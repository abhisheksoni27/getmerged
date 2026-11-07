import type { LucideIcon } from "lucide-react";
import type { FrictionFingerprint, PRFunnel } from "./types";

export interface FunnelTileConfig {
  key: string;
  label: string;
  value: string;
  color: "emerald" | "rose" | "sky" | "purple";
  note: string;
}

export interface FrictionBarConfig {
  key: "style" | "tests" | "scope";
  label: string;
  pct: number;
  color: "rose" | "amber" | "sky";
}

export interface VitalItem {
  key: string;
  Icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
}

export interface ReviewerRow {
  key: string;
  label: string;
  value: string;
  valueClass: string;
}

export interface VibeScore {
  key: string;
  label: string;
  value: number;
  valueClass: string;
  barClass: string;
}

export interface TemplateCard {
  key: string;
  filename: string;
  text: string;
}

export function buildFunnelTiles(pf: PRFunnel): FunnelTileConfig[] {
  return [
    { key: "merge", label: "Outside Merge Rate", value: `${pf.merge_rate.toFixed(1)}%`, color: "emerald", note: "of all submitted PRs" },
    { key: "abandon", label: "PR Abandonment", value: `${pf.abandonment_rate.toFixed(1)}%`, color: "rose", note: "closed without merge" },
    { key: "first_timer", label: "First-Timer Merge", value: `${pf.first_timer_success_rate.toFixed(1)}%`, color: "sky", note: "newcomer success rate" },
    { key: "repeat", label: "Repeat Contributor", value: `${pf.repeat_contributor_rate.toFixed(1)}%`, color: "purple", note: "came back for more" },
  ];
}

export function buildFrictionBars(ff: FrictionFingerprint): FrictionBarConfig[] {
  return [
    { key: "style", label: "Code Style & Lint Nitpicks", pct: ff.formatting_and_style_pct, color: "rose" },
    { key: "tests", label: "Missing Tests & CI Breakages", pct: ff.missing_tests_and_ci_pct, color: "amber" },
    { key: "scope", label: "Scope & Architecture Discussion", pct: ff.scope_and_spec_pct, color: "sky" },
  ];
}

export function impactBadgeClass(impact: string): string {
  return impact === "Critical"
    ? "bg-rose-950/80 text-rose-300 border border-rose-800"
    : impact === "High"
    ? "bg-amber-950/80 text-amber-300 border border-amber-800"
    : "bg-zinc-800 text-[var(--text-secondary)] border border-zinc-700";
}

export function statusBadgeClass(status: string): string {
  return status === "Bottleneck"
    ? "bg-rose-950 text-rose-400 border border-rose-800"
    : status === "Needs Attention"
    ? "bg-amber-950 text-amber-400 border border-amber-800"
    : status === "Exceptional"
    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
    : "bg-emerald-950/60 text-emerald-400 border border-emerald-900";
}
