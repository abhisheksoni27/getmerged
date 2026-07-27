import HomeClient from "./HomeClient";
import type { MacroStats } from "@/types/opendoor";

async function getMacroStats(): Promise<MacroStats | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://opendoor.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/stats/macro`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.stats || null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialStats = await getMacroStats();
  return <HomeClient initialStats={initialStats} />;
}
