export interface EcosystemMetadata {
  title: string;
  description: string;
  headline: string;
  tagline: string;
}

const ECOSYSTEM_METADATA: Record<string, EcosystemMetadata> = {
  go: {
    title: "Top Welcoming Go (Golang) Repositories & Good First Issues | GetMerged",
    description: "Explore the most welcoming Go (Golang) open-source projects. Filtered by objective PR merge rate, maintainer response time, and first-timer friendliness.",
    headline: "Go Ecosystem",
    tagline: "High-concurrency microservices, cloud-native tools, and performant backend packages with active maintainers.",
  },
  typescript: {
    title: "Best Welcoming TypeScript Repositories for Contributors | GetMerged",
    description: "Find high-probability TypeScript repositories accepting external pull requests. Scored by C-Rank™ maintainer turnaround and PR merge rates.",
    headline: "TypeScript Ecosystem",
    tagline: "Modern web frameworks, developer tooling, and enterprise frontend libraries actively merging newcomer PRs.",
  },
  javascript: {
    title: "Top JavaScript Open Source Projects Welcoming PRs | GetMerged",
    description: "Discover JavaScript repositories where your pull requests won't sit neglected. Benchmark maintainer velocity and first-timer acceptance.",
    headline: "JavaScript Ecosystem",
    tagline: "Vibrant node modules, React/Vue components, and client-side utilities with responsive maintainers.",
  },
  python: {
    title: "Welcoming Python Open Source Repositories & Good First Issues | GetMerged",
    description: "Discover welcoming Python repositories across AI, data science, and web frameworks. Scored with objective C-Rank telemetry.",
    headline: "Python Ecosystem",
    tagline: "Machine learning libraries, automation tools, and async backend APIs actively onboarding contributors.",
  },
  rust: {
    title: "Top Welcoming Rust Repositories for New Contributors | GetMerged",
    description: "Find Rust open-source crates and systems projects where maintainers actively guide and merge external contributions.",
    headline: "Rust Ecosystem",
    tagline: "Memory-safe systems programming, CLI utilities, and high-performance engines with welcoming review cultures.",
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
    title: `Top Welcoming ${capitalized} Repositories & PR Likelihood | GetMerged`,
    description: `Discover welcoming open-source ${capitalized} repositories ranked by real pull request merge velocity, reviewer responsiveness, and first-timer acceptance rates.`,
    headline: `${capitalized} Ecosystem`,
    tagline: `Discover active ${capitalized} projects where external pull requests are actively reviewed and merged.`,
  };
}
