---
name: Voice Training Studio
description: Feed Sondra's own writing into the system to sharpen the AI's voice match over time — with tools to compare outputs, rate the accuracy, and see measurable improvement.
effort: large
status: planned
---

The current voice profile is built from a static set of writing samples and written guidelines. It's good, but it doesn't improve. This turns voice matching into a living, compounding capability: the more Sondra uses the pipeline, the more writing samples it accumulates, and the sharper the match gets.

## What it looks like

**Writing Sample Library**
- A dedicated section where Sondra can upload or paste her own writing
- Each sample is tagged by type (blog post, LinkedIn, social, email) and topic area
- The system uses these samples to refine the voice profile dynamically

**Voice Match Rating**
- After each article enters review, Sondra can rate the voice match on a simple 1-5 scale
- Optional: flag specific sentences or paragraphs as "not my voice" with a highlight tool
- These ratings and flagged passages feed directly into future drafting passes

**Before/After Comparisons**
- The studio shows how article quality has changed over time
- Side-by-side comparison: an early article draft vs. a recent one, on similar topics
- A simple "voice drift" metric: are we getting closer to or further from Sondra's natural style?

**Voice Profile Dashboard**
- Visual summary of the current voice profile: top stylistic traits, common patterns, dos and don'ts
- Sondra can edit profile sections directly ("add: I always start with a specific number or dollar amount")
- Version history of the profile — see what changed and when

**Sample-Driven Drafting**
- When drafting, the agent can pull the 3-5 most stylistically similar samples from the library and use them as direct in-context examples
- This is the highest-impact lever: few-shot prompting from real writing beats written guidelines every time

## Key details

- Minimum viable training: 10 writing samples across varied topics is enough to see meaningful improvement
- Rating data is never used to change the profile automatically — it informs suggestions that Sondra approves
- The flagged "not my voice" passages are particularly valuable: they become explicit negative examples in the prompt
- Voice profile edits take effect on the next drafting pass, not retroactively

~~~
Two main components:

1. **Sample Library:** A `writingSamples` table: `content` (text), `title` (string), `type` ('blog' | 'linkedin' | 'social' | 'email'), `topicTags` (string[], JSON), `addedAt` (timestamp). Full-text indexed.

2. **Rating System:** Add `voiceMatchRating` (1-5, optional) and `voiceFeedback` (JSON array of flagged passage objects with text + reason) to the article record.

The drafting prompt changes: instead of just the static voice profile, it includes:
- The written voice profile
- 3-5 most relevant writing samples (retrieved by topic similarity via embedding search or keyword match)
- Any voice ratings and flagged passages from recent articles

The Voice Profile Dashboard is a new settings-adjacent view. Profile stored as rich text on the user record (currently `imageStyleGuide` field — add a `voiceProfileMarkdown` field alongside it).
~~~
