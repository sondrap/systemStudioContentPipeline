---
name: Proactive Topic Radar
description: The pipeline connects what's heating up in Sondra's source ecosystem with gaps in her published content, and tells her exactly what she should write next.
effort: medium
status: planned
---

The Morning Brief surfaces raw signal. The Topic Radar interprets it. It looks at what's been covered, what's trending, what Sondra's audience would find most valuable right now, and makes a case for the three topics she should tackle this week — with reasoning.

## What it looks like

**Weekly Radar Panel**
- A panel in the pipeline dashboard (or as a weekly agent message) showing 3-5 topic recommendations
- Each recommendation includes: the topic, why it's timely, why it fits Sondra's angle, what's already in the pipeline (to avoid overlap), and an estimated research richness score (is there enough out there to write a great article?)
- One-click to add to backlog or start research immediately

**Reasoning Transparency**
- Each recommendation shows its work: "LangGraph 2.0 dropped this week (flagged in Tuesday's brief). You haven't written about stateful agents since February. Your three most-read articles are on agentic architecture. This fits."
- Not a black box — Sondra should be able to agree or disagree with the logic

**"Why Not" Visibility**
- Topics Sondra dismissed from the brief show up with a note: "You dismissed this twice — mark it as permanently not relevant?"

## Key details

- Runs weekly (configurable), generates a fresh recommendation set
- Factors in: recent brief items, Sondra's existing published articles (to avoid repetition), what's in the current pipeline, and time since last piece on a given sub-topic
- The agent should be able to answer "why did you recommend this?" conversationally
- Recommendations don't expire — if Sondra doesn't act on them, they stay visible until she does

~~~
Build on top of the Morning Intelligence Brief (requires that feature). The radar method:
1. Pulls the last 14 days of brief items that weren't dismissed
2. Pulls the last 90 days of published article titles/keywords to understand coverage
3. Runs a `generateText` call with both lists + the content angle to produce ranked recommendations with reasoning
4. Stores as a `radar` record: `generatedAt`, `recommendations` (JSON), `status` ('active' | 'archived')

Agent can surface radar items conversationally. Give the agent a `getTopicRadar` tool.
~~~
