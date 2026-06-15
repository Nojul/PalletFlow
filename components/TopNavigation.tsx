"use client";

import { Box, LayoutGrid, Layers } from "lucide-react";

type Section = "optimizer" | "presets";

type Props = {
  activeSection: Section;
  onSelectSection: (section: Section) => void;
};

const sections: Array<{ id: Section; label: string; icon: typeof LayoutGrid }> =
  [
    { id: "optimizer", label: "Optimizer", icon: Layers },
    { id: "presets", label: "Box Presets", icon: Box },
  ];

export function TopNavigation({ activeSection, onSelectSection }: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <LayoutGrid size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-brand-300/70">
              PalletFlow Suite
            </p>
            <p className="text-lg font-semibold text-white">
              Logistics optimization hub
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`inline-flex items-center gap-2 rounded-3xl px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand-500 text-white shadow-soft"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
