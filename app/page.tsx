"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxManager } from "@/components/BoxManager";
import { BoxPresetsManager } from "@/components/BoxPresetsManager";
import { OptimizerSidebar } from "@/components/OptimizerSidebar";
import { PalletConfigPanel, euroPallet } from "@/components/PalletConfigPanel";
import { PalletScene } from "@/components/PalletScene";
import { TopDownView } from "@/components/TopDownView";
import { TopNavigation } from "@/components/TopNavigation";
import { AboutUsPage } from "@/components/AboutUsPage";
import { buildPackingPlan, summarizePacking } from "@/lib/packing";
import {
  buildLevelOptions,
  buildPackingWarnings,
  defaultBoxes,
  getVisibilityCounts,
  HomeSection,
  PlacedPlanBox,
} from "@/lib/homePage";
import {
  BOX_PRESETS_STORAGE_KEY,
  defaultBoxPresets,
  parseStoredBoxPresets,
} from "@/lib/presetStorage";
import { BoxPreset, BoxTemplate, PalletConfig } from "@/lib/types";
import { PRESETS_UPDATED_EVENT, SECTION_SELECTED_EVENT } from "@/lib/ui";

export default function HomePage() {
  const [pallet, setPallet] = useState<PalletConfig>(euroPallet);
  const [boxes, setBoxes] = useState<BoxTemplate[]>(defaultBoxes);
  const [presets, setPresets] = useState<BoxPreset[]>(defaultBoxPresets);
  const [activeSection, setActiveSection] = useState<HomeSection>("optimizer");
  const [placedBoxes, setPlacedBoxes] = useState<PlacedPlanBox[]>([]);
  const [activeLayer, setActiveLayer] = useState<number | "all">(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showScannableOnly, setShowScannableOnly] = useState(false);
  const [useScannableOptimization, setUseScannableOptimization] =
    useState(true);
  const [showBoxOutlines, setShowBoxOutlines] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(BOX_PRESETS_STORAGE_KEY);
    setPresets(parseStoredBoxPresets(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(BOX_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as BoxPreset[];
      setPresets(detail);
    };
    window.addEventListener(PRESETS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const section = (event as CustomEvent<string>).detail as HomeSection;
      setActiveSection(section);
    };

    window.addEventListener(SECTION_SELECTED_EVENT, handleNavigation);
    return () =>
      window.removeEventListener(SECTION_SELECTED_EVENT, handleNavigation);
  }, []);

  const levelOptions = useMemo(
    () => buildLevelOptions(placedBoxes),
    [placedBoxes],
  );

  useEffect(() => {
    if (!levelOptions.some((item) => item.value === activeLayer)) {
      setActiveLayer(levelOptions[0]?.value ?? 0);
    }
  }, [levelOptions, activeLayer]);

  const optimize = () => {
    if (isOptimizing) return;

    setIsOptimizing(true);

    window.setTimeout(() => {
      try {
        const plan = buildPackingPlan(pallet, boxes, {
          scannableOptimization: useScannableOptimization,
        });
        setPlacedBoxes(plan);
        setActiveLayer("all");
        setShowScannableOnly(false);
      } catch (error) {
        console.error("Optimization failed", error);
      } finally {
        setIsOptimizing(false);
      }
    }, 0);
  };

  const resetLayout = () => {
    setPlacedBoxes([]);
    setActiveLayer(0);
    setHovered(null);
    setShowScannableOnly(false);
  };

  const totalBoxes = boxes.reduce(
    (sum, item) => sum + Math.max(0, item.quantity),
    0,
  );

  const visibilityCounts = useMemo(
    () => getVisibilityCounts(placedBoxes),
    [placedBoxes],
  );

  const metrics = useMemo(
    () => summarizePacking(pallet, placedBoxes),
    [pallet, placedBoxes],
  );
  const warnings = useMemo(
    () =>
      buildPackingWarnings(pallet, placedBoxes, totalBoxes, visibilityCounts, {
        totalWeight: metrics.totalWeight,
        maxHeight: metrics.maxHeight,
      }),
    [
      metrics.maxHeight,
      metrics.totalWeight,
      pallet,
      placedBoxes,
      totalBoxes,
      visibilityCounts,
    ],
  );

  const hoveredDetails = placedBoxes.find((box) => box.id === hovered);

  const displayedBoxes = showScannableOnly
    ? placedBoxes.filter((box) => box.sideVisible)
    : placedBoxes;

  return (
    <>
      <TopNavigation activeSection={activeSection} />
      <main className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-10">
        {activeSection === "optimizer" ? (
          <div className="mx-auto max-w-[1440px] space-y-5">
            <header className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-6 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.25em] text-brand-300/80">
                    PalletFlow
                  </p>
                  <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
                    3D pallet packing optimizer built for modern logistics.
                  </h1>
                  <p className="max-w-2xl text-slate-400">
                    Define pallets, create box templates, and visualize
                    efficient placements in 3D with real-time metrics.
                  </p>
                </div>
              </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.8fr)_minmax(220px,1fr)] xl:grid-cols-[minmax(260px,320px)_minmax(0,1.8fr)_minmax(220px,320px)]">
              <div className="space-y-5">
                <PalletConfigPanel config={pallet} onChange={setPallet} />
                <BoxManager
                  boxes={boxes}
                  onChange={setBoxes}
                  presets={presets}
                />
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft">
                  <div className="min-h-[320px] h-[min(55vh,520px)]">
                    <PalletScene
                      pallet={pallet}
                      boxes={displayedBoxes}
                      activeLayer={activeLayer}
                      showOnlyScannable={showScannableOnly}
                      showBoxOutlines={showBoxOutlines}
                      highlightedBoxId={hovered}
                      onHoverBox={setHovered}
                    />
                  </div>
                </div>

                <TopDownView
                  pallet={pallet}
                  boxes={displayedBoxes}
                  activeLayer={activeLayer}
                  onHoverBox={setHovered}
                  hoveredId={hovered}
                />

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-300 shadow-soft">
                  <p className="text-sm font-semibold text-slate-100">
                    Box details
                  </p>
                  <div className="mt-4 min-h-[172px]">
                    {hoveredDetails ? (
                      <div className="space-y-3">
                        <p className="text-base font-semibold text-white">
                          {hoveredDetails.name}
                        </p>
                        <p>
                          Size: {hoveredDetails.width}×{hoveredDetails.depth}×
                          {hoveredDetails.height} cm
                        </p>
                        <p>Weight: {hoveredDetails.weight} kg</p>
                        <p>
                          Position: {hoveredDetails.x}, {hoveredDetails.y},{" "}
                          {hoveredDetails.z}
                        </p>
                        <p>X rotation: {hoveredDetails.rotationX}°</p>
                        <p>Y rotation: {hoveredDetails.rotationY}°</p>
                      </div>
                    ) : (
                      <div className="flex h-full items-center">
                        <p className="text-slate-500">
                          Hover a box to see details.
                        </p>
                      </div>
                    )}
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
                scannableOnly={showScannableOnly}
                scannableCounts={visibilityCounts}
                useScannableOptimization={useScannableOptimization}
                showBoxOutlines={showBoxOutlines}
                isOptimizing={isOptimizing}
                onToggleScannableOnly={() =>
                  setShowScannableOnly((current) => !current)
                }
                onToggleScannableOptimization={() =>
                  setUseScannableOptimization((current) => !current)
                }
                onToggleBoxOutlines={() =>
                  setShowBoxOutlines((current) => !current)
                }
                onSelectLayer={setActiveLayer}
                onOptimize={optimize}
                onReset={resetLayout}
              />
            </div>
          </div>
        ) : activeSection === "presets" ? (
          <BoxPresetsManager presets={presets} />
        ) : activeSection === "about us" ? (
          <AboutUsPage />
        ) : null}
        {isOptimizing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="flex min-w-[240px] flex-col items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-900/95 px-8 py-8 shadow-2xl shadow-slate-950/50">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
              <p className="text-lg font-semibold text-white">Optimizing...</p>
              <p className="mt-2 text-sm text-slate-400">
                Processing your pallet layout
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
