import { BoxTemplate, PalletConfig, PlacedBox } from "./types";
import { buildGreedyPackingPlan } from "./packing.greedy";
import { buildLayeredPackingPlan } from "./packing.layered";

type PackingAlgorithm = "greedy" | "layered";

type PackingOptions = {
  scannableOptimization?: boolean;
  algorithm?: PackingAlgorithm;
  requireAccessibility?: boolean;
};

export function getVolume(width: number, depth: number, height: number) {
  return width * depth * height;
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
