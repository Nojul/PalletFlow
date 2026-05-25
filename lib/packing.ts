import { BoxTemplate, PalletConfig, PlacedBox } from './types';

const createId = () => Math.random().toString(36).slice(2, 10);

export function getVolume(width: number, depth: number, height: number) {
  return width * depth * height;
}

type OrientationVariant = {
  width: number;
  depth: number;
  height: number;
  rotationX: 0 | 90;
  rotationY: 0 | 90;
};

function getOrientation(item: { width: number; depth: number; height: number }, rotationX: 0 | 90, rotationY: 0 | 90): OrientationVariant {
  let width = item.width;
  let depth = item.depth;
  let height = item.height;

  if (rotationY === 90) {
    [width, depth] = [depth, width];
  }

  if (rotationX === 90) {
    [height, depth] = [depth, height];
  }

  return { width, depth, height, rotationX, rotationY };
}

function collide(a: PlacedBox, b: PlacedBox) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.depth &&
    a.y + a.depth > b.y &&
    a.z < b.z + b.height &&
    a.z + a.height > b.z
  );
}

function fitsInside(pallet: PalletConfig, box: { width: number; depth: number; height: number }, position: { x: number; y: number; z: number }) {
  return (
    position.x + box.width <= pallet.width + 1e-6 &&
    position.y + box.depth <= pallet.depth + 1e-6 &&
    position.z + box.height <= pallet.height + 1e-6
  );
}

type VisibilityStatus = "side-visible" | "top-only" | "hidden";

type VisibleSides = {
  left: boolean;
  right: boolean;
  front: boolean;
  back: boolean;
};

type PackingOptions = {
  scannableOptimization?: boolean;
};

const DEFAULT_MIN_SUPPORT = 0.7; // 70% of base area must be supported by pallet or boxes below


const isFlush = (value: number, target: number) => Math.abs(value - target) < 1e-6;

const overlaps = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) => startA < endB && endA > startB;

function getVisibleSides(
  pallet: PalletConfig,
  box: PlacedBox,
  placedBoxes: PlacedBox[],
) {
  const otherBoxes = placedBoxes.filter((item) => item.id !== box.id);
  const x0 = box.x;
  const x1 = box.x + box.width;
  const y0 = box.y;
  const y1 = box.y + box.depth;
  const z0 = box.z;
  const z1 = box.z + box.height;

  const left = !otherBoxes.some(
    (other) =>
      overlaps(other.y, other.y + other.depth, y0, y1) &&
      overlaps(other.z, other.z + other.height, z0, z1) &&
      other.x < x0 &&
      other.x + other.width > 0,
  );

  const right = !otherBoxes.some(
    (other) =>
      overlaps(other.y, other.y + other.depth, y0, y1) &&
      overlaps(other.z, other.z + other.height, z0, z1) &&
      other.x < pallet.width &&
      other.x + other.width > x1,
  );

  const front = !otherBoxes.some(
    (other) =>
      overlaps(other.x, other.x + other.width, x0, x1) &&
      overlaps(other.z, other.z + other.height, z0, z1) &&
      other.y < y0 &&
      other.y + other.depth > 0,
  );

  const back = !otherBoxes.some(
    (other) =>
      overlaps(other.x, other.x + other.width, x0, x1) &&
      overlaps(other.z, other.z + other.height, z0, z1) &&
      other.y < pallet.depth &&
      other.y + other.depth > y1,
  );

  return {
    left,
    right,
    front,
    back,
  };
}

function annotateVisibility(pallet: PalletConfig, boxes: PlacedBox[]) {
  return boxes.map((box) => {
    const visibleSides = getVisibleSides(pallet, box, boxes);
    const sideVisible =
      visibleSides.left ||
      visibleSides.right ||
      visibleSides.front ||
      visibleSides.back;
    const topVisible =
      !boxes.some(
        (other) =>
          other.id !== box.id &&
          overlaps(other.x, other.x + other.width, box.x, box.x + box.width) &&
          overlaps(other.y, other.y + other.depth, box.y, box.y + box.depth) &&
          other.z < pallet.height &&
          other.z + other.height > box.z + box.height,
      );
    const visibilityStatus: VisibilityStatus = sideVisible
      ? "side-visible"
      : topVisible
      ? "top-only"
      : "hidden";

    return {
      ...box,
      visibleSides,
      sideVisible,
      topVisible,
      visibilityStatus,
      scannable: sideVisible || topVisible,
      invalid: (box.invalid ?? false) || visibilityStatus === "hidden",
    };
  });
}

function scorePlacement(
  candidate: PlacedBox,
  placed: PlacedBox[],
  pallet: PalletConfig,
) {
  const allBoxes = annotateVisibility(pallet, [...placed, candidate]);
  return allBoxes.reduce((score, item) => {
    if (item.visibilityStatus === "side-visible") return score + 100;
    if (item.visibilityStatus === "top-only") return score + 20;
    return score - 200;
  }, 0);
}

export function buildPackingPlan(
  pallet: PalletConfig,
  boxes: BoxTemplate[],
  options: PackingOptions = {},
) {
  const minSupportFraction = Math.max(0, Math.min(1, (options as any).minSupportFraction ?? DEFAULT_MIN_SUPPORT));
  const items = boxes.flatMap((template) => {
    const width = Number(template.width);
    const depth = Number(template.depth);
    const height = Number(template.height);
    const weight = Number(template.weight);
    const quantity = Math.max(0, Number(template.quantity) || 0);

    return Array.from({ length: quantity }, (_, index) => ({
      id: `${template.id}-${index}`,
      boxId: template.id,
      name: template.name,
      weight,
      color: template.color,
      width,
      depth,
      height,
      volume: getVolume(width, depth, height),
      segments: template.irregularSegments,
    }));
  });

  items.sort((a, b) => b.volume - a.volume || b.height - a.height);

  const placed: PlacedBox[] = [];

  const zPositions = [0];

  const expandPositions = () => {
    const positions = new Set<number>();
    positions.add(0);
    placed.forEach((item) => positions.add(item.z + item.height));
    return Array.from(positions).sort((a, b) => a - b);
  };

  const tryPlace = (item: typeof items[number]) => {
    const orientationVariants: OrientationVariant[] = [
      getOrientation(item, 0, 0),
      getOrientation(item, 0, 90),
      getOrientation(item, 90, 0),
      getOrientation(item, 90, 90),
    ];

    const zCandidates = expandPositions();
    const scoredCandidates: Array<{
      candidate: PlacedBox;
      score: number;
      coords: { x: number; y: number; z: number };
    }> = [];

    for (const z of zCandidates) {
      for (const variant of orientationVariants) {
        for (let x = 0; x <= pallet.width - variant.width; x += 2) {
          for (let y = 0; y <= pallet.depth - variant.depth; y += 2) {
            const candidate = {
              id: createId(),
              boxId: item.boxId,
              name: item.name,
              originalWidth: item.width,
              originalDepth: item.depth,
              originalHeight: item.height,
              width: variant.width,
              depth: variant.depth,
              height: variant.height,
              weight: item.weight,
              color: item.color,
              x,
              y,
              z,
              rotationX: variant.rotationX,
              rotationY: variant.rotationY,
              layer: z === 0 ? 0 : z,
            };

            if (!fitsInside(pallet, candidate, candidate)) continue;
            const collisions = placed.some((placedItem) => collide(candidate, placedItem));
            if (collisions) continue;

            // Stability/support check: compute fraction of base area supported at this z
            const supportFraction = computeSupportFraction(candidate, placed, pallet);
            if (supportFraction < minSupportFraction) continue;

            if (options.scannableOptimization) {
              scoredCandidates.push({
                candidate,
                score: scorePlacement(candidate, placed, pallet),
                coords: { x, y, z },
              });
            } else {
              placed.push(candidate);
              // stabilize after placing
              stabilizePlaced(placed, pallet, minSupportFraction);
              return true;
            }
          }
        }
      }
    }

    if (scoredCandidates.length > 0) {
      scoredCandidates.sort((a, b) =>
        b.score - a.score ||
        a.coords.z - b.coords.z ||
        a.coords.x - b.coords.x ||
        a.coords.y - b.coords.y,
      );
      placed.push(scoredCandidates[0].candidate);
      // After placing, stabilize stack (snap down unsupported boxes where possible)
      stabilizePlaced(placed, pallet, minSupportFraction);
      return true;
    }

    return false;
  };

  items.forEach((item) => tryPlace(item));

  return annotateVisibility(pallet, placed);
}

// Compute support area fraction for a candidate placed at its current z
function computeSupportFraction(candidate: PlacedBox, placed: PlacedBox[], pallet: PalletConfig) {
  const eps = 1e-6;
  if (candidate.z <= eps) return 1; // fully supported by pallet

  const baseArea = candidate.width * candidate.depth;
  if (baseArea <= 0) return 0;

  // supporting boxes are those whose top equals candidate.z
  const supporting = placed.filter((b) => Math.abs(b.z + b.height - candidate.z) < eps && b.id !== candidate.id);

  let supportArea = 0;
  for (const b of supporting) {
    const overlapX = Math.max(0, Math.min(b.x + b.width, candidate.x + candidate.width) - Math.max(b.x, candidate.x));
    const overlapY = Math.max(0, Math.min(b.y + b.depth, candidate.y + candidate.depth) - Math.max(b.y, candidate.y));
    supportArea += overlapX * overlapY;
  }

  return supportArea / baseArea;
}

// Try to snap unstable boxes down to nearest supporting z (or mark invalid if none)
function stabilizePlaced(placed: PlacedBox[], pallet: PalletConfig, minSupportFraction: number) {
  const eps = 1e-6;
  // collect candidate z positions (pallet base and all tops)
  const positions = new Set<number>([0]);
  placed.forEach((b) => positions.add(b.z + b.height));
  const zCandidates = Array.from(positions).sort((a, b) => a - b);

  // iterate boxes from lowest to highest so we settle the stack
  const sorted = [...placed].sort((a, b) => a.z - b.z);
  for (const box of sorted) {
    const currentSupport = computeSupportFraction(box, placed, pallet);
    if (currentSupport >= minSupportFraction) {
      box.invalid = false;
      continue;
    }

    // try lower z positions (closest below current)
    const lowerZ = zCandidates.filter((z) => z < box.z).sort((a, b) => b - a);
    let snapped = false;
    for (const z of lowerZ) {
      // temporarily set z and check collisions
      const origZ = box.z;
      box.z = z;
      const collisions = placed.some((other) => other.id !== box.id && collide(box, other));
      if (collisions) {
        box.z = origZ;
        continue;
      }
      const support = computeSupportFraction(box, placed, pallet);
      if (support >= minSupportFraction) {
        snapped = true;
        box.invalid = false;
        break;
      }
      box.z = origZ;
    }

    if (!snapped) {
      box.invalid = true; // mark as unstable/invalid
    }
  }
}

export function summarizePacking(pallet: PalletConfig, placed: PlacedBox[]) {
  const totalVolume = pallet.width * pallet.depth * pallet.height;
  const usedVolume = placed.reduce((sum, box) => sum + box.width * box.depth * box.height, 0);
  const totalWeight = placed.reduce((sum, box) => sum + box.weight, 0);
  const maxHeight = placed.reduce((current, box) => Math.max(current, box.z + box.height), 0);
  const utilization = totalVolume ? Math.min(100, (usedVolume / totalVolume) * 100) : 0;
  const heightUsage = pallet.height ? Math.min(100, (maxHeight / pallet.height) * 100) : 0;
  const efficiency = totalWeight && totalVolume ? Math.round((utilization * 0.7 + heightUsage * 0.2 + Math.min(100, (usedVolume / totalVolume) * 100) * 0.1)) : utilization;

  return {
    totalVolume,
    usedVolume,
    totalWeight,
    maxHeight,
    utilization,
    heightUsage,
    efficiency,
  };
}
