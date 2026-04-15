---
name: Performance Intelligence
description: See how every published article performs — reads, time on page, traffic sources — and let that data shape which topics the pipeline recommends next.
effort: medium
status: planned
---

Right now the pipeline is output-only. An article goes out and Sondra has no idea whether it found an audience, which topics resonated, or what her best work looks like in terms of reader behavior. This closes the loop: performance data comes back in, and it makes the pipeline smarter about what to write next.

## What it looks like

**Article Performance Panel**
- Each published article gets a performance tab in the article editor
- Metrics: total reads, unique readers, average time on page, estimated read completion rate, top traffic sources
- A 30-day sparkline showing read volume over time (see if it's still picking up traffic or peaked at launch)

**Pipeline Dashboard Stats**
- A stats row at the top of the pipeline dashboard: total published articles, total reads all time, average reads per article, best-performing article this month
- Not overwhelming — just the headline numbers that tell her how her content operation is doing overall

**Top Performers View**
- A sortable list of all published articles ranked by reads, time on page, or engagement rate
- Makes it obvious which topics, article types, and angles resonate most
- "Your RAG articles average 3.2x more reads than your agentic workflow pieces" — the kind of insight that shapes the next quarter's strategy

**Performance Feedback to Topic Radar**
- The Topic Radar (when built) can factor in performance data: if RAG-related content consistently outperforms, it weights RAG topics higher in recommendations
- If a specific source or angle drives more engaged readers, surface more content from that angle
- This is the flywheel: write, measure, write smarter

## Key details

- Metrics sourced from systemstudio.ai's analytics API (if available) or from direct blog analytics if the Canonical Blog is enabled
- Fallback: Google Analytics integration via a tracking ID configured as a secret
- Performance data refreshes daily, not in real-time (this is a strategy tool, not a live dashboard)
- The performance panel is visible for published articles only — no data for in-progress work

~~~
Performance data ingestion depends on the publish destination:
1. **systemstudio.ai API:** Add a `getArticleStats(publishedUrl)` method that calls systemstudio.ai's analytics endpoint if they provide one
2. **Canonical Blog:** Instrument the public blog pages with a lightweight read-tracking endpoint — on page load and at 50% scroll depth, fire a `trackRead(articleId, event)` method. Store in a `readEvents` table: `articleId`, `event` ('view' | 'read'), `source` (referrer), `timestamp`.
3. **Google Analytics:** Configure GA4 tag in the canonical blog, expose Measurement Protocol as a fallback

A `getArticlePerformance(articleId)` method aggregates the data into the standard stats shape regardless of source.

For the Top Performers view and Topic Radar integration, a `getContentPerformanceSummary()` method returns aggregate stats per topic cluster, article type, and source.
~~~
