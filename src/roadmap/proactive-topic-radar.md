---
name: Proactive Topic Radar
description: The pipeline connects what's heating up in the AI world and what Sondra's ICP is actively struggling with this week — and makes a case for the three topics she should write next, with the reasoning shown.
effort: medium
status: planned
---

The Morning Brief surfaces raw signal. The Topic Radar interprets it. It looks at what's been covered, what themes are underrepresented, what the ICP is feeling acutely right now, and makes a case for the three topics Sondra should tackle this week — with full reasoning. With the audience lens now baked into every source scan, the Radar has richer inputs than ever: not just "what's trending in AI" but "what are founders actually struggling with this week, and which of those maps to a real AI development she hasn't covered yet."

## What it looks like

**Weekly Radar Panel**
- A panel in the pipeline dashboard (or as a weekly agent message) showing 3-5 topic recommendations
- Each recommendation includes: the proposed topic, the AI signal behind it, the audience pain it maps to, the content angle it fits (Validating Overwhelm / Translating Tech / Anti-Hype / Investor Pressure), what's already in the pipeline to avoid overlap, and an estimated research richness score
- One-click to add to backlog or start research immediately

**Reasoning Transparency**
- Each recommendation shows its full intersection logic: "LangGraph 2.0 dropped this week (signal). Founders in r/automation are asking why their AI workflows keep failing (audience — Tool Sprawl). You haven't covered Tool Sprawl in six weeks. SEO opportunity: high. Angle: Anti-Hype Pragmatist. This fits."
- Not a black box — Sondra should be able to agree or disagree with each piece of the reasoning

**Pain Theme Coverage View**
- The Radar shows which of the four ICP pain themes (Pressure, Tool Sprawl, Relief, Skepticism) Sondra has covered recently and which are underrepresented in her last 90 days
- A "coverage gap" indicator flags when a theme hasn't appeared in more than 4 weeks — her audience is still feeling that pain even if she hasn't addressed it
- Content angles are tracked separately: if she hasn't written an Anti-Hype piece in two months, that's surfaced as a strategic gap

**"Why Not" Visibility**
- Topics Sondra dismissed from the brief show up with a note: "You dismissed this twice — mark it as permanently not relevant?"
- Dismissed items inform the noise model so the Radar tightens over time

**Discovery Call Boost**
- When Prospect Questions Capture is live, questions and objections Sondra has logged from real conversations appear as a dedicated "From Your Conversations" section at the top of the Radar — highest-priority signal, since these come directly from the ICP's mouth
- If the same pain theme has appeared in three or more conversations, the Radar flags it as urgent

## Key details

- Runs weekly (configurable), generates a fresh recommendation set
- Every recommendation must pass the intersection test: real AI signal + documented ICP pain — no exceptions
- Factors in: recent backlog items with pain theme tags, published article coverage by theme and angle, what's in the current pipeline, SEO opportunity ratings on backlog topics, and time since last article in each theme
- The agent can answer "why did you recommend this?" conversationally and reference specific sources by name
- Recommendations persist until Sondra acts — they don't expire on the next run, but are marked stale if a newer recommendation supersedes them on the same topic

~~~
The scanning foundation is live with dual-source architecture and pain theme tagging. The Radar can be built immediately against existing backlog data.

The radar method:
1. Pulls recent unactioned backlog items including `painTheme`, `seoOpportunity`, `suggestedKeyword`, and source attribution (signal vs. audience)
2. Pulls the last 90 days of published articles with their titles and pain theme tags to map coverage
3. Computes theme and angle coverage gaps (simple frequency analysis per theme/angle over the 90-day window)
4. If `prospectQuestions` table exists (Prospect Questions Capture), pulls recent entries and weighs themes with 3+ entries as urgent
5. Runs `generateText` with: backlog items, coverage gap analysis, content angle history, and ICP pain themes from `src/audience.md` to produce ranked recommendations with full intersection reasoning
6. Stores as a `radar` record: `generatedAt`, `recommendations` (JSON including painTheme, angle, signalEvidence, audienceEvidence, intersectionReasoning), `status` ('active' | 'archived')

Give the editorial agent a `getTopicRadar` tool. The agent's system prompt includes the four pain themes and four content angles so it can reason about recommendations conversationally.

When Real Search Volume Data ships, augment step 1 with `keywordData.monthlyVolume` and `keywordData.difficulty` — replace estimated opportunity ratings with hard numbers in the ranking logic.
~~~
