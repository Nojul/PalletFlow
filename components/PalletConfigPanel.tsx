"use client";

import { PalletConfig } from "@/lib/types";
import { ArrowRight, CircleDollarSign, Square } from "lucide-react";

type Props = {
  config: PalletConfig;
  onChange: (config: PalletConfig) => void;
};

const presets: Array<{ label: string; config: PalletConfig }> = [
  {
    label: "EUR pallet",
    config: { width: 120, depth: 80, height: 150, maxWeight: 1500, unit: "cm" },
  },
  {
    label: "US pallet",
    config: {
      width: 122,
      depth: 101,
      height: 150,
      maxWeight: 1800,
      unit: "cm",
    },
  },
];

export function PalletConfigPanel({ config, onChange }: Props) {
  const update = (field: keyof PalletConfig, value: string | number) => {
    onChange({
      ...config,
      [field]: typeof value === "string" ? Number(value) : value,
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-soft backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
          <Square size={20} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Pallet configuration
          </h2>
          <p className="text-xs text-slate-400">
            Define your pallet size, height limit and maximum weight.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Width", field: "width" },
          { label: "Depth", field: "depth" },
          { label: "Height", field: "height" },
          { label: "Max weight", field: "maxWeight" },
        ].map((item) => (
          <label key={item.field} className="block text-sm text-slate-300">
            <span className="mb-2 block text-slate-400">{item.label}</span>
            <input
              type="number"
              value={config[item.field as keyof PalletConfig]}
              min={0}
              onChange={(event) =>
                update(item.field as keyof PalletConfig, event.target.value)
              }
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-3 text-white outline-none transition focus:border-brand-400"
            />
          </label>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-400">Quick presets</p>
        <div className="flex flex-wrap gap-3">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.config)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:border-brand-400"
            >
              <ArrowRight size={16} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Unit</span>
          <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-slate-200">
            <CircleDollarSign size={16} className="mr-2" />
            {config.unit}
          </div>
        </div>
      </div>
    </section>
  );
}
