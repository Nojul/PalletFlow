import { buildPackingPlan } from "@/lib/packing";
import { defaultBoxPresets } from "@/lib/presetStorage";
import { BoxTemplate, PalletConfig } from "@/lib/types";

export type HomeSection = "optimizer" | "presets" | "about us";

export type LevelOption = {
  value: number | "all";
  label: string;
  subtitle: string;
};

export type PlacedPlanBox = ReturnType<typeof buildPackingPlan>[number];

export type VisibilityCounts = {
  visible: number;
  topOnly: number;
  hidden: number;
};

const defaultPalette = ["#38bdf8", "#a855f7", "#34d399", "#f97316", "#facc15"];

export const defaultBoxes: BoxTemplate[] = defaultBoxPresets
  .slice(0, 3)
  .map((preset, index) => ({
    id: `box-from-preset-${preset.id}`,
    name: preset.name,
    width: preset.width,
    depth: preset.depth,
    height: preset.height,
    weight: preset.weight,
    quantity: index === 0 ? 64 : index === 1 ? 12 : index === 2 ? 8 : 4,
    color: defaultPalette[index % defaultPalette.length],
  }));

export function buildLevelOptions(placedBoxes: PlacedPlanBox[]): LevelOption[] {
  const uniqueLevels = Array.from(
    new Set(placedBoxes.map((item) => item.layer)),
  ).sort((left, right) => left - right);

  return [
    {
      value: "all" as const,
      label: "All levels",
      subtitle: "View the full stack",
    },
    ...uniqueLevels.map((layer, index) => ({
      value: layer,
      label: index === 0 ? "First level" : `Level ${index + 1}`,
      subtitle:
        layer === 0
          ? "Ground floor"
          : `Height: ${placedBoxes.find((box) => box.layer === layer)?.z} cm`,
    })),
  ];
}

export function getVisibilityCounts(
  placedBoxes: PlacedPlanBox[],
): VisibilityCounts {
  return {
    visible: placedBoxes.filter(
      (box) => box.visibilityStatus === "side-visible",
    ).length,
    topOnly: placedBoxes.filter((box) => box.visibilityStatus === "top-only")
      .length,
    hidden: placedBoxes.filter((box) => box.visibilityStatus === "hidden")
      .length,
  };
}

export function buildPackingWarnings(
  pallet: PalletConfig,
  placedBoxes: PlacedPlanBox[],
  totalBoxes: number,
  visibilityCounts: VisibilityCounts,
  metrics: {
    totalWeight: number;
    maxHeight: number;
  },
) {
  const warnings: string[] = [];

  if (metrics.totalWeight > pallet.maxWeight) {
    warnings.push("Total weight exceeds pallet capacity.");
  }

  if (metrics.maxHeight > pallet.height) {
    warnings.push("Height limit overflow detected.");
  }

  if (placedBoxes.length < totalBoxes) {
    warnings.push(
      `${totalBoxes - placedBoxes.length} boxes could not be placed.`,
    );
  }

  if (visibilityCounts.hidden > 0) {
    warnings.push(
      `${visibilityCounts.hidden} boxes are not externally visible.`,
    );
  }

  if (visibilityCounts.topOnly > 0) {
    warnings.push(
      `${visibilityCounts.topOnly} boxes only have top visibility.`,
    );
  }

  return warnings;
}
