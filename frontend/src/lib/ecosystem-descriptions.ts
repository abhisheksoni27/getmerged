export interface EcosystemMetadata {
  title: string;
  description: string;
  headline: string;
  tagline: string;
}

const ECOSYSTEM_METADATA: Record<string, EcosystemMetadata> = {
  go: {
    title: "Best Go Open Source Repositories | GetMerged",
    description: "Top Golang backend, cloud-native, and CLI projects ranked by contributor merge likelihood and review turnaround.",
    headline: "Go (Golang) Ecosystem",
    tagline: "Cloud infrastructure, backend engines, and developer CLIs with active maintainer triage.",
  },
  typescript: {
    title: "Best TypeScript Open Source Repos | GetMerged",
    description: "Discover top TypeScript repositories where external pull requests get reviewed fast and merged reliably.",
    headline: "TypeScript & JavaScript Ecosystem",
    tagline: "Modern fullstack, UI component, and tooling repositories welcoming external PRs.",
  },
  javascript: {
    title: "Best JavaScript Open Source Repos | GetMerged",
    description: "Discover JavaScript repositories where your pull requests won't sit neglected. Benchmark maintainer velocity and first-timer acceptance.",
    headline: "JavaScript Ecosystem",
    tagline: "Vibrant node modules, React/Vue components, and client-side utilities with responsive maintainers.",
  },
  python: {
    title: "Best Python Open Source Repositories | GetMerged",
    description: "Browse the top Python open-source repositories scored by PR merge velocity, reviewer responsiveness, and first-time contributor success on C-Rank™.",
    headline: "Python Open Source Ecosystem",
    tagline: "High-velocity data science, web framework, and automation projects with welcoming maintainers.",
  },
  rust: {
    title: "Best Rust Open Source Repositories | GetMerged",
    description: "High-performance systems programming and CLI crates in Rust ranked by responsive code review teams.",
    headline: "Rust Systems Ecosystem",
    tagline: "Memory-safe crates and tooling projects with supportive maintainers.",
  },
  java: {
    title: "Best Java Open Source Repositories | GetMerged",
    description: "Discover responsive Java codebases across Spring, Android, and distributed backend systems with high PR merge odds.",
    headline: "Java Ecosystem",
    tagline: "Enterprise backends, Android tooling, and distributed systems with clear contribution guidelines.",
  },
  cpp: {
    title: "Best C & C++ Open Source Repos | GetMerged",
    description: "Find active C and C++ repositories with high maintainer engagement, responsive reviews, and documented good first issues.",
    headline: "C / C++ Ecosystem",
    tagline: "Game engines, native system drivers, and embedded applications with supportive maintainers.",
  },
  ruby: {
    title: "Best Ruby Open Source Repositories | GetMerged",
    description: "Explore top Ruby repositories scored by maintainer hospitality, rapid review turnarounds, and first-timer success.",
    headline: "Ruby Ecosystem",
    tagline: "Rails gems, web frameworks, and developer productivity tools that embrace open-source newcomers.",
  },
  kotlin: {
    title: "Best Kotlin Open Source Repositories to Contribute | GetMerged",
    description: "Discover top welcoming Kotlin open-source repositories for Android, Compose Multiplatform, and Ktor. Ranked by real PR merge rates, review turnarounds, and open good first issues.",
    headline: "Kotlin & Android Ecosystem",
    tagline: "Android apps, Compose Multiplatform libraries, and backend microservices welcoming first-time contributors.",
  },
  swift: {
    title: "Best Swift Open Source Repositories | GetMerged",
    description: "Discover top Swift and Apple ecosystem open-source repositories with fast review response times and active maintainers.",
    headline: "Swift & Apple Ecosystem",
    tagline: "iOS, macOS, and server-side Swift packages actively merging community pull requests.",
  },
  php: {
    title: "Best PHP & Laravel Open Source Repositories | GetMerged",
    description: "Find high-velocity PHP and Laravel repositories with high merge rates and active maintainer feedback.",
    headline: "PHP & Laravel Ecosystem",
    tagline: "Laravel packages, Symfony bundles, and modern PHP libraries welcoming new contributors.",
  },
};

export function getEcosystemMetadata(lang: string): EcosystemMetadata {
  const normalized = (lang || "").toLowerCase().trim();
  if (ECOSYSTEM_METADATA[normalized]) {
    return ECOSYSTEM_METADATA[normalized];
  }

  const capitalized = lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Open Source";
  return {
    title: `Best ${capitalized} Open Source Repos | GetMerged`,
    description: `Discover welcoming open-source ${capitalized} repositories ranked by real pull request merge velocity, reviewer responsiveness, and first-timer acceptance rates.`,
    headline: `${capitalized} Ecosystem`,
    tagline: `Discover active ${capitalized} projects where external pull requests are actively reviewed and merged.`,
  };
}
