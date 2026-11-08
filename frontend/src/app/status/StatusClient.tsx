"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2, AlertCircle, RefreshCw, Server, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export function StatusClient() {
  const [healthStatus, setHealthStatus] = useState<string>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = async () => {
    setHealthStatus("checking");
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health`);
      const end = performance.now();
      if (res.ok) {
        setHealthStatus("healthy");
        setLatencyMs(Math.round(end - start));
      } else {
        setHealthStatus("degraded");
      }
    } catch {
      setHealthStatus("unhealthy");
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent ">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-1 w-full font-sans text-[var(--text-secondary)]">
        <Link prefetch={false}
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-base border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 font-space">
              <Server className="h-6 w-6 text-[var(--text-primary)]" />
              GetMerged System Status
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)] font-sans">
              Real-time API operational status, latency metrics, and backend service health checks.
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="inline-flex items-center gap-2 rounded-xl surface-base border border-[var(--border-subtle)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:surface-elevated transition-all self-start sm:self-auto shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthStatus === "checking" ? "animate-spin text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} />
            Refresh Status
          </button>
        </div>

        {/* Global Operational Status Banner */}
        <div
          className={`rounded-xl p-6 mb-8 flex items-center justify-between border shadow-xs transition-all backdrop-blur-md ${
            healthStatus === "healthy"
              ? "bg-[rgba(63,185,80,0.1)] border-[rgba(63,185,80,0.3)] text-[var(--green-bright)]"
              : healthStatus === "degraded"
              ? "bg-[rgba(210,153,34,0.15)] border-[rgba(210,153,34,0.3)] text-[var(--amber-bright)]"
              : healthStatus === "unhealthy"
              ? "bg-[rgba(248,81,73,0.15)] border-[rgba(248,81,73,0.3)] text-[#F85149]"
              : "bg-[#0D111A] border-[var(--border-subtle)] text-[var(--text-primary)]"
          }`}
        >
          <div className="flex items-center gap-4">
            {healthStatus === "healthy" && <CheckCircle2 className="h-8 w-8 text-[var(--green-bright)] shrink-0" />}
            {healthStatus === "degraded" && <AlertCircle className="h-8 w-8 text-[var(--amber-bright)] shrink-0" />}
            {healthStatus === "unhealthy" && <AlertCircle className="h-8 w-8 text-[#F85149] shrink-0" />}
            {healthStatus === "checking" && <RefreshCw className="h-8 w-8 text-[var(--text-secondary)] animate-spin shrink-0" />}

            <div>
              <h2 className="text-lg font-bold font-space text-[var(--text-primary)]">
                {healthStatus === "healthy" && "All Systems Operational"}
                {healthStatus === "degraded" && "Degraded API Performance"}
                {healthStatus === "unhealthy" && "System Outage Detected"}
                {healthStatus === "checking" && "Pinging API Health Endpoint..."}
              </h2>
              <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
                {lastChecked ? `Last checked at ${lastChecked}` : "Connecting to backend health check..."}
              </p>
            </div>
          </div>

          {latencyMs !== null && (
            <div className="hidden sm:flex flex-col items-end font-mono">
              <span className="text-xl font-bold text-[var(--green-bright)]">{latencyMs} ms</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-sans">Latency</span>
            </div>
          )}
        </div>

        {/* Service Health Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 font-sans">
          <div className="rounded-xl bg-[rgba(17,24,39,0.7)] p-6 shadow-xs border border-[var(--border-subtle)] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-2 font-space text-sm">
                <Zap className="h-4 w-4 text-[var(--purple-bright)]" /> API Services
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[rgba(63,185,80,0.15)] text-[var(--green-bright)] border border-[rgba(63,185,80,0.3)]">
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              Repository scoring, telemetry analysis, and ranking query engine.
            </p>
          </div>

          <div className="rounded-xl bg-[rgba(17,24,39,0.7)] p-6 shadow-xs border border-[var(--border-subtle)] backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-2 font-space text-sm">
                <ShieldCheck className="h-4 w-4 text-[var(--green-bright)]" /> In-Memory Cache
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[rgba(63,185,80,0.15)] text-[var(--green-bright)] border border-[rgba(63,185,80,0.3)]">
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              High-throughput edge caching and automated score invalidation layer.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
