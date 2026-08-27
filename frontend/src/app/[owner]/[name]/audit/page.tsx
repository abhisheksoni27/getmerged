import { RepoAuditReport } from "@/components/RepoAuditReport";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export default async function RepoAuditPage({ params }: PageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  return <RepoAuditReport owner={owner} name={name} fullName={fullName} />;
}
