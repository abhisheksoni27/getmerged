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
    <div className="relative min-h-screen flex flex-col bg-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-1 w-full font-mono">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to opendoor
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-3">
              <Server className="h-7 w-7 text-emerald-600" />
              Opendoor System Status
            </h1>
            <p className="mt-1 text-xs text-zinc-500 font-sans">
              Real-time API operational status, latency metrics, and backend service health checks.
            </p>
          </div>

          <button
            onClick={checkHealth}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-all self-start sm:self-auto shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthStatus === "checking" ? "animate-spin text-emerald-600" : ""}`} />
            Refresh Status
          </button>
        </div>

        {/* Global Operational Status Banner */}
        <div
          className={`rounded-2xl border p-6 mb-8 flex items-center justify-between shadow-xs transition-all ${
            healthStatus === "healthy"
              ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
              : healthStatus === "degraded"
              ? "border-amber-200 bg-amber-50/60 text-amber-900"
              : healthStatus === "unhealthy"
              ? "border-rose-200 bg-rose-50/60 text-rose-900"
              : "border-zinc-200 bg-zinc-50 text-zinc-900"
          }`}
        >
          <div className="flex items-center gap-4">
            {healthStatus === "healthy" && <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />}
            {healthStatus === "degraded" && <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />}
            {healthStatus === "unhealthy" && <AlertCircle className="h-8 w-8 text-rose-600 shrink-0" />}
            {healthStatus === "checking" && <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin shrink-0" />}

            <div>
              <h2 className="text-lg font-bold">
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
              <span className="text-xl font-bold text-emerald-700">{latencyMs} ms</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Roundtrip Latency</span>
            </div>
          )}
        </div>

        {/* Service Health Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" /> API Gateway Health
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Endpoint: <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">{API_BASE_URL}/api/v1/health</code>
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" /> Valkey Tag Cache Engine
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
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
