import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

export interface FitRadarData {
  language_match: number;
  onboarding_quality: number;
  first_timer_receptivity: number;
  review_speed: number;
  merge_probability: number;
  contributor_level: string;
}

export function useFitRadar(fullName: string | undefined) {
  const [fitRadar, setFitRadar] = useState<FitRadarData | null>(null);

  useEffect(() => {
    if (!fullName) {
      setFitRadar(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/fit-radar`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.fit_radar) {
          setFitRadar(data.fit_radar);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [fullName]);

  return { fitRadar };
}
