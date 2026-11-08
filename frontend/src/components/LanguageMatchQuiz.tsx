"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2, Star, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface QuizMatchIssue {
  id: number;
  title: string;
  url: string;
  created_at?: string;
  comment_count?: number;
}

interface QuizMatchRepo {
  full_name: string;
  description: string;
  language: string;
  stars: number;
  c_rank_score: number;
  c_rank_tier: string;
  issues: QuizMatchIssue[];
}

interface QuizResponse {
  matches: QuizMatchRepo[];
  languages: string[];
  level: string;
  total_candidates: number;
  message?: string;
}

const QUIZ_LANGUAGES = [
  "python",
  "typescript",
  "javascript",
  "go",
  "rust",
  "java",
  "cpp",
  "csharp",
  "ruby",
  "php",
  "kotlin",
  "swift",
] as const;

const QUIZ_LEVELS = [
  { value: "new_to_open_source", label: "New to open source" },
  { value: "few_prs_merged", label: "A few PRs merged" },
  { value: "regular_contributor", label: "Regular contributor" },
] as const;

function displayNameFromSlug(slug: string): string {
  const map: Record<string, string> = {
    python: "Python",
    typescript: "TypeScript",
    javascript: "JavaScript",
    go: "Go",
    rust: "Rust",
    java: "Java",
    cpp: "C++",
    csharp: "C#",
    ruby: "Ruby",
    php: "PHP",
    kotlin: "Kotlin",
    swift: "Swift",
  };
  return map[slug] ?? slug;
}

const tierCls: Record<string, string> = {
  S: "border border-[var(--purple-bright)] text-[var(--purple-bright)] bg-purple-500/10",
  A: "border border-[var(--green-bright)] text-[var(--green-bright)] bg-emerald-500/10",
  B: "border border-[var(--accent-warning)] text-[var(--accent-warning)] bg-amber-500/10",
  C: "border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-white/5",
  D: "border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-white/5",
};

export function LanguageMatchQuiz() {
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState<string>("new_to_open_source");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuizResponse | null>(null);
  const [error, setError] = useState(false);

  const toggleLang = (lang: string) => {
    if (selected.includes(lang)) {
      setSelected(selected.filter((l) => l !== lang));
    } else {
      if (selected.length >= 3) return;
      setSelected([...selected, lang]);
    }
  };

  const handleFind = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams();
      selected.forEach((l) => qs.append("languages", l));
      qs.set("level", level);
      const res = await fetch(`${API_BASE_URL}/api/v1/repos/match-quiz?${qs.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const json: QuizResponse = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setSelected([]);
    setLevel("new_to_open_source");
    setError(false);
  };

  return (
    <section
      aria-label="Language match quiz"
      data-testid="language-match-quiz"
      className="mx-auto max-w-4xl card p-6 sm:p-8 my-10 sm:my-14"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Sparkles className="h-5 w-5 text-[var(--purple-bright)]" />
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] font-space">
          Find your first issue in 10 seconds
        </h2>
      </div>

      {!data && !error && (
        <>
          <p className="mt-1 text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            Pick 2-3 languages you know - we&apos;ll instantly match you with top-ranked,
            beginner-welcoming repositories and live good first issues.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUIZ_LANGUAGES.map((lang) => {
              const active = selected.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  aria-pressed={active}
                  className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-[var(--text-primary)] text-[#04060A] border-[var(--text-primary)] font-bold shadow-xs"
                      : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {displayNameFromSlug(lang)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-mono text-[var(--text-tertiary)] font-medium">
            {selected.length}/3 selected (pick at least 2)
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUIZ_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                aria-pressed={level === l.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border ${
                  level === l.value
                    ? "bg-[var(--text-primary)] text-[#04060A] border-[var(--text-primary)] font-bold shadow-xs"
                    : "bg-[#0D111A] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={selected.length < 2 || loading}
              onClick={handleFind}
              data-testid="quiz-submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--purple-bright)] px-5 py-2.5 text-xs font-mono font-bold text-[#04060A] hover:brightness-110 transition-all disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding matches...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Show my matches
                </>
              )}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-950/20 p-6 text-center">
          <p className="text-xs font-mono text-rose-300">Matching is temporarily unavailable.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setError(false)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[#0D111A] px-4 py-2 text-xs font-mono text-[var(--text-primary)] hover:border-[var(--border-hover)] cursor-pointer"
            >
              Try again
            </button>
            <Link prefetch={false} href="/repos" className="rounded-lg border border-[var(--border-subtle)] bg-[#0D111A] px-4 py-2 text-xs font-mono text-[var(--text-primary)] hover:border-[var(--border-hover)]">
              Browse all repos →
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.matches.length === 0 ? (
            <div className="mt-6 rounded-lg border border-[var(--border-subtle)] bg-[#0D111A] p-8 text-center" data-testid="quiz-empty">
              <p className="text-xs font-mono text-[var(--text-secondary)]">{data.message || "No strong matches yet."}</p>
              <button type="button" onClick={reset} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--purple-bright)] px-4 py-2 text-xs font-mono font-bold text-[#04060A]">
                Start over
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-6 space-y-3" data-testid="quiz-matches">
                {data.matches.map((m) => (
                  <li key={m.full_name} className="p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/${m.full_name}`}
                        className="text-sm font-bold font-mono text-[var(--text-primary)] hover:text-[var(--purple-bright)] transition-colors"
                      >
                        {m.full_name}
                      </a>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-mono font-bold ${tierCls[m.c_rank_tier] ?? "border border-[var(--border-subtle)] text-[var(--text-secondary)]"}`}>
                        {m.c_rank_tier}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-sans leading-relaxed text-[var(--text-secondary)]">
                      {m.description || "No description available."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs font-mono text-[var(--text-tertiary)]">
                      {m.language && <span className="pill">{m.language}</span>}
                      <span className="inline-flex items-center gap-1 font-mono text-[var(--text-secondary)]">
                        <Star className="h-3.5 w-3.5 fill-[#C4910A] text-[#C4910A]" /> {(m.stars || 0).toLocaleString()}
                      </span>
                      <span className="ml-auto font-mono text-[var(--text-tertiary)]">Score <strong className="text-[var(--text-primary)]">{Math.round(m.c_rank_score)}</strong></span>
                    </div>
                    {m.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                        {m.issues.map((issue) => (
                          <li key={issue.id} className="text-xs font-sans">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
                              <span>{issue.title}</span>
                              <ExternalLink className="h-3 w-3 text-[var(--text-tertiary)] shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 p-4 bg-[#0D111A] border border-[var(--border-subtle)] rounded-lg">
                <button type="button" onClick={reset} className="text-xs font-mono text-[var(--purple-bright)] hover:underline cursor-pointer">
                  ← Retake quiz
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
