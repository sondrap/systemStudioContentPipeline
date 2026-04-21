# Get Dashboard Data

Fetch a slim summary of all articles and topics in the pipeline.

## When to use
- When Sondra asks about the status of her pipeline ("What's in the pipeline?" "What articles are in review?")
- Before suggesting topics, to check what already exists and avoid duplicates
- To see what's been published recently and identify content gaps

## Input

ALWAYS pass `{ "slim": true }`. This is required to keep the response size manageable. Full article bodies and research briefs are massive and will exceed Claude's request size limit if you pull them for every article at once.

```json
{ "slim": true }
```

## Returns (slim mode)

- **articles**: An array of article summaries, each with:
  - `id`, `title`, `slug`, `status` (researching / drafting / review / published), `focusKeyword`
  - `excerpt`, `wordCount`, `hasImage`, `linkedInPostCount`
  - `publishedAt`, `publishedUrl`, `created_at`, `updated_at`
  - Does NOT include the full body, research brief, LinkedIn post content, or critiques. Use `get-article` for any of those on a specific piece.
- **topics**: An array of topic summaries with `id`, `title`, `description`, `priority`, `status`, `articleId`, `suggestedBy`, `suggestedKeyword`, `seoOpportunity`, `created_at`
- **editorialDirection**: Sondra's current editorial direction note, if set

## Presenting results

Summarize concisely. Group by status. Highlight anything in "review" that needs Sondra's attention. Don't dump raw data.

## Follow-up

If Sondra asks about a specific article in depth (the body, the SEO critique, the LinkedIn posts), use `get-article` with that article's id. Never try to include full article bodies in your response from this tool — they're too long and not included in the slim data anyway.
