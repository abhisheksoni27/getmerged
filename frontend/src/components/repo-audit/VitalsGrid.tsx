"use client";

import type { VitalItem } from "./report-derivations";

export function VitalsGrid({ vitals }: { vitals: VitalItem[] }) {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {vitals.map(({ key, Icon, iconClass, label, value }) => (
        <div key={key} className="flex items-center gap-1.5 text-xs font-mono">
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          <span className="text-zinc-400">{label}</span>
          <span className="text-white font-bold">{value}</span>
        </div>
      ))}
    </div>
  );
}
