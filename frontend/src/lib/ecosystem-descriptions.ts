export interface EcosystemMetadata {
  title: string;
  description: string;
  headline: string;
  tagline: string;
}

const ECOSYSTEM_METADATA: Record<string, EcosystemMetadata> = {
  go: {
    title: "Best Go Open Source Repos Ranked by Maintainer Response (2026) | GetMerged",
    description: "Top Golang backend, cloud-native, and CLI projects ranked by contributor merge likelihood and review turnaround.",
    headline: "Go (Golang) Ecosystem",
    tagline: "Cloud infrastructure, backend engines, and developer CLIs with active maintainer triage.",
  },
  typescript: {
    title: "Best TypeScript Open Source Repos Ranked by Maintainer Response (2026) | GetMerged",
    description: "Discover top TypeScript repositories where external pull requests get reviewed fast and merged reliably.",
    headline: "TypeScript & JavaScript Ecosystem",
    tagline: "Modern fullstack, UI component, and tooling repositories welcoming external PRs.",
  },
  javascript: {
    title: "Top JavaScript Open Source Projects Welcoming PRs | GetMerged",
    description: "Discover JavaScript repositories where your pull requests won't sit neglected. Benchmark maintainer velocity and first-timer acceptance.",
    headline: "JavaScript Ecosystem",
    tagline: "Vibrant node modules, React/Vue components, and client-side utilities with responsive maintainers.",
  },
  python: {
    title: "Best Python Open Source Repos Ranked by Maintainer Response (2026) | GetMerged",
    description: "Browse the top Python open-source repositories scored by PR merge velocity, reviewer responsiveness, and first-time contributor success on C-Rank™.",
    headline: "Python Open Source Ecosystem",
    tagline: "High-velocity data science, web framework, and automation projects with welcoming maintainers.",
  },
  rust: {
    title: "Best Rust Open Source Repos Ranked by Maintainer Response (2026) | GetMerged",
    description: "High-performance systems programming and CLI crates in Rust ranked by responsive code review teams.",
    headline: "Rust Systems Ecosystem",
    tagline: "Memory-safe crates and tooling projects with supportive maintainers.",
  },
  java: {
    title: "Welcoming Java Open Source Projects & First-Timer PRs | GetMerged",
    description: "Discover responsive Java codebases across Spring, Android, and distributed backend systems with high PR merge odds.",
    headline: "Java Ecosystem",
    tagline: "Enterprise backends, Android tooling, and distributed systems with clear contribution guidelines.",
  },
  cpp: {
    title: "Top C++ Open Source Repositories Welcoming External PRs | GetMerged",
    description: "Find active C and C++ repositories with high maintainer engagement, responsive reviews, and documented good first issues.",
    headline: "C / C++ Ecosystem",
    tagline: "Game engines, native system drivers, and embedded applications with supportive maintainers.",
  },
  ruby: {
    title: "Welcoming Ruby on Rails & Gem Projects for Contributors | GetMerged",
    description: "Explore top Ruby repositories scored by maintainer hospitality, rapid review turnarounds, and first-timer success.",
    headline: "Ruby Ecosystem",
    tagline: "Rails gems, web frameworks, and developer productivity tools that embrace open-source newcomers.",
  },
};

export function getEcosystemMetadata(lang: string): EcosystemMetadata {
  const normalized = (lang || "").toLowerCase().trim();
  if (ECOSYSTEM_METADATA[normalized]) {
    return ECOSYSTEM_METADATA[normalized];
  }

  const capitalized = lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Open Source";
  return {
    title: `Best ${capitalized} Open Source Repos Ranked by Contributor Friendliness (2026) | GetMerged`,
    description: `Discover welcoming open-source ${capitalized} repositories ranked by real pull request merge velocity, reviewer responsiveness, and first-timer acceptance rates.`,
    headline: `${capitalized} Ecosystem`,
    tagline: `Discover active ${capitalized} projects where external pull requests are actively reviewed and merged.`,
  };
}
