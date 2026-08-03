# Jira Story: Implement JSON-LD Structured Data Schema for Rich Search Snippets

## Epic Link
EPIC-102: Search Engine Optimization (SEO) & Visibility

## Description
As a developer searching Google for open-source repositories or contribution reviews, I want to see search snippets with rich ratings and stats so that I can click directly onto opendoor.

## Why
Search Engines (especially Google) crawl structured data to render Rich Snippets (stars, metrics, classes). Implementing `SoftwareSourceCode` and `Rating` schemas will make our search results stand out, directly improving the Click-Through Rate (CTR) from the search engine results page (SERP).

## Specific Key Result
- **SERP CTR**: Increase search result CTR by 25% for repository-specific search queries.
- **Rich Snippets**: Secure 100% valid schema verification on Google Search Console for dynamic repository paths.

## How to Solve (Solution)
1. **JSON-LD Schema Generation**: Embed a script tag containing JSON-LD metadata dynamically inside `/repo/[owner]/[name]/page.tsx` on the server-side:
   ```json
   {
     "@context": "https://schema.org",
     "@type": "SoftwareSourceCode",
     "name": "repository-name",
     "programmingLanguage": "Go",
     "codeRepository": "https://github.com/owner/name",
     "aggregateRating": {
       "@type": "AggregateRating",
       "ratingValue": "4.8",
       "reviewCount": "120",
       "bestRating": "5.0",
       "worstRating": "1.0"
     }
   }
   ```
2. **Metadata Optimization**: Match the Schema `ratingValue` dynamically with the mapped numerical value of the C-Rank (S=5, A=4, B=3, C=2, D=1).
3. **Structured Testing**: Integrate the page templates with validation scripts using Schema.org/Google Rich Results Test APIs.
