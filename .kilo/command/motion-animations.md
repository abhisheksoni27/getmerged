# Motion.dev (framer-motion) Animation Plan

## Current State
- `framer-motion` v12.42.2 already installed
- Used minimally in: `GlobalSearch.tsx` (modal), `HomeClient.tsx` (chips + empty state)

## Animation Opportunities

### 1. Hero Section (HomeClient.tsx)
- Staggered entrance for headline, subtitle, search bar, quick chips
- Use `motion.div` with `initial`/`animate` + `transition.delay`

### 2. Macro Stats Grid (HomeClient.tsx)
- Count-up animation for stat numbers using `useMotionValue` + `useTransform`
- Fade-in on scroll into view with `whileInView`

### 3. Repo Cards Grid (HomeClient.tsx)
- Staggered entrance using `motion.div` with `viewport` prop
- Replace CSS `animate-fade-slide-up` with motion for consistency

### 4. Narrative Blocks (HomeClient.tsx)
- Scroll-triggered fade/slide for the storytelling blocks
- Use `whileInView` with `viewport={{ margin: "-100px" }}`

### 5. Ecosystem Leaderboard (HomeClient.tsx)
- Staggered list item entrance on scroll

### 6. Header (Header.tsx)
- Subtle logo hover animation
- Smooth nav link underline animation (motion instead of CSS)

### 7. Category Switcher Buttons (HomeClient.tsx)
- Active state transition animation (scale/background)

### 8. Footer (Footer.tsx)
- Subtle entrance animation on scroll

## Approach
- Use `motion` from `framer-motion` (already installed)
- Keep animations subtle and purposeful (no bouncy/elastic over-animations)
- Respect `prefers-reduced-motion` via `useReducedMotion` hook
- Use `whileInView` for scroll-triggered animations
- Use `AnimatePresence` for enter/exit transitions where applicable
