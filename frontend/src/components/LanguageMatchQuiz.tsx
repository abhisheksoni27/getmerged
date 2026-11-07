"use client";

import React, { useState } from "react";
import { Sparkles, Star, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { displayNameFromSlug } from "@/lib/languageSlug";

const QUIZ_LANGUAGES = [
  "python",
  "typescript",
  "javascript",
  "go",
  "rust",
  "java",
  "csharp",
  "cpp",
  "ruby",
  "php",
  "kotlin",
  "swift",
];

const QUIZ_LEVELS = [
  { value: "beginner", label: "New to open source" },
  { value: "intermediate", label: "A few PRs merged" },
  { value: "advanced", label: "Regular contributor" },
];

interface QuizIssue {
  id: number;
  title: string;
  url: string;
  repo_full_name: string;
  language: string;
}

interface QuizMatch {
  full_name: string;
  language: string;
  stars: number;
  description: string;
  github_url: string;
  c_rank_tier: string;
  c_rank_score: number;
  issues: QuizIssue[];
}

interface QuizData {
  matches: QuizMatch[];
  message?: string;
}

const tierCls: Record<string, string> = {
  S: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300",
  A: "bg-sky-500/15 border border-sky-500/30 text-sky-300",
};

function githubAuthUrl(langs: string[]): string {
  const params = new URLSearchParams();
  if (langs.length > 0) {
    params.set("languages", langs.join(","));
  }
  params.set("source", "quiz");
  const qs = params.toString();
  return `${API_BASE_URL}/api/v1/auth/github${qs ? `?${qs}` : ""}`;
}

export function LanguageMatchQuiz() {
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState<string>("beginner");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuizData | null>(null);
  const [error, setError] = useState(false);

  const toggleLang = (lang: string) => {
    setSelected((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : prev.length < 3
        ? [...prev, lang]
        : prev
    );
  };

  const handleFind = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.set("languages", selected.join(","));
      params.set("level", level);
      const res = await fetch(`${API_BASE_URL}/api/public/quiz-match?${params.toString()}`);
      if (!res.ok) {
        setError(true);
        setData(null);
        return;
      }
      const body = (await res.json()) as QuizData;
      setData(body && Array.isArray(body.matches) ? body : { matches: [] });
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(false);
  };

  return (
    <section
      aria-label="Language match quiz"
      data-testid="language-match-quiz"
      className="mx-auto max-w-4xl rounded-3xl border border-[var(--border-subtle)] glass-panel p-6 sm:p-10 shadow-2xl my-8 sm:my-10"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-space">
          Find your first issue in 10 seconds
        </h2>
      </div>

      {!data && !error && (
        <>
          <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed">
            Pick 2-3 languages you know - we&apos;ll instantly match you with top-ranked,
            beginner-welcoming repositories and live good first issues.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {QUIZ_LANGUAGES.map((lang) => {
              const active = selected.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-500 text-black font-bold shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                      : "border border-[var(--border-subtle)] bg-white/[0.05] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {displayNameFromSlug(lang)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-mono text-[var(--text-secondary)]">
            {selected.length}/3 selected (pick at least 2)
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {QUIZ_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                aria-pressed={level === l.value}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  level === l.value
                    ? "bg-white/[0.16] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"
                    : "border border-[var(--border-subtle)] bg-white/[0.03] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="mt-7">
            <button
              type="button"
              disabled={selected.length < 2 || loading}
              onClick={handleFind}
              data-testid="quiz-submit"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-xs sm:text-sm font-bold font-mono text-[var(--text-primary)] transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg cursor-pointer active:scale-[0.98]"
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
        <div className="mt-5 rounded-2xl border border-dashed border-rose-500/30 glass-panel p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Matching is unavailable right now.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setError(false)}
              className="rounded-xl glass-card px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-zinc-800 cursor-pointer"
            >
              Try again
            </button>
            <Link prefetch={false} href="/repos" className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-subtle)]">
              Browse all repos →
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.matches.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-subtle)] glass-panel p-8 text-center" data-testid="quiz-empty">
              <p className="text-sm text-[var(--text-secondary)]">{data.message || "No strong matches yet."}</p>
              <a
                href={githubAuthUrl(selected)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl glass-card px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-zinc-800"
              >
                Connect GitHub for full matching →
              </a>
              <button type="button" onClick={reset} className="ml-3 text-xs font-semibold text-emerald-400 hover:underline cursor-pointer">
                Start over
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-5 space-y-3" data-testid="quiz-matches">
                {data.matches.map((m) => (
                  <li key={m.full_name} className="rounded-2xl border border-[var(--border-subtle)] glass-panel p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/${m.full_name}`}
                        className="text-base font-bold text-[var(--text-primary)] hover:text-orange-400 font-space"
                      >
                        {m.full_name}
                      </a>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${tierCls[m.c_rank_tier] ?? "glass-card text-[var(--text-secondary)] border border-[var(--border-subtle)]"}`}>
                        {m.c_rank_tier}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                      {m.description || "No description available."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {m.language && <span className="rounded-md glass-card px-2 py-0.5 font-medium capitalize text-[var(--text-primary)]">{m.language}</span>}
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {(m.stars || 0).toLocaleString()}
                      </span>
                      <span className="ml-auto font-mono text-[var(--text-secondary)]">C-Rank <strong className="text-[var(--text-primary)]">{Math.round(m.c_rank_score)}</strong></span>
                    </div>
                    {m.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                        {m.issues.map((issue) => (
                          <li key={issue.id} className="text-xs">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--text-secondary)] hover:text-emerald-400 flex items-center gap-1">
                              <span>{issue.title}</span>
                              <ExternalLink className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-dashed border-emerald-400/40 glass-panel p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Save these matches &amp; unlock new-issue alerts</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  One-click GitHub auth pre-fills your language profile so your dashboard feed is ready immediately.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={githubAuthUrl(selected)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-sm"
                    data-testid="quiz-connect-github"
                  >
                    Connect with GitHub →
                  </a>
                  <button type="button" onClick={reset} className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer">
                    Retake quiz
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
