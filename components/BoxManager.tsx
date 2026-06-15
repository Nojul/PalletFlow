import { useEffect, useState } from "react";
import { BoxTemplate, BoxPreset } from "@/lib/types";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  boxes: BoxTemplate[];
  onChange: (boxes: BoxTemplate[]) => void;
  presets?: BoxPreset[];
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

export function BoxManager({ boxes, onChange, presets = [] }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"custom" | "preset">("custom");
  const [draftBox, setDraftBox] = useState<BoxTemplate>(defaultBox());
  const [selectedPreset, setSelectedPreset] = useState("");
  const selectedPresetItem = presets.find((item) => item.id === selectedPreset);

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
              [field]: numericFields.includes(field)
                ? value === ""
                  ? ("" as unknown as number)
                  : Number(value)
                : value,
            }
          : box,
      ),
    );
  };

  const removeBox = (id: string) =>
    onChange(boxes.filter((box) => box.id !== id));

  const [expanded, setExpanded] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(boxes.map((box) => [box.id, true])),
  );

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = { ...prev };
      boxes.forEach((box) => {
        if (!(box.id in next)) next[box.id] = true;
      });
      return next;
    });
  }, [boxes]);

  useEffect(() => {
    if (addMode === "preset" && selectedPresetItem) {
      setDraftBox((current) => ({
        ...current,
        name: selectedPresetItem.name,
        width: selectedPresetItem.width,
        depth: selectedPresetItem.depth,
        height: selectedPresetItem.height,
        weight: selectedPresetItem.weight,
        // Do NOT override draft quantity from preset — quantity is applied at add time
      }));
    }
  }, [addMode, selectedPresetItem]);

  const openAddModal = () => {
    setAddMode("custom");
    setSelectedPreset("");
    setDraftBox(defaultBox());
    setIsModalOpen(true);
  };

  const addNewBox = () => {
    onChange([
      ...boxes,
      {
        ...draftBox,
        id: `box-${Math.random().toString(36).slice(2, 8)}`,
      },
    ]);
    setIsModalOpen(false);
    setSelectedPreset("");
    setDraftBox(defaultBox());
  };

  const updateDraft = (field: keyof BoxTemplate, value: string | number) => {
    const numericFields: Array<keyof BoxTemplate> = [
      "width",
      "depth",
      "height",
      "weight",
      "quantity",
    ];

    setDraftBox((current) => ({
      ...current,
      [field]: numericFields.includes(field)
        ? value === ""
          ? ("" as unknown as number)
          : Number(value)
        : value,
    }));
  };

  return (
    <section className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown size={18} className="text-slate-300" />
          ) : (
            <ChevronRight size={18} className="text-slate-300" />
          )}
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Box templates
            </h2>
            <p className="text-xs text-slate-400">
              Create reusable box types and quantities for packing.
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold leading-none text-white transition hover:bg-brand-600"
        >
          <Plus size={16} /> Add box type
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800/90 bg-slate-950/95 p-6 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-brand-300/80">
                  Add box type
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Add a custom box or choose a preset
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-3">
              <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-950/90 p-2">
                <button
                  type="button"
                  onClick={() => setAddMode("custom")}
                  className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                    addMode === "custom"
                      ? "bg-brand-500 text-white"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  Custom box
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("preset")}
                  className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                    addMode === "preset"
                      ? "bg-brand-500 text-white"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  From preset
                </button>
              </div>

              {addMode === "preset" && (
                <div className="mt-4 rounded-3xl bg-slate-950/90 p-4">
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block text-slate-400">
                      Select preset
                    </span>
                    <select
                      value={selectedPreset}
                      onChange={(event) => {
                        const presetId = event.target.value;
                        setSelectedPreset(presetId);
                        const preset = presets.find(
                          (item) => item.id === presetId,
                        );
                        if (preset) {
                          setDraftBox((current) => ({
                            ...current,
                            name: preset.name,
                            width: preset.width,
                            depth: preset.depth,
                            height: preset.height,
                            weight: preset.weight,
                            // do not apply preset quantity here
                          }));
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white outline-none transition focus:border-brand-400"
                    >
                      <option value="">Choose a saved preset</option>
                      {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {presets.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      No saved presets available. Create some on the Box Presets
                      page.
                    </p>
                  ) : null}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {addMode === "custom" ? (
                  [
                    { label: "Name", field: "name", type: "text" },
                    { label: "Width", field: "width", type: "number" },
                    { label: "Depth", field: "depth", type: "number" },
                    { label: "Height", field: "height", type: "number" },
                    { label: "Weight", field: "weight", type: "number" },
                    { label: "Quantity", field: "quantity", type: "number" },
                  ].map((input) => {
                    return (
                      <label
                        key={input.field}
                        className="block text-sm text-slate-300"
                      >
                        <span className="mb-2 block text-slate-400">
                          {input.label}
                        </span>
                        <div>
                          <input
                            type={input.type}
                            value={
                              draftBox[input.field as keyof BoxTemplate] as
                                | string
                                | number
                            }
                            min={input.type === "number" ? 0 : undefined}
                            onChange={(event) =>
                              updateDraft(
                                input.field as keyof BoxTemplate,
                                event.target.value,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white outline-none transition focus:border-brand-400"
                          />
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block text-slate-400">Quantity</span>
                    <input
                      type="number"
                      value={draftBox.quantity}
                      min={0}
                      onChange={(event) =>
                        updateDraft("quantity", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-white outline-none transition focus:border-brand-400"
                    />
                  </label>
                )}

                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm text-slate-400">Color</p>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {[
                      "#38bdf8",
                      "#a855f7",
                      "#34d399",
                      "#f97316",
                      "#facc15",
                    ].map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => updateDraft("color", swatch)}
                        className="h-9 w-9 rounded-full border-2 transition focus:outline-none"
                        style={{
                          backgroundColor: swatch,
                          borderColor:
                            draftBox.color === swatch
                              ? "#ffffff"
                              : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={draftBox.color}
                    onChange={(event) =>
                      updateDraft("color", event.target.value)
                    }
                    className="h-12 w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/90 p-1"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addNewBox}
                  disabled={addMode === "preset" && !selectedPresetItem}
                  className="inline-flex items-center justify-center rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add box
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded ? (
        <div className="space-y-4">
          {boxes.map((box) => (
            <div
              key={box.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIds((current) => ({
                      ...current,
                      [box.id]: !current[box.id],
                    }))
                  }
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    {expandedIds[box.id] ? (
                      <ChevronDown size={16} className="text-slate-300" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-300" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {box.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Volume: {box.width}×{box.depth}×{box.height}
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeBox(box.id)}
                  className="rounded-2xl border border-slate-700 px-3 py-2 text-slate-300 transition hover:border-red-500 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {expandedIds[box.id] !== false && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Name", field: "name", type: "text" },
                    { label: "Width", field: "width", type: "number" },
                    { label: "Depth", field: "depth", type: "number" },
                    { label: "Height", field: "height", type: "number" },
                    { label: "Weight", field: "weight", type: "number" },
                    { label: "Quantity", field: "quantity", type: "number" },
                  ].map((input) => {
                    const unit =
                      input.field === "width" ||
                      input.field === "depth" ||
                      input.field === "height"
                        ? "cm"
                        : input.field === "weight"
                          ? "kg"
                          : null;
                    return (
                      <label
                        key={`${box.id}-${input.field}`}
                        className="block text-sm text-slate-300"
                      >
                        <span className="mb-2 block text-slate-400">
                          {input.label}
                        </span>
                        <div className="relative">
                          <input
                            type={input.type}
                            value={
                              box[input.field as keyof BoxTemplate] as
                                | string
                                | number
                            }
                            onChange={(event) =>
                              updateBox(
                                box.id,
                                input.field as keyof BoxTemplate,
                                event.target.value,
                              )
                            }
                            onBlur={(event) => {
                              if (
                                input.type === "number" &&
                                event.target.value === ""
                              ) {
                                updateBox(
                                  box.id,
                                  input.field as keyof BoxTemplate,
                                  0,
                                );
                              }
                            }}
                            min={input.type === "number" ? 0 : undefined}
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
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm text-slate-400">Color</p>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {[
                        "#38bdf8",
                        "#a855f7",
                        "#34d399",
                        "#f97316",
                        "#facc15",
                      ].map((swatch) => (
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
                      ))}
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
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
