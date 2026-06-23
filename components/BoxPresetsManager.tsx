"use client";

import { useMemo, useState } from "react";
import { BoxPreset } from "@/lib/types";
import { BOX_PRESETS_STORAGE_KEY } from "@/lib/presetStorage";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

type Props = {
  presets: BoxPreset[];
};

const blankPreset = (): BoxPreset => ({
  id: `preset-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  width: 40,
  depth: 30,
  height: 25,
  weight: 18,
});

const fields = [
  { label: "Name", key: "name", type: "text" },
  { label: "Width", key: "width", type: "number" },
  { label: "Length", key: "depth", type: "number" },
  { label: "Height", key: "height", type: "number" },
  { label: "Weight", key: "weight", type: "number" },
];

export function BoxPresetsManager({ presets }: Props) {
  const [draft, setDraft] = useState<BoxPreset>(blankPreset());
  const [draftStr, setDraftStr] = useState<Record<string, string>>(() => ({
    name: "",
    width: "",
    depth: "",
    height: "",
    weight: "",
  }));

  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);

  const isEditing = editId !== null;

  const normalizeNumberInput = (value: string) => {
    if (value === "") return "";
    if (value === "0") return "0";
    if (value.startsWith("0") && !value.startsWith("0.")) {
      const stripped = value.replace(/^0+/, "");
      return stripped === "" ? "0" : stripped;
    }
    return value;
  };

  const handleChange = (field: keyof BoxPreset, value: string | number) => {
    if (field === "name") {
      setDraft((current) => ({ ...current, [field]: String(value) }));
      setDraftStr((cur) => ({ ...cur, [field]: String(value) }));
    } else {
      const str = normalizeNumberInput(String(value));
      setDraftStr((cur) => ({ ...cur, [field]: str }));
    }
  };

  const resetForm = () => {
    setDraft(blankPreset());
    setDraftStr({
      name: "",
      width: "",
      depth: "",
      height: "",
      weight: "",
    });
    setEditId(null);
  };

  const handleSave = () => {
    const nextPreset = {
      ...draft,
      name: (draftStr.name || draft.name).trim() || "New preset",
      width: Number(draftStr.width || String(draft.width)) || 0,
      depth: Number(draftStr.depth || String(draft.depth)) || 0,
      height: Number(draftStr.height || String(draft.height)) || 0,
      weight: Number(draftStr.weight || String(draft.weight)) || 0,
    } as BoxPreset;

    const updated = isEditing
      ? presets.map((preset) => (preset.id === editId ? nextPreset : preset))
      : [...presets, nextPreset];

    // persist and notify parent via event
    try {
      localStorage.setItem(BOX_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("presets:update", { detail: updated }),
      );
    } catch {
      // ignore storage errors
    }

    resetForm();
    setFormOpen(true);
  };

  const startEdit = (preset: BoxPreset) => {
    setDraft(preset);
    setDraftStr({
      name: String(preset.name || ""),
      width: String(preset.width ?? ""),
      depth: String(preset.depth ?? ""),
      height: String(preset.height ?? ""),
      weight: String(preset.weight ?? ""),
    });
    setEditId(preset.id);
    setFormOpen(true);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((item) => item.id !== id);
    try {
      localStorage.setItem(BOX_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("presets:update", { detail: updated }),
      );
    } catch {
      // ignore
    }
    if (editId === id) {
      resetForm();
    }
  };

  const previewMessage = useMemo(() => {
    if (presets.length === 0) {
      return "Create a reusable box preset to quickly add it from the optimizer page.";
    }
    return "Edit presets below or use them directly from the optimizer box manager.";
  }, [presets.length]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-6 py-6 lg:px-10">
      <section className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-brand-300/80">
              Box Presets
            </p>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Reusable box definitions for faster packing.
              </h1>
            </div>
            <p className="max-w-2xl text-slate-400">
              Create, edit and delete presets for frequently used box types. Use
              these presets when adding new boxes to the optimizer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormOpen((value) => !value);
            }}
            className="inline-flex items-center gap-2 rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <Plus size={16} />
            {formOpen ? "Hide preset form" : "New preset"}
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-[minmax(280px,1fr)_minmax(0,1.8fr)] xl:grid-cols-[minmax(280px,360px)_minmax(0,1.8fr)]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Preset editor
                </p>
                <p className="text-xs text-slate-400">
                  Save preset definitions that can be reused later.
                </p>
              </div>
              <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                {presets.length} saved
              </span>
            </div>

            {formOpen && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((field) => {
                    const unit =
                      field.key === "width" ||
                      field.key === "depth" ||
                      field.key === "height"
                        ? "cm"
                        : field.key === "weight"
                          ? "kg"
                          : null;
                    return (
                      <label
                        key={field.key}
                        className="block text-sm text-slate-300"
                      >
                        <span className="mb-2 block text-slate-400">
                          {field.label}
                        </span>
                        <div className="relative">
                          <input
                            type={field.type}
                            value={
                              field.type === "number"
                                ? (draftStr[field.key] ??
                                  String(draft[field.key as keyof BoxPreset]))
                                : String(draft[field.key as keyof BoxPreset])
                            }
                            min={field.type === "number" ? 0 : undefined}
                            onChange={(event) =>
                              handleChange(
                                field.key as keyof BoxPreset,
                                field.type === "number"
                                  ? event.target.value
                                  : event.target.value,
                              )
                            }
                            onBlur={(event) => {
                              if (field.type === "number") {
                                const raw =
                                  draftStr[field.key] ??
                                  String(draft[field.key as keyof BoxPreset]);
                                const parsed = raw === "" ? 0 : Number(raw);
                                setDraft((cur) => ({
                                  ...cur,
                                  [field.key]: parsed,
                                }));
                              }
                            }}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 pr-12 text-white outline-none transition focus:border-brand-400"
                          />
                          {unit ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                              {unit}
                            </span>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* color removed from presets */}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    <Check size={16} />
                    {isEditing ? "Save preset" : "Create preset"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 text-sm text-slate-300 shadow-soft">
            <p>{previewMessage}</p>
          </div>
        </div>

        <div className="space-y-4">
          {presets.length === 0 ? (
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-6 text-slate-300 shadow-soft">
              <p className="text-base font-semibold text-white">
                No presets saved yet
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Use the form to create reusable presets. They will automatically
                be stored in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                          Preset
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {preset.width}×{preset.depth}×{preset.height} cm,{" "}
                        {preset.weight} kg
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(preset)}
                        className="inline-flex items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-400"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        className="inline-flex items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-slate-300">
                    {/* quantity removed from presets */}
                    {/* color removed from presets */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
