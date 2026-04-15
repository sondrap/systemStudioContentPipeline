---
name: Content Series & Arcs
description: Group articles into named series, plan the narrative arc across multiple pieces, and build the kind of sustained authority that one-off articles never create.
effort: medium
status: planned
---

The most influential content creators in any space aren't just writing good individual articles — they're building arguments over time. A series on "The Real Cost of AI Infrastructure" that runs four parts builds more authority than four standalone articles on similar topics. This gives Sondra the tools to plan and execute that kind of intentional content arc.

## What it looks like

**Series Creation**
- Sondra can create a named series with a description, target article count, and planned thesis arc
- Example: "Proprietary Data Playbook" — a 5-part series walking through the full journey from raw data to deployed RAG system
- Each article in the series gets a series label and a part number

**Arc Planning**
- A series view shows all articles in the series in order, with their current status
- Drag to reorder articles within the series
- A "series brief" field: the overall argument this series makes by the time the last article lands
- The writing agent gets the series brief and knows which part it's writing — so each article advances the argument instead of repeating it

**Series-Aware Writing**
- When drafting an article that's part of a series, the writing agent gets: the series brief, the titles and summaries of prior parts (if published), and the article's position in the arc
- It avoids repeating ground already covered and sets up the next part naturally
- "Part 3 of 5 in the Proprietary Data Playbook" appears in the article intro if Sondra approves it

**Series Landing Page** (when Canonical Blog is live)
- Each series gets a dedicated landing page: series intro, links to all parts in order, reading progress for return visitors
- Readers who finish Part 1 see "Continue to Part 2 →" at the bottom

## Key details

- An article can belong to only one series at a time
- Series don't have to be planned upfront — Sondra can add an existing article to a series retroactively
- A series can be "in progress" (more parts coming) or "complete" (the arc is finished)
- The backlog view shows a filter for "in series" vs. "standalone" topics

~~~
Add a `series` table: `name` (string), `description` (string, optional), `seriesBrief` (string, optional), `targetArticleCount` (number, optional), `status` ('active' | 'complete').

Add `seriesId` (string, optional) and `seriesPosition` (number, optional) to the article record.

When the writing agent runs for a series article, the `drafting` method fetches:
- The series record (name, brief)
- Previously published articles in the same series (title + first 500 chars of body as summary)
- The article's position in the series

These are appended to the drafting prompt context.

Series management UI: a new section in the sidebar or a modal accessible from the topic backlog and article editor. Series landing pages are part of the Canonical Blog feature — flag as requiring that.
~~~
