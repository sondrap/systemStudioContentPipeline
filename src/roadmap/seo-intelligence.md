---
name: SEO Intelligence Suite
description: Beyond keyword suggestions — real competitive gap analysis, semantic topic clustering, and a live optimization score in the article editor that tells Sondra exactly where to improve before she publishes.
effort: large
status: done
---

SEO woven through every pipeline stage rather than treated as a separate step. Articles arrive at the review phase already optimized, with clear visibility into what matters for search so Sondra can edit with confidence.

## What Shipped

**Topic-Level Keyword Research**
- Every topic (both agent-scanned and manually added) gets a suggested focus keyword and an SEO opportunity rating (`high`, `moderate`, or `low`) during the scan
- Backlog page shows a colored SEO badge (green up-arrow, amber tilde, or muted down-arrow) on every topic row
- Detail panel displays the full suggested keyword with context about how it will be used
- Helps Sondra prioritize what to write based on real search demand, not just gut feel

**Competitor Gap Analysis in Research**
- During the research phase, the AI analyzes the top 3-5 Google results for the topic
- Extracts common keywords used across competing articles and identifies content gaps (angles, audiences, or subtopics that competitors miss)
- Passed into the writing prompt so the draft naturally differentiates from competitors
- Surfaced in the editor's SEO panel so Sondra can see the competitive landscape while reviewing

**Live SEO Score in Editor**
- Circular score ring (0-100) with color coding: green at 70+, amber at 40-69, red below 40
- 10 weighted checks covering focus keyword placement, meta description length, headings, keyword density, article length, and URL slug
- Updates in real time on every keystroke (computed client-side, no network round-trip)
- Each check has a pass/fail indicator with specific detail explaining what's wrong and how to fix it

**Keyword Highlighting**
- Toggle button switches the article body from editable textarea to a read-only view with every occurrence of the focus keyword wrapped in a gold highlight
- Directly solves "I don't know what to change if it's SEO important" — Sondra can instantly see which words are there for search and which are just prose
- A "Back to editing" pill button returns to the editable view

**Editable SEO Fields**
- Focus keyword, meta description, and URL slug are directly editable in the sidebar panel
- Meta description shows live character count with color feedback (gold if under 120, green at 120-165, red over 165)
- URL slug auto-cleans input to lowercase alphanumeric + hyphens
- Changes debounce to the server after 1.5 seconds of inactivity

**Competitor Insights Panel**
- Collapsible section in the SEO panel showing research-phase competitor analysis
- Three subsections: common keywords competitors use (as tag chips), content gaps (bulleted list of opportunities), and top competing articles with their word counts

## Key Details

- SEO score is a guide, not a mandate. Sondra's voice comes first. The score never pushes toward keyword stuffing or unnatural phrasing.
- Gap analysis runs as part of the research phase, not as a separate manual action
- All scoring is client-side in `utils/seoScore.ts`. No backend call for the score itself.
- Topic-level keyword research uses AI-derived estimates from Google search results. No third-party SEO API required.

## Not Yet Built (Future Enhancements)

- **Semantic topic clusters**: Map Sondra's published library into semantic clusters to inform topic prioritization
- **Internal linking suggestions**: Recommend linking to related published articles from within a draft
- **Real search volume data**: Integrate a third-party SEO API (Ahrefs, SEMrush) for quantitative search metrics

## History

- **2026-04-16** — Built the full SEO integration across all four pipeline stages. Added `seoOpportunity` and `suggestedKeyword` to Topics, `competitorInsights` to research brief, live SEO score panel with 10 weighted checks in the article editor, keyword highlight toggle, and editable SEO fields (focus keyword, meta description, slug). Scenario data updated to seed realistic SEO values.
