"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Briefcase,
  ShieldCheck,
  Award,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Code2,
  Mail,
  MapPin,
  X,
  Copy,
  Check,
  Send,
  UserCheck,
} from "lucide-react";

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

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
  const [pitchTone, setPitchTone] = useState<"peer" | "deep" | "coffee">("peer");
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupUsername.trim().replace(/^@/, "");
    if (clean) {
      router.push(`/u/${clean}`);
    }
  };

  const generatedPitch = useMemo(() => {
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

  const languagesList = ["All", "Go", "TypeScript", "Rust", "Python", "C++"];

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (openToWorkOnly && !c.open_to_work) return false;
      if (selectedLang !== "All" && c.primary_language !== selectedLang && !c.languages.includes(selectedLang)) {
        return false;
      }
      if (selectedMinKarma > 0 && c.total_karma < selectedMinKarma) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesUsername = c.username.toLowerCase().includes(q);
        const matchesHeadline = c.headline.toLowerCase().includes(q);
        const matchesBio = c.bio.toLowerCase().includes(q);
        const matchesRepos = c.top_repos.some((r) => r.toLowerCase().includes(q));
        const matchesLang = c.languages.some((l) => l.toLowerCase().includes(q));
        if (!matchesName && !matchesUsername && !matchesHeadline && !matchesBio && !matchesRepos && !matchesLang) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, searchQuery, selectedLang, selectedMinKarma, openToWorkOnly]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="rounded-3xl glass-panel border border-blue-500/30 p-8 sm:p-12 bg-gradient-to-br from-blue-950/40 via-zinc-950/90 to-zinc-900/50 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
          <Briefcase className="h-4 w-4" />
          <span>WorkDone Database · For Technical Founders, CTOs & Engineering Leaders</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Stop Screening Resumes. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
            Hire the Engineers Who Built Your Tech Stack.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed font-sans">
          Resumes are full of self-reported claims. <strong>WorkDone Database</strong> is full of proof. Search senior software engineers indexed by actual pull requests merged into production open-source infrastructure.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing?tab=recruiter"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60 cursor-pointer active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            <span>Unlock Founder & CTO Pass ($49/mo)</span>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl glass-panel border border-white/[0.14] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>Join Talent Pool (For Devs)</span>
          </Link>
        </div>
      </div>

      {/* 3 Core Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-zinc-950/60 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-white">
            1. Audited Code Proof
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Every candidate profile links to exact GitHub commits and merged PRs reviewed by core maintainers. No LeetCode trivia needed.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-zinc-950/60 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-white">
            2. Proof-of-Work Seniority
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Filter by verified Karma reputation. A Level 4+ engineer has proven merges across multiple Tier-S repositories.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-zinc-950/60 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-white">
            3. Direct Technical Outreach
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Connect directly founder-to-engineer with candidates who explicitly toggled <strong>&ldquo;Open to Opportunities&rdquo;</strong>.
          </p>
        </div>
      </div>

      {/* Direct Public GitHub Profile Inspector */}
      <div className="p-6 rounded-2xl glass-panel border border-white/[0.1] bg-[#121214]/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold font-space text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-400" />
              Inspect Any GitHub Developer&apos;s WorkDone Dossier
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Enter any public GitHub username to inspect their verified Karma score, merged PR history, and codebase seniority.
            </p>
          </div>
        </div>

        <form onSubmit={handleLookupSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">github.com/</span>
            <input
              type="text"
              value={lookupUsername}
              onChange={(e) => setLookupUsername(e.target.value)}
              placeholder="e.g. torvalds, shadcn, or your candidate's username"
              className="w-full pl-28 pr-4 py-2.5 rounded-xl bg-[#0a0a0c] border border-white/[0.12] text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            Inspect Profile
          </button>
        </form>
      </div>

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
            <span>Showing <strong className="text-white">{filteredCandidates.length}</strong> verified opt-in engineers</span>
          </div>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="p-5 rounded-2xl glass-panel border border-white/[0.1] bg-[#121214]/90 space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by repo (e.g. 'kubernetes', 'next.js'), skill, or candidate username..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0a0a0c] border border-white/[0.1] text-white text-sm font-sans placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Parametric Filters Grid */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
            {/* Language Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-zinc-400 mr-1">Ecosystem:</span>
              {languagesList.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                    selectedLang === lang
                      ? "bg-blue-600 text-white shadow-sm"
                      : "glass-card text-zinc-400 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Minimum Karma & Open to Work Toggles */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Karma Filter */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-400">Min Karma:</span>
                <select
                  value={selectedMinKarma}
                  onChange={(e) => setSelectedMinKarma(Number(e.target.value))}
                  className="bg-[#0a0a0c] border border-white/[0.12] rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>All Levels</option>
                  <option value={1500}>Level 4+ (Top 5% Senior)</option>
                  <option value={3500}>Level 5 (Top 1% Legend)</option>
                </select>
              </div>

              {/* Open to Work Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300">
                <input
                  type="checkbox"
                  checked={openToWorkOnly}
                  onChange={(e) => setOpenToWorkOnly(e.target.checked)}
                  className="rounded border-white/20 bg-zinc-900 text-blue-600 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Actively Open to Work
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Candidate List Results */}
        <div className="space-y-4">
          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center rounded-3xl glass-panel border border-white/[0.08] bg-[#0c0c0e]/80 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center mx-auto text-zinc-400">
                <UserCheck className="h-6 w-6 text-emerald-400" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold font-space text-white">
                  Zero Fake Profiles · Real Opt-Ins Only
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  WorkDone Database never scrapes fake profiles or sells scraped emails. Only verified GitHub contributors who explicitly opt in through their dashboard appear here.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Opt In to Talent Pool (For Devs)</span>
                </Link>
                <Link
                  href="/pricing?tab=recruiter"
                  className="px-6 py-2.5 rounded-xl glass-panel border border-white/[0.14] hover:bg-white/[0.08] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <span>Set Up Founder Talent Alert ($49/mo)</span>
                </Link>
              </div>
            </div>
          ) : (
            filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-[#141416]/90 hover:border-blue-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group"
              >
                {/* Left: Avatar + Candidate Info */}
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cand.avatar_url}
                      alt={cand.name}
                      className="w-12 h-12 rounded-full border border-white/[0.15] object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/u/${cand.username}`}
                          className="text-base font-bold font-space text-white hover:text-blue-400 transition-colors"
                        >
                          {cand.name}
                        </Link>
                        <span className="text-xs font-mono text-zinc-400">@{cand.username}</span>

                        {cand.open_to_work && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Open to Work · {cand.work_type_preference}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-300 font-sans mt-0.5 leading-snug">
                        {cand.headline}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Metrics Row */}
                  <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                    <span
                      className="px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1.5 text-white"
                      style={{ backgroundColor: `${cand.badge_color}25`, borderColor: `${cand.badge_color}50`, borderWidth: 1 }}
                    >
                      <Zap className="h-3.5 w-3.5" style={{ color: cand.badge_color }} />
                      <span>{cand.total_karma.toLocaleString()} Karma</span>
                      <span className="opacity-80">({cand.level_title})</span>
                    </span>

                    <span className="glass-card px-2.5 py-0.5 rounded-md text-zinc-300">
                      🏆 {cand.percentile}
                    </span>

                    <span className="glass-card px-2.5 py-0.5 rounded-md text-zinc-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-zinc-400" /> {cand.location}
                    </span>
                  </div>

                  {/* Work Done Summary */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Proven Work Done in Open Source:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cand.work_done.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-[#0a0a0c] border border-white/[0.08] text-[11px] font-mono text-zinc-300 flex items-center gap-2"
                        >
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span className="font-semibold text-white">{item.repo_name}</span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-zinc-400 truncate max-w-[280px]">{item.pr_title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 lg:w-52">
                  <button
                    type="button"
                    onClick={() => {
                      setPitchCandidate(cand);
                      setCopiedPitch(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/50 cursor-pointer active:scale-[0.98]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Draft Founder Pitch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDossierCandidate(cand)}
                    className="px-3.5 py-2 rounded-xl glass-panel border border-white/[0.14] hover:bg-white/[0.08] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Inspect Dossier</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(cand);
                      setShowRecruiterModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.12] text-zinc-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <Lock className="h-3.5 w-3.5 text-blue-400" />
                    <span>Unlock Contact</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: WORK DONE DOSSIER MODAL */}
      {activeDossierCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl glass-panel border border-white/[0.15] bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveDossierCandidate(null)}
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeDossierCandidate.avatar_url}
                alt={activeDossierCandidate.name}
                className="w-14 h-14 rounded-full border border-white/[0.2]"
              />
              <div>
                <h3 className="text-xl font-bold font-space text-white">
                  {activeDossierCandidate.name}
                </h3>
                <p className="text-xs text-zinc-300 font-sans">{activeDossierCandidate.headline}</p>
                <div className="flex items-center gap-2 mt-1 font-mono text-xs text-zinc-400">
                  <span>⚡ {activeDossierCandidate.total_karma.toLocaleString()} Karma</span>
                  <span>·</span>
                  <span className="text-emerald-400">{activeDossierCandidate.percentile}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Audited Open Source Pull Requests:
              </h4>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeDossierCandidate.work_done.map((pr, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white font-mono">{pr.repo_name}</span>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Tier {pr.repo_tier} Reputed Repo
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{pr.pr_title}</p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.04]">
                      <span>Diff: +{pr.lines_added} / -{pr.lines_deleted} lines</span>
                      <span>Review Speed: {pr.turnaround_hours}h</span>
                      <a
                        href={pr.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                      >
                        <span>View PR Diff</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  const target = activeDossierCandidate;
                  setActiveDossierCandidate(null);
                  setPitchCandidate(target);
                  setCopiedPitch(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                <span>Draft Founder Pitch for this PR</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setActiveDossierCandidate(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCandidate(activeDossierCandidate);
                    setActiveDossierCandidate(null);
                    setShowRecruiterModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Unlock Contact</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 1-CLICK FOUNDER TECHNICAL COMPLIMENT OUTREACH ENGINE */}
      {pitchCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl glass-panel border border-violet-500/30 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setPitchCandidate(null)}
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
                <Sparkles className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-mono mb-1">
                  Founder-to-Engineer Pitch Engine · 80%+ Reply Rate
                </div>
                <h3 className="text-xl font-bold font-space text-white">
                  Technical Pitch for {pitchCandidate.name}
                </h3>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Generates an ego-stroking, hyper-targeted peer-to-peer message analyzing their exact PR in <strong className="text-white">{pitchCandidate.top_repos[0]}</strong>.
                </p>
              </div>
            </div>

            {/* Config Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0a0a0c] border border-white/[0.08] text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
                  <span>Your Company / Team Name:</span>
                </label>
                <input
                  type="text"
                  value={pitchCompany}
                  onChange={(e) => setPitchCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. Acme Infra"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-mono text-[11px]">Your Role / Title:</label>
                <input
                  type="text"
                  value={pitchSenderTitle}
                  onChange={(e) => setPitchSenderTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. CTO & Co-Founder"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-zinc-400 font-mono text-[11px]">Role & Target Comp:</label>
                <input
                  type="text"
                  value={pitchRole}
                  onChange={(e) => setPitchRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. Staff Distributed Systems Lead ($240k–$300k + equity)"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-zinc-400 font-mono text-[11px]">Your Core Technical Challenge (Symmetry Hook):</label>
                <input
                  type="text"
                  value={pitchChallenge}
                  onChange={(e) => setPitchChallenge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.1] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. scaling our low-latency distributed cluster architecture"
                />
              </div>

              {/* Pitch Tone Selector */}
              <div className="sm:col-span-2 pt-1 flex items-center gap-2 flex-wrap font-mono text-[11px]">
                <span className="text-zinc-400">Pitch Style:</span>
                <button
                  type="button"
                  onClick={() => setPitchTone("peer")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    pitchTone === "peer"
                      ? "bg-violet-600 text-white font-bold"
                      : "glass-card text-zinc-400 hover:text-white"
                  }`}
                >
                  Architecture Peer (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchTone("deep")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    pitchTone === "deep"
                      ? "bg-violet-600 text-white font-bold"
                      : "glass-card text-zinc-400 hover:text-white"
                  }`}
                >
                  Deep Technical Flattery (PR Diffs)
                </button>
                <button
                  type="button"
                  onClick={() => setPitchTone("coffee")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    pitchTone === "coffee"
                      ? "bg-violet-600 text-white font-bold"
                      : "glass-card text-zinc-400 hover:text-white"
                  }`}
                >
                  Fast 2-Line Coffee Chat
                </button>
              </div>
            </div>

            {/* Live Generated Message Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Generated Outreach Pitch (Ready to Send):</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  ✓ High-conversion peer format
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#09090b] border border-violet-500/20 space-y-3 font-mono text-xs text-zinc-200 selection:bg-violet-500/30">
                <div className="pb-2 border-b border-white/[0.06] text-zinc-300">
                  <span className="text-zinc-500">Subject: </span>
                  <strong className="text-white">{generatedPitch.subject}</strong>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed font-sans text-sm text-zinc-200">
                  {generatedPitch.body}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
              <div className="text-[11px] font-mono text-zinc-400">
                Direct Candidate Email: <span className="blur-[4px] select-none text-zinc-300">masked@private.dev</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `Subject: ${generatedPitch.subject}\n\n${generatedPitch.body}`;
                    navigator.clipboard.writeText(fullText);
                    setCopiedPitch(true);
                    setTimeout(() => setCopiedPitch(false), 2500);
                  }}
                  className="px-5 py-2.5 rounded-xl glass-panel border border-white/[0.15] hover:bg-white/[0.08] text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {copiedPitch ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Pitch!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-zinc-300" />
                      <span>Copy Pitch</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = pitchCandidate;
                    setPitchCandidate(null);
                    setSelectedCandidate(target);
                    setShowRecruiterModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer active:scale-[0.98]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Direct Email ($49/mo)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECRUITER CONTACT UNLOCK / PASS GATE */}
      {showRecruiterModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-blue-500/40 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <button
              type="button"
              onClick={() => setShowRecruiterModal(false)}
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
              <Briefcase className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-space text-white">
                Unlock Direct Contact for {selectedCandidate.name}
              </h3>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Connect directly with {selectedCandidate.name} via verified work email and LinkedIn.
              </p>
            </div>

            {/* Blurred Contact Preview */}
            <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08] space-y-2 text-left font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Email:
                </span>
                <span className="blur-[5px] select-none text-zinc-300">masked@private.dev</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-2">
                  <LinkedinIcon className="h-3.5 w-3.5" /> LinkedIn:
                </span>
                <span className="blur-[5px] select-none text-zinc-300">linkedin.com/in/private-url</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/pricing?tab=recruiter"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60"
              >
                <span>Get WorkDone Founder Pass ($49/mo)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-[11px] font-sans text-zinc-400">
                Includes 25 verified direct contact unlocks, ATS exports, and instant alerts when new Tier-S contributors open up.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
