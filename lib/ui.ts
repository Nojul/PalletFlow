export const BOX_COLOR_SWATCHES = [
  "#38bdf8",
  "#a855f7",
  "#34d399",
  "#f97316",
  "#facc15",
] as const;

export const PRESETS_UPDATED_EVENT = "presets:update";
export const SECTION_SELECTED_EVENT = "palletflow:select-section";

export function createClientId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeNumberInput(value: string) {
  if (value === "") return "";
  if (value === "0") return "0";
  if (value.startsWith("0") && !value.startsWith("0.")) {
    const stripped = value.replace(/^0+/, "");
    return stripped === "" ? "0" : stripped;
  }

  return value;
}

export function parseNumberInput(value: string, fallback = 0) {
  if (value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
