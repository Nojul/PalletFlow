import { useEffect, useState } from "react";
import { PalletConfig } from "@/lib/types";
import {
  ArrowRight,
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  Square,
} from "lucide-react";

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
  {
    label: "Post Canada pallet",
    config: {
      width: 121.9,
      depth: 101.6,
      height: 150,
      maxWeight: 1600,
      unit: "cm",
    },
  },
];

export function PalletConfigPanel({ config, onChange }: Props) {
  const normalizeNumberInput = (value: string) => {
    if (value === "") return "";
    if (value === "0") return "0";
    if (value.startsWith("0") && !value.startsWith("0.")) {
      const stripped = value.replace(/^0+/, "");
      return stripped === "" ? "0" : stripped;
    }
    return value;
  };

  const [local, setLocal] = useState<Record<string, string>>({
    width: String(config.width ?? ""),
    depth: String(config.depth ?? ""),
    height: String(config.height ?? ""),
    maxWeight: String(config.maxWeight ?? ""),
  });

  useEffect(() => {
    setLocal({
      width: String(config.width ?? ""),
      depth: String(config.depth ?? ""),
      height: String(config.height ?? ""),
      maxWeight: String(config.maxWeight ?? ""),
    });
  }, [config.width, config.depth, config.height, config.maxWeight]);

  const update = (field: keyof PalletConfig, value: number) => {
    onChange({ ...config, [field]: value });
  };

  const [expanded, setExpanded] = useState(true);

  return (
    <section className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-3 text-left"
        >
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
          {expanded ? (
            <ChevronDown size={18} className="text-slate-300" />
          ) : (
            <ChevronRight size={18} className="text-slate-300" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Width", field: "width" },
              { label: "Depth", field: "depth" },
              { label: "Height", field: "height" },
              { label: "Max weight", field: "maxWeight" },
            ].map((item) => {
              const unit = item.field === "maxWeight" ? "kg" : "cm";
              return (
                <label
                  key={item.field}
                  className="block text-sm text-slate-300"
                >
                  <span className="mb-2 block text-slate-400">
                    {item.label}
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      value={local[item.field as string]}
                      min={0}
                      onChange={(event) => {
                        const val = normalizeNumberInput(event.target.value);
                        setLocal((cur) => ({ ...cur, [item.field]: val }));
                      }}
                      onBlur={() => {
                        const raw = local[item.field as string];
                        const parsed = raw === "" ? 0 : Number(raw);
                        update(item.field as keyof PalletConfig, parsed);
                      }}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 pr-12 text-white outline-none transition focus:border-brand-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      {unit}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-400">Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.config)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-brand-400"
                >
                  <ArrowRight size={16} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Unit</span>
              <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-slate-200">
                <CircleDollarSign size={16} className="mr-2" />
                {config.unit}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
