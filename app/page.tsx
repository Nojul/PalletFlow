"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxManager } from "@/components/BoxManager";
import { OptimizerSidebar } from "@/components/OptimizerSidebar";
import { PalletConfigPanel } from "@/components/PalletConfigPanel";
import { PalletScene } from "@/components/PalletScene";
import { TopDownView } from "@/components/TopDownView";
import { buildPackingPlan, summarizePacking } from "@/lib/packing";
import { BoxTemplate, PalletConfig } from "@/lib/types";

const defaultPallet: PalletConfig = {
  width: 120,
  depth: 80,
  height: 150,
  maxWeight: 1500,
  unit: "cm",
};

const defaultBoxes: BoxTemplate[] = [
  {
    id: "box-a",
    name: "Standard crate",
    width: 50,
    depth: 40,
    height: 30,
    weight: 25,
    quantity: 3,
    color: "#38bdf8",
  },
  {
    id: "box-b",
    name: "Compact carton",
    width: 40,
    depth: 30,
    height: 25,
    weight: 18,
    quantity: 4,
    color: "#a855f7",
  },
];

export default function HomePage() {
  const [pallet, setPallet] = useState<PalletConfig>(defaultPallet);
  const [boxes, setBoxes] = useState<BoxTemplate[]>(defaultBoxes);
  const [placedBoxes, setPlacedBoxes] = useState(
    [] as Array<ReturnType<typeof buildPackingPlan>[number]>,
  );
  const [activeLayer, setActiveLayer] = useState<number | "all">(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const levelOptions = useMemo(() => {
    const uniqueLevels = Array.from(
      new Set(placedBoxes.map((item) => item.layer)),
    ).sort((a, b) => a - b);

    const levelItems = uniqueLevels.map((layer, index) => ({
      value: layer,
      label: index === 0 ? "First level" : `Level ${index + 1}`,
      subtitle:
        layer === 0 ? "Ground floor" : `${Math.round(layer)} cm above base`,
    }));

    return [
      {
        value: "all" as const,
        label: "All levels",
        subtitle: "View the full stack",
      },
      ...levelItems,
    ];
  }, [placedBoxes]);

  useEffect(() => {
    if (!levelOptions.some((item) => item.value === activeLayer)) {
      setActiveLayer(levelOptions[0]?.value ?? 0);
    }
  }, [levelOptions, activeLayer]);

  const optimize = () => {
    const plan = buildPackingPlan(pallet, boxes);
    setPlacedBoxes(plan);
    setActiveLayer("all");
  };

  const resetLayout = () => {
    setPlacedBoxes([]);
    setActiveLayer(0);
    setHovered(null);
  };

  const totalBoxes = boxes.reduce(
    (sum, item) => sum + Math.max(0, item.quantity),
    0,
  );
  const metrics = useMemo(
    () => summarizePacking(pallet, placedBoxes),
    [pallet, placedBoxes],
  );
  const warnings = useMemo(() => {
    const result: string[] = [];
    if (metrics.totalWeight > pallet.maxWeight) {
      result.push("Total weight exceeds pallet capacity.");
    }
    if (metrics.maxHeight > pallet.height) {
      result.push("Height limit overflow detected.");
    }
    if (placedBoxes.length < totalBoxes) {
      result.push(
        `${totalBoxes - placedBoxes.length} boxes could not be placed.`,
      );
    }
    return result;
  }, [
    metrics,
    pallet.maxWeight,
    pallet.height,
    placedBoxes.length,
    totalBoxes,
  ]);

  const hoveredDetails = placedBoxes.find((box) => box.id === hovered);

  return (
    <main className="min-h-screen px-6 py-6 lg:px-10">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <header className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-8 shadow-soft backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-brand-300/80">
                PalletFlow
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
                3D pallet packing optimizer built for modern logistics.
              </h1>
              <p className="max-w-2xl text-slate-400">
                Define pallets, create box templates, and visualize efficient
                placements in 3D with real-time metrics.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <PalletConfigPanel config={pallet} onChange={setPallet} />
            <BoxManager boxes={boxes} onChange={setBoxes} />
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-5 shadow-soft">
              <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                <div className="h-[640px] min-h-[420px]">
                  <PalletScene
                    pallet={pallet}
                    boxes={placedBoxes}
                    activeLayer={activeLayer}
                    onHoverBox={setHovered}
                  />
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-300">
                    <p className="text-sm font-semibold text-slate-100">
                      Box details
                    </p>
                    {hoveredDetails ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-base font-semibold text-white">
                          {hoveredDetails.name}
                        </p>
                        <p>
                          Size: {hoveredDetails.width}×{hoveredDetails.depth}×
                          {hoveredDetails.height}
                        </p>
                        <p>Weight: {hoveredDetails.weight}kg</p>
                        <p>
                          Position: {hoveredDetails.x}, {hoveredDetails.y},{" "}
                          {hoveredDetails.z}
                        </p>
                        <p>Rotation: {hoveredDetails.rotation}°</p>
                      </div>
                    ) : (
                      <p className="mt-4 text-slate-500">
                        Hover over a box in the 3D view to inspect its
                        placement.
                      </p>
                    )}
                  </div>
                  <TopDownView
                    pallet={pallet}
                    boxes={placedBoxes}
                    activeLayer={activeLayer}
                  />
                </div>
              </div>
            </div>
          </div>

          <OptimizerSidebar
            totalBoxes={totalBoxes}
            placedBoxes={placedBoxes.length}
            utilization={metrics.utilization}
            heightUsage={metrics.heightUsage}
            efficiency={metrics.efficiency}
            totalWeight={metrics.totalWeight}
            maxWeight={pallet.maxWeight}
            warnings={warnings}
            activeLayer={activeLayer}
            layers={levelOptions}
            onSelectLayer={setActiveLayer}
            onOptimize={optimize}
            onReset={resetLayout}
          />
        </div>
      </div>
    </main>
  );
}
