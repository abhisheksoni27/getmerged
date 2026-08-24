import { NextRequest, NextResponse } from "next/server";
import { saveEvaluation, getEvaluation, PREvaluationPayload } from "@/lib/pr-eval-store";

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
  return NextResponse.json(evalData);
}
