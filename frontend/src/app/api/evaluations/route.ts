import { NextRequest, NextResponse } from "next/server";
import { saveEvaluation, getEvaluation, PREvaluationPayload } from "@/lib/pr-eval-store";
import { getEvalOutcome, backendBase } from "@/lib/eval-outcome-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id || !body.repo) {
      return NextResponse.json({ error: "id and repo are required" }, { status: 400 });
    }

    const payload: PREvaluationPayload = {
      id: String(body.id),
      repo: String(body.repo),
      pr_number: body.pr_number ? Number(body.pr_number) : null,
      score: Number(body.score) || 0,
      verdict: String(body.verdict || "ADJUSTMENTS RECOMMENDED"),
      referrer_id: body.referrer_id ? String(body.referrer_id) : null,
      timestamp: Number(body.timestamp) || Date.now(),
    };

    saveEvaluation(payload);

    // Register the join key with the backend so prtracker sync can attach the
    // verified outcome later (AC4). Best-effort: sharing must never fail
    // because outcome tracking is unavailable.
    try {
      await fetch(`${backendBase()}/api/v1/pr-evals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eval_id: payload.id,
          repo: payload.repo,
          pr_number: payload.pr_number ?? 0,
          score: payload.score,
          timestamp: payload.timestamp,
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch (e) {
      console.warn("pr-eval registration skipped:", e);
    }

    return NextResponse.json({ success: true, id: payload.id });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const evalData = getEvaluation(id);
  if (!evalData) {
    return NextResponse.json({ error: "not found or expired" }, { status: 404 });
  }
  // Attach the verified outcome so dashboard cards render the same verdict
  // field as share pages and OG images (AC5).
  const outcome = await getEvalOutcome(id);
  return NextResponse.json(outcome ? { ...evalData, outcome } : evalData);
}
