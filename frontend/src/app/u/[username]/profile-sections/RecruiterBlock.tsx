"use client";

import React from "react";
import OpenToOpportunitiesToggle from "@/components/OpenToOpportunitiesToggle";
import { RecruiterContactSection } from "@/components/RecruiterContactSection";

interface RecruiterBlockProps {
  username: string;
  slug: string;
}

export const RecruiterBlock: React.FC<RecruiterBlockProps> = ({ username, slug }) => {
  if (!username || !slug) return null;
  return (
    <>
      <OpenToOpportunitiesToggle slug={slug} />
      {/* Section 12: Recruiter & Opportunities Direct Signal on GetMerged */}
      <RecruiterContactSection username={username} slug={slug} />
    </>
  );
};
