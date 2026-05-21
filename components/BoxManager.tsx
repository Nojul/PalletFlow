"use client";

import { BoxTemplate } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  boxes: BoxTemplate[];
  onChange: (boxes: BoxTemplate[]) => void;
};

const defaultBox = (): BoxTemplate => ({
  id: `box-${Math.random().toString(36).slice(2, 8)}`,
  name: "Standard box",
  width: 40,
  depth: 30,
  height: 25,
  weight: 18,
  quantity: 2,
  color: "#60a5fa",
  irregularSegments: [],
});

export function BoxManager({ boxes, onChange }: Props) {
  const updateBox = (
    id: string,
    field: keyof BoxTemplate,
    value: string | number,
  ) => {
    const numericFields: Array<keyof BoxTemplate> = [
      "width",
      "depth",
      "height",
      "weight",
      "quantity",
    ];

    onChange(
      boxes.map((box) =>
        box.id === id
          ? {
              ...box,
              [field]: numericFields.includes(field) ? Number(value) : value,
            }
          : box,
      ),
    );
  };

  const removeBox = (id: string) =>
    onChange(boxes.filter((box) => box.id !== id));

  return (
    <section className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Box templates
          </h2>
          <p className="text-xs text-slate-400">
            Create reusable box types and quantities for packing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...boxes, defaultBox()])}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold leading-none text-white transition hover:bg-brand-600"
        >
          <Plus size={16} /> Add box type
        </button>
      </div>

      <div className="space-y-4">
        {boxes.map((box) => (
          <div
            key={box.id}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {box.name}
                </p>
                <p className="text-xs text-slate-500">
                  Volume: {box.width}×{box.depth}×{box.height}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeBox(box.id)}
                className="rounded-2xl border border-slate-700 px-3 py-2 text-slate-300 transition hover:border-red-500 hover:text-red-300"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { label: "Name", field: "name", type: "text" },
                { label: "Width", field: "width", type: "number" },
                { label: "Depth", field: "depth", type: "number" },
                { label: "Height", field: "height", type: "number" },
                { label: "Weight", field: "weight", type: "number" },
                { label: "Quantity", field: "quantity", type: "number" },
              ].map((input) => (
                <label
                  key={`${box.id}-${input.field}`}
                  className="block text-sm text-slate-300"
                >
                  <span className="mb-2 block text-slate-400">
                    {input.label}
                  </span>
                  <input
                    type={input.type}
                    value={
                      box[input.field as keyof BoxTemplate] as string | number
                    }
                    onChange={(event) =>
                      updateBox(
                        box.id,
                        input.field as keyof BoxTemplate,
                        event.target.value,
                      )
                    }
                    min={input.type === "number" ? 0 : undefined}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white outline-none transition focus:border-brand-400"
                  />
                </label>
              ))}
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm text-slate-400">Color</p>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {["#38bdf8", "#a855f7", "#34d399", "#f97316", "#facc15"].map(
                    (swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => updateBox(box.id, "color", swatch)}
                        className="h-9 w-9 rounded-full border-2 transition focus:outline-none"
                        style={{
                          backgroundColor: swatch,
                          borderColor:
                            box.color === swatch ? "#ffffff" : "transparent",
                        }}
                      />
                    ),
                  )}
                </div>
                <input
                  type="color"
                  value={box.color}
                  onChange={(event) =>
                    updateBox(box.id, "color", event.target.value)
                  }
                  className="h-12 w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/90 p-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
