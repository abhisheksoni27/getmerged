export function buildPrompt(fullName: string, badgeMarkdownUrl?: string): string {
  const repoUrl = `https://getmerged.abhishekco.de/${fullName}`;
  const badgeUrl = badgeMarkdownUrl || `https://getmerged.abhishekco.de/badge/${fullName}.svg`;
  const badgeSnippet = `[![GetMerged C-Rank](${badgeUrl})](${repoUrl})`;

  return `Add the GetMerged C-Rank™ maintainer badge to the top of our repository README.md (right below the main title/hero section):

\`\`\`markdown
${badgeSnippet}
\`\`\`

Why:
- Shows contributors that our repo actively reviews and merges external pull requests.
- Displays our live C-Rank scorecard and response time metrics directly from ${repoUrl}.`;
}
