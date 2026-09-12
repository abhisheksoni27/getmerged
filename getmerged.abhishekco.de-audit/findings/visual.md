# Visual + Mobile + UX — 85/100
HTML + `frontend/src` source audit.

## Passes
Viewport meta ✅. Responsive classes (246× sm:, 50× lg:, hero text-4xl→sm:6xl, grids collapse). Mobile menu exists (`Header.tsx:199-294`, aria-labeled drawer). Rankings table in `overflow-x-auto` (`rankings/[lang]/page.tsx:409`). OG image live (`/opengraph-image` → 200 image/png 64KB). Dark contrast ~7:1 body, emerald accents pass.

## Issues
1. **[Medium] H1 invisible without JS** — `HeroSection.tsx:89-96` motion.h1, no reduced-motion guard, no CSS fallback; 9 opacity:0 instances page-wide. JS-disabled = blank hero. Fix: useReducedMotion skip (pattern exists in Header/lib/motion) or noscript/CSS fallback.
2. **[Low] Tap targets <44px** — watchlist btn 24px (`Header:170`), mobile toggle 36px (`:203`), drawer links ~32px. Bump to ≥44px.
3. **[Low] H2 precedes H1** — intentional sr-only SEO block (`page.tsx:146`); harmless, noting only.
4. **[Low/verify] Compare results table** — `/compare` SSR is empty-state only; confirm results view has overflow-x-auto wrapper.
5. **Info:** `/twitter-image`, `/apple-icon` 404 (fallback to og:image, fine); `/favicon.ico` 302s.

Not checked: rendered pixels, real-device overflow.
