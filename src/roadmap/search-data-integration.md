---
name: Real Search Volume Data
description: Replace AI-estimated keyword metrics with live data from a professional SEO API — actual monthly searches, keyword difficulty, and trend lines that make every topic decision quantifiably smarter.
effort: medium
status: planned
---

The SEO opportunity score is currently derived from AI analysis of search results. It's directionally right, but it's an estimate. Real search volume data replaces "probably high volume" with hard numbers: 18,400 monthly searches for "LangGraph tutorial," keyword difficulty 42, trend up 34% in 90 days. Every topic decision becomes a business decision.

## What it looks like

**Quantified Topic Backlog**
- The backlog SEO badge that today shows High / Moderate / Low now shows real monthly search volume: "14K / mo" with a small trend arrow
- Keyword difficulty appears as a 0-100 score — a 22 is an opportunity; a 91 is a wall
- Sorting the backlog by search volume or difficulty creates an instant content prioritization framework

**Enriched SEO Panel in the Editor**
- The focus keyword field now shows a data card below it: monthly search volume, difficulty, related keyword suggestions with their own volumes
- Trend sparkline shows 12-month search interest — Sondra can see if she's getting into a topic at the right moment or after the wave has passed
- Top-ranking competitors shown with their estimated monthly organic traffic

**Keyword Suggestions That Have Data Behind Them**
- When Sondra edits the focus keyword, alternative keyword suggestions appear — each with volume, difficulty, and a "better opportunity" or "harder to rank" label
- Turns keyword selection from intuition into informed choice

## Key details

- Powered by Ahrefs Data API or SEMrush API — configured as a secret, so it works without any code changes
- Data refreshes when a topic is created or promoted to research — not on every page load
- If no API key is configured, the system falls back gracefully to the existing AI-estimated scores with no visible degradation
- Volume data is cached per keyword for 7 days — the API is not called on every editor open

~~~
Single integration point: a `getKeywordData(keyword: string)` backend method that calls the configured SEO API and returns a standardized shape: `{ monthlyVolume, difficulty, trend, relatedKeywords[], topCompetitors[] }`.

Store the result in a `keywordCache` table: `keyword`, `data` (JSON), `fetchedAt`. On read, check if `fetchedAt` is within 7 days before making a new API call.

Attach the data to the topic record at research-kick-off time (store as `keywordData` JSON on the topic). The editor reads from the topic record — no live API call during editing.

Graceful fallback: if `KEYWORD_API_KEY` secret is not set, `getKeywordData` returns `null` and the UI falls back to the existing seoOpportunity field.
~~~
