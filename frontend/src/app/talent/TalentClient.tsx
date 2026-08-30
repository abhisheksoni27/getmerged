"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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

const INITIAL_CANDIDATES: CandidateProfile[] = [
  {
    id: "cand-1",
    username: "alexrivera-eng",
    name: "Alex Rivera",
    avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4",
    headline: "Staff Systems Engineer · Kubernetes, Envoy & Cilium Contributor",
    bio: "Focused on high-throughput network dataplanes, eBPF telemetry, and kernel-level network proxies. 8+ years building distributed cloud infrastructure.",
    location: "San Francisco, CA (Remote)",
    timezone: "UTC-7 (PST)",
    primary_language: "Go",
    languages: ["Go", "C++", "Rust", "eBPF"],
    total_karma: 4250,
    level: 5,
    level_title: "Core OSS Legend",
    percentile: "Top 1% Worldwide",
    badge_color: "#10b981",
    open_to_work: true,
    work_type_preference: "Staff / Lead",
    maintainer_trust_rating: 4.95,
    merged_prs_count: 24,
    top_repos: ["kubernetes/kubernetes", "envoyproxy/envoy", "cilium/cilium"],
    email: "alex.rivera@staff-infra.dev",
    linkedin: "https://linkedin.com/in/alexrivera-systems",
    work_done: [
      {
        repo_name: "kubernetes/kubernetes",
        repo_tier: "S",
        pr_title: "kube-proxy: optimize iptables rule synchronization throughput for 5k+ nodes",
        pr_url: "https://github.com/kubernetes/kubernetes/pull/118242",
        lines_added: 840,
        lines_deleted: 310,
        turnaround_hours: 18,
        merged_at: "2 weeks ago",
      },
      {
        repo_name: "envoyproxy/envoy",
        repo_tier: "S",
        pr_title: "http: reduce memory overhead in streaming buffer chunk allocation",
        pr_url: "https://github.com/envoyproxy/envoy/pull/28914",
        lines_added: 420,
        lines_deleted: 115,
        turnaround_hours: 12,
        merged_at: "1 month ago",
      },
      {
        repo_name: "cilium/cilium",
        repo_tier: "S",
        pr_title: "bpf: fix conntrack table entry race condition during rapid pod migration",
        pr_url: "https://github.com/cilium/cilium/pull/24180",
        lines_added: 195,
        lines_deleted: 42,
        turnaround_hours: 8,
        merged_at: "2 months ago",
      },
    ],
  },
  {
    id: "cand-2",
    username: "priyasharma-dev",
    name: "Priya Sharma",
    avatar_url: "https://avatars.githubusercontent.com/u/2048552?v=4",
    headline: "Senior Frontend Architect · Next.js, Turborepo & Tailwind Contributor",
    bio: "React and Next.js performance specialist. Architected zero-CLS server-side component rendering systems for high-scale e-commerce products.",
    location: "Bengaluru, India (Remote)",
    timezone: "UTC+5:30 (IST)",
    primary_language: "TypeScript",
    languages: ["TypeScript", "React", "Rust", "Node.js"],
    total_karma: 2890,
    level: 4,
    level_title: "Senior Open-Source Engineer",
    percentile: "Top 5% Worldwide",
    badge_color: "#3b82f6",
    open_to_work: true,
    work_type_preference: "Full-Time",
    maintainer_trust_rating: 4.88,
    merged_prs_count: 16,
    top_repos: ["vercel/next.js", "tailwindlabs/tailwindcss", "shadcn-ui/ui"],
    email: "priya.sharma@fullstack-lead.io",
    linkedin: "https://linkedin.com/in/priya-sharma-dev",
    work_done: [
      {
        repo_name: "vercel/next.js",
        repo_tier: "S",
        pr_title: "app-router: improve streaming SSR payload hydration speed for nested suspense trees",
        pr_url: "https://github.com/vercel/next.js/pull/62114",
        lines_added: 620,
        lines_deleted: 190,
        turnaround_hours: 14,
        merged_at: "5 days ago",
      },
      {
        repo_name: "tailwindlabs/tailwindcss",
        repo_tier: "S",
        pr_title: "v4-oxide: optimize container query CSS generation parser in Rust",
        pr_url: "https://github.com/tailwindlabs/tailwindcss/pull/14102",
        lines_added: 340,
        lines_deleted: 85,
        turnaround_hours: 22,
        merged_at: "3 weeks ago",
      },
    ],
  },
  {
    id: "cand-3",
    username: "marcus-vance-rs",
    name: "Marcus Vance",
    avatar_url: "https://avatars.githubusercontent.com/u/3819201?v=4",
    headline: "Rust Core & Distributed DB Engineer · Tokio & DataFusion Contributor",
    bio: "Low-latency systems developer specializing in async runtime internals, column-oriented database execution engines, and WebAssembly.",
    location: "Berlin, Germany (Remote / Hybrid)",
    timezone: "UTC+1 (CET)",
    primary_language: "Rust",
    languages: ["Rust", "C++", "Go", "SQL"],
    total_karma: 3410,
    level: 4,
    level_title: "Senior Open-Source Engineer",
    percentile: "Top 5% Worldwide",
    badge_color: "#3b82f6",
    open_to_work: true,
    work_type_preference: "Full-Time",
    maintainer_trust_rating: 4.92,
    merged_prs_count: 19,
    top_repos: ["tokio-rs/tokio", "apache/arrow-datafusion", "vectordotdev/vector"],
    email: "marcus@rustacean.org",
    linkedin: "https://linkedin.com/in/marcus-vance-rust",
    work_done: [
      {
        repo_name: "tokio-rs/tokio",
        repo_tier: "S",
        pr_title: "io: zero-copy ringbuffer implementation for vectorized socket I/O",
        pr_url: "https://github.com/tokio-rs/tokio/pull/6201",
        lines_added: 512,
        lines_deleted: 140,
        turnaround_hours: 16,
        merged_at: "1 week ago",
      },
      {
        repo_name: "apache/arrow-datafusion",
        repo_tier: "S",
        pr_title: "physical-plan: parallelize Parquet bloom filter evaluation across worker partitions",
        pr_url: "https://github.com/apache/arrow-datafusion/pull/9812",
        lines_added: 730,
        lines_deleted: 210,
        turnaround_hours: 26,
        merged_at: "1 month ago",
      },
    ],
  },
  {
    id: "cand-4",
    username: "elena-rostova",
    name: "Elena Rostova",
    avatar_url: "https://avatars.githubusercontent.com/u/4910283?v=4",
    headline: "AI Infrastructure & ML Systems · vLLM & PyTorch Contributor",
    bio: "Optimizing GPU kernel dispatch, FlashAttention integration, and high-throughput speculative decoding for LLM inference engines.",
    location: "Austin, TX (Remote)",
    timezone: "UTC-5 (CST)",
    primary_language: "Python",
    languages: ["Python", "CUDA", "C++", "PyTorch"],
    total_karma: 3880,
    level: 5,
    level_title: "Core OSS Legend",
    percentile: "Top 1% Worldwide",
    badge_color: "#10b981",
    open_to_work: true,
    work_type_preference: "Staff / Lead",
    maintainer_trust_rating: 4.98,
    merged_prs_count: 22,
    top_repos: ["vllm-project/vllm", "pytorch/pytorch", "huggingface/transformers"],
    email: "elena@ml-systems.ai",
    linkedin: "https://linkedin.com/in/elena-rostova-ai",
    work_done: [
      {
        repo_name: "vllm-project/vllm",
        repo_tier: "S",
        pr_title: "attention: implement PagedAttention chunked prefill pipelining for multi-GPU nodes",
        pr_url: "https://github.com/vllm-project/vllm/pull/5820",
        lines_added: 940,
        lines_deleted: 320,
        turnaround_hours: 10,
        merged_at: "4 days ago",
      },
      {
        repo_name: "huggingface/transformers",
        repo_tier: "S",
        pr_title: "quantization: support 4-bit AWQ weight dequantization kernels on modern CUDA architectures",
        pr_url: "https://github.com/huggingface/transformers/pull/31940",
        lines_added: 480,
        lines_deleted: 95,
        turnaround_hours: 15,
        merged_at: "3 weeks ago",
      },
    ],
  },
  {
    id: "cand-5",
    username: "davidkim-backend",
    name: "David Kim",
    avatar_url: "https://avatars.githubusercontent.com/u/5829104?v=4",
    headline: "Backend & Storage Engineer · Gin, Redis-Go & Postgres Contributor",
    bio: "Microservices performance, distributed locking protocols, and database connection pooling. 6+ years shipping high-availability APIs.",
    location: "Seattle, WA (Remote)",
    timezone: "UTC-7 (PST)",
    primary_language: "Go",
    languages: ["Go", "SQL", "Docker", "gRPC"],
    total_karma: 1640,
    level: 4,
    level_title: "Senior Open-Source Engineer",
    percentile: "Top 5% Worldwide",
    badge_color: "#3b82f6",
    open_to_work: true,
    work_type_preference: "Full-Time",
    maintainer_trust_rating: 4.82,
    merged_prs_count: 11,
    top_repos: ["gin-gonic/gin", "redis/go-redis", "jackc/pgx"],
    email: "david@backend-infra.io",
    linkedin: "https://linkedin.com/in/david-kim-backend",
    work_done: [
      {
        repo_name: "gin-gonic/gin",
        repo_tier: "A",
        pr_title: "context: reuse sync.Pool buffers during multi-part file stream parsing",
        pr_url: "https://github.com/gin-gonic/gin/pull/3840",
        lines_added: 210,
        lines_deleted: 65,
        turnaround_hours: 24,
        merged_at: "2 weeks ago",
      },
      {
        repo_name: "jackc/pgx",
        repo_tier: "S",
        pr_title: "pool: add jittered exponential backoff during sudden RDS failover",
        pr_url: "https://github.com/jackc/pgx/pull/1820",
        lines_added: 175,
        lines_deleted: 40,
        turnaround_hours: 14,
        merged_at: "1 month ago",
      },
    ],
  },
];

export function TalentClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedMinKarma, setSelectedMinKarma] = useState<number>(0);
  const [openToWorkOnly, setOpenToWorkOnly] = useState<boolean>(true);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [showRecruiterModal, setShowRecruiterModal] = useState<boolean>(false);
  const [activeDossierCandidate, setActiveDossierCandidate] = useState<CandidateProfile | null>(null);

  const languagesList = ["All", "Go", "TypeScript", "Rust", "Python", "C++"];

  const filteredCandidates = useMemo(() => {
    return INITIAL_CANDIDATES.filter((c) => {
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
        const matchesHeadline = c.headline.toLowerCase().includes(q);
        const matchesBio = c.bio.toLowerCase().includes(q);
        const matchesRepos = c.top_repos.some((r) => r.toLowerCase().includes(q));
        const matchesLang = c.languages.some((l) => l.toLowerCase().includes(q));
        if (!matchesName && !matchesHeadline && !matchesBio && !matchesRepos && !matchesLang) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedLang, selectedMinKarma, openToWorkOnly]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="rounded-3xl glass-panel border border-blue-500/30 p-8 sm:p-12 bg-gradient-to-br from-blue-950/40 via-zinc-950/90 to-zinc-900/50 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
          <Briefcase className="h-4 w-4" />
          <span>WorkDone Database · by GetMerged</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Stop Screening Resumes. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
            Search Developers by Work Done.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed font-sans">
          Resumes are full of claims. <strong>WorkDone Database</strong> is full of proof. Search senior software engineers indexed by actual pull requests merged into active, audited open-source codebases.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing?tab=recruiter"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60 cursor-pointer active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            <span>Unlock WorkDone Recruiter Pass ($49/mo)</span>
          </Link>
          <button
            type="button"
            onClick={() => setActiveDossierCandidate(INITIAL_CANDIDATES[0])}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl glass-panel border border-white/[0.14] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Inspect Sample Work Dossier</span>
            <ArrowRight className="h-4 w-4" />
          </button>
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
            Every candidate card links to exact GitHub commits and merged PRs reviewed by core maintainers.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-zinc-950/60 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-white">
            2. Proof-of-Work Karma
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Filter by verified reputation score. A Level 4+ engineer has proven merges across multiple Tier-S codebases.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] bg-zinc-950/60 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold font-space text-white">
            3. Active Availability Only
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Connect directly with high-signal developers who explicitly toggled <strong>&ldquo;Open to Opportunities&rdquo;</strong>.
          </p>
        </div>
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
              Search by target codebase, language ecosystem, Karma score, or architecture keywords.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Showing <strong className="text-white">{filteredCandidates.length}</strong> verified engineers</span>
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
              placeholder="Search by repo (e.g. 'kubernetes', 'next.js'), skill, or candidate name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0a0a0c] border border-white/[0.1] text-white text-sm font-sans placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1"
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
            <div className="p-12 text-center rounded-2xl glass-panel border border-white/[0.08] text-zinc-400 font-mono text-sm">
              No verified candidates found matching your filters. Try clearing the search query or selecting &quot;All&quot; ecosystems.
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
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0 lg:w-48">
                  <button
                    type="button"
                    onClick={() => setActiveDossierCandidate(cand)}
                    className="px-4 py-2.5 rounded-xl glass-panel border border-white/[0.14] hover:bg-white/[0.08] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer active:scale-[0.98]"
                  >
                    <Lock className="h-3.5 w-3.5" />
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
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white"
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

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveDossierCandidate(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Unlock Contact Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECRUITER CONTACT UNLOCK / PASS GATE */}
      {showRecruiterModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-blue-500/40 bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <button
              type="button"
              onClick={() => setShowRecruiterModal(false)}
              className="absolute right-5 top-5 p-2 rounded-full glass-card text-zinc-400 hover:text-white"
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
                <span className="blur-[5px] select-none text-zinc-300">alex.rivera@private.dev</span>
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
                <span>Get WorkDone Recruiter Pass ($49/mo)</span>
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
