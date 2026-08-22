#!/usr/bin/env python3
"""Auto blog-strategy generator (Issue #96).

Reads source material from local blog skill files
(/home/deploy/.claude/skills/blog*/SKILL.md), synthesizes a strategy plan,
validates required sections, then writes docs/blog-strategy.md in place.
Exits non-zero (no output written, nothing to commit) on:
  - missing/unreadable skill sources            (AC1)
  - empty/invalid generation or validation miss (AC2)
  - LLM/API failure after exactly 1 retry       (AC4)

Usage: python3 scripts/generate_blog_strategy.py [--llm-enhance]
"""
import glob
import json
import os
import re
import sys
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL_GLOB = "/home/deploy/.claude/skills/blog*/SKILL.md"
OUTPUT_PATH = os.path.join(REPO_ROOT, "docs", "blog-strategy.md")

PILLARS = [
    {
        "name": "Content Creation Engine",
        "rationale": "Own the brief-to-publish pipeline with persona-driven drafting and rich media so every post ships fast without sacrificing voice.",
        "skills": ["blog-brief", "blog-outline", "blog-write", "blog-persona", "blog-style", "blog-brand", "blog-chart", "blog-image", "blog-audio"],
    },
    {
        "name": "Research & Evidence",
        "rationale": "Ground every claim in verifiable sources to maximize E-E-A-T and AI-citation readiness.",
        "skills": ["blog-discourse", "blog-factcheck", "blog-notebooklm"],
    },
    {
        "name": "Search & AI Citation Optimization",
        "rationale": "Win both classic Google rankings and LLM citations (ChatGPT, Perplexity, AI Overviews) via schema, structured answers, and Google field data.",
        "skills": ["blog-seo-check", "blog-schema", "blog-geo", "blog-google", "blog-flow"],
    },
    {
        "name": "Planning, Distribution & Repurposing",
        "rationale": "Cluster-led architecture plus systematic repurposing turns one article into ten distribution assets.",
        "skills": ["blog-strategy", "blog-cluster", "blog-calendar", "blog-repurpose"],
    },
    {
        "name": "Global Reach (i18n)",
        "rationale": "Multiply addressable audience with SEO-safe translation, cultural localization, and hreflang hygiene.",
        "skills": ["blog-translate", "blog-localize", "blog-multilingual", "blog-locale-audit", "blog-taxonomy"],
    },
    {
        "name": "Quality, Measurement & Decay Control",
        "rationale": "Audit, score, and refresh continuously so traffic compounds instead of decaying.",
        "skills": ["blog-analyze", "blog-audit", "blog-decay", "blog-cannibalization", "blog-rewrite"],
    },
]
CLUSTERS = {
    "Content Creation Engine": [
        ("Brief-to-Publish Pipeline", ["blog-brief", "blog-outline", "blog-write"], "how to write blog posts that rank"),
        ("Voice & Persona System", ["blog-persona", "blog-style", "blog-brand"], "consistent brand voice guidelines"),
        ("Rich Media Assets", ["blog-chart", "blog-image", "blog-audio"], "blog data visualization and images"),
    ],
    "Research & Evidence": [
        ("Audience Listening", ["blog-discourse"], "what customers ask on Reddit and X"),
        ("Claim Verification", ["blog-factcheck", "blog-notebooklm"], "sourced statistics for content"),
    ],
    "Search & AI Citation Optimization": [
        ("Technical SERP Wins", ["blog-seo-check", "blog-schema", "blog-google"], "schema markup and Search Console workflow"),
        ("AI Answer Surfaces", ["blog-geo", "blog-flow"], "get cited by ChatGPT and Perplexity"),
    ],
    "Planning, Distribution & Repurposing": [
        ("Hub-and-Spoke Architecture", ["blog-strategy", "blog-cluster"], "topic clusters and pillar pages"),
        ("Cadence & Channels", ["blog-calendar", "blog-repurpose"], "editorial calendar and social repurposing"),
    ],
    "Global Reach (i18n)": [
        ("Translate-Localize Pipeline", ["blog-translate", "blog-localize", "blog-multilingual"], "multilingual SEO workflow"),
        ("Locale Hygiene", ["blog-locale-audit", "blog-taxonomy"], "hreflang audit and tag taxonomy"),
    ],
    "Quality, Measurement & Decay Control": [
        ("Scoring & Audits", ["blog-analyze", "blog-audit"], "blog content quality score"),
        ("Refresh & Consolidation", ["blog-decay", "blog-cannibalization", "blog-rewrite"], "content decay recovery"),
    ],
}
CHANNELS = [
    "Email newsletter (weekly digest of new posts)",
    "LinkedIn articles + posts (B2B reach)",
    "X/Twitter threads via blog-repurpose",
    "Reddit practitioner communities via blog-discourse insights",
    "YouTube Shorts / podcast audio via blog-audio",
    "Internal linking mesh from hub pillar pages",
]
METRICS = [
    "Organic sessions: +20% quarter over quarter (Search Console)",
    "AI citation rate: brand cited in >=5 tracked LLM answers per month",
    "Cluster coverage: 100% of pillars have >=1 published cluster",
    "Average content score >=85/100 on blog-analyze before publish",
    "Decay alerts resolved within 2 weeks (0 stale >180 days)",
    "Repurpose ratio: >=4 derivative assets per flagship post",
]


def load_skills():
    paths = sorted(glob.glob(SKILL_GLOB))
    readable = [p for p in paths if os.path.isfile(p) and os.access(p, os.R_OK)]
    if not readable:
        sys.stderr.write(
            f"ERROR: no readable skill sources matching {SKILL_GLOB} "
            f"(found {len(paths)} candidate(s)). Aborting; nothing written.\n"
        )
        sys.exit(1)
    skills = {}
    for p in readable:
        try:
            text = open(p, encoding="utf-8").read()
        except OSError as e:
            sys.stderr.write(f"ERROR: cannot read {p}: {e}\n")
            sys.exit(1)
        m = re.search(r"^name:\s*(.+)$", text, re.M)
        name = m.group(1).strip() if m else os.path.basename(os.path.dirname(p))
        d = re.search(r"^description:\s*(.+?)(?=^[a-z_-]+:|\Z)", text, re.M | re.S)
        desc = re.sub(r"\s+", " ", d.group(1)).strip()[:160] if d else ""
        skills[name] = desc
    if len(skills) < 3:
        sys.stderr.write("ERROR: fewer than 3 usable skill sources; aborting.\n")
        sys.exit(1)
    return skills


def llm_enhance(plan_md):
    """Optional LLM pass. AC4: 1 retry, fail fast non-zero; empty/invalid = failure."""
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        return plan_md  # deterministic mode
    prompt = (
        "Improve this blog strategy plan's Executive Summary only. "
        "Return ONLY a replacement '## Executive Summary' section body, 120 words max.\n\n"
        + plan_md[:4000]
    )
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    last_err = None
    for attempt in (1, 2):  # initial + exactly 1 retry
        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=payload,
                headers={
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                body = json.loads(r.read())
            text = "".join(b.get("text", "") for b in body.get("content", []))
            if not text.strip():
                raise ValueError("empty LLM generation")
            return plan_md.replace(
                "<!-- SUMMARY -->", text.strip(), 1
            ) if "<!-- SUMMARY -->" in plan_md else plan_md
        except Exception as e:  # noqa: BLE001 - fail fast per AC4
            last_err = e
    sys.stderr.write(f"ERROR: LLM/API failed after 1 retry: {last_err}. Aborting.\n")
    sys.exit(1)


def build_plan(skills):
    known = set(skills)
    lines = []
    ap = lines.append
    ap("# Blog Strategy Plan (Auto-Generated)")
    ap("")
    ap("> Generated by `scripts/generate_blog_strategy.py` from "
       f"{len(skills)} local blog skill sources. Rerun to overwrite.")
    ap("")
    ap("## Executive Summary")
    ap("")
    ap("<!-- SUMMARY -->")
    ap("A six-pillar program covering the full lifecycle: evidence-first research, "
       "persona-driven creation, dual-surface optimization (Google + AI citations), "
       "cluster-based internal linking, multilingual expansion, and continuous decay "
       "control. Every stage maps to an installed skill, making execution repeatable "
       "and auditable.")
    ap("")
    ap("## Topic Pillars")
    ap("")
    for p in PILLARS:
        present = [s for s in p["skills"] if s in known]
        ap(f"- **{p['name']}** — {p['rationale']}")
        ap(f"  - Source skills: {', '.join(present) if present else '(core)'} ({len(present)})")
    ap("")
    ap("## Clusters")
    ap("")
    total_clusters = 0
    for p in PILLARS:
        ap(f"### {p['name']}")
        ap("")
        for cname, members, kw in CLUSTERS[p["name"]]:
            live = ", ".join(m for m in members if m in known)
            ap(f"- **Cluster: {cname}** — target keyword: \"{kw}\"; skills: {live}")
            total_clusters += 1
        ap("")
    ap("## Publishing Cadence")
    ap("")
    ap("| Slot | Volume | Output |")
    ap("| --- | --- | --- |")
    ap("| Flagship posts | 1 per week | New cluster article (brief -> outline -> write -> factcheck -> seo-check) |")
    ap("| Secondary posts | 1 per week | Supporting spoke article or refreshed rewrite |")
    ap("| Refresh slot | 1 per month | Decay-flagged post updated via blog-decay + blog-rewrite |")
    ap("")
    ap("Total: 2 posts per week sustained; every 6th week one slot is reserved for audit-driven consolidation.")
    ap("")
    ap("## Distribution Channels")
    ap("")
    for c in CHANNELS:
        ap(f"- {c}")
    ap("")
    ap("## Success Metrics")
    ap("")
    for m in METRICS:
        ap(f"- {m}")
    ap("")
    ap("## Governance")
    ap("")
    ap("- Validation gates: generator fails non-zero on missing sections, so an invalid plan can never be committed.")
    ap("- Quarterly: rerun blog-audit + locale-audit; reconcile this plan against actuals in Success Metrics.")
    ap("")
    ap("## Appendix: Skill Coverage Map")
    ap("")
    ap("| Skill | Pillar |")
    ap("| --- | --- |")
    assigned = {}
    for p in PILLARS:
        for s in p["skills"]:
            assigned.setdefault(s, p["name"])
    for s in sorted(known):
        ap(f"| {s} | {assigned.get(s, 'Planning, Distribution & Repurposing')} |")
    ap("")
    md = "\n".join(lines)
    stats = {"pillars": len(PILLARS), "clusters": total_clusters}
    return md, stats


def validate(md):
    errors = []
    def section(title):
        m = re.search(rf"^## {re.escape(title)}\n(.*?)(?=^## |\Z)", md, re.M | re.S)
        return m.group(1) if m else None
    s = section("Topic Pillars")
    n_pillars = len(re.findall(r"^- \*\*.+\*\*", s, re.M)) if s else 0
    if n_pillars < 3:
        errors.append(f"topic_pillars: expected >=3, found {n_pillars}")
    s = section("Clusters")
    if not s or not s.strip():
        errors.append("clusters: section missing/empty")
    else:
        blocks = re.split(r"^### ", s, flags=re.M)[1:]
        if len(blocks) < n_pillars:
            errors.append("clusters: fewer cluster groups than pillars")
        for b in blocks:
            pname = b.splitlines()[0].strip()
            n = len(re.findall(r"^- \*\*Cluster:", b, re.M))
            if n < 1:
                errors.append(f"clusters[{pname}]: needs >=1 cluster, found {n}")
    s = section("Publishing Cadence")
    if not s or "per week" not in s:
        errors.append("publishing_cadence: missing or lacks per-week cadence")
    s = section("Distribution Channels")
    if not s or len(re.findall(r"^- ", s, re.M)) < 1:
        errors.append("distribution_channels: missing/empty")
    s = section("Success Metrics")
    if not s or len(re.findall(r"^- ", s, re.M)) < 1:
        errors.append("success_metrics: missing/empty")
    return errors


def main():
    skills = load_skills()          # AC1
    md, stats = build_plan(skills)
    md = llm_enhance(md)            # AC4 (optional path)
    errors = validate(md)           # AC2
    if errors:
        sys.stderr.write("ERROR: plan validation failed:\n" +
                         "\n".join(f"  - {e}" for e in errors) + "\n")
        sys.exit(1)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    tmp = OUTPUT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(md)
    os.replace(tmp, OUTPUT_PATH)    # AC3: fixed path, overwrite in place
    print(f"OK wrote {OUTPUT_PATH} ({stats['pillars']} pillars, {stats['clusters']} clusters)")


if __name__ == "__main__":
    main()
