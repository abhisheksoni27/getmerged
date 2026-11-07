"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { TemplateCard } from "./report-derivations";

export function TemplateCards({ cards }: { cards: TemplateCard[] }) {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(key);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="space-y-4">
      {cards.map((t) => (
        <div key={t.key} className="rounded-xl border border-[var(--border-subtle)] bg-black/50 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">{t.filename}</span>
            <button
              type="button"
              onClick={() => handleCopy(t.key, t.text)}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded px-2.5 py-1 transition-all cursor-pointer"
            >
              {copiedTemplate === t.key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedTemplate === t.key ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap bg-zinc-950/80 p-3 rounded-lg border border-white/[0.05] overflow-x-auto">
            {t.text}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function TemplateCardsSection({ cards }: { cards: TemplateCard[] }) {
  return (
    <section className="rounded-2xl border-2 border-[var(--border-subtle)] glass-panel p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-extrabold font-mono text-[var(--text-primary)] mb-2">
        <Copy className="h-4 w-4 text-purple-400" /> Ready-to-Commit GitHub Templates
      </h2>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        Copy and commit these directly to your repo to reduce friction today.
      </p>

      <TemplateCards cards={cards} />
    </section>
  );
}
