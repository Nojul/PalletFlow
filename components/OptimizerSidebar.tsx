import { ArrowRight, AlertTriangle, Layers } from "lucide-react";

type LevelOption = {
  value: number | "all";
  label: string;
  subtitle: string;
};

type Props = {
  totalBoxes: number;
  placedBoxes: number;
  utilization: number;
  heightUsage: number;
  efficiency: number;
  totalWeight: number;
  maxWeight: number;
  warnings: string[];
  activeLayer: number | "all";
  layers: LevelOption[];
  onSelectLayer: (newLayer: number | "all") => void;
  onOptimize: () => void;
  onReset: () => void;
};

export function OptimizerSidebar({
  totalBoxes,
  placedBoxes,
  utilization,
  heightUsage,
  efficiency,
  totalWeight,
  maxWeight,
  warnings,
  activeLayer,
  layers,
  onSelectLayer,
  onOptimize,
  onReset,
}: Props) {
  const activeLabel =
    activeLayer === "all"
      ? "All levels"
      : (layers.find((item) => item.value === activeLayer)?.label ??
        "Layer view");
  return (
    <section className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Insights</p>
          <p className="text-xs text-slate-400">
            Packing metrics and warnings in one view.
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-3xl bg-slate-900/80 p-3 text-sm text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span>Total boxes</span>
          <span>
            {placedBoxes}/{totalBoxes}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Utilization</span>
          <span>{utilization.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Height usage</span>
          <span>{heightUsage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Efficiency score</span>
          <span>{efficiency.toFixed(0)}</span>
        </div>
        <div className="rounded-3xl bg-slate-950/90 p-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers size={16} />
            <span>Levels</span>
          </div>
          <div className="mt-2 grid gap-2">
            {layers.map((item) => (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => onSelectLayer(item.value)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  item.value === activeLayer
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-[11px] text-slate-500">
                  {item.subtitle}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Current view: {activeLabel}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-slate-900/80 p-3">
        <button
          type="button"
          onClick={onOptimize}
          className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <ArrowRight size={18} /> Optimize packing
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-400"
        >
          Reset layout
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="mb-3 flex items-center gap-2 text-rose-100">
            <AlertTriangle size={18} /> Warnings
          </div>
          <ul className="space-y-2 text-slate-200">
            {warnings.map((warning) => (
              <li key={warning} className="text-xs">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
