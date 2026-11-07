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
  S: "bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold",
  A: "bg-sky-50 border border-sky-200 text-sky-800 font-bold",
  B: "bg-purple-50 border border-purple-200 text-purple-800 font-bold",
  C: "bg-amber-50 border border-amber-200 text-amber-800 font-bold",
  D: "bg-rose-50 border border-rose-200 text-rose-800 font-bold",
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
      className="mx-auto max-w-4xl rounded-2xl border border-zinc-200/90 bg-white p-7 sm:p-10 shadow-xs my-10 sm:my-14"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-sans">
          Find your first issue in 10 seconds
        </h2>
      </div>

      {!data && !error && (
        <>
          <p className="mt-2 text-sm text-zinc-600 font-sans leading-relaxed">
            Pick 2-3 languages you know - we&apos;ll instantly match you with top-ranked,
            beginner-welcoming repositories and live good first issues.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {QUIZ_LANGUAGES.map((lang) => {
              const active = selected.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  aria-pressed={active}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300"
                  }`}
                >
                  {displayNameFromSlug(lang)}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs font-mono text-zinc-400 font-medium">
            {selected.length}/3 selected (pick at least 2)
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUIZ_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                aria-pressed={level === l.value}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border ${
                  level === l.value
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300"
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
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-xs"
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
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
          <p className="text-sm font-medium text-rose-800">Matching is unavailable right now.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setError(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 shadow-2xs hover:bg-zinc-50 cursor-pointer"
            >
              Try again
            </button>
            <Link prefetch={false} href="/repos" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 shadow-2xs hover:bg-zinc-50">
              Browse all repos →
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.matches.length === 0 ? (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-8 text-center" data-testid="quiz-empty">
              <p className="text-sm font-medium text-zinc-700">{data.message || "No strong matches yet."}</p>
              <a
                href={githubAuthUrl(selected)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 shadow-xs"
              >
                Connect GitHub for full matching →
              </a>
              <button type="button" onClick={reset} className="ml-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer">
                Start over
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-6 space-y-3" data-testid="quiz-matches">
                {data.matches.map((m) => (
                  <li key={m.full_name} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/${m.full_name}`}
                        className="text-base font-bold text-zinc-900 hover:text-blue-600 font-sans tracking-tight"
                      >
                        {m.full_name}
                      </a>
                      <span className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-mono font-medium ${tierCls[m.c_rank_tier] ?? "border border-zinc-200 bg-zinc-100 text-zinc-700"}`}>
                        {m.c_rank_tier}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-sans leading-relaxed text-zinc-600">
                      {m.description || "No description available."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs font-sans text-zinc-500">
                      {m.language && <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-zinc-700 font-medium">{m.language}</span>}
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-zinc-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> {(m.stars || 0).toLocaleString()}
                      </span>
                      <span className="ml-auto font-mono text-zinc-500">C-Rank <strong className="text-zinc-900 font-bold">{Math.round(m.c_rank_score)}</strong></span>
                    </div>
                    {m.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                        {m.issues.map((issue) => (
                          <li key={issue.id} className="text-xs font-sans">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5">
                              <span>{issue.title}</span>
                              <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-2xs">
                <p className="text-xs font-bold text-zinc-900 font-sans">Save these matches &amp; unlock new-issue alerts</p>
                <p className="mt-1 text-xs text-zinc-500 font-sans">
                  One-click GitHub auth pre-fills your language profile so your dashboard feed is ready immediately.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={githubAuthUrl(selected)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-medium text-white shadow-xs"
                    data-testid="quiz-connect-github"
                  >
                    Connect with GitHub →
                  </a>
                  <button type="button" onClick={reset} className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer">
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
