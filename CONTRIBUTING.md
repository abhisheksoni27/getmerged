# Contributing to GetMerged

Thanks for your interest in contributing to GetMerged!

We believe open source should be welcoming, transparent, and responsive. This repository practices what GetMerged measures: **every outside PR gets reviewed within 24 hours**.

---

## 🤝 Our Maintainer Pledge

1. **Fast, guaranteed review**: You will receive maintainer feedback or an approval within 24 hours of opening your PR.
2. **Actionable guidance**: If changes are needed, we explain why and how. No vague dismissals, no ghosting.
3. **Credit where due**: Every merged contribution is acknowledged, and your PR helps train our welcoming scoring model.

---

## 🚀 Quick Setup

### Prerequisites
- **Go 1.22+**
- **Node.js 20+** and `npm`
- Git

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/getmerged.git
cd getmerged
```

### 2. Local Environment
No secret tokens are required to run the development stack locally.

```bash
# Terminal 1: Backend (runs SQLite in-memory / local opendoor.db)
cd backend
cp .env.example .env
go run ./cmd/server

# Terminal 2: Frontend (Next.js)
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your local instance.

---

## 🧪 Testing & Verification

Before submitting a PR, make sure all tests and lints pass:

```bash
# Run all frontend and backend checks at once
make check

# Or individually:
cd frontend && npm run check      # ESLint + TypeScript typecheck
cd backend && go test -v ./...    # Go unit tests
```

---

## 📋 Pull Request Guidelines

1. **Pick an issue first**: Check [open Good First Issues](https://github.com/abhisheksoni27/getmerged/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or open an issue to discuss non-trivial changes before building.
2. **Keep PRs focused**: 1 PR = 1 feature or fix. Smaller PRs get reviewed and merged faster.
3. **SSR-First**: If you touch public pages (`/[owner]/[name]`, `/good-first-issue`, `/rankings`), primary data must be fetched server-side in `page.tsx` for fast, zero-CLS rendering.
4. **No mock UI**: Every user-facing button, form, or card must connect to a real, working backend endpoint or database table.
5. **Atomic commits**: Write clear commit messages describing what changed and why (e.g. `fix(ui): improve contrast on sticky header`).

---

## 💬 Questions?

Open an issue on GitHub or reach out to [@abhisheksoni27](https://x.com/abhisheksoni27) on X.
