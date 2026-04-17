---
name: In-Body Images
description: Two contextually relevant still-life images generated per article body, placing visual anchors at key scroll depths so every article ships meeting the 3-image industry minimum.
effort: medium
status: in-progress
---

The hero image ships with every article. But a single image at the top doesn't satisfy the scroll-depth rule: there should be something of visual interest no matter how far a reader has scrolled. Stage 1 of the visual upgrade adds two in-body images per article, bringing the total to three and hitting the established industry minimum.

## What's being built

**Two In-Body Images Per Article**
- Generated in the same Editorial Still Life style as the hero — brand-coherent, never generic stock
- Placed at contextually meaningful positions in the article body: at a section break, following a major claim, or where the text shifts angle
- Each image prompt is derived from the local passage content, not the article title — so the image speaks to what's happening at that scroll depth, not just the overall topic

**Placement Logic**
- Articles are split into sections; images land after sections 1 and 3 (roughly the one-third and two-thirds mark)
- The drafting agent is aware of image placement when writing — section breaks are structured to give images natural landing points
- Fallback: for short articles under 600 words, one in-body image is placed at the midpoint

**Pipeline Integration**
- In-body image generation runs in parallel with hero image generation during the drafting phase
- Images are stored as article assets alongside the hero image
- The review editor renders them inline at their intended positions so Sondra sees the full visual layout before approving

## Key details

- Same style, same generation pipeline as the hero — no new image model or prompt architecture required
- Alt text is generated for each image based on the passage it accompanies
- Images are not regenerated on revision passes unless Sondra explicitly requests it
- This is Stage 1. Subsequent stages add chart-based and typographic visuals for different content types.

## History

- **April 2026** — In development. Hero image already ships with every article. This stage adds two in-body images per article to satisfy the scroll-depth coverage rule.
