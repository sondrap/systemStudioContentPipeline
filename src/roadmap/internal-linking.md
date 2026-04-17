---
name: Smart Internal Links
description: While editing, the AI notices when a paragraph touches a topic Sondra has already covered and surfaces a direct link — every article automatically strengthens the authority of the ones before it.
effort: small
status: planned
---

The SEO suite knows what search wants. Smart Internal Links teaches the pipeline what Sondra has already written — turning a growing library of articles into an interconnected body of work that compounds topical authority over time.

## What it looks like

**In-Editor Link Suggestions**
- As Sondra edits, a lightweight panel in the SEO sidebar surfaces related published articles: "You covered LangGraph state machines in March — link there?"
- Suggestions show article title, publish date, and the specific passage that overlaps with what she's writing now
- One-click inserts the link with AI-generated anchor text that fits naturally into the surrounding sentence

**Anchor Text Control**
- The suggested anchor text is editable before inserting — Sondra approves, tweaks, or dismisses
- The inserted link is visible inline in the editor immediately

**Coverage at a Glance**
- A "Related Articles" count badge on the SEO panel shows how many of Sondra's published pieces are relevant to the current draft
- Makes it easy to see at a glance whether this article is well-connected to the rest of the library

## Key details

- Suggestions are generated at draft open time and refresh when the focus keyword changes — not on every keystroke
- A minimum relevance threshold prevents noise: only articles with genuine topical overlap surface
- Articles already linked in the draft are excluded from suggestions
- Internal links are tracked in the article record so the SEO score check for internal linking works off real data

~~~
Two components:

1. **Relevance matching:** At article open, run `findRelatedArticles(articleId, focusKeyword)` — pulls published articles, scores by keyword overlap and topic similarity (simple keyword matching is sufficient to start; embeddings can replace it later). Returns top 5 matches with the most relevant passage from each.

2. **Link insertion:** `insertInternalLink(articleId, targetArticleId, anchorText, position)` — updates the article body with the link at the specified character offset. Client handles the inline editing UX.

No new table needed — related articles are computed on demand. Cache the result per article session.
~~~
