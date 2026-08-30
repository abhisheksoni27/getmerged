import { NextRequest, NextResponse } from "next/server";
import { generateUserBadgeSvg, generateRepoBadgeSvg } from "@/lib/badge-generator";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;

  // Intercept user badges if caught by dynamic route pattern
  if (owner.toLowerCase() === "u") {
    const userSvg = await generateUserBadgeSvg(name);
    return new NextResponse(userSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml;charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const repoSvg = await generateRepoBadgeSvg(owner, name);
  return new NextResponse(repoSvg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml;charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
