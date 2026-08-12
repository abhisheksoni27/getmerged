import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export default async function LegacyRepoPage({ params }: PageProps) {
  const { owner, name } = await params;
  redirect(`/${owner}/${name}`);
}
