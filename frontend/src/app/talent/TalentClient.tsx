"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Code2 } from "lucide-react";
import { CandidateCard } from "./components/CandidateCard";
import { DossierModal } from "./components/DossierModal";
import { PitchModal, type GeneratedPitch, type PitchTone } from "./components/PitchModal";
import { RecruiterUnlockModal } from "./components/RecruiterUnlockModal";
import { TalentEmptyState } from "./components/TalentEmptyState";
import { TalentFilters } from "./components/TalentFilters";
import { TalentHero } from "./components/TalentHero";
import { TalentLookupInspector } from "./components/TalentLookupInspector";
import { useTalentFilters, type TalentSortKey } from "./components/useTalentFilters";

export interface CandidateWorkDoneItem {
  repo_name: string;
  repo_tier: "S" | "A" | "B";
  pr_title: string;
  pr_url: string;
  lines_added: number;
  lines_deleted: number;
  turnaround_hours: number;
  merged_at: string;
}

export interface CandidateProfile {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  headline: string;
  bio: string;
  location: string;
  timezone: string;
  primary_language: string;
  languages: string[];
  total_karma: number;
  level: number;
  level_title: string;
  percentile: string;
  badge_color: string;
  open_to_work: boolean;
  work_type_preference: "Full-Time" | "Contract" | "Staff / Lead";
  maintainer_trust_rating: number;
  merged_prs_count: number;
  top_repos: string[];
  work_done: CandidateWorkDoneItem[];
  email?: string;
  linkedin?: string;
}

interface TalentClientProps {
  initialCandidates?: CandidateProfile[];
}

export function TalentClient({ initialCandidates = [] }: TalentClientProps) {
  const router = useRouter();
  const [candidates] = useState<CandidateProfile[]>(initialCandidates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedMinKarma, setSelectedMinKarma] = useState<number>(0);
  const [openToWorkOnly, setOpenToWorkOnly] = useState<boolean>(true);
  const [sortKey] = useState<TalentSortKey>("featured");
  const [page] = useState(1);
  const [pageSize] = useState(Number.POSITIVE_INFINITY);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [showRecruiterModal, setShowRecruiterModal] = useState<boolean>(false);
  const [activeDossierCandidate, setActiveDossierCandidate] = useState<CandidateProfile | null>(null);

  // Direct GitHub Username Lookup input
  const [lookupUsername, setLookupUsername] = useState("");

  // 1-Click Founder Pitch State
  const [pitchCandidate, setPitchCandidate] = useState<CandidateProfile | null>(null);
  const [pitchCompany, setPitchCompany] = useState("Our Infra Team");
  const [pitchSenderTitle, setPitchSenderTitle] = useState("CTO & Co-Founder");
  const [pitchRole, setPitchRole] = useState("Staff Systems Lead ($220k–$280k + equity)");
  const [pitchChallenge, setPitchChallenge] = useState("scaling our low-latency distributed cluster architecture");
  const [pitchTone, setPitchTone] = useState<PitchTone>("peer");
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupUsername.trim().replace(/^@/, "");
    if (clean) {
      router.push(`/u/${clean}`);
    }
  };

  const generatedPitch: GeneratedPitch = useMemo(() => {
    if (!pitchCandidate) return { subject: "", body: "" };
    const firstName = pitchCandidate.name.split(" ")[0] || pitchCandidate.username;
    const topPR = pitchCandidate.work_done[0];
    const repo = topPR ? topPR.repo_name : pitchCandidate.top_repos[0] || "open-source";
    const prTitle = topPR ? topPR.pr_title : "production pull request contributions";

    if (pitchTone === "coffee") {
      const subject = `Saw your work in ${repo} - quick coffee chat?`;
      const body = `Hey ${firstName},

I'm the ${pitchSenderTitle} at ${pitchCompany}. Saw your contributions in ${repo} (specifically "${prTitle}"). Really clean architecture.

We're currently ${pitchChallenge} and looking for a ${pitchRole}.

Would you be open to a casual 15-minute intro chat sometime this week? No recruiter screens or LeetCode trivia - just engineers talking systems.

Best,
${pitchSenderTitle}, ${pitchCompany}`;
      return { subject, body };
    }

    if (pitchTone === "deep") {
      const subject = `Deep dive on your ${repo} PR / ${pitchRole} at ${pitchCompany}`;
      const body = `Hey ${firstName},

I was reading through your merged PR in ${repo}: "${prTitle}". 

The way you handled lines (+${topPR?.lines_added || 400}/-${topPR?.lines_deleted || 100}) with a ${topPR?.turnaround_hours || 18}h maintainer turnaround is rare proof of high-velocity engineering.

At ${pitchCompany}, we're tackling an identical bottleneck: ${pitchChallenge}. We need someone with your exact depth in ${pitchCandidate.primary_language} to take full ownership.

Role: ${pitchRole}
Location: Remote / Flexible

If you're open to exploring what we're building, let's grab 20 minutes to geek out over the architecture.

Best,
${pitchSenderTitle}, ${pitchCompany}`;
      return { subject, body };
    }

    // Default "peer"
    const subject = `Your PR in ${repo} / Technical Lead at ${pitchCompany}`;
    const body = `Hey ${firstName},

I'm the ${pitchSenderTitle} at ${pitchCompany}. I came across your work in ${repo} on GetMerged - especially your work on "${prTitle}".

We are currently ${pitchChallenge}. Given your track record in ${pitchCandidate.languages.slice(0, 3).join(", ")}, you'd have massive leverage here.

We're hiring a ${pitchRole}. We don't do whiteboard algorithms or 5-round HR loops; we hire engineers based on proof of work.

Are you open to a quick technical chat this week?

Best,
${pitchSenderTitle}, ${pitchCompany}`;
    return { subject, body };
  }, [pitchCandidate, pitchCompany, pitchSenderTitle, pitchRole, pitchChallenge, pitchTone]);

  const { paginatedCandidates, totalCount } = useTalentFilters({
    candidates,
    searchQuery,
    selectedLang,
    selectedMinKarma,
    openToWorkOnly,
    sortKey,
    page,
    pageSize,
  });

  const handleDraftPitch = (cand: CandidateProfile) => {
    setActiveDossierCandidate(null);
    setPitchCandidate(cand);
    setCopiedPitch(false);
  };

  const handleUnlock = (cand: CandidateProfile) => {
    setSelectedCandidate(cand);
    setActiveDossierCandidate(null);
    setShowRecruiterModal(true);
  };

  const handleCopyPitch = () => {
    const fullText = `Subject: ${generatedPitch.subject}\n\n${generatedPitch.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const handleSendEmail = (target: CandidateProfile) => {
    setPitchCandidate(null);
    setSelectedCandidate(target);
    setShowRecruiterModal(true);
  };

  return (
    <div className="space-y-12">
      <TalentHero />

      <TalentLookupInspector
        username={lookupUsername}
        onUsernameChange={setLookupUsername}
        onSubmit={handleLookupSubmit}
      />

      {/* The WorkDone Parametric Search Matrix */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-space text-white flex items-center gap-2">
              <Code2 className="h-6 w-6 text-blue-400" />
              WorkDone Parametric Search
            </h2>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Search verified opt-in contributors by target codebase, language ecosystem, or Karma score.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Showing <strong className="text-white">{totalCount}</strong> verified opt-in engineers</span>
          </div>
        </div>

        <TalentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          selectedLang={selectedLang}
          onLangChange={setSelectedLang}
          selectedMinKarma={selectedMinKarma}
          onMinKarmaChange={setSelectedMinKarma}
          openToWorkOnly={openToWorkOnly}
          onOpenToWorkChange={setOpenToWorkOnly}
        />

        {/* Candidate List Results */}
        <div className="space-y-4">
          {paginatedCandidates.length === 0 ? (
            <TalentEmptyState />
          ) : (
            paginatedCandidates.map((cand) => (
              <CandidateCard
                key={cand.id}
                candidate={cand}
                onDraftPitch={handleDraftPitch}
                onInspect={setActiveDossierCandidate}
                onUnlock={handleUnlock}
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: WORK DONE DOSSIER MODAL */}
      {activeDossierCandidate && (
        <DossierModal
          candidate={activeDossierCandidate}
          onClose={() => setActiveDossierCandidate(null)}
          onDraftPitch={handleDraftPitch}
          onUnlock={handleUnlock}
        />
      )}

      {/* MODAL 2: 1-CLICK FOUNDER TECHNICAL COMPLIMENT OUTREACH ENGINE */}
      {pitchCandidate && (
        <PitchModal
          candidate={pitchCandidate}
          pitch={generatedPitch}
          company={pitchCompany}
          onCompanyChange={setPitchCompany}
          senderTitle={pitchSenderTitle}
          onSenderTitleChange={setPitchSenderTitle}
          role={pitchRole}
          onRoleChange={setPitchRole}
          challenge={pitchChallenge}
          onChallengeChange={setPitchChallenge}
          tone={pitchTone}
          onToneChange={setPitchTone}
          copied={copiedPitch}
          onCopy={handleCopyPitch}
          onSendEmail={handleSendEmail}
          onClose={() => setPitchCandidate(null)}
        />
      )}

      {/* MODAL 3: RECRUITER CONTACT UNLOCK / PASS GATE */}
      {showRecruiterModal && selectedCandidate && (
        <RecruiterUnlockModal
          candidate={selectedCandidate}
          onClose={() => setShowRecruiterModal(false)}
        />
      )}
    </div>
  );
}
