---
name: Data Visualization
description: For articles with numeric content, auto-generate clean charts and graphs in the brand palette — rendered precisely as code, not AI image generation, so every number is always accurate.
effort: medium
status: planned
---

AI image generation can't render numbers. A bar chart generated as an image will hallucinate values, misalign labels, and corrupt data in ways that are hard to spot and damaging to credibility. Data visualization for this pipeline is code-rendered: the pipeline detects numeric claims in the article, interprets the data, and produces clean SVG or HTML charts in the SystemStudio brand palette — accurate by construction.

## What it looks like

**Automatic Detection**
- During the drafting phase, the writing agent flags passages that contain comparative data, trend data, or stat callouts: "adoption grew from 12% to 41% over two years," "tool A handles 3x more requests than tool B," "62% of teams reported..."
- Flags are lightweight markers in the draft, not separate AI calls — the same agent that writes the article decides what to visualize

**Chart Type Selection**
- The pipeline chooses the appropriate chart type based on the data shape:
  - **Bar chart** — comparisons between discrete items or categories
  - **Line/trend chart** — data over time, growth curves, adoption curves
  - **Stat callout card** — a single powerful number deserves its own visual treatment, not a full chart
  - **Simple table** — when the data is multi-dimensional and a chart would oversimplify it
- Sondra can change the chart type or remove the chart entirely in the review editor

**Brand-Accurate Rendering**
- Charts use the SystemStudio palette: Deep Current for primary series, Sage Stone for secondary, Blush Veil for highlights
- Typography matches: Bespoke Serif for chart titles, Satoshi for axis labels and data values
- Output is SVG embedded directly in the article body — crisp at all sizes, no separate image file to manage, no performance hit
- Dark/light rendering respects the blog's display context

**Editable Data**
- Before the chart renders, the pipeline surfaces the extracted data as a small editable table in the review sidebar: "Here's the data I used — does this look right?"
- Sondra can correct numbers, rename labels, or remove a data point before approving
- This is the critical check: the AI does the extraction, Sondra verifies the accuracy

**In-Editor Preview**
- Charts appear inline in the review editor exactly where they'll appear in the published article
- Sondra can drag a chart to a different position or remove it entirely without affecting the surrounding text

## Key details

- Data visualization only activates for articles where the writing agent finds genuinely chartable data — it won't force charts onto articles that don't warrant them
- The threshold: at least two comparable data points, or a clear time-series progression
- Stat callout cards have a lower threshold — any single striking number can get one
- SVG output is sanitized before embedding to prevent XSS; no external dependencies in the rendered chart
- Charts count toward scroll-depth visual coverage alongside the still-life images

~~~
Two-phase implementation:

**Phase 1 — Detection and data extraction:**
Add a `detectVisualizableData(articleBody)` step after drafting completes. Returns an array of visualization candidates: `{ passage, dataType, extractedData, suggestedChartType, insertionPoint }`. Uses a `generateObject` call with a schema that enforces structured data extraction.

**Phase 2 — SVG generation:**
A `renderChart(chartType, data, brandConfig)` method generates deterministic SVG from the extracted data. No AI involved in this step — it's a pure data-to-SVG function. Use a lightweight charting library (D3 or a simple SVG templating approach) to produce the markup.

Store charts as `articleVisuals` records: `articleId`, `type` ('chart'), `svgContent`, `insertionPoint`, `data` (JSON, for re-rendering if brand changes), `approved` (boolean). The review editor reads these alongside still-life images to render the full visual layout.

The editable data table in review calls `updateChartData(visualId, updatedData)` which re-runs the SVG render and updates the stored markup.
~~~
