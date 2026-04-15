---
name: Journal Content Spec
description: Content design spec from systemstudio.ai defining article data structure, formatting, and editorial guidelines for the Journal page.
---

# SystemStudio.ai Journal Content Spec

This is the content spec from the main site. Articles published from the pipeline must conform to this format.

## Article Data Structure

```json
{
  "title": "Why Most AI Projects Fail Before They Start",
  "slug": "why-most-ai-projects-fail",
  "excerpt": "The problem isn't the technology. It's the question you asked it to answer.",
  "body": "<full article content in markdown>",
  "tags": ["strategy", "ai-adoption"],
  "publishedAt": "2026-04-15T12:00:00Z",
  "coverImageUrl": "https://i.mscdn.ai/...",
  "coverImageAlt": "Description of the cover image",
  "ogDescription": "Short description for social sharing (max 160 chars)"
}
```

## Valid Tags

`strategy`, `ai-adoption`, `operations`, `case-study`, `tools`, `leadership`, `methodology`

## Formatting Rules

- Use `##` (H2) for major sections, `###` (H3) for subsections. Never H1 in body.
- Short punchy paragraphs (2-4 sentences)
- Blockquotes for pull quotes
- Fenced code blocks with language hints
- Images via markdown syntax, uploaded to MindStudio CDN
- Links render Deep Current with Blush Veil underline
- Bold for emphasis, italic for titles/terms. Don't overuse.

## SEO Metadata

- Page title: `{Article Title} — SystemStudio.ai`
- Meta description: `ogDescription` or fallback to `excerpt`
- Canonical URL: `https://systemstudio.msagent.ai/journal/{slug}`

## API Endpoint

```
POST /journal/posts
Authorization: Bearer sk_...
Content-Type: application/json
```

Required fields: `title`, `slug`, `body`, `excerpt`. Rejects duplicates on slug.
