---
name: SEO Intelligence Suite
description: Beyond keyword suggestions — real competitive gap analysis, semantic topic clustering, and a live optimization score in the article editor that tells Sondra exactly where to improve before she publishes.
effort: large
status: planned
---

The MVP generates keyword suggestions and a meta description. This makes SEO a real capability: proactive gap analysis that shows Sondra which topics her competitors are ranking for but she isn't, semantic clustering that helps her build authority across a topic area, and live scoring in the editor.

## What it looks like

**Competitive Gap Analysis**
- For any topic, the research agent analyzes the top-ranking articles and surfaces: what keywords they're targeting, what questions they're answering, what angles Sondra isn't covering
- Presented as a "gap map" — here's what the competition is doing, here's where Sondra has an opening
- Filtered through her voice angle: gaps worth filling are ones where Sondra has a specific, earned opinion — not just content inflation

**Semantic Topic Clusters**
- The pipeline builds a map of Sondra's published content, organized by semantic clusters (e.g., "RAG architecture," "fine-tuning costs," "agentic workflow design")
- Shows which clusters are well-covered and which are thin
- Informs the Topic Radar: under-covered clusters with high search demand get surfaced as priority topics

**Live SEO Score in Editor**
- While reviewing an article, a sidebar panel shows a live SEO score (0-100) with specific improvement callouts:
  - "Primary keyword appears 0 times in the first 200 words"
  - "Meta description is 87 characters — shoot for 140-160"
  - "No internal links to related articles"
  - "H2 subheadings don't include secondary keywords"
- Each callout has a one-click fix or a "why does this matter?" explanation
- Score updates as Sondra edits the article

**Keyword Research Panel**
- Expanded from the MVP's basic keyword suggestions
- Shows search volume estimates, difficulty, and related long-tail variants
- Surfaced in the research brief before drafting, so the AI can optimize from the start

## Key details

- SEO score is a guide, not a mandate. Sondra's voice comes first. The score should never push toward keyword stuffing or unnatural phrasing.
- Gap analysis runs as part of the research phase, not as a separate manual action
- Semantic cluster map refreshes when new articles are published
- Internal linking suggestions are based on her actual published article library, not generic best practices

~~~
SEO intelligence has three implementation parts:

1. **Gap analysis in research phase:** During `runTask()`, add additional searches targeting competitor articles (top 5 Google results for the topic). Scrape and analyze their heading structure, keyword density, and questions they address. Add a `seoGapAnalysis` field to the research brief JSON.

2. **Semantic cluster map:** A background job that runs after each publish. Uses `generateText` to cluster all published article titles/keywords into 5-10 semantic topics. Stored as a `contentClusters` JSON on the settings/user record.

3. **Live SEO score:** Frontend-computed from article fields already in the store. No backend call needed for most checks. Keyword density, meta description length, H2 structure, and word count are all computable client-side. Internal link suggestions require a method call to get the published article library.

Third-party SEO APIs (Ahrefs, SEMrush) could provide search volume data but require API keys as secrets. Build without them first — AI-derived estimates from web search are good enough for MVP of this feature.
~~~
