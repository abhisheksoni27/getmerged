"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { KeyRound, BookOpen, ExternalLink } from "lucide-react";

interface SwaggerParam {
  name: string;
  in: string;
  type?: string;
  description?: string;
  required?: boolean;
}

interface SwaggerOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: SwaggerParam[];
  responses?: Record<string, { description?: string }>;
}

interface SwaggerSpec {
  info?: { title?: string; version?: string; description?: string };
  basePath?: string;
  paths: Record<string, Record<string, SwaggerOperation>>;
  securityDefinitions?: Record<string, { type?: string; name?: string; in?: string; description?: string }>;
}

const METHOD_STYLES: Record<string, string> = {
  get: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 border-emerald-300",
  post: "bg-sky-100 text-sky-800 border-sky-300",
  put: "bg-amber-500/15 border border-amber-500/30 text-amber-300 border-amber-300",
  patch: "bg-amber-500/15 border border-amber-500/30 text-amber-300 border-amber-300",
  delete: "bg-red-100 text-red-700 border-red-300",
};

export function DocsClient() {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/docs/swagger.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load API spec (${res.status})`);
        return res.json();
      })
      .then(setSpec)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load API spec"));
  }, []);

  const endpoints = useMemo(() => {
    if (!spec) return [];
    const out: Array<{ path: string; method: string; op: SwaggerOperation }> = [];
    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      // Internal endpoints are blocked by nginx externally - not part of the public API.
      if (path.startsWith("/internal")) continue;
      for (const [method, op] of Object.entries(methods)) {
        if (method === "parameters" || typeof op !== "object") continue;
        out.push({ path, method, op });
      }
    }
    out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    return out;
  }, [spec]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-6 w-6 text-emerald-600" />
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {spec?.info?.title ?? "Public API"} Docs
        </h1>
      </div>
      <p className="text-sm text-[var(--text-secondary)] max-w-3xl">
        {spec?.info?.description ??
          "Programmatic access to C-Rank™ scored repositories, rankings, and PR acceptance forecasts."}
      </p>

      {/* Authentication */}
      <section className="mt-8 rounded-xl border border-[var(--border-subtle)] glass-panel p-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
          <KeyRound className="h-4 w-4 text-emerald-600" /> Authentication
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Generate an API key in your{" "}
          <Link prefetch={false} href="/dashboard" className="text-emerald-400 font-semibold hover:underline">
            dashboard
          </Link>{" "}
          and pass it as a Bearer token on every request:
        </p>
        <pre className="mt-3 rounded-lg glass-card text-[var(--text-primary)] text-xs p-3 overflow-x-auto">
          curl -H &quot;Authorization: Bearer odk_yourkey&quot; {API_BASE_URL}/api/v1/repos?language=Go
        </pre>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
            <span className="font-bold">Free tier</span> - 60 requests/hour + 10 requests/min burst per key. Exceeding a
            limit returns <code className="rounded glass-card px-1">429</code> with{" "}
            <code className="rounded glass-card px-1">X-RateLimit-*</code> and{" "}
            <code className="rounded glass-card px-1">Retry-After</code> headers.
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-950/70 border-emerald-800/80 px-3 py-2 text-emerald-300">
            <span className="font-bold">Pro</span> - 600 requests/hour + 100 requests/min burst available on request for high-volume integrations.
          </div>
        </div>
        {spec?.securityDefinitions && Object.keys(spec.securityDefinitions).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {Object.entries(spec.securityDefinitions).map(([scheme, def]) => (
              <p key={scheme} className="text-xs text-[var(--text-secondary)]" data-testid="security-scheme">
                Security scheme <code className="rounded glass-card px-1 font-semibold">{scheme}</code>: apiKey in{" "}
                <code className="rounded glass-card px-1">{def.in}</code> header{" "}
                <code className="rounded glass-card px-1">{def.name}</code>
                {def.description ? ` - ${def.description}` : ""}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* Error codes */}
      <section className="mt-8 rounded-xl border border-[var(--border-subtle)] glass-panel p-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error codes</h2>
        <table className="w-full text-left text-xs text-[var(--text-secondary)]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="py-1 pr-3 font-semibold">HTTP</th>
              <th className="py-1 pr-3 font-semibold">Code</th>
              <th className="py-1 font-semibold">Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-50">
              <td className="py-1.5 pr-3 font-mono">401</td>
              <td className="py-1.5 pr-3 font-mono">ERR_MALFORMED_AUTH_HEADER</td>
              <td className="py-1">Authorization header missing the Bearer scheme or the odk_ key prefix.</td>
            </tr>
            <tr className="border-b border-zinc-50">
              <td className="py-1.5 pr-3 font-mono">401</td>
              <td className="py-1.5 pr-3 font-mono">ERR_INVALID_API_KEY</td>
              <td className="py-1">Key unknown or revoked - revocation takes effect immediately.</td>
            </tr>
            <tr className="border-b border-zinc-50">
              <td className="py-1.5 pr-3 font-mono">429</td>
              <td className="py-1.5 pr-3 font-mono">ERR_RATE_LIMITED</td>
              <td className="py-1">
                Hourly or per-minute burst cap hit; wait for the <code className="rounded glass-card px-1">Retry-After</code>{" "}
                seconds before retrying.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Endpoints */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Endpoints</h2>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}
        {!spec && !error && (
          <div className="text-sm text-[var(--text-secondary)] animate-pulse">Loading API specification…</div>
        )}
        <ul className="space-y-3">
          {endpoints.map(({ path, method, op }) => (
            <li key={`${method}-${path}`} className="rounded-xl border border-[var(--border-subtle)] glass-panel p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${
                    METHOD_STYLES[method] ?? "glass-card text-[var(--text-secondary)] border-[var(--border-subtle)]"
                  }`}
                >
                  {method}
                </span>
                <code className="text-sm font-semibold text-[var(--text-primary)]">{path}</code>
              </div>
              {op.summary && <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{op.summary}</p>}
              {op.description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{op.description}</p>}
              {op.parameters && op.parameters.length > 0 && (
                <table className="mt-2 w-full text-left text-[11px] text-[var(--text-secondary)]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-1 pr-3 font-semibold">Parameter</th>
                      <th className="py-1 pr-3 font-semibold">In</th>
                      <th className="py-1 pr-3 font-semibold">Type</th>
                      <th className="py-1 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.parameters.map((p) => (
                      <tr key={p.in + p.name} className="border-b border-zinc-50 last:border-0">
                        <td className="py-1 pr-3 font-mono">{p.name}{p.required && "*"}</td>
                        <td className="py-1 pr-3">{p.in}</td>
                        <td className="py-1 pr-3">{p.type ?? "string"}</td>
                        <td className="py-1">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-center text-[11px] text-[var(--text-secondary)]">
        Auto-generated from the OpenAPI 2.0 spec ({spec?.info?.version ?? "1.0"}).
      </p>
    </div>
  );
}
