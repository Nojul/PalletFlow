"use client";

import { PlacedBox, PalletConfig } from "@/lib/types";

type Props = {
  pallet: PalletConfig;
  boxes: PlacedBox[];
  activeLayer: number | "all";
};

export function TopDownView({ pallet, boxes, activeLayer }: Props) {
  const layerBoxes =
    activeLayer === "all"
      ? boxes
      : boxes.filter((box) => box.layer === activeLayer);

  const scale = 300 / Math.max(pallet.width, pallet.depth, 1);
  const boardWidth = pallet.width * scale;
  const boardHeight = pallet.depth * scale;
  const offsetX = Math.max(0, (320 - boardWidth) / 2);
  const offsetY = Math.max(0, (320 - boardHeight) / 2);

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            2D top-down view
          </p>
          <p className="text-xs text-slate-500">
            {activeLayer === "all"
              ? "Full stack layout"
              : `Height ${activeLayer} cm`}
          </p>
        </div>
      </div>
      <div className="grid place-items-center">
        <div
          className="relative h-[320px] w-[320px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90"
          style={{
            backgroundSize: "24px 24px",
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.07) 1px, transparent 1px)",
          }}
        >
          <div
            className="absolute rounded-3xl border border-slate-700 bg-slate-950/80"
            style={{
              left: offsetX,
              top: offsetY,
              width: boardWidth,
              height: boardHeight,
            }}
          />

          {layerBoxes.map((box) => (
            <div
              key={box.id}
              className="absolute rounded-2xl border border-white/10 bg-white/10 text-[10px] text-slate-100"
              style={{
                left: offsetX + box.x * scale,
                top: offsetY + box.y * scale,
                width: box.width * scale,
                height: box.depth * scale,
                backgroundColor: `${box.color}cc`,
                borderColor: box.color,
              }}
            >
              <div className="truncate px-1 py-0.5">{box.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
