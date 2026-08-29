export interface FrameworkTopic {
  name: string;
  tag: string;
  slug: string;
}

export interface EcosystemMetadata {
  title: string;
  description: string;
  headline: string;
  tagline: string;
  topFrameworks: FrameworkTopic[];
}

const ECOSYSTEM_METADATA: Record<string, EcosystemMetadata> = {
  go: {
    title: "Best Go Open Source Repositories | GetMerged",
    description: "Top Golang backend, cloud-native, and CLI projects ranked by contributor merge likelihood and review turnaround.",
    headline: "Go (Golang) Ecosystem",
    tagline: "Cloud infrastructure, backend engines, and developer CLIs with active maintainer triage.",
    topFrameworks: [
      { name: "Gin", tag: "#gin", slug: "gin" },
      { name: "Fiber", tag: "#fiber", slug: "fiber" },
      { name: "Echo", tag: "#echo", slug: "echo" },
      { name: "gRPC Go", tag: "#grpc", slug: "grpc" },
      { name: "Kubernetes", tag: "#kubernetes", slug: "kubernetes" },
      { name: "CLI & Cobra", tag: "#cli", slug: "cli" },
    ],
  },
  typescript: {
    title: "Best TypeScript Open Source Repos | GetMerged",
    description: "Discover top TypeScript repositories where external pull requests get reviewed fast and merged reliably.",
    headline: "TypeScript & JavaScript Ecosystem",
    tagline: "Modern fullstack, UI component, and tooling repositories welcoming external PRs.",
    topFrameworks: [
      { name: "Next.js", tag: "#nextjs", slug: "nextjs" },
      { name: "React", tag: "#react", slug: "react" },
      { name: "NestJS", tag: "#nest", slug: "nest" },
      { name: "Vue.js", tag: "#vue", slug: "vue" },
      { name: "Svelte", tag: "#svelte", slug: "svelte" },
      { name: "Tailwind CSS", tag: "#tailwind", slug: "tailwind" },
    ],
  },
  javascript: {
    title: "Best JavaScript Open Source Repos | GetMerged",
    description: "Discover JavaScript repositories where your pull requests won't sit neglected. Benchmark maintainer velocity and first-timer acceptance.",
    headline: "JavaScript Ecosystem",
    tagline: "Vibrant node modules, React/Vue components, and client-side utilities with responsive maintainers.",
    topFrameworks: [
      { name: "React", tag: "#react", slug: "react" },
      { name: "Express", tag: "#express", slug: "express" },
      { name: "Node.js", tag: "#nodejs", slug: "nodejs" },
      { name: "Vue.js", tag: "#vue", slug: "vue" },
      { name: "Electron", tag: "#electron", slug: "electron" },
    ],
  },
  python: {
    title: "Best Python Open Source Repositories | GetMerged",
    description: "Browse the top Python open-source repositories scored by PR merge velocity, reviewer responsiveness, and first-time contributor success on C-Rank™.",
    headline: "Python Open Source Ecosystem",
    tagline: "High-velocity data science, web framework, and automation projects with welcoming maintainers.",
    topFrameworks: [
      { name: "FastAPI", tag: "#fastapi", slug: "fastapi" },
      { name: "Django", tag: "#django", slug: "django" },
      { name: "Flask", tag: "#flask", slug: "flask" },
      { name: "PyTorch", tag: "#pytorch", slug: "pytorch" },
      { name: "LangChain", tag: "#langchain", slug: "langchain" },
      { name: "Data Science", tag: "#pandas", slug: "pandas" },
    ],
  },
  rust: {
    title: "Best Rust Open Source Repositories | GetMerged",
    description: "High-performance systems programming and CLI crates in Rust ranked by responsive code review teams.",
    headline: "Rust Systems Ecosystem",
    tagline: "Memory-safe crates and tooling projects with supportive maintainers.",
    topFrameworks: [
      { name: "Tokio", tag: "#tokio", slug: "tokio" },
      { name: "Actix Web", tag: "#actix", slug: "actix" },
      { name: "Axum", tag: "#axum", slug: "axum" },
      { name: "Tauri", tag: "#tauri", slug: "tauri" },
      { name: "WebAssembly", tag: "#wasm", slug: "wasm" },
      { name: "CLI Tools", tag: "#cli", slug: "cli" },
    ],
  },
  java: {
    title: "Best Java Open Source Repositories | GetMerged",
    description: "Discover responsive Java codebases across Spring, Android, and distributed backend systems with high PR merge odds.",
    headline: "Java Ecosystem",
    tagline: "Enterprise backends, Android tooling, and distributed systems with clear contribution guidelines.",
    topFrameworks: [
      { name: "Spring Boot", tag: "#spring-boot", slug: "spring" },
      { name: "Quarkus", tag: "#quarkus", slug: "quarkus" },
      { name: "Micronaut", tag: "#micronaut", slug: "micronaut" },
      { name: "Android", tag: "#android", slug: "android" },
      { name: "Apache Kafka", tag: "#kafka", slug: "kafka" },
    ],
  },
  cpp: {
    title: "Best C & C++ Open Source Repos | GetMerged",
    description: "Find active C and C++ repositories with high maintainer engagement, responsive reviews, and documented good first issues.",
    headline: "C / C++ Ecosystem",
    tagline: "Game engines, native system drivers, and embedded applications with supportive maintainers.",
    topFrameworks: [
      { name: "Unreal Engine", tag: "#unreal-engine", slug: "unreal-engine" },
      { name: "Qt Framework", tag: "#qt", slug: "qt" },
      { name: "OpenCV", tag: "#opencv", slug: "opencv" },
      { name: "Embedded Systems", tag: "#embedded", slug: "embedded" },
      { name: "Game Dev", tag: "#gamedev", slug: "game-development" },
    ],
  },
  csharp: {
    title: "Best C# & .NET Open Source Repositories | GetMerged",
    description: "Discover high-performance C# and .NET open-source projects with active maintainers and fast pull request turnaround.",
    headline: "C# & .NET Ecosystem",
    tagline: "Modern ASP.NET Core, Blazor, and Unity game development repositories welcoming external pull requests.",
    topFrameworks: [
      { name: "ASP.NET Core", tag: "#aspnetcore", slug: "aspnetcore" },
      { name: ".NET", tag: "#dotnet", slug: "dotnet" },
      { name: "Blazor", tag: "#blazor", slug: "blazor" },
      { name: "Unity", tag: "#unity", slug: "unity" },
      { name: "WPF / Desktop", tag: "#wpf", slug: "wpf" },
    ],
  },
  ruby: {
    title: "Best Ruby Open Source Repositories | GetMerged",
    description: "Explore top Ruby repositories scored by maintainer hospitality, rapid review turnarounds, and first-timer success.",
    headline: "Ruby Ecosystem",
    tagline: "Rails gems, web frameworks, and developer productivity tools that embrace open-source newcomers.",
    topFrameworks: [
      { name: "Ruby on Rails", tag: "#rails", slug: "rails" },
      { name: "Sinatra", tag: "#sinatra", slug: "sinatra" },
      { name: "Hanami", tag: "#hanami", slug: "hanami" },
      { name: "Jekyll", tag: "#jekyll", slug: "jekyll" },
      { name: "RubyGems", tag: "#gems", slug: "gems" },
    ],
  },
  kotlin: {
    title: "Best Kotlin Open Source Repositories to Contribute | GetMerged",
    description: "Discover top welcoming Kotlin open-source repositories for Android, Compose Multiplatform, and Ktor. Ranked by real PR merge rates, review turnarounds, and open good first issues.",
    headline: "Kotlin & Android Ecosystem",
    tagline: "Android apps, Compose Multiplatform libraries, and backend microservices welcoming first-time contributors.",
    topFrameworks: [
      { name: "Android SDK", tag: "#android", slug: "android" },
      { name: "Compose Multiplatform", tag: "#compose-multiplatform", slug: "compose" },
      { name: "Ktor", tag: "#ktor", slug: "ktor" },
      { name: "Spring Kotlin", tag: "#spring-boot", slug: "spring" },
    ],
  },
  swift: {
    title: "Best Swift Open Source Repositories | GetMerged",
    description: "Discover top Swift and Apple ecosystem open-source repositories with fast review response times and active maintainers.",
    headline: "Swift & Apple Ecosystem",
    tagline: "iOS, macOS, and server-side Swift packages actively merging community pull requests.",
    topFrameworks: [
      { name: "SwiftUI", tag: "#swiftui", slug: "swiftui" },
      { name: "UIKit", tag: "#uikit", slug: "uikit" },
      { name: "Vapor", tag: "#vapor", slug: "vapor" },
      { name: "Combine & Async", tag: "#combine", slug: "combine" },
    ],
  },
  php: {
    title: "Best PHP & Laravel Open Source Repositories | GetMerged",
    description: "Find high-velocity PHP and Laravel repositories with high merge rates and active maintainer feedback.",
    headline: "PHP & Laravel Ecosystem",
    tagline: "Laravel packages, Symfony bundles, and modern PHP libraries welcoming new contributors.",
    topFrameworks: [
      { name: "Laravel", tag: "#laravel", slug: "laravel" },
      { name: "Symfony", tag: "#symfony", slug: "symfony" },
      { name: "WordPress", tag: "#wordpress", slug: "wordpress" },
      { name: "API Platform", tag: "#api-platform", slug: "api-platform" },
    ],
  },
  dart: {
    title: "Best Dart & Flutter Open Source Repositories | GetMerged",
    description: "Discover top Flutter and Dart packages welcoming community pull requests with active maintainers.",
    headline: "Dart & Flutter Ecosystem",
    tagline: "Cross-platform mobile and web applications built with Flutter and Dart.",
    topFrameworks: [
      { name: "Flutter", tag: "#flutter", slug: "flutter" },
      { name: "Riverpod", tag: "#riverpod", slug: "riverpod" },
      { name: "Dart SDK", tag: "#dart", slug: "dart" },
    ],
  },
  elixir: {
    title: "Best Elixir & Phoenix Open Source Repositories | GetMerged",
    description: "Find responsive Elixir and Phoenix projects with active maintainers and friendly review cultures.",
    headline: "Elixir & Phoenix Ecosystem",
    tagline: "Scalable real-time distributed systems and Phoenix web applications.",
    topFrameworks: [
      { name: "Phoenix", tag: "#phoenix", slug: "phoenix" },
      { name: "LiveView", tag: "#liveview", slug: "liveview" },
      { name: "Ecto", tag: "#ecto", slug: "ecto" },
    ],
  },
  zig: {
    title: "Best Zig Open Source Repositories | GetMerged",
    description: "Discover welcoming Zig systems programming repositories with active maintainers.",
    headline: "Zig Systems Ecosystem",
    tagline: "Next-generation memory-safe systems software and compilers.",
    topFrameworks: [
      { name: "Systems Programming", tag: "#systems", slug: "systems" },
      { name: "Embedded Zig", tag: "#embedded", slug: "embedded" },
      { name: "Game Development", tag: "#gamedev", slug: "gamedev" },
    ],
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
    topFrameworks: [
      { name: "Web Frameworks", tag: "#web", slug: "web" },
      { name: "CLI Tools", tag: "#cli", slug: "cli" },
      { name: "Developer Tools", tag: "#devtools", slug: "devtools" },
      { name: "Libraries", tag: "#library", slug: "library" },
    ],
  };
}
