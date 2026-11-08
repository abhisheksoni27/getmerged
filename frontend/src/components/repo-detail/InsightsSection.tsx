"use client";

import { AlertCircle, CheckCircle2, Quote, Sparkles } from "lucide-react";
import { AIInsights } from "@/types/opendoor";
import { WidgetSection } from "./WidgetSection";

interface InsightsSectionProps {
  insights: AIInsights | null;
  fullName: string;
}

export function InsightsSection({ insights, fullName }: InsightsSectionProps) {
  return (
    <WidgetSection
      id="guidelines"
      show={Boolean(insights)}
      className="scroll-mt-36 relative rounded-2xl border border-[var(--border-subtle)] glass-panel p-5 sm:p-6 rounded-2xl mb-10"
    >
      {insights && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--border-subtle)] bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="font-space text-base font-extrabold text-[var(--text-primary)]">
              AI Maintainer Review Guidelines
            </h2>
          </div>

          <div className="space-y-6 pt-2 font-sans">
            {/* Persona Overview Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0D111A] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--purple-bright)]">
                  Maintainer Review Telemetry
                </span>
                <h3 className="text-base font-space font-bold mt-0.5">
                  {insights.maintainer_persona || `${fullName.split("/")[1] || "Core"} Maintainer Team`}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-2 sm:pt-0 sm:pl-4">
                <span className="pill pill-green">Direct PRs Welcomed</span>
                <span className="pill pill-purple">AI PRs Allowed</span>
              </div>
            </div>

            {/* Description */}
            {insights.maintainer_vibe && (
              <div className="p-4 rounded-xl glass-card/60 border border-[var(--border-subtle)] rounded-xl">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {insights.maintainer_vibe}
                </p>
              </div>
            )}

            {/* Deep Narrative Sections (Issue #80): evidence-grounded insights from real PR/issue discussions */}
            {insights.deep_sections && insights.deep_sections.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {insights.deep_sections.map((section, idx) => {
                  if (!section.title || !section.body) return null;

                  // Check if body is a numbered list like "1) ... 2) ..." or newline-separated items
                  const isNumberedList = /^\s*1\)\s+|(?:\s+\d+\)\s+)/.test(section.body);
                  const items = isNumberedList
                    ? section.body.split(/(?=\b\d+\)\s+)/).map(s => s.trim()).filter(Boolean)
                    : section.body.split(/\n+/).map(s => s.trim()).filter(Boolean);

                  return (
                    <div key={idx} className="rounded-xl border-2 border-[var(--border-subtle)] glass-panel p-4 shadow-sm">
                      <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Quote className="h-3.5 w-3.5 text-indigo-500" />
                        {section.title}
                      </h4>
                      {items.length > 1 ? (
                        <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                          {items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2">
                              <span className="text-indigo-600 font-bold font-mono shrink-0 select-none">•</span>
                              <span className="flex-1">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                          {section.body}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top Do's & Don'ts Checklist */}
            {((insights.top_dos && insights.top_dos.length > 0) || (insights.top_donts && insights.top_donts.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Do's */}
                {insights.top_dos && insights.top_dos.length > 0 && (
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-4">
                    <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Top PR Submission Do&apos;s
                    </h4>
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-sans">
                      {insights.top_dos.map((doItem, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{doItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Don'ts */}
                {insights.top_donts && insights.top_donts.length > 0 && (
                  <div className="rounded-xl bg-rose-950/40 border border-rose-500/20 rounded-xl p-4">
                    <h4 className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      Top PR Friction Pitfalls (Don&apos;ts)
                    </h4>
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-sans">
                      {insights.top_donts.map((dontItem, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{dontItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </WidgetSection>
  );
}
