# Jira Story: Programmatic OG/Social Preview Cards for Viral Sharing

## Epic Link
EPIC-102: Search Engine Optimization (SEO) & Visibility

## Description
As a contributor or maintainer sharing opendoor pages on Twitter/LinkedIn, I want Google/Twitter link cards to render custom visual previews of the repository metrics so that my post gains high engagement.

## Why
Dynamic, data-rich preview cards (OpenGraph/OG images) dramatically increase click-through rates from social shares, driving high volumes of organic developer traffic back to our homepage and rankings hubs.

## Specific Key Result
- **Viral Referral Traffic**: Drive a 50% increase in incoming traffic originating from Twitter/X and LinkedIn.
- **Preview Render Success**: Ensure 100% successful dynamic OG card generation on dynamic routes.

## How to Solve (Solution)
1. **Dynamic OG Image Endpoint**: Implement a Next.js dynamic API route (`/api/og/repo/[owner]/[name]`) using `@vercel/og` or HTML-canvas to programmatically generate SVG/PNG preview images.
2. **Card Visual Layout**: The preview card should feature the repository name, C-Rank badge (S/A/B/C/D), response times, and the opendoor watermark in our brand-cream/dark neobrutalist aesthetic.
3. **OpenGraph Head tags**: Configure dynamic Head tags inside rankings and repo page templates to link directly to these dynamic preview endpoints.
