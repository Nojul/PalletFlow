"use client";

import { PlacedBox, PalletConfig } from "@/lib/types";

type Props = {
  pallet: PalletConfig;
  boxes: PlacedBox[];
  activeLayer: number;
};

export function TopDownView({ pallet, boxes, activeLayer }: Props) {
  const layerBoxes = boxes.filter((box) => box.layer === activeLayer);
  const scale = 300 / Math.max(pallet.width, pallet.depth, 1);

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            2D top-down view
          </p>
          <p className="text-xs text-slate-500">Layer {activeLayer} layout.</p>
        </div>
      </div>
      <div className="relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90">
        <div
          className="absolute left-0 top-0 h-full w-full bg-slate-950/80"
          style={{ width: pallet.width * scale, height: pallet.depth * scale }}
        />
        {layerBoxes.map((box) => (
          <div
            key={box.id}
            className="absolute rounded-2xl border border-white/10 bg-white/10 text-[10px] text-slate-100"
            style={{
              left: box.x * scale,
              top: box.y * scale,
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
  );
}
