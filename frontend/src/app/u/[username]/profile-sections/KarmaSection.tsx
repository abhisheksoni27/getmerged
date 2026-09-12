"use client";

import React from "react";
import { KarmaProfileBadge, type ContributorKarmaData } from "@/components/KarmaProfileBadge";
import { EmbedKarmaBadgeCard } from "@/components/EmbedKarmaBadgeCard";

interface KarmaSectionProps {
  slugOrUsername: string;
  initialKarma?: ContributorKarmaData | null;
}

export const KarmaSection: React.FC<KarmaSectionProps> = ({
  slugOrUsername,
  initialKarma = null,
}) => {
  if (!slugOrUsername) return null;
  return (
    <div className="mb-8 space-y-6">
      <KarmaProfileBadge username={slugOrUsername} initialKarma={initialKarma} />
      <EmbedKarmaBadgeCard
        username={slugOrUsername}
        karma={initialKarma?.total_karma}
        levelTitle={initialKarma?.rank?.title}
        badgeColor={initialKarma?.rank?.badge_color}
      />
    </div>
  );
};
