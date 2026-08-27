import { RepoAuditReport } from "@/components/RepoAuditReport";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  return {
    title: `Deep Maintainer Audit & C-Rank™ Diagnostics for ${fullName} | GetMerged`,
    description: `Inspect detailed telemetry breakdown, review turnaround bottlenecks, first-timer hospitality metrics, and maintainer persona insights for ${fullName}.`,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/${fullName}/audit`,
    },
  };
}

export default async function RepoAuditPage({ params }: PageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  return (
    <>
      <section className="sr-only" aria-label="Maintainer Telemetry Audit Report">
        <h1>Deep Maintainer Audit & C-Rank™ Diagnostics for {fullName}</h1>
        <p>Comprehensive pull request turnaround, maintainer latency breakdown, review friction analysis, and first-timer conversion diagnostic report for {fullName}.</p>
      </section>
      <RepoAuditReport owner={owner} name={name} fullName={fullName} />
    </>
  );
}
