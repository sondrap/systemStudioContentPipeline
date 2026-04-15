---
name: Research Archive
description: Every research brief the pipeline has ever compiled, searchable and reusable — so prior work compounds instead of disappearing after an article ships.
effort: small
status: planned
---

Every time the research pipeline runs, it produces something valuable: a structured brief with key findings, quotes, and sources on a specific topic. Right now that brief is only accessible while reviewing the article it produced. This makes all that prior research permanently findable and reusable.

## What it looks like

**Archive View**
- A dedicated section (accessible from the sidebar or a top-nav item) listing all past research briefs
- Each brief shows: topic, research date, source count, which article it produced (if any), key findings preview
- Full-text search across all briefs

**Research Reuse**
- When starting a new article, Sondra can optionally attach a prior brief as "prior research" — the writing agent incorporates both the new research and the prior brief
- When the agent discovers a topic closely related to a prior brief, it surfaces it: "You researched LangGraph stateful agents in January — want me to pull that into this research pass?"

**Research-Only Mode**
- Run the research pipeline on a topic without creating an article — just to capture the brief
- Useful for exploratory research that isn't ready for an article yet

## Key details

- All briefs stored indefinitely, never auto-deleted
- Search covers: topic title, key findings text, source URLs, quotes
- Briefs can be tagged manually (e.g., "RAG," "fine-tuning," "agentic") for category browsing
- The editorial agent has access to the archive via a `searchResearchArchive` tool

~~~
Research briefs are already stored as JSON on the article record. This feature:
1. Decouples briefs from articles — brief can exist without producing an article
2. Adds a `researchBriefs` table (or repurposes article records without bodies) for standalone briefs
3. Builds a search index over brief content (SQLite FTS5 is sufficient)
4. Adds a `searchResearchArchive` method exposed to the agent

The archive UI is a new view in the sidebar or as a tab on the Topic Backlog view.
~~~
