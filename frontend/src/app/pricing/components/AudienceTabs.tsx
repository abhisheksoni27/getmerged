import React from "react";
import { GitPullRequest, Briefcase, Activity } from "lucide-react";
import { AudienceTab } from "./pricing-types";

interface AudienceTabsProps {
  activeTab: AudienceTab;
  onChange: (tab: AudienceTab) => void;
}

export function AudienceTabs({ activeTab, onChange }: AudienceTabsProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-sm max-w-full overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => onChange("contributors")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "contributors"
              ? "bg-[#0D9668] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
          }`}
        >
          <GitPullRequest className="h-4 w-4 shrink-0" />
          <span>Contributors</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("recruiter")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "recruiter"
              ? "bg-[#2D8ABF] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
          }`}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>CTOs & Founders</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("maintainers")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "maintainers"
              ? "bg-[var(--brand-terracotta)] text-[var(--text-primary)] shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span>Maintainers</span>
        </button>
      </div>
    </div>
  );
}
