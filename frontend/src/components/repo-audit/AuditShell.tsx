"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuditShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-transparent overflow-x-hidden">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <Link prefetch={false}
          href={`/${fullName}`}
          title="Back to repository"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {fullName}
        </Link>
        {children}
      </main>
    </div>
  );
}
