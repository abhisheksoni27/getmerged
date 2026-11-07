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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "contributors"
              ? "bg-zinc-900 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
          }`}
        >
          <GitPullRequest className="h-4 w-4 shrink-0" />
          <span>Contributors</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("recruiter")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "recruiter"
              ? "bg-zinc-900 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
          }`}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>CTOs & Founders</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("maintainers")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "maintainers"
              ? "bg-zinc-900 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span>Maintainers</span>
        </button>
      </div>
    </div>
  );
}
