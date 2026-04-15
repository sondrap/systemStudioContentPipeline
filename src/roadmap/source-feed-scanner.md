---
name: Morning Intelligence Brief
description: Every morning, the app automatically scans Sondra's entire source ecosystem and surfaces what's new, what's heating up, and what's worth writing about — before she opens her laptop.
effort: medium
status: planned
---

Right now, Sondra has to notice things herself — a tweet, a newsletter, a GitHub commit — and manually add topics to her backlog. This flips that. The pipeline becomes proactive: it reads her trusted sources on a schedule and brings her the signal, filtered through her specific content lens.

## What it looks like

**Daily Brief**
- Every morning, a new "Intelligence Brief" appears in the pipeline dashboard
- Each brief covers: new GitHub releases from her tracked repos, recent newsletter editions, notable posts from her tracked thought leaders, trending discussions in her communities
- Each item includes a relevance note: why this matters for Sondra's specific angle

**In-Brief Actions**
- "Add to Backlog" — save the topic with the source pre-linked
- "Start Research" — kick it directly into the pipeline
- "Dismiss" — mark it as seen and not relevant

**Brief History**
- Past briefs accessible in the sidebar, so nothing disappears
- Items Sondra engaged with are marked

**Chat Integration**
- The editorial agent can reference the morning brief in conversation: "This morning's brief flagged a new LlamaIndex release — want me to pull that into a topic?"

## Key details

- Sources scanned: newsletters (Latent Space, DiamantAI), GitHub release feeds (LangChain, LlamaIndex, CrewAI, AutoGen, NirDiamant/RAG_Techniques), Reddit (r/AI_Agents, r/LocalLLaMA), tracked X/LinkedIn accounts
- Runs at a configured time each morning (default: 7am, Sondra's timezone)
- Each source item is deduplicated against prior briefs — nothing surfaces twice
- Relevance filter: a fast AI pass that scores each item against Sondra's content angle before including it, so the brief stays tight (10-15 items max, not 100)

~~~
Implement as a cron job. For each source category:
- GitHub: poll the GitHub releases API for tracked repos
- Newsletters: parse RSS feeds where available; scrape otherwise
- Reddit: Reddit API for new posts above a score threshold
- Thought leaders: requires either Twitter API (expensive) or a social listening integration

Use a lightweight `generateText` pass to score each item for relevance (0-1) against a prompt describing Sondra's content angle. Only include items above a threshold.

Store briefs in a `briefs` table: `date`, `items` (JSON array), `status` ('new' | 'read'). Items track engagement state (dismissed, added, started).

Surface the latest unread brief as a persistent but dismissable banner on the pipeline dashboard.
~~~
