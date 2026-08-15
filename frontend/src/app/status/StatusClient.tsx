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
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-1 w-full font-sans text-zinc-800">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-3 font-space">
              <Server className="h-6 w-6 text-zinc-900" />
              GetMerged System Status
            </h1>
            <p className="mt-1 text-xs text-zinc-500 font-sans">
              Real-time API operational status, latency metrics, and backend service health checks.
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-all self-start sm:self-auto shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthStatus === "checking" ? "animate-spin text-zinc-900" : "text-zinc-500"}`} />
            Refresh Status
          </button>
        </div>

        {/* Global Operational Status Banner */}
        <div
          className={`rounded-3xl p-6 mb-8 flex items-center justify-between border shadow-xs transition-all ${
            healthStatus === "healthy"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : healthStatus === "degraded"
              ? "bg-amber-50/80 border-amber-200 text-amber-900"
              : healthStatus === "unhealthy"
              ? "bg-rose-50/80 border-rose-200 text-rose-900"
              : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          <div className="flex items-center gap-4">
            {healthStatus === "healthy" && <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />}
            {healthStatus === "degraded" && <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />}
            {healthStatus === "unhealthy" && <AlertCircle className="h-8 w-8 text-rose-600 shrink-0" />}
            {healthStatus === "checking" && <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin shrink-0" />}

            <div>
              <h2 className="text-lg font-bold font-space">
                {healthStatus === "healthy" && "All Systems Operational"}
                {healthStatus === "degraded" && "Degraded API Performance"}
                {healthStatus === "unhealthy" && "System Outage Detected"}
                {healthStatus === "checking" && "Pinging API Health Endpoint..."}
              </h2>
              <p className="text-xs font-sans text-zinc-600 mt-0.5">
                {lastChecked ? `Last checked at ${lastChecked}` : "Connecting to backend health check..."}
              </p>
            </div>
          </div>

          {latencyMs !== null && (
            <div className="hidden sm:flex flex-col items-end font-mono">
              <span className="text-xl font-bold text-emerald-700">{latencyMs} ms</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">Latency</span>
            </div>
          )}
        </div>

        {/* Service Health Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 font-sans">
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-zinc-200/80">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-zinc-900 flex items-center gap-2 font-space text-sm">
                <Zap className="h-4 w-4 text-amber-500" /> API Services
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Repository scoring, telemetry analysis, and ranking query engine.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xs border border-zinc-200/80">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-zinc-900 flex items-center gap-2 font-space text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> In-Memory Cache
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              High-throughput edge caching and automated score invalidation layer.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
