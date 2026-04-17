---
name: Prospect Questions Capture
description: A lightweight tool for logging the questions, objections, and frustrations Sondra hears directly from founders on discovery calls — turning primary ICP research into her highest-signal content ideas.
effort: small
status: planned
---

Reddit and LinkedIn are great proxies. But Sondra has access to something better: real non-technical founders telling her, in their own words, exactly what they don't understand, what they've tried that failed, and what keeps them up at night. Sources.md calls this out explicitly — "if three different prospects asked the same question this month, that is a topic" — and right now that signal evaporates after the call ends. This captures it.

## What it looks like

**Quick-Capture Interface**
- A minimal capture form accessible from anywhere in the app — including a mobile-optimized view for use between calls
- Three fields: what they said (a direct quote or paraphrase), the type (question / objection / frustration), and optional context (call stage, company type, anything that adds color)
- Submit in under 30 seconds. It is not a CRM. It is a napkin.

**Pain Theme Auto-Tagging**
- On save, the pipeline runs a fast classification pass against the four ICP pain themes: Pressure, Tool Sprawl, Relief, Skepticism
- The suggested tag is shown and editable — Sondra can correct it in one tap
- Entries tagged to a theme accumulate against that theme's count

**Pattern Detection**
- When the same pain theme appears in three or more separate entries, the pipeline surfaces an alert: "Tool Sprawl has come up in 4 conversations this month — this is a topic"
- The alert appears in the Morning Intelligence Brief as a "From Your Conversations" item, ranked above scraped sources because it's primary research
- Three entries is the threshold: enough to be a pattern, low enough to catch trends while they're fresh

**Backlog Integration**
- From the alert, one click creates a topic in the backlog: pre-tagged with the pain theme, pre-populated with the actual phrases Sondra heard ("'At what point does the stack become the problem?' — three different calls")
- The real quotes become research context the writing agent can draw on — the article can use the actual language her prospects use, not a paraphrase

**Library View**
- All captured entries are browsable, filterable by theme, and searchable
- Entries that became topics are marked so Sondra can see what she acted on
- At a glance: which themes are accumulating fastest, which are dormant

## Key details

- This is a capture tool, not an analytics dashboard — the interface should be frictionless enough to use on a phone with one hand after hanging up
- Entries are never surfaced publicly or used to train anything without explicit action — they are private notes
- The "three entries" pattern threshold is configurable
- Discovery call entries carry more weight in the Radar than backlog items from scraped sources — documented in the Radar's recommendation prompt as "direct ICP signal"

~~~
New `prospectQuestions` table: `entryText` (string), `entryType` ('question' | 'objection' | 'frustration'), `painTheme` ('pressure' | 'toolSprawl' | 'relief' | 'skepticism'), `context` (string, optional), `capturedAt` (timestamp), `topicId` (foreign key, nullable — set when entry leads to a backlog topic).

`createProspectEntry(data)` — saves the entry and runs `classifyPainTheme(entryText)` (a `generateObject` call with a one-of-four schema) to suggest the tag. Returns both the saved entry and the suggested theme.

`getPatternAlerts()` — groups entries by `painTheme` for the last 30 days, returns themes with count >= 3 that haven't yet generated a topic.

`createTopicFromPattern(painTheme)` — pulls all entries for that theme, generates a topic title and description using the raw quotes as input, creates a backlog item with `painTheme` pre-tagged and source set to 'prospect-conversations', returns the new topic.

The Morning Intelligence Brief query should include `getPatternAlerts()` output when assembling brief items, with a `sourceType: 'prospect'` flag so the UI can distinguish them from scraped sources.
~~~
