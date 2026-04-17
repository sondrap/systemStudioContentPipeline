---
name: Social Share Cards
description: Auto-generate a branded Open Graph preview image for every article — so when Sondra's work gets shared on LinkedIn, Twitter, or in Slack, the link preview looks like it came from a premium publication.
effort: small
status: planned
---

The article body is beautifully art-directed. The link preview that appears when someone shares it on social is an afterthought. Social Share Cards fixes that: every article automatically gets a branded OG image built from its title, subtitle, and visual identity — so the first impression of a shared article is as strong as the article itself.

## What it looks like

**Auto-Generated at Publish**
- When an article is approved, the pipeline generates a branded OG image sized at 1200×630px
- The card uses the article title (Bespoke Serif, large), subtitle or first sentence (Satoshi), and the SystemStudio Pipeline brand mark
- Background uses a linen-to-deep-current gradient — consistent across all articles, instantly recognizable as Sondra's brand

**Title Treatment Options**
- Short titles: set large and centered with generous breathing room
- Longer titles: set left-aligned with a stronger typographic hierarchy — title, then byline, then brand mark
- The pipeline selects the layout automatically based on character count

**Article Hero as Background**
- Optionally, the article's hero image can appear as a blurred background behind the card text — giving each share card a unique visual identity while keeping the brand typography consistent in the foreground
- Sondra can toggle this preference globally or per-article

**Publish Destination Integration**
- For systemstudio.ai publishing: the OG image URL is passed as part of the publish payload
- For the Canonical Blog (when built): the OG image is served from the pipeline's own storage and referenced in the `<meta>` tags
- The share card URL is stored on the article record for use anywhere else (newsletter, LinkedIn post, etc.)

## Key details

- Generated as a PNG, stored as an article asset alongside the hero image
- Regenerated automatically if the article title changes before publishing
- The same SVG template used for pull quote cards is extended for share cards — consistent rendering approach, no new infrastructure
- Falls back gracefully: if generation fails, the hero image serves as the OG image

~~~
`generateShareCard(articleId)` renders an SVG template with the article's title, subtitle, and brand config, then converts to PNG using the same canvas/headless approach as pull quote card exports.

Store as an `articleVisuals` record with `type: 'ogcard'`. The publishing methods (`publishToSite`, `publishToBlog`) read the share card asset and include it in the publish payload automatically.

Trigger generation at the "Approve & Publish" step — before the API call to systemstudio.ai, ensure the share card asset exists (or generate it synchronously if missing).
~~~
