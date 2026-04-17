---
name: Journal Content Spec
description: Content design spec from systemstudio.ai defining article data structure, formatting, and editorial guidelines for the Journal page.
---

# SystemStudio.ai Journal Content Spec

This is the contract between the content pipeline and the systemstudio.ai Journal. Articles published from the pipeline POST to systemstudio.ai's API using the payload shape defined below.

## Article Data Structure

Full payload the pipeline sends on publish:

```json
{
  "title": "Why Most AI Projects Fail Before They Start",
  "slug": "why-most-ai-projects-fail",
  "excerpt": "The problem isn't the technology. It's the question you asked it to answer.",
  "body": "<full article content in markdown>",
  "tags": ["strategy", "ai-adoption"],
  "publishedAt": "2026-04-15T12:00:00Z",
  "coverImageUrl": "https://i.mscdn.ai/...",
  "coverImageAlt": "Description of the cover image for accessibility and image SEO",
  "ogDescription": "Short description for social link previews (140-160 chars)",
  "metaDescription": "Short description for search result snippets (140-160 chars, usually same as ogDescription)",
  "focusKeyword": "AI project failure",
  "seoKeywords": ["AI projects", "AI strategy", "AI implementation", "business AI"]
}
```

## Field Reference

| Field | Required | Type | Purpose |
|---|---|---|---|
| `title` | ✓ | string | Page title tag and article headline |
| `slug` | ✓ | string | URL path segment (lowercase, hyphenated, no special chars) |
| `excerpt` | ✓ | string | Article hook, shown on listing pages |
| `body` | ✓ | string (markdown) | Full article content |
| `tags` | | string[] | Article categorization; valid values below |
| `publishedAt` | ✓ | ISO 8601 | Publication timestamp |
| `coverImageUrl` | | string | Hero image URL (MindStudio CDN) |
| `coverImageAlt` | | string | Cover image alt text (accessibility + image SEO) |
| `ogDescription` | | string | Social link preview description (`<meta property="og:description">`) |
| `metaDescription` | | string | Search result snippet (`<meta name="description">`) |
| `focusKeyword` | | string | Primary target keyword for this article |
| `seoKeywords` | | string[] | Supporting keyword phrases for structured data and related-content logic |

## SEO Metadata Usage on the Blog Side

How the blog should use each SEO field:

- **`title`** → `<title>` tag and `<h1>` on the article page
- **`metaDescription`** → `<meta name="description">` for Google search snippets
- **`ogDescription`** → `<meta property="og:description">` for social previews (LinkedIn, Twitter, iMessage)
- **`focusKeyword`** → Structured data (JSON-LD `keywords` field, schema.org Article `about` or `keywords`)
- **`seoKeywords`** → Internal search, related-content tagging, or structured data
- **`coverImageUrl`** → `<meta property="og:image">` and `<img>` tag
- **`coverImageAlt`** → `<img alt>` attribute

Note: the old `<meta name="keywords">` HTML tag is NOT needed. Google has not used it for ranking since 2009. `focusKeyword` and `seoKeywords` are stored for structured data and internal features, not for the old keywords meta tag.

## Valid Tags

`strategy`, `ai-adoption`, `operations`, `case-study`, `tools`, `leadership`, `methodology`

## Formatting Rules

- Use `##` (H2) for major sections, `###` (H3) for subsections. Never H1 in body.
- Short punchy paragraphs (2-4 sentences).
- Blockquotes for pull quotes.
- Fenced code blocks with language hints.
- Images via markdown syntax, uploaded to MindStudio CDN.
- Links render Deep Current with Blush Veil underline.
- Bold for emphasis, italic for titles/terms. Don't overuse.

## Canonical URL

`https://systemstudio.msagent.ai/journal/{slug}`

## API Endpoint

```
POST /_/api/journal/posts
X-API-Key: jnl_...
Content-Type: application/json
```

Required fields: `title`, `slug`, `body`, `excerpt`. Rejects duplicates on slug.

**Authentication note:** The journal API uses the `X-API-Key` header for authentication, not `Authorization: Bearer`. This is because MindStudio's platform reserves the `Authorization` header for its own built-in auth system, so app-level custom keys use the standard `X-API-Key` convention instead.

**Expected response shape (for pipeline to extract publishedUrl):**

```json
{
  "ok": true,
  "url": "https://systemstudio.msagent.ai/journal/why-most-ai-projects-fail",
  "postId": "abc-123"
}
```

The pipeline will fall back to `https://systemstudio.msagent.ai/journal/{slug}` if the response does not include `url` or `publishedUrl`.

**Error handling:** Non-2xx responses surface their status and body back to the pipeline editor so the user can diagnose and fix the issue. Ensure error responses include a useful message in the body.
