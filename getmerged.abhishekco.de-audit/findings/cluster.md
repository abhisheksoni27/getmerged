# Semantic Clusters + Internal Linking — 70/100
Source + live-curl verified.

| Pillar | Children | Hub→spoke | Spoke→hub |
|---|---|---|---|
| /rankings | 20× /rankings/[lang] | ✅ | ✅ + BreadcrumbList |
| /good-first-issue | 14× /good-first-issue/[lang] | ✅ | ✅ |
| /contribute | N× /contribute/[language] | ✅ | ✅ |
| /topics | 100+× /topics/[topic] | ⚠️ hub client-rendered, zero /topics/* links in HTML | ✅ spoke breadcrumb |
| /guides | /guides/[slug] (5) | ✅ | ✅ |
| /repos (shadow) | 102k /{owner}/{name} | ✅ paginated | ❌ no backlink |

## Gaps (priority)
1. **Repo-page orphan risk (critical).** Zero links to other repo pages — RelatedRepos [] on facebook/react, no related section, no how-to-contribute link. Long tail (~101k outside top-50s) reachable only via sitemap + /repos pagination. Fix: SSR related-repos (same lang/tier/topic) + how-to-contribute CTA. (Confirm whether related is globally empty or just that repo.)
2. **/contribute nav-orphaned** — absent from Header + Footer. /rankings footer-only. /topics single footer link. Add Contribute+Rankings to header/Discover dropdown.
3. **Slug mismatch:** /contribute/c-plus-plus vs /rankings/cpp + /good-first-issue/cpp (also csharp). Cross-links break. Normalize + redirect.
4. **/topics hub not SSR-crawlable** — SSR the topic list (spokes fine, but hub passes no equity).
5. **Missing lateral links:** gfi[lang]→rankings[lang]/contribute[lang]; topics[topic]→rankings[lang]/guides; guides[slug]→topics/rankings/repo scorecards; /repos filtered→rankings[lang]; contribute[lang]→gfi[lang].
6. Anchor text descriptive sitewide ✅. BreadcrumbList JSON-LD on all spokes ✅.

## Cannibalization
- /contribute vs /good-first-issue (highest): same language-card UX + repo pool. Differentiate: GFI = live issue feed ("claim this ticket"), contribute = repo matchmaker ("find a home + game plan"). Add mutual cross-links, distinct H1 verbs.
- /repos vs /rankings/[lang] (medium): /repos?language=python title collides with /rankings/python. Make /repos titles filter-descriptive, keep superlatives+ItemList only on rankings.
- how-to-contribute vs guides (low, complementary): add "apply this playbook →" boxes. topics vs rankings (low): mirror topic→language links.
