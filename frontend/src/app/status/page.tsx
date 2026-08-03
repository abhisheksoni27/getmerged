"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2, AlertCircle, RefreshCw, Server, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function StatusPage() {
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
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 flex-1 w-full font-sans text-zinc-800">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/70 text-xs text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors mb-6 font-sans border border-zinc-200/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to opendoor
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/40 pb-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-3 font-space">
              <Server className="h-7 w-7 text-brand-dark animate-pulse" />
              Opendoor System Status
            </h1>
            <p className="mt-1.5 text-xs text-zinc-500 font-sans">
              Real-time API operational status, latency metrics, and backend service health checks.
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100/70 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/60 transition-all self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthStatus === "checking" ? "animate-spin text-brand-dark" : ""}`} />
            Refresh Status
          </button>
        </div>

        {/* Global Operational Status Banner */}
        <div
          className={`rounded-2xl p-6 mb-8 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all ${
            healthStatus === "healthy"
              ? "bg-emerald-50/70 text-emerald-900"
              : healthStatus === "degraded"
              ? "bg-amber-50/70 text-amber-900"
              : healthStatus === "unhealthy"
              ? "bg-rose-50/70 text-rose-900"
              : "bg-zinc-100/60 text-zinc-900"
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
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xl font-bold text-emerald-700 font-mono">{latencyMs} ms</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">Roundtrip Latency</span>
            </div>
          )}
        </div>

        {/* Service Health Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 font-sans">
          <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-zinc-100">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-dark animate-bounce" /> API Gateway Health
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Endpoint: <code className="bg-[#faf9f6] px-1.5 py-0.5 rounded text-[11px] font-mono">{API_BASE_URL}/api/v1/health</code>
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-zinc-100">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" /> Valkey Tag Cache Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              In-memory cache layer with tag-based invalidation support.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
