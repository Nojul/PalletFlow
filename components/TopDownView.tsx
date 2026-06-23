"use client";

import { useState } from "react";
import { PlacedBox, PalletConfig } from "@/lib/types";

type Props = {
  pallet: PalletConfig;
  boxes: PlacedBox[];
  activeLayer: number | "all";
  onHoverBox?: (boxId: string | null) => void;
  hoveredId?: string | null;
};

export function TopDownView({
  pallet,
  boxes,
  activeLayer,
  onHoverBox,
  hoveredId,
}: Props) {
  const [rotation, setRotation] = useState(0);

  const layerBoxes =
    activeLayer === "all"
      ? boxes
      : boxes.filter((box) => box.layer === activeLayer);

  const containerSize = 500;
  const scale = containerSize / Math.max(pallet.width, pallet.depth, 1);
  const boardWidth = pallet.width * scale;
  const boardHeight = pallet.depth * scale;
  const offsetX = (containerSize - boardWidth) / 2;
  const offsetY = (containerSize - boardHeight) / 2;

  const isRotated = rotation === 90 || rotation === 270;
  const displayWidth = isRotated ? containerSize : containerSize;
  const displayHeight = isRotated ? containerSize : containerSize;

  const handleHover = (boxId: string | null) => {
    onHoverBox?.(boxId);
  };

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 hover:bg-slate-800/50 transition-colors"
          title="Rotate 90°"
        >
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      <div className="flex justify-center">
        <div
          className="relative w-full max-w-[min(500px,100%)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/90"
          style={{
            aspectRatio: "1 / 1",
            backgroundSize: "24px 24px",
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.07) 1px, transparent 1px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
          >
            <div
              className="absolute border border-slate-600 bg-slate-900/40"
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
                className="absolute rounded border border-white/20 text-[10px] text-slate-100 cursor-pointer transition-all hover:border-white/40 hover:bg-opacity-75"
                style={{
                  left: offsetX + box.x * scale,
                  top: offsetY + box.y * scale,
                  width: box.width * scale,
                  height: box.depth * scale,
                  backgroundColor:
                    hoveredId === box.id ? `${box.color}60` : `${box.color}40`,
                  borderColor:
                    hoveredId === box.id ? box.color : `${box.color}80`,
                  opacity:
                    hoveredId === null ||
                    hoveredId === undefined ||
                    hoveredId === box.id
                      ? 1
                      : 0.6,
                }}
                onMouseEnter={() => handleHover(box.id)}
                onMouseLeave={() => handleHover(null)}
              >
                <div
                  className="truncate px-1 py-0.5 text-xs"
                  style={{
                    transform: `rotate(-${rotation}deg)`,
                    transformOrigin: "center",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {box.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
