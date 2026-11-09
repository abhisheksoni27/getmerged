import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache on edge/Next.js for 1 hour

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GetMerged-App",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch("https://api.github.com/repos/abhisheksoni27/getmerged", {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Fallback if rate-limited or error
      return Response.json(
        { stars: 1 },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }

    const data = await res.json();
    const stars = typeof data.stargazers_count === "number" ? data.stargazers_count : 1;

    return Response.json(
      { stars },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return Response.json(
      { stars: 1 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  }
}
