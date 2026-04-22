---
name: Pattern Learning System
description: The pipeline learns Sondra's taste from every correction she makes — structured by failure mode, routed to every stage that needs it, and managed so the system stays sharp instead of drifting.
effort: large
status: planned
---

Every Send Back is a signal. Tier 1 captures those signals as a growing list. Tier 2 structures them, routes them intelligently, tracks their confidence, and gives Sondra visibility and control over what the system has learned about her.

## What it looks like

**Structured memory, not a bag of bullets**

Memory is organized by failure mode category — not a single flat list:

- Headline patterns (hooks, formats Sondra accepts vs. rejects)
- Opening hook patterns
- CTA patterns and placement
- Tone calibration (where she pulls back, where she leans in)
- Section structure preferences
- Voice signatures she keeps vs. edits away
- Keyword placement instincts
- Source and link preferences

Each category maintains its own evolving ruleset. Entries aren't just directives — they're typed observations: "Sondra rejected 4 of the last 6 headlines that opened with 'How to' — prefer specific-moment hooks."

**Confidence signals on every learning**

Each pattern carries one of three confidence states:

- **Strong** — observed consistently enough to become a hard rule injected into the writer prompt
- **Emerging** — soft guidance surfaced as a suggestion, not a mandate
- **Noisy** — pattern has been contradicted by recent behavior; flagged for auto-retirement

Confidence rises as the pattern holds and falls when Sondra's actions contradict it. Noisy patterns retire automatically after a review cycle.

**Reviewers get the memory too**

Both the Draft Critique agent and the SEO Critique agent are prompted with the relevant structured learnings for the article they're evaluating — not just the writer. Emerging patterns get caught before they reach Sondra. The corrections loop closes earlier with every article.

**Editorial Patterns page**

A dedicated page in the web UI where Sondra can:
- Browse every learned pattern by category
- See usage stats per rule ("fired 23 times across 8 articles")
- Manually add learnings the extractor missed
- Remove patterns she disagrees with
- Mark a pattern as retired without waiting for auto-review

**Periodic self-review**

Every N articles, the system reviews its own memory for contradictions, outdated rules, and patterns that seem forced or over-fitted. Sondra receives a gentle prompt to confirm or prune the flagged items — a 2-minute editorial hygiene pass that keeps the memory honest.

## Key details

- Builds on Tier 1 (the flat `src/editorial-memory.md` file) as its data source — this is additive, not a rewrite. The extractor agent feeds both systems during the transition.
- Pattern extraction still triggers after every successful Send Back. Tier 2 adds classification and category routing on top of Tier 1's append behavior.
- The confidence system is event-driven: each time a strong pattern fires and Sondra accepts the draft without Send Back on that dimension, confidence ticks up. Each Send Back on a dimension where a strong pattern fired ticks it down.
- The self-review prompt is non-blocking — Sondra can dismiss and it resurfaces after the next review cycle.
- Retired patterns are archived, not deleted. Sondra can reinstate them.

~~~
New `editorialPatterns` table: id, category, pattern_text, confidence (strong/emerging/noisy), observation_count, article_count, last_fired_at, retired_at.

Upgrade the post-SendBack extractor agent to classify each new learning into a category and upsert into the table (incrementing observation_count on match).

New `reviewPatterns` method for the self-review cron: pulls all patterns, runs an LLM pass for contradiction detection, surfaces candidates for retirement.

Draft writer and both critique agents query the table at invocation time — filtering for strong/emerging patterns in the relevant categories — and inject them into their system prompts.

New `editorialPatterns` web page: table view grouped by category, usage stats pulled from the table, inline edit/delete/add controls.
~~~
