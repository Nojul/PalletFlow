import { BoxTemplate, PalletConfig, PlacedBox } from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);

type PackingAlgorithm = "greedy" | "layered";

type PlacementItem = {
  id: string;
  boxId: string;
  name: string;
  weight: number;
  color: string;
  width: number;
  depth: number;
  height: number;
  volume: number;
  segments?: BoxTemplate["irregularSegments"];
};

type OrientationVariant = {
  width: number;
  depth: number;
  height: number;
  rotationX: 0 | 90;
  rotationY: 0 | 90;
};

type PlacementCandidate = {
  candidate: PlacedBox;
  score: number;
  coords: { x: number; y: number; z: number };
};

type FoundationPlanEntry = {
  template: BoxTemplate;
  requiredOnFirstLayer: number;
  maxStackHeight: number;
  remaining: number;
};

type PackingOptions = {
  scannableOptimization?: boolean;
  algorithm?: PackingAlgorithm;
  requireAccessibility?: boolean;
};

export function getVolume(width: number, depth: number, height: number) {
  return width * depth * height;
}

function getOrientation(
  item: { width: number; depth: number; height: number },
  rotationX: 0 | 90,
  rotationY: 0 | 90,
): OrientationVariant {
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

function getAllOrientationVariants(item: {
  width: number;
  depth: number;
  height: number;
}): OrientationVariant[] {
  return [
    {
      width: item.width,
      depth: item.depth,
      height: item.height,
      rotationX: 0,
      rotationY: 0,
    },
    {
      width: item.depth,
      depth: item.width,
      height: item.height,
      rotationX: 0,
      rotationY: 90,
    },
  ];
}

function createPlacementItems(boxes: BoxTemplate[]) {
  return boxes.flatMap((template) => {
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

function getEffectivePalletBounds(
  pallet: PalletConfig,
  allowOverflow: boolean,
) {
  const tolerance = allowOverflow
    ? Math.max(0, pallet.edgeOverflowTolerance ?? 0)
    : 0;
  return {
    width: pallet.width + tolerance,
    depth: pallet.depth + tolerance,
  };
}

function fitsInside(
  pallet: PalletConfig,
  box: { width: number; depth: number; height: number },
  position: { x: number; y: number; z: number },
) {
  const tolerance = Math.max(0, pallet.edgeOverflowTolerance ?? 0);
  return (
    position.x + box.width <= pallet.width + tolerance + 1e-6 &&
    position.y + box.depth <= pallet.depth + tolerance + 1e-6 &&
    position.z + box.height <= pallet.height + 1e-6
  );
}

type VisibilityStatus = "side-visible" | "top-only" | "hidden";

const DEFAULT_MIN_SUPPORT = 0.8;
const MAX_CANDIDATES_PER_PLACEMENT = 24;
const MAX_FIRST_LAYER_CANDIDATES = 12;
const MAX_FIRST_LAYER_SEARCH_NODES = 800;
const PLACEMENT_TIME_BUDGET_MS = 1800;
const SCANNABLE_TIME_BUDGET_MS = 4000;

const overlaps = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && endA > startB;

function isFaceFullyExposed(
  pallet: PalletConfig,
  box: PlacedBox,
  placedBoxes: PlacedBox[],
  side: "left" | "right" | "front" | "back",
) {
  const eps = 1e-6;
  const otherBoxes = placedBoxes.filter((item) => item.id !== box.id);
  const x0 = box.x;
  const x1 = box.x + box.width;
  const y0 = box.y;
  const y1 = box.y + box.depth;
  const z0 = box.z;
  const z1 = box.z + box.height;

  const spansHeight = (other: PlacedBox) =>
    overlaps(other.z, other.z + other.height, z0, z1);
  const spansWidth = (other: PlacedBox) =>
    overlaps(other.x, other.x + other.width, x0, x1);
  const spansDepth = (other: PlacedBox) =>
    overlaps(other.y, other.y + other.depth, y0, y1);

  switch (side) {
    case "left":
      if (x0 <= eps) return true;
      return !otherBoxes.some(
        (other) =>
          spansHeight(other) &&
          spansDepth(other) &&
          other.x + other.width >= x0 - eps &&
          other.x < x0,
      );
    case "right":
      if (x1 >= pallet.width - eps) return true;
      return !otherBoxes.some(
        (other) =>
          spansHeight(other) &&
          spansDepth(other) &&
          other.x <= x1 + eps &&
          other.x + other.width > x1,
      );
    case "front":
      if (y0 <= eps) return true;
      return !otherBoxes.some(
        (other) =>
          spansHeight(other) &&
          spansWidth(other) &&
          other.y + other.depth >= y0 - eps &&
          other.y < y0,
      );
    case "back":
      if (y1 >= pallet.depth - eps) return true;
      return !otherBoxes.some(
        (other) =>
          spansHeight(other) &&
          spansWidth(other) &&
          other.y <= y1 + eps &&
          other.y + other.depth > y1,
      );
    default:
      return false;
  }
}
function getVisibleSides(
  pallet: PalletConfig,
  box: PlacedBox,
  placedBoxes: PlacedBox[],
) {
  return {
    left: isFaceFullyExposed(pallet, box, placedBoxes, "left"),
    right: isFaceFullyExposed(pallet, box, placedBoxes, "right"),
    front: isFaceFullyExposed(pallet, box, placedBoxes, "front"),
    back: isFaceFullyExposed(pallet, box, placedBoxes, "back"),
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
    const topVisible = !boxes.some(
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
      scannable: sideVisible,
      invalid: !sideVisible,
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

function getOrientationVariants(item: PlacementItem): OrientationVariant[] {
  return getAllOrientationVariants(item);
}

function hasExternalVisibleSide(
  pallet: PalletConfig,
  box: PlacedBox,
  placedBoxes: PlacedBox[],
) {
  const visibleSides = getVisibleSides(pallet, box, placedBoxes);
  return (
    visibleSides.left ||
    visibleSides.right ||
    visibleSides.front ||
    visibleSides.back
  );
}

function isFloorLayoutAccessible(
  pallet: PalletConfig,
  placedBoxes: PlacedBox[],
) {
  const floorBoxes = placedBoxes.filter((item) => Math.abs(item.z) < 1e-6);
  if (floorBoxes.length === 0) return true;

  return floorBoxes.every((box) =>
    hasExternalVisibleSide(pallet, box, floorBoxes),
  );
}

// Compute support area fraction for a candidate placed at its current z
function computeSupportFraction(
  candidate: PlacedBox,
  placed: PlacedBox[],
  pallet: PalletConfig,
) {
  const eps = 1e-6;
  if (candidate.z <= eps) return 1; // fully supported by pallet

  const baseArea = candidate.width * candidate.depth;
  if (baseArea <= 0) return 0;

  // supporting boxes are those whose top equals candidate.z
  const supporting = placed.filter(
    (b) =>
      Math.abs(b.z + b.height - candidate.z) < eps && b.id !== candidate.id,
  );

  let supportArea = 0;
  for (const b of supporting) {
    const overlapX = Math.max(
      0,
      Math.min(b.x + b.width, candidate.x + candidate.width) -
        Math.max(b.x, candidate.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(b.y + b.depth, candidate.y + candidate.depth) -
        Math.max(b.y, candidate.y),
    );
    supportArea += overlapX * overlapY;
  }

  return supportArea / baseArea;
}

function getStackAlignmentPenalty(candidate: PlacedBox, placed: PlacedBox[]) {
  if (candidate.z === 0) return 0;

  const supporting = placed.filter(
    (box) =>
      Math.abs(box.z + box.height - candidate.z) < 1e-6 &&
      collide(
        {
          ...candidate,
          z: candidate.z - candidate.height,
        },
        box,
      ),
  );

  if (supporting.length === 0) return 500000;

  const bestAlignment = supporting.reduce((best, box) => {
    const xOffset = Math.abs(candidate.x - box.x);
    const yOffset = Math.abs(candidate.y - box.y);

    return Math.min(best, xOffset + yOffset);
  }, Infinity);

  // Strongly penalize any lateral offset on top of another box.
  // Use a much larger multiplier and add a base penalty for any offset.
  const offsetPenalty =
    bestAlignment === 0 ? 0 : 1000000 + bestAlignment * 5000;
  return offsetPenalty;
}

function getPlacementScore(
  candidate: PlacedBox,
  placed: PlacedBox[],
  pallet: PalletConfig,
  options: PackingOptions,
  floorOnly: boolean,
  allowOverflow: boolean,
) {
  if (options.scannableOptimization) {
    return scorePlacement(candidate, placed, pallet);
  }

  if (floorOnly) {
    const floorBoxes = [
      ...placed.filter((item) => Math.abs(item.z) < 1e-6),
      candidate,
    ];
    const bounds = getEffectivePalletBounds(pallet, allowOverflow);
    const usedArea = floorBoxes.reduce(
      (sum, item) => sum + item.width * item.depth,
      0,
    );
    const minX = Math.min(...floorBoxes.map((item) => item.x));
    const maxX = Math.max(...floorBoxes.map((item) => item.x + item.width));
    const minY = Math.min(...floorBoxes.map((item) => item.y));
    const maxY = Math.max(...floorBoxes.map((item) => item.y + item.depth));
    const boundingArea = Math.max(1e-6, (maxX - minX) * (maxY - minY));
    const slackRight = Math.max(0, bounds.width - maxX);
    const slackBottom = Math.max(0, bounds.depth - maxY);
    const coverageRatio =
      usedArea / Math.max(1e-6, bounds.width * bounds.depth);
    const accessibleBoxes = floorBoxes.filter((box) =>
      hasExternalVisibleSide(pallet, box, floorBoxes),
    ).length;
    const exposedSides = floorBoxes.reduce((sum, box) => {
      const visibleSides = getVisibleSides(pallet, box, floorBoxes);
      return (
        sum +
        Number(visibleSides.left) +
        Number(visibleSides.right) +
        Number(visibleSides.front) +
        Number(visibleSides.back)
      );
    }, 0);
    const accessibilityBonus = accessibleBoxes * 50000 + exposedSides * 2500;
    const accessibilityPenalty =
      Math.max(0, floorBoxes.length - accessibleBoxes) * 1000000;
    return (
      coverageRatio * 1000000 -
      boundingArea * 0.25 -
      slackRight * 120 -
      slackBottom * 120 +
      accessibilityBonus -
      accessibilityPenalty
    );
  }

  const sameHeightBoxes = placed.filter(
    (b) => Math.abs(b.z - candidate.z) < 1e-6,
  );

  const currentLayerPenalty =
    candidate.z > 0 && sameHeightBoxes.length === 0 ? 500000 : 0;

  const heightPenalty = candidate.z * 5000;

  const gapPenalty = (candidate.x + candidate.y) * 10;

  const stairPenalty = getStackAlignmentPenalty(candidate, placed);

  // Ensure alignment penalty dominates: if aligned, stairPenalty is 0;
  // if not aligned, it's huge, so this term alone will decide.
  return (
    1000000 - currentLayerPenalty - heightPenalty - gapPenalty - stairPenalty
  );
}

function expandPositions(placed: PlacedBox[]) {
  const positions = new Set<number>();
  positions.add(0);
  placed.forEach((item) => positions.add(item.z + item.height));
  return Array.from(positions).sort((a, b) => a - b);
}

function generateAxisPositions(
  placedBoxes: PlacedBox[],
  axis: "x" | "y",
  maxCoord: number,
  step: number,
): number[] {
  if (maxCoord < -1e-6) return [];
  const positions = new Set<number>();
  positions.add(0);

  // Always test positions flush with existing box edges — this is what
  // prevents the staircase/pyramid drift.
  for (const box of placedBoxes) {
    const start = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.width : box.depth;
    positions.add(start);
    positions.add(start + size);
  }

  // Fill in the rest of the search space with the regular grid.
  for (let value = 0; value <= maxCoord + 1e-6; value += step) {
    positions.add(value);
  }

  return Array.from(positions)
    .filter((value) => value >= -1e-6 && value <= maxCoord + 1e-6)
    .sort((a, b) => a - b);
}

function findPlacementCandidates(
  item: PlacementItem,
  placed: PlacedBox[],
  pallet: PalletConfig,
  minSupportFraction: number,
  options: PackingOptions,
  zCandidates: number[],
  floorOnly: boolean,
  allowOverflow: boolean,
  requireAccessibility: boolean,
) {
  const orientationVariants = getOrientationVariants(item);
  const scoredCandidates: PlacementCandidate[] = [];
  const bounds = getEffectivePalletBounds(pallet, allowOverflow);
  const deadline =
    Date.now() +
    (options.scannableOptimization
      ? SCANNABLE_TIME_BUDGET_MS
      : PLACEMENT_TIME_BUDGET_MS);
  const step = options.scannableOptimization
    ? Math.max(
        2,
        Math.min(3, Math.round(Math.min(item.width, item.depth) / 24)),
      )
    : Math.max(
        4,
        Math.min(6, Math.round(Math.min(item.width, item.depth) / 20)),
      );
  const maxCandidates = options.scannableOptimization
    ? MAX_CANDIDATES_PER_PLACEMENT + 8
    : MAX_CANDIDATES_PER_PLACEMENT;

  for (const variant of orientationVariants) {
    const xPositions = generateAxisPositions(
      placed,
      "x",
      bounds.width - variant.width,
      step,
    );
    const yPositions = generateAxisPositions(
      placed,
      "y",
      bounds.depth - variant.depth,
      step,
    );

    for (const z of zCandidates) {
      for (const x of xPositions) {
        for (const y of yPositions) {
          if (Date.now() > deadline) {
            return scoredCandidates;
          }

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
          const collisions = placed.some((placedItem) =>
            collide(candidate, placedItem),
          );
          if (collisions) continue;

          const supportFraction = computeSupportFraction(
            candidate,
            placed,
            pallet,
          );
          if (supportFraction < minSupportFraction) continue;

          if (
            requireAccessibility &&
            floorOnly &&
            !isFloorLayoutAccessible(pallet, [...placed, candidate])
          ) {
            continue;
          }

          scoredCandidates.push({
            candidate,
            score: getPlacementScore(
              candidate,
              placed,
              pallet,
              options,
              floorOnly,
              allowOverflow,
            ),
            coords: { x, y, z },
          });

          if (scoredCandidates.length >= maxCandidates) {
            return scoredCandidates;
          }
        }
      }
    }
  }

  return scoredCandidates;
}

function findBestPlacement(
  item: PlacementItem,
  placed: PlacedBox[],
  pallet: PalletConfig,
  minSupportFraction: number,
  options: PackingOptions,
  floorOnly: boolean,
  allowOverflow: boolean,
  requireAccessibility: boolean,
) {
  const scoredCandidates = findPlacementCandidates(
    item,
    placed,
    pallet,
    minSupportFraction,
    options,
    floorOnly ? [0] : expandPositions(placed),
    floorOnly,
    allowOverflow,
    requireAccessibility,
  );

  if (scoredCandidates.length === 0) return null;

  scoredCandidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.coords.z - b.coords.z ||
      a.coords.x - b.coords.x ||
      a.coords.y - b.coords.y,
  );

  return scoredCandidates[0];
}

function createFoundationPlan(boxes: BoxTemplate[], pallet: PalletConfig) {
  return boxes
    .map((template) => {
      const quantity = Math.max(0, Number(template.quantity) || 0);
      const height = Number(template.height);
      const maxStackHeight = Math.max(
        1,
        Math.floor(pallet.height / Math.max(1, height)),
      );
      const requiredOnFirstLayer = Math.max(
        1,
        Math.min(quantity, Math.ceil(quantity / maxStackHeight)),
      );

      return {
        template,
        requiredOnFirstLayer,
        maxStackHeight,
        remaining: quantity,
      } satisfies FoundationPlanEntry;
    })
    .filter((entry) => entry.remaining > 0);
}

function findVerticalPlacement(
  item: PlacementItem,
  placed: PlacedBox[],
  pallet: PalletConfig,
  baseBox: PlacedBox,
  minSupportFraction: number,
) {
  const candidate = {
    ...baseBox,
    id: createId(),
    boxId: item.boxId,
    name: item.name,

    originalWidth: baseBox.originalWidth,
    originalDepth: baseBox.originalDepth,
    originalHeight: baseBox.originalHeight,

    width: baseBox.width,
    depth: baseBox.depth,
    height: baseBox.height,

    x: baseBox.x,
    y: baseBox.y,
    z: baseBox.z + baseBox.height,

    rotationX: baseBox.rotationX,
    rotationY: baseBox.rotationY,
  };

  if (!fitsInside(pallet, candidate, candidate)) return null;
  if (placed.some((placedItem) => collide(candidate, placedItem))) return null;

  const supportFraction = computeSupportFraction(candidate, placed, pallet);
  if (supportFraction < minSupportFraction) return null;

  candidate.x = baseBox.x;
  candidate.y = baseBox.y;
  candidate.z = baseBox.z + baseBox.height;

  return {
    candidate,
    score: 0,
    coords: { x: candidate.x, y: candidate.y, z: candidate.z },
  };
}

function assignStackLevels(placed: PlacedBox[]) {
  const boxes = placed.map((box) => ({ ...box }));
  const layers = new Map<string, number>();

  const sorted = [...boxes].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  for (const box of sorted) {
    if (Math.abs(box.z) < 1e-6) {
      layers.set(box.id, 0);
      continue;
    }

    const supporting = boxes.filter((other) => {
      if (other.id === box.id) return false;
      if (Math.abs(other.z + other.height - box.z) > 1e-6) return false;
      const overlapX = Math.max(
        0,
        Math.min(other.x + other.width, box.x + box.width) -
          Math.max(other.x, box.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(other.y + other.depth, box.y + box.depth) -
          Math.max(other.y, box.y),
      );
      return overlapX > 1e-6 && overlapY > 1e-6;
    });

    const parentLevel = supporting.reduce((maxLevel, other) => {
      const level = layers.get(other.id) ?? 0;
      return Math.max(maxLevel, level);
    }, 0);

    layers.set(box.id, parentLevel + 1);
  }

  return boxes.map((box) => ({
    ...box,
    layer: layers.get(box.id) ?? 0,
  }));
}

function buildAccessibleFirstLayer(
  pallet: PalletConfig,
  floorItems: PlacementItem[],
  placed: PlacedBox[],
  minSupportFraction: number,
  options: PackingOptions,
) {
  let searchNodes = 0;
  const deadline =
    Date.now() +
    (options.scannableOptimization
      ? SCANNABLE_TIME_BUDGET_MS
      : PLACEMENT_TIME_BUDGET_MS);

  const search = (
    remainingItems: PlacementItem[],
    currentPlaced: PlacedBox[],
  ): PlacedBox[] | null => {
    searchNodes += 1;
    if (searchNodes > MAX_FIRST_LAYER_SEARCH_NODES || Date.now() > deadline) {
      return null;
    }

    if (remainingItems.length === 0) {
      return currentPlaced;
    }

    const item = remainingItems[0];
    const candidates = findPlacementCandidates(
      item,
      currentPlaced,
      pallet,
      minSupportFraction,
      options,
      [0],
      true,
      true,
      true,
    )
      .filter((candidate) =>
        isFloorLayoutAccessible(pallet, [
          ...currentPlaced,
          candidate.candidate,
        ]),
      )
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.coords.z - b.coords.z ||
          a.coords.x - b.coords.x ||
          a.coords.y - b.coords.y,
      );

    for (const candidate of candidates.slice(0, MAX_FIRST_LAYER_CANDIDATES)) {
      const nextPlaced = [...currentPlaced, candidate.candidate];
      const result = search(remainingItems.slice(1), nextPlaced);
      if (result) {
        return result;
      }
    }

    return null;
  };

  return search(floorItems, placed);
}

function stabilizePlaced(
  placed: PlacedBox[],
  pallet: PalletConfig,
  minSupportFraction: number,
) {
  const eps = 1e-6;
  const positions = new Set<number>([0]);
  placed.forEach((b) => positions.add(b.z + b.height));
  const zCandidates = Array.from(positions).sort((a, b) => a - b);

  const sorted = [...placed].sort((a, b) => a.z - b.z);
  for (const box of sorted) {
    const currentSupport = computeSupportFraction(box, placed, pallet);
    if (currentSupport >= minSupportFraction) {
      box.invalid = false;
      // Try to snap x/y to a supporting box if there's significant overlap
      if (box.z > eps) {
        const supporting = placed.filter(
          (b) => Math.abs(b.z + b.height - box.z) < eps && b.id !== box.id,
        );
        for (const b of supporting) {
          const overlapX = Math.max(
            0,
            Math.min(b.x + b.width, box.x + box.width) - Math.max(b.x, box.x),
          );
          const overlapY = Math.max(
            0,
            Math.min(b.y + b.depth, box.y + box.depth) - Math.max(b.y, box.y),
          );
          const baseArea = box.width * box.depth;
          const overlapRatio = (overlapX * overlapY) / baseArea;

          if (overlapRatio >= 0.8) {
            const origX = box.x;
            const origY = box.y;
            box.x = b.x;
            box.y = b.y;

            const collisions = placed.some(
              (other) => other.id !== box.id && collide(box, other),
            );
            if (!collisions) {
              box.invalid = false;
              break;
            }
            box.x = origX;
            box.y = origY;
          }
        }
      }
      continue;
    }

    const lowerZ = zCandidates.filter((z) => z < box.z);
    let snapped = false;
    for (const z of lowerZ) {
      const origZ = box.z;
      box.z = z;
      const collisions = placed.some(
        (other) => other.id !== box.id && collide(box, other),
      );
      if (collisions) {
        box.z = origZ;
        continue;
      }
      const support = computeSupportFraction(box, placed, pallet);
      if (support >= minSupportFraction && z >= 0) {
        snapped = true;
        box.invalid = false;
        break;
      }
      box.z = origZ;
    }

    if (!snapped) {
      box.invalid = true;
    }
  }
}

function buildGreedyPackingPlan(
  pallet: PalletConfig,
  boxes: BoxTemplate[],
  options: PackingOptions = {},
) {
  const minSupportFraction = Math.max(
    0,
    Math.min(1, (options as any).minSupportFraction ?? DEFAULT_MIN_SUPPORT),
  );
  const items = createPlacementItems(boxes);
  items.sort((a, b) => b.volume - a.volume || b.height - a.height);

  const placed: PlacedBox[] = [];

  items.forEach((item) => {
    const placement = findBestPlacement(
      item,
      placed,
      pallet,
      minSupportFraction,
      options,
      false,
      false,
      false,
    );
    if (!placement) return;

    placed.push(placement.candidate);
    stabilizePlaced(placed, pallet, minSupportFraction);
  });

  return annotateVisibility(pallet, assignStackLevels(placed));
}

function buildLayeredPackingPlan(
  pallet: PalletConfig,
  boxes: BoxTemplate[],
  options: PackingOptions = {},
) {
  const minSupportFraction = Math.max(
    0,
    Math.min(1, (options as any).minSupportFraction ?? DEFAULT_MIN_SUPPORT),
  );
  const placed: PlacedBox[] = [];
  const inventory = createFoundationPlan(boxes, pallet).sort((a, b) => {
    const volumeA = getVolume(
      a.template.width,
      a.template.depth,
      a.template.height,
    );
    const volumeB = getVolume(
      b.template.width,
      b.template.depth,
      b.template.height,
    );
    return volumeB - volumeA || b.template.height - a.template.height;
  });

  const floorItems: PlacementItem[] = [];
  for (const entry of inventory) {
    const targetFirstLayer = Math.min(
      entry.requiredOnFirstLayer,
      entry.remaining,
    );
    for (let index = 0; index < targetFirstLayer; index += 1) {
      floorItems.push({
        id: `${entry.template.id}-floor-${index}`,
        boxId: entry.template.id,
        name: entry.template.name,
        weight: Number(entry.template.weight),
        color: entry.template.color,
        width: Number(entry.template.width),
        depth: Number(entry.template.depth),
        height: Number(entry.template.height),
        volume: getVolume(
          Number(entry.template.width),
          Number(entry.template.depth),
          Number(entry.template.height),
        ),
      });
    }
  }

  const floorPlacements = buildAccessibleFirstLayer(
    pallet,
    floorItems,
    placed,
    minSupportFraction,
    options,
  );
  if (floorPlacements) {
    for (const placement of floorPlacements) {
      placed.push(placement);
      const entry = inventory.find(
        (item) => item.template.id === placement.boxId,
      );
      if (entry) {
        entry.remaining -= 1;
      }
    }
    stabilizePlaced(placed, pallet, minSupportFraction);
  }

  for (const entry of inventory) {
    const floorBoxesForEntry = placed.filter(
      (box) => box.boxId === entry.template.id && Math.abs(box.z) < 1e-6,
    );
    for (const baseBox of floorBoxesForEntry) {
      const item: PlacementItem = {
        id: entry.template.id,
        boxId: entry.template.id,
        name: entry.template.name,
        weight: Number(entry.template.weight),
        color: entry.template.color,
        width: Number(entry.template.width),
        depth: Number(entry.template.depth),
        height: Number(entry.template.height),
        volume: getVolume(
          Number(entry.template.width),
          Number(entry.template.depth),
          Number(entry.template.height),
        ),
      };

      let currentBox = baseBox;
      while (entry.remaining > 0) {
        const stackPlacement = findVerticalPlacement(
          item,
          placed,
          pallet,
          currentBox,
          minSupportFraction,
        );
        if (!stackPlacement) break;

        placed.push(stackPlacement.candidate);
        entry.remaining -= 1;
        stabilizePlaced(placed, pallet, minSupportFraction);
        currentBox = stackPlacement.candidate;
      }
    }
  }

  for (const entry of inventory) {
    while (entry.remaining > 0) {
      const item: PlacementItem = {
        id: entry.template.id,
        boxId: entry.template.id,
        name: entry.template.name,
        weight: Number(entry.template.weight),
        color: entry.template.color,
        width: Number(entry.template.width),
        depth: Number(entry.template.depth),
        height: Number(entry.template.height),
        volume: getVolume(
          Number(entry.template.width),
          Number(entry.template.depth),
          Number(entry.template.height),
        ),
      };

      const placement = findBestPlacement(
        item,
        placed,
        pallet,
        minSupportFraction,
        options,
        false,
        true,
        true,
      );
      if (!placement) break;

      placed.push(placement.candidate);
      entry.remaining -= 1;
      stabilizePlaced(placed, pallet, minSupportFraction);
    }
  }

  return annotateVisibility(pallet, assignStackLevels(placed));
}

export function buildPackingPlan(
  pallet: PalletConfig,
  boxes: BoxTemplate[],
  options: PackingOptions = {},
) {
  const algorithm = options.algorithm ?? pallet.packingAlgorithm ?? "greedy";
  if (algorithm === "layered") {
    return buildLayeredPackingPlan(pallet, boxes, options);
  }

  return buildGreedyPackingPlan(pallet, boxes, options);
}

export function summarizePacking(pallet: PalletConfig, placed: PlacedBox[]) {
  const totalVolume = pallet.width * pallet.depth * pallet.height;
  const usedVolume = placed.reduce(
    (sum, box) => sum + box.width * box.depth * box.height,
    0,
  );
  const totalWeight = placed.reduce((sum, box) => sum + box.weight, 0);
  const maxHeight = placed.reduce(
    (current, box) => Math.max(current, box.z + box.height),
    0,
  );
  const utilization = totalVolume
    ? Math.min(100, (usedVolume / totalVolume) * 100)
    : 0;
  const heightUsage = pallet.height
    ? Math.min(100, (maxHeight / pallet.height) * 100)
    : 0;
  const efficiency =
    totalWeight && totalVolume
      ? Math.round(
          utilization * 0.7 +
            heightUsage * 0.2 +
            Math.min(100, (usedVolume / totalVolume) * 100) * 0.1,
        )
      : utilization;

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
