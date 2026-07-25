# opendoor

Find repos that welcome contributors

#### Description
**opendoor** is a web platform that helps open‑source contributors find repositories where their pull requests are actually welcomed and merged.

It scores public GitHub repositories using a proprietary **C‑Rank™** system (S to D) based on objective metrics: merge rates, response times, and first‑timer success.

Think of it as *Glassdoor for open‑source repos*: don't guess which door is open. Opendoor shows you.

#### Tech Stack
1. Backend - golang, gin-gonic
2. Frontend - Next.js, Tailwindcss, shadcdn ui
3. External - GitHub GraphQL API

# Rules to always adhere to
1. Build an implementation plan, get it approved, then code.
2. Focus on test driven development for the backend code. Red -> Green -> Refactor
3. Write clear, concise simple code that reads like prose.
4. Do not re-invent the wheel, use libs made by others.
5. Never assume, always ask clarifying questions. It does not matter. Ask 10 times if needed.
6. Divide stuff into files, and follow SRP, SOLID, and KISS. (not girls)
7. No ORMs. Native mysql Queries.
8. Config driven by .env, no hacks, no wrappers, no defaults.
9. Connections to distributed components should be made in middleware and passed on to the below layers as part of gin's context.