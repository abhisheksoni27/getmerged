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
  S: "bg-[#FACC15] border-2 border-black text-black font-black",
  A: "bg-[#10B981] border-2 border-black text-black font-black",
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
      className="mx-auto max-w-4xl rounded-none border-2 border-black bg-white p-6 sm:p-10 shadow-[4px_4px_0px_0px_#000] my-8 sm:my-10"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Sparkles className="h-5 w-5 text-black" />
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black font-display">
          Find your first issue in 10 seconds
        </h2>
      </div>

      {!data && !error && (
        <>
          <p className="mt-2 text-xs sm:text-sm text-neutral-800 font-mono leading-relaxed">
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
                  className={`rounded-none px-3.5 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer border-2 border-black ${
                    active
                      ? "bg-black text-[#FACC15] shadow-none translate-x-0.5 translate-y-0.5"
                      : "bg-[#FFFDF8] text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#F4F4EE]"
                  }`}
                >
                  {displayNameFromSlug(lang)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-mono text-neutral-600 font-bold uppercase">
            {selected.length}/3 selected (pick at least 2)
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {QUIZ_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                aria-pressed={level === l.value}
                className={`rounded-none px-3.5 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer border-2 border-black ${
                  level === l.value
                    ? "bg-black text-white shadow-none translate-x-0.5 translate-y-0.5"
                    : "bg-[#FFFDF8] text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#F4F4EE]"
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
              className="inline-flex items-center gap-2 rounded-none bg-[#FACC15] px-6 py-3 text-xs sm:text-sm font-black font-mono uppercase text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:bg-black hover:text-[#FACC15] transition-all disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
        <div className="mt-5 rounded-none border-2 border-dashed border-[#EF4444] bg-[#FFFDF8] p-6 text-center shadow-[2px_2px_0px_0px_#000]">
          <p className="text-xs font-mono font-bold text-black uppercase">Matching is unavailable right now.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setError(false)}
              className="rounded-none border-2 border-black bg-white px-4 py-2 text-xs font-mono font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15] cursor-pointer"
            >
              Try again
            </button>
            <Link prefetch={false} href="/repos" className="rounded-none border-2 border-black bg-white px-4 py-2 text-xs font-mono font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FACC15]">
              Browse all repos →
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          {data.matches.length === 0 ? (
            <div className="mt-5 rounded-none border-2 border-dashed border-black bg-[#FFFDF8] p-8 text-center shadow-[2px_2px_0px_0px_#000]" data-testid="quiz-empty">
              <p className="text-xs font-mono font-bold text-black uppercase">{data.message || "No strong matches yet."}</p>
              <a
                href={githubAuthUrl(selected)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-none border-2 border-black bg-[#FACC15] px-4 py-2.5 text-xs font-mono font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-black hover:text-[#FACC15]"
              >
                Connect GitHub for full matching →
              </a>
              <button type="button" onClick={reset} className="ml-3 text-xs font-mono font-bold text-black hover:underline cursor-pointer uppercase">
                Start over
              </button>
            </div>
          ) : (
            <>
              <ul className="mt-5 space-y-3" data-testid="quiz-matches">
                {data.matches.map((m) => (
                  <li key={m.full_name} className="rounded-none border-2 border-black bg-white p-5 shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/${m.full_name}`}
                        className="text-base font-black text-black hover:text-[#2563EB] font-mono uppercase tracking-tight"
                      >
                        {m.full_name}
                      </a>
                      <span className={`shrink-0 rounded-none px-2.5 py-0.5 text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] ${tierCls[m.c_rank_tier] ?? "border-2 border-black bg-neutral-200 text-black"}`}>
                        {m.c_rank_tier}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-mono leading-relaxed text-neutral-800">
                      {m.description || "No description available."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs font-mono text-neutral-700">
                      {m.language && <span className="rounded-none border border-black bg-[#FFFDF8] px-2 py-0.5 font-bold uppercase text-black">{m.language}</span>}
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-black">
                        <Star className="h-3.5 w-3.5 fill-[#FACC15] text-black" /> {(m.stars || 0).toLocaleString()}
                      </span>
                      <span className="ml-auto font-mono text-neutral-700">C-Rank <strong className="text-black font-black">{Math.round(m.c_rank_score)}</strong></span>
                    </div>
                    {m.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t-2 border-black pt-3">
                        {m.issues.map((issue) => (
                          <li key={issue.id} className="text-xs font-mono">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="font-bold text-neutral-800 hover:text-black hover:underline flex items-center gap-1">
                              <span>{issue.title}</span>
                              <ExternalLink className="h-3 w-3 text-black shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-none border-2 border-black bg-[#FFFDF8] p-5 shadow-[3px_3px_0px_0px_#000]">
                <p className="text-xs font-black uppercase tracking-wider text-black font-mono">Save these matches &amp; unlock new-issue alerts</p>
                <p className="mt-1 text-xs text-neutral-800 font-mono">
                  One-click GitHub auth pre-fills your language profile so your dashboard feed is ready immediately.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={githubAuthUrl(selected)}
                    className="inline-flex items-center gap-1.5 rounded-none bg-[#10B981] hover:bg-black hover:text-[#10B981] border-2 border-black px-4 py-2 text-xs font-mono font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]"
                    data-testid="quiz-connect-github"
                  >
                    Connect with GitHub →
                  </a>
                  <button type="button" onClick={reset} className="text-xs font-mono font-bold text-black hover:underline cursor-pointer uppercase">
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
