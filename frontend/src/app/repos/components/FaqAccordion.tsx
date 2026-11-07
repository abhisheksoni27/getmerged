"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { FAQS, FaqItem } from "./repoFilterOptions";

function FaqCard({ faq }: { faq: FaqItem }) {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-2">
      <h3 className="text-sm font-bold font-space text-[var(--text-primary)] flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
        <span>{faq.q}</span>
      </h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans pl-6">
        {faq.a}
      </p>
    </div>
  );
}

export function FaqAccordion() {
  return (
    <section className="mt-16 pt-12 border-t border-[var(--border-subtle)]">
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold font-space text-[var(--text-primary)]">
          Frequently Asked Questions About Open-Source Rankings
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-1">
          Everything you need to know about how C-Rank™ benchmarks repository maintainer availability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {FAQS.map((faq, idx) => (
          <FaqCard key={idx} faq={faq} />
        ))}
      </div>
    </section>
  );
}
