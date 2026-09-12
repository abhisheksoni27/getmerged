# Backlinks + Linkable Assets — 65/100 (program strength; referring-domain counts unverifiable)
Live curl + source. No Moz/Ahrefs keys — no DA/RD numbers claimed. Web-search mention check failed (backend 403).

## Assets (verified)
- C-Rank badge (`RepoBadgeGenerator`) ✅ — README snippet w/ followed image+text link, UTM-tagged. Strongest magnet.
- Karma badge (`/api/v1/u/:user/karma.svg`) ✅ — contributor READMEs → /u/ pages. Scales with users.
- Shields endpoints (badge.json/svg 302 → shields.io) ⚠️ — README <img> points at shields, zero equity; only wrapping <a> gives value. Consolidate on direct /api/badge/ + <a>; deprecate bare-img installs.
- GFI embed (`/embed/gfi/`, `/embed-pr`) ✅ backend, CTA link real — but no copy-paste snippet UI. Under-promoted.
- Share cards /c/[id], /share/pr-eval/[id] ✅ SSR + OG — social signals + embeds.
- Resume /u/[username]/resume ✅ — LinkedIn/GitHub profile backlinks.
- Dataset schema + DataDownload ✅ — Google Dataset Search discovery; no visible download button (schema-only).
- Atom /feeds/top.xml ✅ · /docs ✅ · OSS org github.com/GetMergedApp ✅ (sameAs inconsistent: about lists GetMergedApp, homepage lists abhisheksoni27/getmerged).

## Outbound/social
Homepage outbound minimal (self + github avatars). No X/LinkedIn/Discord links found — single-network presence = weak entity signals. twitter:card set, no twitter:site handle.

## rel audit
Default external = noopener/noreferrer (passes equity outward). Only 1 nofollow sitewide. ~10+ target=_blank GitHub links w/o nofollow/ugc. Paid Repo Boost (sponsored flag, ordered first) ships with **zero rel="sponsored"** — real policy risk. UGC feedback/review links lack rel="ugc".

## Could NOT verify
RD/DA/anchors/spam/lost-links/competitor gap; actual badge adoption in READMEs; feed syndicators; OG-card pickup.

## Digital-PR quick wins
1. rel=sponsored + "Boosted" label on paid placements; rel=ugc on community links. 2. GFI-widget copy-paste embed box. 3. Visible dataset download + /datasets hub; pitch newsletters. 4. Publish Ghost-town index as data post. 5. Standardize sameAs + footer social icons. 6. Badge-referrer dashboard via existing UTM as backlink proxy.
