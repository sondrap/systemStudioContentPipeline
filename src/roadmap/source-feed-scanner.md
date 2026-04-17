---
name: Morning Intelligence Brief
description: Every morning, the pipeline scans the AI world and the founder community forums separately — and surfaces only the topics where something real in AI maps directly to pain Sondra's ICP is already feeling.
effort: medium
status: in-progress
---

The pipeline doesn't wait for Sondra to notice things. It monitors two distinct ecosystems on a schedule and filters relentlessly for intersection: topics where a real AI development maps to a pain point non-technical founders are already expressing in their own language. The scanning infrastructure is live. What remains is the brief as a product experience — a curated artifact she can act on, not just topics silently appearing in the backlog.

## What's been built

- Twice-weekly cron job runs automatically across both source ecosystems
- **Signal sources** scan the AI practitioner world: YouTube channels (Cole Medin, AI Jason), GitHub repos (LangChain, LangGraph, n8n), newsletters (Latent Space, DiamantAI), and key voices on X/LinkedIn
- **Audience sources** scan where the ICP actually hangs out: r/Entrepreneur, r/smallbusiness, r/AiForSmallBusiness, r/automation, r/solopreneur, and LinkedIn founder communities
- Every discovered topic is filtered through the audience lens from `src/audience.md` — it must map to at least one of the four ICP pain themes (Pressure, Tool Sprawl, Relief, Skepticism) to surface
- Topics that pass are automatically added to the backlog with source context and pain theme tagging
- Manual trigger available from the Backlog page
- Chat agent can trigger a scan conversationally and report what was found

## What remains

**The Brief as an Artifact**
- Each scan produces a named "Intelligence Brief" (e.g., "Wednesday Morning, April 16") that persists as its own record — not just topics in the backlog
- Brief appears as a persistent banner on the pipeline dashboard when unread
- Items are grouped by source type so Sondra can see at a glance what came from the AI world vs. what came from founder conversations
- Each item shows its intersection evidence: the AI signal, the audience pain theme it maps to, and a one-line relevance note — "LangGraph 2.0 dropped this week (signal). Founders in r/automation are asking why their AI workflows break unpredictably (audience). Intersection: 'Why Your AI Automation Keeps Falling Apart' — maps to Tool Sprawl."

**In-Brief Actions**
- "Add to Backlog" — saves the item as a topic with source pre-linked and pain theme already tagged
- "Start Research" — kicks the item directly into the pipeline
- "Dismiss" — marks it not relevant (tracked, so the Topic Radar learns from it)

**Brief History**
- Past briefs accessible in the sidebar — nothing disappears
- Items Sondra engaged with are visually marked

**Chat Integration**
- The editorial agent can reference specific briefs conversationally: "Wednesday's brief flagged something the Tool Sprawl crowd will recognize immediately — want me to pull that into a topic?"

## Key details

- Brief items are deduplicated across briefs — the same source item never surfaces twice
- The intersection filter is the primary quality gate: topics that only come from signal sources (no audience evidence) are held unless the pain mapping is obvious; topics that only come from audience sources without a real AI development attached are flagged as "audience signal, no AI hook yet"
- Brief stays tight: 10-15 items maximum, pre-filtered for intersection quality
- Scan schedule: currently twice-weekly; will support daily cadence with a `briefs` table storing `date`, `items` (JSON with per-item engagement state), `status` ('new' | 'read')
- Dismissed items feed back into the Proactive Topic Radar

~~~
The cron job and backlog integration are live. The dual-source architecture and audience lens filtering are live. Remaining work:

Create the `briefs` table: `date`, `items` (JSON array — each item includes: `title`, `signalSource`, `audienceSource`, `painTheme`, `intersectionNote`, `engagementState`), `status` ('new' | 'read').

Migrate cron output from writing directly to the backlog to writing to `briefs` first. The "Add to Backlog" action creates the backlog entry with `painTheme` pre-populated.

Surface the latest unread brief as a dismissable banner on the pipeline dashboard. Add brief history sidebar section. Give the editorial agent a `getLatestBrief` tool.
~~~

## History

- **April 2026** — Scanning infrastructure shipped. Twice-weekly cron job runs automatically across signal and audience sources, topics land in the backlog with pain theme tagging, manual trigger available from Backlog page and via chat agent. Audience lens from `src/audience.md` now filters all topic discovery.
