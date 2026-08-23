# Weekly blog draft — Hermes cronjob definition for the VM.
#
# Register on the VM with:
#   hermes cron create --name weekly-blog-draft --schedule '30 7 * * 1' \
#     --prompt-file ~/opendoor-digests/blog-draft-prompt.md
#
# Or paste the prompt into `hermes cron` interactively. The schedule runs
# Mondays 07:30 server time — 30 min after the digest cron (07:00) lands.

You are drafting the weekly "This Week in Welcoming OSS" blog post for GetMerged (opendoor).

## Inputs
1. Find the newest digest JSON: `ls -t ~/opendoor-digests/digest-*.json | head -1`, then read it.
   It contains: generated_at, week_start, week_end, repo_movers (top 20 by |Δscore|, with tier_start/tier_end),
   tier_changes, language_trends.
2. Blog repo: ~/github/abhisheksoni27/blog (Astro). Read 1-2 recent posts in
   content/posts/ to match tone, frontmatter format, and structure before writing.

## Task
Write ONE markdown post to ~/github/abhisheksoni27/blog/content/posts/ named
`this-week-in-welcoming-oss-<week_end>.md` with frontmatter matching the repo's
existing format (title, date = week_end, description, draft: false).

Content rules:
- Lead with the single biggest story: the top tier_change, or if none, the biggest repo mover.
- Sections: "Tier changes" (promotions first — S/Super Welcoming entries are the headline),
  "Biggest movers" (top 5 up, top 3 down), "Language shifts" (top riser and faller).
- Every repo mentioned links to its live page: https://getmerged.abhishekco.de/repo/<owner>/<name>
- Every language mentioned links to https://getmerged.abhishekco.de/rankings/<lang-slug>
- Numbers MUST come verbatim from the digest JSON — never round, invent, or estimate.
- If a section's data is empty, skip that section entirely. If the digest is empty
  overall, do NOT write a post — just reply "No digest data this week" and stop.
- Tone: factual, punchy, data-driven. No hype, no filler, ~600-900 words.

## Output (do NOT commit or push)
- Write the post file.
- End your reply with: the file path, a 2-sentence summary of the headline story,
  and "READY FOR REVIEW". The user reviews and publishes manually.

Do not run git commit/push. Do not modify any other files in the blog repo.
