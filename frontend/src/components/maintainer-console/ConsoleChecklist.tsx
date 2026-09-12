"use client";

import React from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { MaintainerChecklistItem } from "@/types/opendoor";

interface ConsoleChecklistProps {
  checklist: MaintainerChecklistItem[] | undefined;
}

function ChecklistHeader() {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" /> Prioritized Actions to Raise C-Rank
      </h3>
      <span className="text-xs font-mono text-zinc-300">Top 5 high-impact fixes</span>
    </div>
  );
}

function ChecklistItem({ item }: { item: MaintainerChecklistItem }) {
  return (
    <div className="p-4 glass-panel border border-white/[0.12] rounded-2xl shadow-sm hover:border-white/[0.1] transition-all">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="font-bold text-sm text-white">{item.title}</div>
        <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold rounded-lg border border-emerald-300 shrink-0">
          +{item.impact_pts} pts
        </span>
      </div>
      <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{item.description}</p>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.1]">
        <span className="text-zinc-300 font-mono text-[11px] glass-card px-2 py-0.5 rounded">
          {item.fix_guidance}
        </span>
        {item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 ml-2 shrink-0"
          >
            Fix Guide <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ConsoleChecklist({ checklist }: ConsoleChecklistProps) {
  if (!checklist || checklist.length === 0) {
    return (
      <div>
        <ChecklistHeader />
        <div className="space-y-3">
          <div className="p-6 bg-emerald-950/70 border-emerald-800/80 border-2 border-emerald-400 rounded-2xl text-center text-emerald-300 text-sm font-medium">
            🎉 Outstanding work! All prime welcoming metrics are currently optimized.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ChecklistHeader />
      <div className="space-y-3">
        {checklist.map((item: MaintainerChecklistItem) => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
