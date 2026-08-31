# Schema & Structured Data Audit: getmerged.abhishekco.de

**Category Score**: **94 / 100**

## 1. Implemented Schema Types
- **Dataset (`@type: Dataset`)**: Implemented on all `/rankings/[lang]` pages. Features `variableMeasured`, `license`, `creator`, and `distribution` (`/api/v1/repos?language=...`).
- **ItemList (`@type: ItemList`)**: Embedded on ecosystem rankings with 50 position elements and deep URLs.
- **SoftwareSourceCode (`@type: SoftwareSourceCode`)**: Embedded on repository scorecards with `codeRepository`, `programmingLanguage`, `runtimePlatform`.
- **WebSite & WebApplication**: Embedded on the homepage with `SearchAction` search bar integration.
- **Product & Offer**: Embedded on `/pricing` with 3 tiered subscriptions.

## 2. Validation & Deprecation Checks
- Zero syntax or JSON-LD parsing errors.
- `FAQPage` schema is flagged at `Info` level: Google retired FAQ rich snippets from standard search SERPs in May 2026, but the markup remains valid for general semantic understanding.
