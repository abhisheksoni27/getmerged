"use client";

import { Check, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import type { DeepSection, PrioritizedFix } from "./types";

export function PrioritizedFixItem({ fix }: { fix: PrioritizedFix }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-white font-mono">
        {fix.priority}
      </span>
      <div className="text-xs text-zinc-200">
        {fix.type === "avoid" ? (
          <span className="inline-flex items-center gap-1 font-bold text-rose-400"><XCircle className="h-3.5 w-3.5" /> Avoid:</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-sky-400"><CheckCircle2 className="h-3.5 w-3.5" /> {fix.title}:</span>
        )}{" "}
        <span className="leading-relaxed">{fix.text}</span>
      </div>
    </li>
  );
}

export function PrioritizedFixList({ fixes }: { fixes: PrioritizedFix[] }) {
  if (fixes.length === 0) {
    return <p className="text-xs text-zinc-400">No prioritized fixes available yet.</p>;
  }
  return (
    <ol className="space-y-2.5">
      {fixes.map((fix) => (
        <PrioritizedFixItem key={fix.priority} fix={fix} />
      ))}
    </ol>
  );
}

export function DeepSectionCard({ section }: { section: DeepSection }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
      <h3 className="text-sm font-bold font-mono text-white mb-2">{section.title}</h3>
      <p className="text-xs text-zinc-300 leading-relaxed">{section.body}</p>
    </div>
  );
}

export function DeepSections({ sections }: { sections: DeepSection[] }) {
  if (sections.length === 0) return null;
  return (
    <section className="rounded-2xl border-2 border-white/[0.1] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-4">
        <Sparkles className="h-4 w-4 text-purple-400" /> Deep Analysis Notes
      </h2>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <DeepSectionCard key={i} section={s} />
        ))}
      </div>
    </section>
  );
}

export function DosDonts({ dos, donts }: { dos: string[]; donts: string[] }) {
  if (dos.length === 0 && donts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {dos.length > 0 && (
        <section className="rounded-2xl border-2 border-emerald-900/60 glass-panel p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> What Contributors Should Do
          </h2>
          <ul className="space-y-2">
            {dos.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
      {donts.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-900/60 glass-panel p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-extrabold font-mono text-white mb-3">
            <XCircle className="h-4 w-4 text-rose-400" /> What Contributors Must Avoid
          </h2>
          <ul className="space-y-2">
            {donts.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
