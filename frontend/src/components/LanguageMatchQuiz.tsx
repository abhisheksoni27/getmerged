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
  S: "bg-emerald-950/80 border-emerald-800/80 text-emerald-300 border border-emerald-300",
  A: "bg-sky-100 text-sky-800 border border-sky-300",
};

function githubAuthUrl(langs: string[]): string {
  const params = new URLSearchParams();
  params.set("quiz_langs", langs.join(","));
  return `${API_BASE_URL}/api/v1/auth/github?${params.toString()}`;
}

// LanguageMatchQuiz is an anonymous onboarding widget: pick 2-3 languages and
// an experience level to instantly see matched S/A repos + good first issues
// via the public /api/public/quiz-match endpoint. Saving results / alerts /
// extra languages require one-click GitHub auth, which pre-seeds the language
// snapshot so /dashboard's ForYou feed is populated from day one.
export function LanguageMatchQuiz() {
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<QuizData | null>(null);

  const toggleLang = (lang: string) => {
    setSelected((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : prev.length >= 3
          ? prev
          : [...prev, lang],
    );
    setError(false);
  };

  const runQuiz = async () => {
    if (selected.length < 2 || loading) return;
    setLoading(true);
    setError(false);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(
        `${API_BASE_URL}/api/public/quiz-match?languages=${encodeURIComponent(selected.join(","))}&level=${level}`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
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
      className="mx-auto max-w-3xl rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold tracking-tight text-zinc-100 font-space">
          Find your first issue in 10 seconds
        </h2>
      </div>

      {!data && !error && (
        <>
          <p className="mt-2 text-sm text-zinc-400">
            Pick 2-3 languages you know - we&apos;ll instantly match you with top-ranked,
            beginner-welcoming repositories and live good first issues.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUIZ_LANGUAGES.map((lang) => {
              const active = selected.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-white/[0.12] bg-[#111827] text-zinc-300 hover:border-emerald-400 hover:text-emerald-400"
                  }`}
                >
                  {displayNameFromSlug(lang)}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] font-mono text-zinc-400">
            {selected.length}/3 selected (pick at least 2)
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUIZ_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                aria-pressed={level === l.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  level === l.value
                    ? "bg-[#1e293b] text-white"
                    : "border border-white/[0.12] bg-[#111827] text-zinc-400 hover:border-white/[0.18]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runQuiz}
            disabled={selected.length < 2 || loading}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {loading ? "Matching…" : "Show my matches"}
          </button>
        </>
      )}

      {/* Fetch/network failure fallback - never crashes, always offers a path */}
      {error && (
        <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-[#111827]/70 p-6 text-center">
          <p className="text-sm text-zinc-400">Matching is unavailable right now.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setError(false)}
              className="rounded-lg bg-[#1e293b] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Try again
            </button>
            <Link href="/repos" className="rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-white/[0.18]">
              Browse all repos →
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.matches.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/[0.12] bg-[#111827]/60 p-8 text-center" data-testid="quiz-empty">
              <p className="text-sm text-zinc-400">{data.message || "No strong matches yet."}</p>
              <a
                href={githubAuthUrl(selected)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Connect GitHub for full matching →
              </a>
              <button type="button" onClick={reset} className="ml-2 text-xs font-semibold text-emerald-400 hover:underline">
                Start over
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-3" data-testid="quiz-matches">
                {data.matches.map((m) => (
                  <li key={m.full_name} className="rounded-xl border border-white/[0.08] bg-[#111827] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/repo/${m.full_name}`}
                        className="text-sm font-semibold text-zinc-100 hover:text-emerald-400"
                      >
                        {m.full_name}
                      </a>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${tierCls[m.c_rank_tier] ?? "bg-[#1e293b] text-zinc-300 border border-white/[0.12]"}`}>
                        {m.c_rank_tier}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {m.description || "No description available."}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                      {m.language && <span className="rounded-full bg-[#1e293b] px-2 py-0.5 font-medium capitalize">{m.language}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" /> {(m.stars || 0).toLocaleString()}
                      </span>
                      <span className="ml-auto font-mono">C-Rank {Math.round(m.c_rank_score)}</span>
                    </div>
                    {m.issues.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-3">
                        {m.issues.map((issue) => (
                          <li key={issue.id} className="text-xs">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-200 hover:text-emerald-400">
                              {issue.title} <ExternalLink className="inline h-3 w-3 text-zinc-400" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-xl border border-dashed border-emerald-400 bg-[#111827]/70 p-4">
                <p className="text-sm font-semibold text-zinc-100">Save these matches &amp; unlock new-issue alerts</p>
                <p className="mt-1 text-xs text-zinc-400">
                  One-click GitHub auth pre-fills your language profile so your dashboard feed is ready immediately.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={githubAuthUrl(selected)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                    data-testid="quiz-connect-github"
                  >
                    Connect with GitHub →
                  </a>
                  <button type="button" onClick={reset} className="text-xs font-semibold text-emerald-400 hover:underline">
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
