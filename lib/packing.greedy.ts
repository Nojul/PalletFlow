import { BoxTemplate, PalletConfig, PlacedBox } from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);
const GEOMETRY_EPS = 1e-6;
const COLLISION_EPS = 0;
const STRICT_OVERLAP_EPS = 1e-12;
const SNAP_PRECISION = 1e6;

const snapCoord = (value: number) =>
  Math.round(value * SNAP_PRECISION) / SNAP_PRECISION;

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
  quantity: number;
  footprintWidth: number;
  footprintDepth: number;
  footprintHeight: number;
  rotationX: 0 | 90;
  rotationY: 0 | 90;
  footprintArea: number;
  maxStackHeight: number;
  requiredFootprints: number;
  remaining: number;
};

type LayerState = {
  placed: PlacedBox[];
  score: number;
  placedCount: number;
  remainingByType: Record<string, number>;
};

type PackingOptions = {
  scannableOptimization?: boolean;
  algorithm?: PackingAlgorithm;
  requireAccessibility?: boolean;
};

function compareCandidatesWithZ(a: PlacementCandidate, b: PlacementCandidate) {
  return (
    b.score - a.score ||
    a.coords.z - b.coords.z ||
    a.coords.x - b.coords.x ||
    a.coords.y - b.coords.y
  );
}

function compareCandidatesFloor(a: PlacementCandidate, b: PlacementCandidate) {
  return (
    b.score - a.score || a.coords.x - b.coords.x || a.coords.y - b.coords.y
  );
}

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
    }));
  });
}

function collide(a: PlacedBox, b: PlacedBox) {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
  const overlapZ =
    Math.min(a.z + a.height, b.z + b.height) - Math.max(a.z, b.z);

  return (
    overlapX > COLLISION_EPS + STRICT_OVERLAP_EPS &&
    overlapY > COLLISION_EPS + STRICT_OVERLAP_EPS &&
    overlapZ > COLLISION_EPS + STRICT_OVERLAP_EPS
  );
}

function hasStrictIntersection(a: PlacedBox, b: PlacedBox) {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
  const overlapZ =
    Math.min(a.z + a.height, b.z + b.height) - Math.max(a.z, b.z);

  return (
    overlapX > STRICT_OVERLAP_EPS &&
    overlapY > STRICT_OVERLAP_EPS &&
    overlapZ > STRICT_OVERLAP_EPS
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
  allowOverflow = false,
) {
  const tolerance = allowOverflow
    ? Math.max(0, pallet.edgeOverflowTolerance ?? 0)
    : 0;
  return (
    position.x >= -tolerance - GEOMETRY_EPS &&
    position.y >= -tolerance - GEOMETRY_EPS &&
    position.z >= -GEOMETRY_EPS &&
    position.x + box.width <= pallet.width + tolerance + GEOMETRY_EPS &&
    position.y + box.depth <= pallet.depth + tolerance + GEOMETRY_EPS &&
    position.z + box.height <= pallet.height + GEOMETRY_EPS
  );
}

function normalizePlacementGeometry(box: PlacedBox): PlacedBox {
  return {
    ...box,
    width: snapCoord(box.width),
    depth: snapCoord(box.depth),
    height: snapCoord(box.height),
    x: snapCoord(box.x),
    y: snapCoord(box.y),
    z: snapCoord(box.z),
  };
}

type VisibilityStatus = "side-visible" | "top-only" | "hidden";

const DEFAULT_MIN_SUPPORT = 0.8;
const MAX_CANDIDATES_PER_PLACEMENT = 24;
const LAYER_BEAM_WIDTH = 40;
const LAYER_STATE_EXPANSIONS = 10;
const LAYER_TYPE_BRANCHING = 2;
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

  const baseArea = candidate.width * candidate.depth;
  if (baseArea <= 0) return 0;

  if (candidate.z <= eps) {
    // Overhang is allowed, but only pallet-overlapping area provides floor support.
    const palletOverlapX = Math.max(
      0,
      Math.min(candidate.x + candidate.width, pallet.width) -
        Math.max(candidate.x, 0),
    );
    const palletOverlapY = Math.max(
      0,
      Math.min(candidate.y + candidate.depth, pallet.depth) -
        Math.max(candidate.y, 0),
    );
    const supportedArea = palletOverlapX * palletOverlapY;
    return supportedArea / baseArea;
  }

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
    const stackPotential = floorBoxes.reduce((sum, box) => {
      const sameBoxes = floorBoxes.filter(
        (b) => b.width === box.width && b.depth === box.depth,
      );

      return sum + sameBoxes.length;
    }, 0);

    let sharedEdges = 0;
    let rowContinuity = 0;
    for (let i = 0; i < floorBoxes.length; i++) {
      for (let j = i + 1; j < floorBoxes.length; j++) {
        const a = floorBoxes[i];
        const b = floorBoxes[j];

        const touchVertical =
          Math.abs(a.x + a.width - b.x) <= GEOMETRY_EPS ||
          Math.abs(b.x + b.width - a.x) <= GEOMETRY_EPS;
        const overlapY = overlaps(a.y, a.y + a.depth, b.y, b.y + b.depth);

        const touchHorizontal =
          Math.abs(a.y + a.depth - b.y) <= GEOMETRY_EPS ||
          Math.abs(b.y + b.depth - a.y) <= GEOMETRY_EPS;
        const overlapX = overlaps(a.x, a.x + a.width, b.x, b.x + b.width);

        if ((touchVertical && overlapY) || (touchHorizontal && overlapX)) {
          sharedEdges += 1;
        }

        const sameRowDepth =
          Math.abs(a.y - b.y) <= GEOMETRY_EPS &&
          Math.abs(a.depth - b.depth) <= GEOMETRY_EPS;
        const sameColumnWidth =
          Math.abs(a.x - b.x) <= GEOMETRY_EPS &&
          Math.abs(a.width - b.width) <= GEOMETRY_EPS;
        if (sameRowDepth || sameColumnWidth) {
          rowContinuity += 1;
        }
      }
    }

    const unusedBoundingArea = Math.max(0, boundingArea - usedArea);

    // New objective: prefer small, strong foundations that allow stacking.
    return (
      coverageRatio * 300000 +
      stackPotential * 1000000 -
      boundingArea * 0.25 -
      unusedBoundingArea * 220 +
      sharedEdges * 1600 +
      rowContinuity * 2000 -
      slackRight * 120 -
      slackBottom * 120
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

  for (const box of placedBoxes) {
    const start = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.width : box.depth;
    positions.add(start);
    positions.add(start + size);
  }

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

          const candidate = normalizePlacementGeometry({
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
          });

          if (!fitsInside(pallet, candidate, candidate, allowOverflow))
            continue;
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

  scoredCandidates.sort(compareCandidatesWithZ);

  return scoredCandidates[0];
}

function findBestStrictScannableFloorPlacement(
  item: PlacementItem,
  placed: PlacedBox[],
  pallet: PalletConfig,
  minSupportFraction: number,
  options: PackingOptions,
) {
  const floorBoxes = placed.filter((box) => Math.abs(box.z) < GEOMETRY_EPS);
  const scoredCandidates = findPlacementCandidates(
    item,
    placed,
    pallet,
    minSupportFraction,
    options,
    [0],
    true,
    true,
    false,
  ).filter(({ candidate }) =>
    isStrictlyScannableFirstLayer(pallet, [...floorBoxes, candidate]),
  );

  if (scoredCandidates.length === 0) return null;

  scoredCandidates.sort(compareCandidatesFloor);

  return scoredCandidates[0];
}

function createPlacementItemFromTemplate(
  template: BoxTemplate,
  dimensions: { width: number; depth: number; height: number },
): PlacementItem {
  const width = Number(dimensions.width);
  const depth = Number(dimensions.depth);
  const height = Number(dimensions.height);

  return {
    id: template.id,
    boxId: template.id,
    name: template.name,
    weight: Number(template.weight),
    color: template.color,
    width,
    depth,
    height,
    volume: getVolume(width, depth, height),
  };
}

function createTemplateDimensionItem(template: BoxTemplate) {
  return createPlacementItemFromTemplate(template, {
    width: template.width,
    depth: template.depth,
    height: template.height,
  });
}

function createFootprintDimensionItem(entry: FoundationPlanEntry) {
  return createPlacementItemFromTemplate(entry.template, {
    width: entry.footprintWidth,
    depth: entry.footprintDepth,
    height: entry.footprintHeight,
  });
}

function getStackOrientationVariants(template: BoxTemplate) {
  const source = {
    width: Number(template.width),
    depth: Number(template.depth),
    height: Number(template.height),
  };

  const seen = new Set<string>();
  const variants: OrientationVariant[] = [];

  const rotations: Array<[0 | 90, 0 | 90]> = [
    [0, 0],
    [0, 90],
    [90, 0],
    [90, 90],
  ];

  for (const [rotationX, rotationY] of rotations) {
    const variant = getOrientation(source, rotationX, rotationY);
    const key = `${variant.width}-${variant.depth}-${variant.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push(variant);
  }

  return variants;
}

function createFoundationPlan(boxes: BoxTemplate[], pallet: PalletConfig) {
  const eps = 1e-6;
  const bounds = getEffectivePalletBounds(pallet, true);

  return boxes
    .map((template) => {
      const quantity = Math.max(0, Number(template.quantity) || 0);
      if (quantity <= 0) return null;

      const orientations = getStackOrientationVariants(template)
        .filter(
          (variant) =>
            variant.width <= bounds.width + eps &&
            variant.depth <= bounds.depth + eps &&
            variant.height <= pallet.height + eps,
        )
        .map((variant) => {
          const maxStackHeight = Math.max(
            1,
            Math.floor(pallet.height / Math.max(eps, variant.height)),
          );
          const requiredFootprints = Math.ceil(quantity / maxStackHeight);
          const footprintArea = variant.width * variant.depth;
          const stackWaste = requiredFootprints * maxStackHeight - quantity;

          return {
            ...variant,
            maxStackHeight,
            requiredFootprints,
            footprintArea,
            stackWaste,
          };
        })
        .sort(
          (a, b) =>
            a.requiredFootprints - b.requiredFootprints ||
            b.maxStackHeight - a.maxStackHeight ||
            a.stackWaste - b.stackWaste ||
            b.footprintArea - a.footprintArea,
        );

      if (orientations.length === 0) return null;

      const best = orientations[0];

      return {
        template,
        quantity,
        footprintWidth: best.width,
        footprintDepth: best.depth,
        footprintHeight: best.height,
        rotationX: best.rotationX,
        rotationY: best.rotationY,
        footprintArea: best.footprintArea,
        maxStackHeight: best.maxStackHeight,
        requiredFootprints: best.requiredFootprints,
        remaining: quantity,
      } satisfies FoundationPlanEntry;
    })
    .filter((entry): entry is FoundationPlanEntry => Boolean(entry));
}

function isPerimeterScannableFootprint(pallet: PalletConfig, box: PlacedBox) {
  const eps = 1e-6;
  return (
    box.x <= eps ||
    box.y <= eps ||
    box.x + box.width >= pallet.width - eps ||
    box.y + box.depth >= pallet.depth - eps
  );
}

function isStrictlyScannableFirstLayer(
  pallet: PalletConfig,
  placedBoxes: PlacedBox[],
) {
  const floorBoxes = placedBoxes.filter((item) => Math.abs(item.z) < 1e-6);
  if (floorBoxes.length === 0) return true;

  return floorBoxes.every(
    (box) =>
      isPerimeterScannableFootprint(pallet, box) &&
      hasExternalVisibleSide(pallet, box, floorBoxes),
  );
}

function countConnectedFloorComponents(floorBoxes: PlacedBox[]) {
  if (floorBoxes.length === 0) return 0;

  const visited = new Set<string>();
  let components = 0;

  const isAdjacent = (a: PlacedBox, b: PlacedBox) => {
    const eps = 1e-6;
    const touchX =
      Math.abs(a.x + a.width - b.x) < eps ||
      Math.abs(b.x + b.width - a.x) < eps;
    const overlapY = overlaps(a.y, a.y + a.depth, b.y, b.y + b.depth);
    const touchY =
      Math.abs(a.y + a.depth - b.y) < eps ||
      Math.abs(b.y + b.depth - a.y) < eps;
    const overlapX = overlaps(a.x, a.x + a.width, b.x, b.x + b.width);
    return (touchX && overlapY) || (touchY && overlapX);
  };

  for (const box of floorBoxes) {
    if (visited.has(box.id)) continue;
    components += 1;

    const queue = [box];
    visited.add(box.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const other of floorBoxes) {
        if (visited.has(other.id)) continue;
        if (!isAdjacent(current, other)) continue;
        visited.add(other.id);
        queue.push(other);
      }
    }
  }

  return components;
}

function getFoundationLayoutScore(
  pallet: PalletConfig,
  floorBoxes: PlacedBox[],
  planByType: Record<string, FoundationPlanEntry>,
) {
  if (floorBoxes.length === 0) return 0;

  const usedArea = floorBoxes.reduce(
    (sum, box) => sum + box.width * box.depth,
    0,
  );
  const palletArea = Math.max(1e-6, pallet.width * pallet.depth);
  const utilization = usedArea / palletArea;

  const minX = Math.min(...floorBoxes.map((item) => item.x));
  const maxX = Math.max(...floorBoxes.map((item) => item.x + item.width));
  const minY = Math.min(...floorBoxes.map((item) => item.y));
  const maxY = Math.max(...floorBoxes.map((item) => item.y + item.depth));
  const boundingArea = Math.max(1e-6, (maxX - minX) * (maxY - minY));
  const compactness = usedArea / boundingArea;

  const edgeContacts = floorBoxes.reduce((sum, box) => {
    const eps = 1e-6;
    return (
      sum +
      Number(box.x <= eps) +
      Number(box.y <= eps) +
      Number(box.x + box.width >= pallet.width - eps) +
      Number(box.y + box.depth >= pallet.depth - eps)
    );
  }, 0);

  let sameTypeAdjacency = 0;
  for (let i = 0; i < floorBoxes.length; i++) {
    for (let j = i + 1; j < floorBoxes.length; j++) {
      const a = floorBoxes[i];
      const b = floorBoxes[j];
      if (a.boxId !== b.boxId) continue;

      const eps = 1e-6;
      const sharedVerticalEdge =
        (Math.abs(a.x + a.width - b.x) < eps ||
          Math.abs(b.x + b.width - a.x) < eps) &&
        overlaps(a.y, a.y + a.depth, b.y, b.y + b.depth);
      const sharedHorizontalEdge =
        (Math.abs(a.y + a.depth - b.y) < eps ||
          Math.abs(b.y + b.depth - a.y) < eps) &&
        overlaps(a.x, a.x + a.width, b.x, b.x + b.width);
      if (sharedVerticalEdge || sharedHorizontalEdge) {
        sameTypeAdjacency += 1;
      }
    }
  }

  const stackPotential = floorBoxes.reduce((sum, box) => {
    const entry = planByType[box.boxId];
    if (!entry) return sum;
    return sum + Math.max(0, entry.maxStackHeight - 1);
  }, 0);

  const components = countConnectedFloorComponents(floorBoxes);
  const fragmentationPenalty = Math.max(0, components - 1);

  return (
    utilization * 250000 +
    compactness * 180000 +
    edgeContacts * 2200 +
    sameTypeAdjacency * 5000 +
    stackPotential * 2800 -
    fragmentationPenalty * 22000
  );
}

function getBoundaryCandidatePositions(
  pallet: PalletConfig,
  floorBoxes: PlacedBox[],
  width: number,
  depth: number,
) {
  const tolerance = Math.max(0, pallet.edgeOverflowTolerance ?? 0);
  const bounds = getEffectivePalletBounds(pallet, true);
  const minX = -tolerance;
  const minY = -tolerance;
  const maxX = bounds.width - width;
  const maxY = bounds.depth - depth;
  if (maxX < -1e-6 || maxY < -1e-6)
    return [] as Array<{ x: number; y: number }>;

  const step = 2;
  const xSet = new Set<number>();
  const ySet = new Set<number>();
  xSet.add(minX);
  ySet.add(minY);

  for (let value = minX; value <= maxX + 1e-6; value += step) {
    xSet.add(value);
  }
  for (let value = minY; value <= maxY + 1e-6; value += step) {
    ySet.add(value);
  }

  for (const box of floorBoxes) {
    xSet.add(box.x);
    xSet.add(box.x + box.width);
    ySet.add(box.y);
    ySet.add(box.y + box.depth);
  }

  const xPositions = Array.from(xSet)
    .filter((value) => value >= minX - 1e-6 && value <= maxX + 1e-6)
    .sort((a, b) => a - b);
  const yPositions = Array.from(ySet)
    .filter((value) => value >= minY - 1e-6 && value <= maxY + 1e-6)
    .sort((a, b) => a - b);
  const positions: Array<{ x: number; y: number }> = [];
  const seen = new Set<string>();
  const eps = 1e-6;

  for (const x of xPositions) {
    for (const y of yPositions) {
      const touchesPerimeter =
        x <= eps ||
        x + width >= pallet.width - eps ||
        y <= eps ||
        y + depth >= pallet.depth - eps;
      if (!touchesPerimeter) continue;
      const key = `${x.toFixed(4)}-${y.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      positions.push({ x, y });
    }
  }

  return positions;
}

function createFoundationCandidate(
  entry: FoundationPlanEntry,
  x: number,
  y: number,
) {
  return {
    id: createId(),
    boxId: entry.template.id,
    name: entry.template.name,
    originalWidth: Number(entry.template.width),
    originalDepth: Number(entry.template.depth),
    originalHeight: Number(entry.template.height),
    width: entry.footprintWidth,
    depth: entry.footprintDepth,
    height: entry.footprintHeight,
    weight: Number(entry.template.weight),
    color: entry.template.color,
    x: snapCoord(x),
    y: snapCoord(y),
    z: 0,
    rotationX: entry.rotationX,
    rotationY: entry.rotationY,
    layer: 0,
  } satisfies PlacedBox;
}

function cloneRemainingByType(remainingByType: Record<string, number>) {
  return Object.fromEntries(Object.entries(remainingByType));
}

function buildStackFootprintLayer(
  pallet: PalletConfig,
  plan: FoundationPlanEntry[],
): PlacedBox[] {
  const planByType = Object.fromEntries(
    plan.map((entry) => [entry.template.id, entry]),
  ) as Record<string, FoundationPlanEntry>;

  const initialRemainingByType = Object.fromEntries(
    plan.map((entry) => [entry.template.id, entry.requiredFootprints]),
  ) as Record<string, number>;

  const totalRequired = Object.values(initialRemainingByType).reduce(
    (sum, count) => sum + count,
    0,
  );

  let states: LayerState[] = [
    {
      placed: [],
      score: 0,
      placedCount: 0,
      remainingByType: initialRemainingByType,
    },
  ];

  const deadline = Date.now() + SCANNABLE_TIME_BUDGET_MS;

  for (let depth = 0; depth < totalRequired; depth++) {
    if (Date.now() > deadline) break;

    const nextStates: LayerState[] = [];

    for (const state of states) {
      const candidateTypes = Object.entries(state.remainingByType)
        .filter(([, remaining]) => remaining > 0)
        .sort((a, b) => {
          const entryA = planByType[a[0]];
          const entryB = planByType[b[0]];
          const pressureA = a[1] * entryA.footprintArea;
          const pressureB = b[1] * entryB.footprintArea;
          return pressureB - pressureA;
        })
        .slice(0, LAYER_TYPE_BRANCHING)
        .map(([typeId]) => typeId);

      for (const typeId of candidateTypes) {
        const entry = planByType[typeId];
        const positions = getBoundaryCandidatePositions(
          pallet,
          state.placed,
          entry.footprintWidth,
          entry.footprintDepth,
        );

        const candidateStates: LayerState[] = [];
        for (const { x, y } of positions) {
          const candidate = createFoundationCandidate(entry, x, y);
          if (!fitsInside(pallet, candidate, candidate, true)) continue;
          if (state.placed.some((placed) => collide(candidate, placed)))
            continue;

          const floor = [...state.placed, candidate];
          if (!isStrictlyScannableFirstLayer(pallet, floor)) continue;

          const remainingByType = cloneRemainingByType(state.remainingByType);
          remainingByType[typeId] -= 1;

          candidateStates.push({
            placed: floor,
            placedCount: state.placedCount + 1,
            remainingByType,
            score: getFoundationLayoutScore(pallet, floor, planByType),
          });
        }

        candidateStates.sort(
          (a, b) =>
            b.score - a.score ||
            b.placedCount - a.placedCount ||
            a.placed.length - b.placed.length,
        );
        nextStates.push(...candidateStates.slice(0, LAYER_STATE_EXPANSIONS));
      }
    }

    if (nextStates.length === 0) break;

    nextStates.sort(
      (a, b) =>
        b.placedCount - a.placedCount ||
        b.score - a.score ||
        a.placed.length - b.placed.length,
    );
    states = nextStates.slice(0, LAYER_BEAM_WIDTH);
  }

  const best = [...states].sort(
    (a, b) =>
      b.placedCount - a.placedCount ||
      b.score - a.score ||
      a.placed.length - b.placed.length,
  )[0];

  return best?.placed ?? [];
}

function findVerticalPlacement(
  item: PlacementItem,
  placed: PlacedBox[],
  pallet: PalletConfig,
  baseBox: PlacedBox,
  minSupportFraction: number,
  allowOverflow: boolean,
) {
  const targetX = snapCoord(baseBox.x);
  const targetY = snapCoord(baseBox.y);
  const targetZ = snapCoord(baseBox.z + baseBox.height);

  const candidate = normalizePlacementGeometry({
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

    x: targetX,
    y: targetY,
    z: targetZ,

    rotationX: baseBox.rotationX,
    rotationY: baseBox.rotationY,
  });

  if (!fitsInside(pallet, candidate, candidate, allowOverflow)) return null;
  if (placed.some((placedItem) => collide(candidate, placedItem))) return null;

  const supportFraction = computeSupportFraction(candidate, placed, pallet);
  if (supportFraction < minSupportFraction) return null;

  candidate.x = targetX;
  candidate.y = targetY;
  candidate.z = targetZ;

  return {
    candidate,
    score: 0,
    coords: { x: candidate.x, y: candidate.y, z: candidate.z },
  };
}

function fillTopSurfacesMiniLayer(
  placed: PlacedBox[],
  inventory: FoundationPlanEntry[],
  pallet: PalletConfig,
  minSupportFraction: number,
  baseFilter?: (box: PlacedBox) => boolean,
) {
  const sourceBoxes = baseFilter ? placed.filter(baseFilter) : [...placed];
  const topSurfaces = sourceBoxes
    .map((box) => ({
      id: box.id,
      x: box.x,
      y: box.y,
      z: box.z + box.height,
      width: box.width,
      depth: box.depth,
      area: box.width * box.depth,
    }))
    .sort((a, b) => b.area - a.area || a.z - b.z);

  const newFootprintsByType = new Map<string, PlacedBox[]>();

  for (const surface of topSurfaces) {
    if (surface.area <= GEOMETRY_EPS) continue;
    if (surface.z >= pallet.height - GEOMETRY_EPS) continue;

    const surfacePlaced: PlacedBox[] = [];

    while (true) {
      let best: {
        entry: FoundationPlanEntry;
        candidate: PlacedBox;
        score: number;
      } | null = null;

      for (const entry of inventory) {
        if (entry.remaining <= 0) continue;

        const item = createTemplateDimensionItem(entry.template);

        const variants = getOrientationVariants(item);
        for (const variant of variants) {
          if (variant.height + surface.z > pallet.height + GEOMETRY_EPS) {
            continue;
          }
          if (
            variant.width > surface.width + GEOMETRY_EPS ||
            variant.depth > surface.depth + GEOMETRY_EPS
          ) {
            continue;
          }

          const xAnchors = new Set<number>([surface.x]);
          const yAnchors = new Set<number>([surface.y]);

          for (const box of surfacePlaced) {
            xAnchors.add(box.x);
            xAnchors.add(box.x + box.width);
            yAnchors.add(box.y);
            yAnchors.add(box.y + box.depth);
          }

          const xs = Array.from(xAnchors)
            .filter(
              (x) =>
                x >= surface.x - GEOMETRY_EPS &&
                x + variant.width <= surface.x + surface.width + GEOMETRY_EPS,
            )
            .sort((a, b) => a - b);
          const ys = Array.from(yAnchors)
            .filter(
              (y) =>
                y >= surface.y - GEOMETRY_EPS &&
                y + variant.depth <= surface.y + surface.depth + GEOMETRY_EPS,
            )
            .sort((a, b) => a - b);

          for (const x of xs) {
            for (const y of ys) {
              const candidate = normalizePlacementGeometry({
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
                z: surface.z,
                rotationX: variant.rotationX,
                rotationY: variant.rotationY,
                layer: surface.z,
              });

              if (!fitsInside(pallet, candidate, candidate, true)) continue;

              const insideSurface =
                candidate.x >= surface.x - GEOMETRY_EPS &&
                candidate.y >= surface.y - GEOMETRY_EPS &&
                candidate.x + candidate.width <=
                  surface.x + surface.width + GEOMETRY_EPS &&
                candidate.y + candidate.depth <=
                  surface.y + surface.depth + GEOMETRY_EPS;
              if (!insideSurface) continue;

              if (placed.some((other) => collide(candidate, other))) continue;
              if (surfacePlaced.some((other) => collide(candidate, other))) {
                continue;
              }

              const supportFraction = computeSupportFraction(
                candidate,
                placed,
                pallet,
              );
              if (supportFraction < minSupportFraction) continue;

              const rightGap =
                surface.x + surface.width - (candidate.x + candidate.width);
              const bottomGap =
                surface.y + surface.depth - (candidate.y + candidate.depth);
              const rowPotential = Math.floor(
                (surface.x + surface.width - candidate.x + GEOMETRY_EPS) /
                  candidate.width,
              );
              const colPotential = Math.floor(
                (surface.y + surface.depth - candidate.y + GEOMETRY_EPS) /
                  candidate.depth,
              );

              const fillRatio =
                (candidate.width * candidate.depth) /
                Math.max(GEOMETRY_EPS, surface.area);
              const centerPenalty =
                Math.abs(candidate.x - surface.x) +
                Math.abs(candidate.y - surface.y);
              const score =
                fillRatio * 100000 +
                candidate.width * candidate.depth * 1000 -
                centerPenalty * 2 +
                rowPotential * 250 +
                colPotential * 250 -
                (rightGap + bottomGap) * 30;

              if (!best || score > best.score) {
                best = { entry, candidate, score };
              }
            }
          }
        }
      }

      if (!best) break;

      placed.push(best.candidate);
      surfacePlaced.push(best.candidate);
      best.entry.remaining -= 1;

      const existing = newFootprintsByType.get(best.entry.template.id) ?? [];
      existing.push(best.candidate);
      newFootprintsByType.set(best.entry.template.id, existing);
    }
  }

  // After horizontal surface packing, stack vertically on each created footprint.
  for (const [typeId, footprints] of newFootprintsByType.entries()) {
    const entry = inventory.find((item) => item.template.id === typeId);
    if (!entry || entry.remaining <= 0) continue;

    const item = createTemplateDimensionItem(entry.template);
    for (const base of footprints) {
      let current = base;

      while (entry.remaining > 0) {
        const stackPlacement = findVerticalPlacement(
          item,
          placed,
          pallet,
          current,
          minSupportFraction,
          true,
        );
        if (!stackPlacement) break;

        placed.push(stackPlacement.candidate);
        entry.remaining -= 1;
        current = stackPlacement.candidate;
      }
    }
  }
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

function sanitizeLayeredPlacements(
  placed: PlacedBox[],
  pallet: PalletConfig,
  minSupportFraction: number,
) {
  const sorted = [...placed]
    .map((box) => normalizePlacementGeometry(box))
    .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);

  const accepted: PlacedBox[] = [];
  for (const candidate of sorted) {
    if (!fitsInside(pallet, candidate, candidate, true)) continue;
    if (accepted.some((other) => hasStrictIntersection(candidate, other))) {
      continue;
    }

    if (candidate.z <= GEOMETRY_EPS) {
      const floorWithCandidate = [...accepted, candidate].filter(
        (box) => Math.abs(box.z) < GEOMETRY_EPS,
      );
      if (!isStrictlyScannableFirstLayer(pallet, floorWithCandidate)) continue;
      accepted.push(candidate);
      continue;
    }

    const supportFraction = computeSupportFraction(candidate, accepted, pallet);
    if (supportFraction < minSupportFraction) continue;

    const hasSupportContact = accepted.some((other) => {
      if (Math.abs(other.z + other.height - candidate.z) > GEOMETRY_EPS) {
        return false;
      }

      const overlapX =
        Math.min(other.x + other.width, candidate.x + candidate.width) -
        Math.max(other.x, candidate.x);
      const overlapY =
        Math.min(other.y + other.depth, candidate.y + candidate.depth) -
        Math.max(other.y, candidate.y);
      return overlapX > GEOMETRY_EPS && overlapY > GEOMETRY_EPS;
    });
    if (!hasSupportContact) continue;

    accepted.push(candidate);
  }

  return accepted;
}

function enforceNoOverlap(boxes: PlacedBox[]) {
  const sorted = [...boxes].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const accepted: PlacedBox[] = [];
  for (const box of sorted) {
    if (accepted.some((other) => hasStrictIntersection(box, other))) continue;
    accepted.push(box);
  }
  return accepted;
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

export function buildGreedyPackingPlan(
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
