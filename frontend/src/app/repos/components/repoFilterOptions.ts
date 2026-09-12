export const LANGUAGES = [
  "All",
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
];

export interface StarBucket {
  label: string;
  value: string;
}

export const STAR_BUCKETS: StarBucket[] = [
  { label: "All Stars", value: "All" },
  { label: "< 5k ★", value: "<5k" },
  { label: "5k - 20k ★", value: "5k-20k" },
  { label: "20k - 50k ★", value: "20k-50k" },
  { label: "50k+ ★", value: "50k+" },
];

export interface TierOption {
  value: string;
  label: string;
}

export const TIER_OPTIONS: TierOption[] = [
  { value: "All", label: "All Tiers (S–D)" },
  { value: "S", label: "Tier S (Elite)" },
  { value: "A", label: "Tier A (Welcoming)" },
  { value: "B", label: "Tier B (Solid)" },
  { value: "C", label: "Tier C (Moderate)" },
  { value: "D", label: "Tier D (Risky)" },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    q: "Are these open-source metrics and rankings 100% free to access?",
    a: "Yes, completely free. GetMerged is built for the global developer and contributor community to make open-source contribution transparent and frictionless. You can browse, filter, inspect maintainer turnaround velocity, and track repository health without paywalls.",
  },
  {
    q: "How does GetMerged help first-time open-source contributors?",
    a: "We measure the First-Timer PR Acceptance Rate and scan for active beginner-friendly issues (good first issue, help wanted). This allows new contributors to identify projects where maintainers actively review and mentor external submissions rather than leaving PRs untouched.",
  },
  {
    q: "Why should I use C-Rank™ instead of just sorting by GitHub stars?",
    a: "GitHub stars reflect historical popularity rather than current maintainer availability. Many famous 50k+ star repositories suffer from maintainer burnout with massive unreviewed PR backlogs. C-Rank™ measures live reviewer responsiveness, external merge rates, and review turnaround times.",
  },
  {
    q: "How many welcoming repositories do you index across different languages?",
    a: "We actively evaluate over 1,400+ repositories across 20+ programming ecosystems. Our S-Tier (Super Welcoming) and A-Tier (Welcoming) catalog includes 350+ JavaScript & TypeScript projects, 280+ Python repos, 190+ Go tools, 120+ Rust systems, alongside high-velocity repositories in Java, C++, PHP, Kotlin, Swift, and more.",
  },
  {
    q: "Does GetMerged track private code or require repository write access?",
    a: "No. All metrics are calculated strictly from public GitHub events and public pull request activity without requesting code access or write permissions.",
  },
  {
    q: "How are repositories evaluated in this directory?",
    a: "Every repository is scored using our C-Rank™ algorithm. We track real maintainer PR response turnaround, external merge rates, first-timer acceptance rates, and active maintainer presence across thousands of GitHub projects.",
  },
  {
    q: "What does the C-Rank™ tier (S, A, B, C, D) mean?",
    a: "Tier S repositories are Super Welcoming with fast maintainer response (< 24h) and high merge rates. Tier A is Welcoming, Tier B is Active, Tier C is Selective, and Tier D indicates unmaintained backlogs or slow review times.",
  },
  {
    q: "How often is data updated?",
    a: "Our automated pipeline syncs daily from GitHub. Every repository page reflects the latest snapshot timestamp directly from GitHub.",
  },
  {
    q: "Can I request my repository to be indexed or re-scored?",
    a: "Yes! Submit your repository via our search bar on the homepage. If it is public on GitHub, it will be automatically queued and indexed in our daily evaluation cycle.",
  },
];
