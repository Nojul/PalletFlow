import { BoxPreset } from "./types";

export const BOX_PRESETS_STORAGE_KEY = "palletflow-box-presets";

export const defaultBoxPresets: BoxPreset[] = [
  {
    id: "B1-carton",
    name: "B1",
    width: 16,
    depth: 22,
    height: 17,
    weight: 5,
  },
  {
    id: "B2-carton",
    name: "B2",
    width: 23,
    depth: 30,
    height: 20,
    weight: 5,
  },
  {
    id: "B3-carton",
    name: "B3",
    width: 30,
    depth: 32,
    height: 25,
    weight: 5,
  },
  {
    id: "B5-carton",
    name: "B5",
    width: 35,
    depth: 35,
    height: 30,
    weight: 5,
  },
  {
    id: "B6-carton",
    name: "B6",
    width: 37,
    depth: 45,
    height: 37,
    weight: 5,
  }
];

export function parseStoredBoxPresets(value: string | null): BoxPreset[] {
  if (!value) {
    return defaultBoxPresets;
  }

  try {
    const parsed = JSON.parse(value) as BoxPreset[];
    if (!Array.isArray(parsed)) {
      return defaultBoxPresets;
    }
    return parsed.map((item) => ({
      id: item.id ?? `preset-${Math.random().toString(36).slice(2, 8)}`,
      name: item.name ?? "Preset box",
      width: Number(item.width) || 0,
      depth: Number(item.depth) || 0,
      height: Number(item.height) || 0,
      weight: Number(item.weight) || 0,
      // color intentionally omitted for presets
    }));
  } catch {
    return defaultBoxPresets;
  }
}
