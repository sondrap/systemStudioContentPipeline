---
name: Pull Quote Cards
description: Render standout sentences from articles as typographic card graphics at key break points — creating visual rhythm and shareable moments without needing additional imagery.
effort: small
status: planned
---

Not every article has data to chart. Pull quote cards give any article visual rhythm: the AI identifies the most compelling sentence in each major section and renders it as a branded typographic card — a striking visual break that rewards scanners and creates naturally shareable moments.

## What it looks like

**Candidate Identification**
- After drafting, the pipeline scans the article for standout passages: strong claims, counterintuitive statements, quotable conclusions, striking statistics stated in prose
- Surfaces 3-5 candidates with their position in the article
- Sondra picks which ones become cards (or approves the defaults) in the review editor

**Card Design**
- Bespoke Serif for the quote text — set large, with generous line height
- Satoshi in a small uppercase treatment for the article title as attribution context
- Background uses the Linen base with a Deep Current left-border accent, or an inverted treatment (Deep Current background, Linen text) for contrast
- Cards are rendered as inline SVG — consistent rendering across all publish destinations, no external font loading required

**Placement**
- Cards appear at natural break points: between h2 sections, after a paragraph that builds to a climactic claim
- The pipeline places cards so they don't stack with still-life images — visual variety is the goal, not visual density
- No more than one pull quote card per major section

**Shareable Export**
- Each pull quote card can also be exported as a standalone image sized for LinkedIn (1200×627) or Twitter/X (1600×900)
- The "Share this quote" option in the published article view pulls the card image and pre-populates a share prompt
- This turns every compelling sentence into a social distribution moment

## Key details

- Pull quote cards are subordinate to still-life images in placement priority — they fill scroll-depth gaps where an image doesn't land, not compete with them
- The "inverted" card treatment (dark background) is used sparingly — no more than one per article — to avoid monotony
- Cards are generated at review time, not before — so Sondra sees the full article before choosing which quotes get elevated
- The shareable export sizes are generated on demand, not stored preemptively

~~~
Pull quote candidates are identified with a `findPullQuoteCandidates(articleBody)` call — a simple `generateObject` call that returns: `{ quote, sectionIndex, rationale }[]` sorted by impact score.

Card rendering is pure SVG/HTML template — no AI call, no external service. Parameterized by quote text, card style ('bordered' | 'inverted'), and brand config. Store as `articleVisuals` records with `type: 'pullquote'` alongside charts and still-life image references.

Shareable export: `exportQuoteCard(visualId, format: 'linkedin' | 'twitter')` re-renders the SVG at the target dimensions using the same template, returns as a downloadable PNG (use a headless browser render or canvas-based conversion).
~~~
