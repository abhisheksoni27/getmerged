import { RepoAuditReport } from "@/components/RepoAuditReport";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  return {
    title: `Maintainer Review Health & C-Rank™ Report for ${fullName} | GetMerged`,
    description: `Detailed pull request review turnaround, merge rates, beginner friendliness, and maintainer insights for ${fullName}.`,
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
      <section className="sr-only" aria-label="Maintainer Review Health Report">
        <h1>Maintainer Review Health & C-Rank™ Report for ${fullName}</h1>
        <p>Detailed pull request turnaround, review speed breakdown, outside merge rates, and first-time contributor report for {fullName}.</p>
      </section>
      <RepoAuditReport owner={owner} name={name} fullName={fullName} />
    </>
  );
}
