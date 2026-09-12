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
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#141414] border border-white/[0.1] shadow-lg max-w-full overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => onChange("contributors")}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === "contributors"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "text-zinc-400 hover:text-white"
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
              ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
              : "text-zinc-400 hover:text-white"
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
              ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span>Maintainers</span>
        </button>
      </div>
    </div>
  );
}
