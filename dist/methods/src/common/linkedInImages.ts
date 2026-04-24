// LinkedIn social card image generator. Renders pixel-perfect 1080x1080 PNG
// cards using HTML+CSS templates with the brand's Bespoke Serif + Satoshi
// fonts and Linen/Deep Current/Blush Veil palette. Calls mindstudio.generateAsset
// to render HTML -> PNG via headless browser, so text is always crisp and
// brand-accurate (no AI text hallucination, no almost-right colors).
//
// Two card variants:
//
//   1. Quote Card: a punchy line from the post as the dominant element.
//      Used for: story, hot-take, confession, framework posts.
//
//   2. Stat Card: a single big number with a short label.
//      Used for: data posts.
//
// Each variant has its own template. Per the user's "LinkedIn Image Generation
// Guidelines" (src/.user-uploads/), the carousel and illustration variants
// from the same brief are explicitly NOT in this v1 build.

import { mindstudio } from '@mindstudio-ai/agent';

// Five image templates, one per LinkedIn post type, designed as a visual
// series. Same fonts (Bespoke Serif, Satoshi) and palette (Linen, Deep
// Current, Sage Stone, Blush Veil, Morning Mist) across all cards; the
// differences are in alignment, weight, color inversion, and layout —
// enough variation that the 5 cards for a single article don't all look
// identical, while still reading as a designed set.
//
//   quote      — big serif quote, centered, Deep Current. (story posts)
//   stat       — big serif number + label, centered. (data posts)
//   headline   — magazine cover treatment, left-aligned, serif 700 with
//                uppercase eyebrow kicker and Blush Veil rule. (hot-take)
//   framework  — numbered list with italic serif numerals and hairline
//                divider. (framework posts)
//   confession — indented narrow column, Sage Stone serif, vertically
//                centered, opens with Blush Veil em-dash, ends with
//                Blush Veil dot. (confession posts)
export type LinkedInImageType = 'quote' | 'stat' | 'headline' | 'framework' | 'confession';

export interface LinkedInImagePayload {
  // The text used to render the card. Meaning depends on card type:
  //   quote      → the quote itself
  //   stat       → number + label joined (also split into separate fields)
  //   headline   → the hook sentence
  //   framework  → the framework title (the list comes from `items`)
  //   confession → the confession prose (2–4 sentences)
  text: string;
  // For stat cards: the headline number (e.g., "73%", "$2.3M", "10x").
  number?: string;
  // For stat cards: the label after the number. For headline cards: an
  // optional eyebrow kicker (e.g., "HOT TAKE"). Defaults to sensible values
  // when omitted.
  label?: string;
  // For framework cards: the numbered list items. Expected 3-4 short lines.
  items?: string[];
  // For headline / framework: the uppercase eyebrow text shown above the
  // headline or title. Defaults to a type-specific fallback.
  eyebrow?: string;
  // Author handle that appears in small text — Sondra's brand.
  authorHandle: string;
}

export interface GeneratedLinkedInImage {
  imageUrl: string;
  imageType: LinkedInImageType;
  // Echo of the text used so the UI can show "this is what's on the image"
  // and let the user edit it for regeneration.
  text: string;
  number?: string;
  label?: string;
  items?: string[];
  eyebrow?: string;
}

// Author handle used in every card. Centralized so it can be easily
// updated as Sondra's brand evolves.
const AUTHOR_HANDLE = '@sondrapatton';

// Brand palette — matches src/interfaces/@brand/colors.md.
const BRAND = {
  linen: '#F7F4F2',         // background
  deepCurrent: '#365367',    // primary text
  sageStone: '#577267',      // secondary
  blushVeil: '#ECD8DC',      // accent
  morningMist: '#D4E4F1',    // pale blue
};

// Fonts — loaded inline via Fontshare per the brand spec.
// Bespoke Serif for quote/number (the visual punch), Satoshi for supporting
// text. Italic variants (500i, 600i) are loaded so the ".ai" in the
// SystemStudio.ai brand mark can render in italic matching the website logo.
const FONT_IMPORTS = `@import url('https://api.fontshare.com/v2/css?f[]=bespoke-serif@500,700&family=satoshi@500,500i,600,600i&display=swap');`;

// SystemStudio.ai brand mark HTML. Renders as "SystemStudio.ai" with the
// ".ai" in italic, matching the treatment on systemstudio.ai itself. Used
// in the footer of every card.
const BRAND_MARK_HTML = `SystemStudio<span class="brand-italic">.ai</span>`;

// Quote Card template. Per the guidelines: "let the words carry the visual,
// no busy imagery". Brand-warm Linen background, Deep Current quote in serif,
// small Blush Veil accent bar, author handle below.
function quoteCardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${FONT_IMPORTS}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1080px; height: 1080px; overflow: hidden;
  background-color: ${BRAND.linen};
}
body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 110px;
  position: relative;
}

/* Subtle accent bar — single Blush Veil stroke */
.accent {
  width: 64px;
  height: 4px;
  background-color: ${BRAND.blushVeil};
  border-radius: 2px;
  margin-bottom: 56px;
}

.quote {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-size: {{quoteFontSize}};
  font-weight: 500;
  line-height: 1.18;
  color: ${BRAND.deepCurrent};
  letter-spacing: -0.01em;
  /* Allow up to 10 lines but clip if longer */
  display: -webkit-box;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Bottom row: author handle, then a soft brand mark on the right */
.footer {
  position: absolute;
  bottom: 80px;
  left: 110px;
  right: 110px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.handle {
  font-family: 'Satoshi', sans-serif;
  font-size: 26px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.02em;
}
/* Brand mark — matches the systemstudio.ai website treatment:
   upright "SystemStudio" + italic ".ai" at the same weight. Kept
   subtle so it reads as a signature, not a dominant element. */
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.55;
  letter-spacing: 0;
}
.brand-italic {
  font-style: italic;
  font-weight: 500;
}
</style>
</head>
<body>
  <div class="accent"></div>
  <p class="quote">{{quoteText}}</p>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">${BRAND_MARK_HTML}</span>
  </div>
</body>
</html>`;
}

// Stat Card template. Big Bespoke Serif number as the hero, short label
// below in Satoshi, author handle in the footer. Same Linen background,
// same Deep Current/Sage Stone palette as the quote card so the two card
// types feel like a coherent set.
function statCardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${FONT_IMPORTS}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1080px; height: 1080px; overflow: hidden;
  background-color: ${BRAND.linen};
}
body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 96px;
  position: relative;
}

.eyebrow {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 56px;
}

.number {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-size: {{numberFontSize}};
  font-weight: 700;
  line-height: 0.95;
  color: ${BRAND.deepCurrent};
  letter-spacing: -0.04em;
  margin-bottom: 48px;
}

.label {
  font-family: 'Satoshi', sans-serif;
  font-size: 38px;
  font-weight: 500;
  line-height: 1.35;
  color: ${BRAND.deepCurrent};
  max-width: 820px;
}

.footer {
  position: absolute;
  bottom: 80px;
  left: 96px;
  right: 96px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.handle {
  font-family: 'Satoshi', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.02em;
}
/* Brand mark — matches the systemstudio.ai website: upright
   "SystemStudio" + italic ".ai" at the same weight. Kept subtle
   so it reads as a signature, not a dominant element. */
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.55;
  letter-spacing: 0;
}
.brand-italic {
  font-style: italic;
  font-weight: 500;
}
</style>
</head>
<body>
  <div class="eyebrow">By the numbers</div>
  <div class="number">{{number}}</div>
  <div class="label">{{label}}</div>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">${BRAND_MARK_HTML}</span>
  </div>
</body>
</html>`;
}

// Headline card template. Magazine-cover treatment: left-aligned content,
// short Blush Veil rule above an uppercase Sage Stone eyebrow kicker, huge
// Bespoke Serif 700 headline with tight negative tracking, Deep Current
// text. Posture = assertive declaration. Per the visual design spec,
// explicitly distinct from the Quote card (center-aligned, weight 500,
// quote marks) so the two never visually collide.
function headlineCardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${FONT_IMPORTS}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1080px; height: 1080px; overflow: hidden;
  background-color: ${BRAND.linen};
}
body {
  padding: 80px 80px 200px 80px;
  position: relative;
  /* Vertical centering via flex so the content block auto-balances. Reserves
     200px at the bottom via padding so the footer never collides with text. */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Short Blush Veil rule — the signature gesture for this card. */
.rule {
  width: 56px;
  height: 3px;
  background-color: ${BRAND.blushVeil};
  margin-bottom: 28px;
}

.eyebrow {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 40px;
}

.headline {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-size: {{headlineFontSize}};
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: ${BRAND.deepCurrent};
  max-width: 860px;
  text-wrap: balance;
  /* Clip at 4 lines as a hard stop even if auto-scale slightly misses */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.footer {
  position: absolute;
  bottom: 80px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.handle {
  font-family: 'Satoshi', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.02em;
}
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.55;
  letter-spacing: 0;
}
.brand-italic { font-style: italic; font-weight: 500; }
</style>
</head>
<body>
  <div class="rule"></div>
  <div class="eyebrow">{{eyebrow}}</div>
  <div class="headline">{{headline}}</div>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">${BRAND_MARK_HTML}</span>
  </div>
</body>
</html>`;
}

// Framework card template. Organized numbered list with italic serif
// numerals (the signature gesture — italic is used ONLY here across the
// set). Left-aligned, hairline divider between header block and list, grid
// layout for the list so numerals and text align cleanly. 3-4 items only;
// longer lists should be demoted to headline or split across cards upstream.
function frameworkCardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${FONT_IMPORTS}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1080px; height: 1080px; overflow: hidden;
  background-color: ${BRAND.linen};
}
body {
  padding: 80px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 28px;
}

.title {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-size: {{titleFontSize}};
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: ${BRAND.deepCurrent};
  max-width: 820px;
  text-wrap: balance;
  margin-bottom: 56px;
  /* Cap at 3 lines */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hairline {
  width: 100%;
  height: 1px;
  background-color: ${BRAND.morningMist};
  margin-bottom: 48px;
}

.list {
  display: grid;
  grid-template-columns: 80px 1fr;
  row-gap: {{rowGap}};
  column-gap: 0;
}

.num {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-weight: 500;
  font-style: italic;
  font-size: 34px;
  color: ${BRAND.sageStone};
  line-height: 1;
  padding-top: 4px;
}

.txt {
  font-family: 'Satoshi', sans-serif;
  font-weight: 600;
  font-size: {{itemFontSize}};
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: ${BRAND.deepCurrent};
}

.footer {
  position: absolute;
  bottom: 80px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.handle {
  font-family: 'Satoshi', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.02em;
}
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.55;
}
.brand-italic { font-style: italic; font-weight: 500; }
</style>
</head>
<body>
  <div class="eyebrow">{{eyebrow}}</div>
  <div class="title">{{title}}</div>
  <div class="hairline"></div>
  <div class="list">{{listRows}}</div>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">${BRAND_MARK_HTML}</span>
  </div>
</body>
</html>`;
}

// Confession card template. Inverse energy to the Quote card: narrow
// indented column, vertically centered, Sage Stone serif (not Deep Current),
// no quote marks, opens with a Blush Veil em-dash and terminates with a
// small Blush Veil dot. Reads as a quiet admission rather than a pronounce-
// ment. Per the visual design spec, the absence of chrome is the point —
// no eyebrow, no rule, no divider.
function confessionCardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${FONT_IMPORTS}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1080px; height: 1080px; overflow: hidden;
  background-color: ${BRAND.linen};
}
body {
  position: relative;
}

.body {
  position: absolute;
  left: 120px;
  top: 50%;
  transform: translateY(-50%);
  width: 640px;
}

.dash {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-weight: 500;
  font-size: {{prose1}};
  color: ${BRAND.blushVeil};
  line-height: 1;
  margin-bottom: 20px;
}

.prose {
  font-family: 'Bespoke Serif', Georgia, serif;
  font-weight: 500;
  font-size: {{prose1}};
  line-height: {{proseLh}};
  letter-spacing: -0.01em;
  color: ${BRAND.sageStone};
  text-wrap: pretty;
  /* Cap extreme overflow at 7 lines */
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Inline terminal punctuation — the card's soft signature. */
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${BRAND.blushVeil};
  margin-left: 8px;
  transform: translateY(-4px);
}

.footer {
  position: absolute;
  bottom: 80px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.handle {
  font-family: 'Satoshi', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: ${BRAND.sageStone};
  letter-spacing: 0.02em;
}
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.55;
}
.brand-italic { font-style: italic; font-weight: 500; }
</style>
</head>
<body>
  <div class="body">
    <div class="dash">—</div>
    <div class="prose">{{prose}}<span class="dot"></span></div>
  </div>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">${BRAND_MARK_HTML}</span>
  </div>
</body>
</html>`;
}

// Pick a font size that scales down with quote length so long quotes still
// fit and short quotes feel impactful. Tuned by trial: characters per line
// at 1080px width with 220px horizontal padding works out to ~22-30 chars
// at the largest size.
function pickQuoteFontSize(text: string): string {
  const len = text.length;
  if (len < 80) return '92px';
  if (len < 140) return '76px';
  if (len < 220) return '60px';
  if (len < 320) return '50px';
  return '42px';
}

function pickNumberFontSize(text: string): string {
  // Numbers are usually short ($2.3M, 73%, 10x). Scale down for longer ones.
  const len = text.length;
  if (len <= 4) return '300px';
  if (len <= 6) return '240px';
  if (len <= 9) return '180px';
  return '140px';
}

// Auto-scale the Headline card's main text based on length. Tuned after
// live tests — 108px at 65 chars was overflowing, so the thresholds are
// tighter than the original design spec suggested. 4-line hard clip in
// the template catches anything that still overflows.
function pickHeadlineFontSize(text: string): string {
  const len = text.length;
  if (len <= 35) return '110px';
  if (len <= 55) return '92px';
  if (len <= 80) return '78px';
  if (len <= 110) return '66px';
  if (len <= 150) return '56px';
  return '48px';
}

// Framework title auto-scale: ≤50 chars 64px, 51-90 chars 56px, 91-120 chars 48px.
function pickFrameworkTitleFontSize(text: string): string {
  const len = text.length;
  if (len <= 50) return '64px';
  if (len <= 90) return '56px';
  return '48px';
}

// Confession auto-scale based on the spec: ≤90 chars 48px/1.3, 91-160 42px/1.32,
// 161-240 36px/1.35. Returns font-size and line-height separately so both can
// be substituted into the template.
function pickConfessionProseStyle(text: string): { fontSize: string; lineHeight: string } {
  const len = text.length;
  if (len <= 90) return { fontSize: '48px', lineHeight: '1.3' };
  if (len <= 160) return { fontSize: '42px', lineHeight: '1.32' };
  return { fontSize: '36px', lineHeight: '1.35' };
}

// Substitute {{var}} placeholders in a template with their actual values.
// Done in our own code rather than relying on generateAsset's testData
// param, which appears to not actually substitute Handlebars variables in
// the current SDK version (every variable rendered as "undefined" in tests).
function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {{key}} with the value
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    out = out.replace(pattern, value);
  }
  return out;
}

// Render a Quote Card. text is the line that will appear as the quote.
export async function renderQuoteCard(payload: LinkedInImagePayload): Promise<GeneratedLinkedInImage> {
  // Strip any wrapping quote characters so we don't double-quote in the template
  const cleanText = payload.text
    .trim()
    .replace(/^["“”'']+|["“”'']+$/g, '')
    .trim();

  const html = substitute(quoteCardHtml(), {
    quoteText: `\u201C${escapeHtml(cleanText)}\u201D`,
    quoteFontSize: pickQuoteFontSize(cleanText),
    handle: payload.authorHandle || AUTHOR_HANDLE,
  });

  const result = await mindstudio.generateAsset({
    source: html,
    sourceType: 'html',
    outputFormat: 'png',
    pageSize: 'custom',
    options: {
      pageWidthPx: 1080,
      pageHeightPx: 1080,
    },
    intermediateAsset: true,
  } as any);

  return {
    imageUrl: (result as any).url,
    imageType: 'quote',
    text: cleanText,
  };
}

// Render a Stat Card. number is the headline (e.g., "73%"), label is the
// short context line below.
export async function renderStatCard(payload: LinkedInImagePayload): Promise<GeneratedLinkedInImage> {
  if (!payload.number || !payload.label) {
    throw new Error('Stat card requires both number and label.');
  }

  const html = substitute(statCardHtml(), {
    number: escapeHtml(payload.number),
    numberFontSize: pickNumberFontSize(payload.number),
    label: escapeHtml(payload.label),
    handle: payload.authorHandle || AUTHOR_HANDLE,
  });

  const result = await mindstudio.generateAsset({
    source: html,
    sourceType: 'html',
    outputFormat: 'png',
    pageSize: 'custom',
    options: {
      pageWidthPx: 1080,
      pageHeightPx: 1080,
    },
    intermediateAsset: true,
  } as any);

  return {
    imageUrl: (result as any).url,
    imageType: 'stat',
    text: `${payload.number} — ${payload.label}`,
    number: payload.number,
    label: payload.label,
  };
}

// Render a Headline card. Uses payload.text as the headline (the post hook)
// and payload.eyebrow as the uppercase kicker. Falls back to "ON AI" if no
// eyebrow is provided so the card never renders with an empty kicker slot.
export async function renderHeadlineCard(payload: LinkedInImagePayload): Promise<GeneratedLinkedInImage> {
  const cleanHeadline = payload.text
    .trim()
    .replace(/^["\u201C\u201D'']+|["\u201C\u201D'']+$/g, '')
    .trim();

  // Truncate at 160 chars — the card is designed for punchy hooks, not
  // paragraphs. Upstream callers should pass in a proper headline.
  const headline = cleanHeadline.length > 160
    ? cleanHeadline.slice(0, 157).replace(/\s+\S*$/, '') + '...'
    : cleanHeadline;

  const eyebrow = (payload.eyebrow || 'HOT TAKE').toUpperCase();

  const html = substitute(headlineCardHtml(), {
    headline: escapeHtml(headline),
    headlineFontSize: pickHeadlineFontSize(headline),
    eyebrow: escapeHtml(eyebrow),
    handle: payload.authorHandle || AUTHOR_HANDLE,
  });

  const result = await mindstudio.generateAsset({
    source: html,
    sourceType: 'html',
    outputFormat: 'png',
    pageSize: 'custom',
    options: { pageWidthPx: 1080, pageHeightPx: 1080 },
    intermediateAsset: true,
  } as any);

  return {
    imageUrl: (result as any).url,
    imageType: 'headline',
    text: headline,
    eyebrow,
  };
}

// Render a Framework card. payload.text is the framework title, payload.items
// is the 3-4 bullet list. Row gap and item font size adjust based on item
// count per the design spec.
export async function renderFrameworkCard(payload: LinkedInImagePayload): Promise<GeneratedLinkedInImage> {
  const items = (payload.items || []).filter(i => i && i.trim().length > 0);
  if (items.length < 2) {
    throw new Error('Framework card requires at least 2 list items.');
  }
  // Cap at 4 — the spec explicitly rules out 5+ items on this card to keep
  // the composition readable at LinkedIn feed size.
  const trimmedItems = items.slice(0, 4);

  // Size adjustments: 3 items get more air, 4 get the default tighter layout.
  const rowGap = trimmedItems.length <= 3 ? '40px' : '32px';
  const itemFontSize = trimmedItems.length <= 3 ? '30px' : '28px';

  // Clean up each item. LinkedIn framework posts tend to use a "short title
  // — long explanation" pattern. The card works best with just the short
  // title, so if an item contains an em-dash or colon boundary, keep only
  // the part before it (that IS the bullet; the rest is reading material).
  // Otherwise apply a generous 90-char cap with graceful word-boundary trim.
  const cleanItems = trimmedItems.map(i => {
    let t = i.trim().replace(/^[-*•\d.)]\s*/, '');

    // Strip trailing explanation after the first em-dash or colon separator.
    // Use Unicode em-dash (\u2014) as well as plain " - " patterns.
    const emDashIdx = t.search(/\s[—\u2014]\s/);
    if (emDashIdx > 10) {
      t = t.slice(0, emDashIdx).trim();
    } else {
      // Colon boundary only if the prefix is short enough to be a title.
      const colonIdx = t.indexOf(': ');
      if (colonIdx > 10 && colonIdx < 60) {
        t = t.slice(0, colonIdx).trim();
      }
    }

    // Final safety cap at 90 chars. If still too long, cut at word boundary
    // with an ellipsis character (single glyph, visually lighter than "...").
    if (t.length > 90) {
      t = t.slice(0, 87).replace(/\s+\S*$/, '').trim() + '…';
    }
    return t;
  });

  const title = payload.text.trim();
  const eyebrow = (payload.eyebrow || 'A FRAMEWORK').toUpperCase();

  // Build the grid rows as concatenated HTML. Each row is numeral cell +
  // text cell. Numerals are zero-padded (01, 02, 03, 04) per the design
  // spec for consistent visual weight.
  const listRows = cleanItems
    .map((item, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<div class="num">${num}</div><div class="txt">${escapeHtml(item)}</div>`;
    })
    .join('\n    ');

  const html = substitute(frameworkCardHtml(), {
    title: escapeHtml(title),
    titleFontSize: pickFrameworkTitleFontSize(title),
    eyebrow: escapeHtml(eyebrow),
    listRows,
    rowGap,
    itemFontSize,
    handle: payload.authorHandle || AUTHOR_HANDLE,
  });

  const result = await mindstudio.generateAsset({
    source: html,
    sourceType: 'html',
    outputFormat: 'png',
    pageSize: 'custom',
    options: { pageWidthPx: 1080, pageHeightPx: 1080 },
    intermediateAsset: true,
  } as any);

  return {
    imageUrl: (result as any).url,
    imageType: 'framework',
    text: title,
    items: cleanItems,
    eyebrow,
  };
}

// Render a Confession card. payload.text is the confession prose. The
// Blush Veil em-dash opener and terminal dot are baked into the template.
export async function renderConfessionCard(payload: LinkedInImagePayload): Promise<GeneratedLinkedInImage> {
  const cleanProse = payload.text
    .trim()
    .replace(/^[—\-]+\s*/, '')   // drop any leading em-dash/dash from input since the card adds its own
    .replace(/["\u201C\u201D'']/g, '') // no wrapping quotes; this isn't a quote card
    .trim();

  // Cap prose length. Important: we don't append "..." when truncating —
  // the card's terminal Blush Veil dot IS the closing punctuation, and
  // stacking ellipsis + dot looks sloppy. Instead, truncate at a clean
  // word boundary and let the dot serve as the period.
  let prose: string;
  if (cleanProse.length > 220) {
    // Cut at 220 chars, back up to the last complete sentence if possible,
    // otherwise the last word. Word boundary is the fallback.
    let cut = cleanProse.slice(0, 220);
    const lastSentence = cut.lastIndexOf('. ');
    if (lastSentence > 120) {
      cut = cut.slice(0, lastSentence);
    } else {
      cut = cut.replace(/\s+\S*$/, '');
    }
    prose = cut.trim();
  } else {
    prose = cleanProse;
  }

  // If the prose ends with a period, drop it — the Blush Veil dot replaces
  // it as the terminal punctuation. If it ends with ! or ?, keep that and
  // the dot will sit after.
  const proseForRender = prose.replace(/[.]+$/, '').trim();

  const style = pickConfessionProseStyle(prose);

  const html = substitute(confessionCardHtml(), {
    prose: escapeHtml(proseForRender),
    prose1: style.fontSize,
    proseLh: style.lineHeight,
    handle: payload.authorHandle || AUTHOR_HANDLE,
  });

  const result = await mindstudio.generateAsset({
    source: html,
    sourceType: 'html',
    outputFormat: 'png',
    pageSize: 'custom',
    options: { pageWidthPx: 1080, pageHeightPx: 1080 },
    intermediateAsset: true,
  } as any);

  return {
    imageUrl: (result as any).url,
    imageType: 'confession',
    text: prose,
  };
}

// HTML-escape a string so quotes and angle brackets don't break the template.
// Handlebars doesn't auto-escape inside our template (we control all of it),
// so we do it manually for the dynamic content.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Decide which image type best fits a given LinkedIn post type. Each of the
// 5 post types gets a visually distinct default so a single article's 5
// LinkedIn variants never look identical:
//
//   story      → quote      (a line from the story lands well as a quote)
//   data       → stat       (big number)
//   hot-take   → headline   (magazine-cover treatment matches the posture)
//   framework  → framework  (numbered list)
//   confession → confession (quiet indented serif)
//
// Unknown post types default to quote. The user can still override via the
// regenerate UI.
export function defaultImageTypeForPost(postType: string): LinkedInImageType {
  switch (postType) {
    case 'data':       return 'stat';
    case 'hot-take':   return 'headline';
    case 'framework':  return 'framework';
    case 'confession': return 'confession';
    case 'story':      return 'quote';
    default:           return 'quote';
  }
}

// Extract a punchy standalone line directly from the ARTICLE BODY for use
// on a quote card. This is the right source for quotes because the article
// body is authored content — lines Sondra wrote or edited — whereas the
// LinkedIn post content is an AI rephrasing that can drift into new
// "quotable" lines that sound like her but aren't actually in her article.
//
// Heuristic scoring:
//   - Must be a complete sentence (ends with . ! or ?)
//   - Prefer 40 to 220 chars (punchy but not tiny or too long)
//   - Prefer sentences that feel standalone (no starting conjunctions)
//   - Skip markdown artifacts (headers, links, list items)
//   - Skip the sign-off and very short fragments
// Returns ranked quote candidates from the article body. Scored by length
// sweet spot, sentence count, first-person voice, etc. Higher score = better
// standalone quote. Returns the raw list so callers can pick the top one,
// skip already-used quotes (for regen variety), or present choices.
export function rankArticleQuoteCandidates(body: string): string[] {
  if (!body || body.trim().length === 0) return [];

  const lines = body
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => {
      if (l.length < 40 || l.length > 300) return false;
      if (l.startsWith('#')) return false;
      if (l.startsWith('-') || l.startsWith('*')) return false;
      if (l.startsWith('>')) return false;
      if (l.startsWith('![')) return false;
      if (/^[Dd]on.t overthink it/.test(l)) return false;
      if (/^SP$/.test(l)) return false;
      if (!/[.!?]$/.test(l)) return false;
      return true;
    });

  if (lines.length === 0) return [];

  const scored = lines.map(line => {
    let score = 0;
    const len = line.length;
    if (len >= 60 && len <= 180) score += 20;
    else if (len >= 40 && len <= 60) score += 10;
    else if (len >= 180 && len <= 220) score += 10;
    const sentenceCount = (line.match(/[.!?]/g) || []).length;
    if (sentenceCount === 1) score += 10;
    if (/^[A-Z]/.test(line) && !/^(And|But|Or|So|Then|Because|Which|That)\b/i.test(line)) score += 5;
    const linkCount = (line.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
    if (linkCount > 1) score -= 10;
    if (line.includes('...') || line.includes('\u2026')) score -= 5;
    if (/\b(I|my|me|we|our|us)\b/.test(line)) score += 3;
    return { line, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Strip markdown and cap length on each candidate before returning
  return scored.map(({ line }) => {
    const clean = line
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    return clean.length > 220 ? clean.slice(0, 217).replace(/\s+\S*$/, '') + '...' : clean;
  });
}

// Extract a punchy standalone line directly from the ARTICLE BODY for use
// on a quote card. This is the right source for quotes because the article
// body is authored content — lines Sondra wrote or edited — whereas the
// LinkedIn post content is an AI rephrasing that can drift into new
// "quotable" lines that sound like her but aren't actually in her article.
//
// `excludeQuotes`: lines to skip (e.g., the one currently on the image,
// so "Regen image" gives variety instead of picking the same top-scored
// line over and over). Compared with normalized whitespace so small
// formatting differences don't defeat the filter.
export function extractQuoteFromArticleBody(body: string, excludeQuotes: string[] = []): string {
  const candidates = rankArticleQuoteCandidates(body);
  if (candidates.length === 0) {
    // Fallback: try to pull any sentence from anywhere in the body
    const sentences = body.match(/[^.!?\n]+[.!?]/g) || [];
    const fallback = sentences.find(s => {
      const trimmed = s.trim();
      return trimmed.length >= 40 && trimmed.length <= 220;
    });
    return fallback?.trim() || '';
  }

  // Skip any candidate matching an excluded quote (whitespace-normalized)
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase().trim();
  const excludeSet = new Set(excludeQuotes.filter(Boolean).map(normalize));

  const firstUnseen = candidates.find(c => !excludeSet.has(normalize(c)));
  // If every top candidate was excluded (e.g., user has regenerated many
  // times), fall back to the top-scored candidate — getting the same
  // quote back is better than getting nothing.
  return firstUnseen || candidates[0];
}

// Kept for backward compat and as a last-resort fallback when no article
// body is available. The article body extractor above is the preferred
// source because post content is AI-rephrased and may not match what the
// article actually says.
export function extractQuoteFromPost(content: string): string {
  const lines = content.trim().split(/\n+/);
  const hook = lines.find(l => l.trim().length > 0) || content.trim();
  if (hook.length < 120) return hook;
  const firstSentenceMatch = hook.match(/^[^.!?\n]+[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : hook;
  if (firstSentence.length > 220) {
    return firstSentence.slice(0, 217).replace(/\s+\S*$/, '') + '...';
  }
  return firstSentence;
}

// Extract a stat from a LinkedIn data post. Looks for the first
// number-with-unit pattern and extracts both the number and the surrounding
// clause as the label. Handles common formats: 73%, $2.3M, 10x, 200+, etc.
export function extractStatFromPost(content: string): { number: string; label: string } {
  // Patterns we recognize, in priority order. The first match wins.
  const patterns: RegExp[] = [
    /(\$[\d.,]+(?:\.\d+)?[BMK]?)/i,            // money: $2.3M, $99, $1,000
    /([\d.,]+%)/,                                  // percentages: 73%, 12.5%
    /([\d.,]+x)/i,                                // multipliers: 10x, 2.5x
    /([\d.,]+\+)/,                                // plus values: 500+, 2,000+
    /(\b\d{2,}(?:[.,]\d+)?\b)/,                  // multi-digit numbers: 73, 1500
  ];

  let foundNumber = '';
  let matchIndex = -1;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      foundNumber = match[1];
      matchIndex = match.index;
      break;
    }
  }

  if (!foundNumber) {
    // Fallback: no number found, treat the whole thing as a quote-style label.
    // The card will still render, just without the visual punch.
    return { number: '?', label: extractQuoteFromPost(content) };
  }

  // For the label, find the sentence containing the number
  const sentences = content.split(/(?<=[.!?])\s+/);
  const containingSentence = sentences.find(s => s.includes(foundNumber)) || sentences[0];

  // Strip the number out of the label so we don't repeat it visually
  let label = containingSentence
    .replace(foundNumber, '')
    .replace(/\s+/g, ' ')
    .trim()
    // Remove leading conjunctions/articles left dangling
    .replace(/^(of|the|a|an|and|but|or|so|that|which|with)\s+/i, '')
    // Remove trailing conjunctions
    .replace(/\s+(of|the|a|an|and|but|or|so|that|which|with)$/i, '')
    .trim();

  // Cap label length so it fits the card
  if (label.length > 140) {
    label = label.slice(0, 137).replace(/\s+\S*$/, '') + '...';
  }

  // If we stripped too much, fall back to the full sentence minus the number
  if (label.length < 10) {
    label = containingSentence.replace(foundNumber, '').trim();
  }

  return { number: foundNumber, label };
}

// AI-driven quote picker. Used when the user provides a direction (e.g.,
// "focus on the pricing angle" or "pick something more personal"). The AI
// reads the article body and chooses a verbatim line matching the direction.
// Validated against the article body to reject hallucinations.
async function pickQuoteWithDirection(opts: {
  articleBody: string;
  direction: string;
  excludeQuotes: string[];
}): Promise<string> {
  const candidates = rankArticleQuoteCandidates(opts.articleBody);
  // Cap candidates sent to the model so the prompt stays small
  const candidateSample = candidates.slice(0, 40);

  const excludeList = opts.excludeQuotes.filter(Boolean).length > 0
    ? `\n\nAVOID these quotes (already used or dismissed):\n${opts.excludeQuotes.filter(Boolean).map(q => `- "${q}"`).join('\n')}`
    : '';

  const { content } = await mindstudio.generateText({
    message: `Pick the best verbatim quote from the article below for a LinkedIn social card image.

User's direction: "${opts.direction}"

Candidate sentences (ranked by standalone quality — prefer these, but you may pick any other sentence from the article body too):
${candidateSample.map((c, i) => `${i + 1}. ${c}`).join('\n')}
${excludeList}

Article body:
${opts.articleBody.substring(0, 10000)}

Return ONLY the chosen quote, verbatim from the article, as a single line of text. No quotation marks, no preamble, no explanation. It must appear word-for-word in the article body. Under 220 characters.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.4,
      maxResponseTokens: 500,
    },
  });

  const picked = content.trim().replace(/^["\u201C\u201D'']+|["\u201C\u201D'']+$/g, '').trim();

  // Validate it's actually in the article
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
  if (picked.length > 0 && normalize(opts.articleBody).includes(normalize(picked))) {
    return picked;
  }
  // Hallucinated or empty — fall back to heuristic with the exclude list
  console.warn('[pickQuoteWithDirection] AI picked a quote not in article body, falling back');
  return extractQuoteFromArticleBody(opts.articleBody, opts.excludeQuotes);
}

// Generate the appropriate image for a LinkedIn post. Used by both the
// initial generation flow (in startArticle / generateLinkedInPosts) and
// the per-variant regenerate flow.
//
// Quote source priority (highest wins):
//   1. `customText` — explicit user edit, trust as-is
//   2. `direction` — AI picks a quote from article body guided by this
//      free-text instruction from the user
//   3. Article body extraction — punchy verbatim line, skipping any in
//      `excludeQuotes` so regen gives variety
//   4. LinkedIn post content — last-resort fallback when no article body is
//      available
//
// The key shift from the old behavior: we no longer default to extracting
// from `postContent`. The LinkedIn post is an AI rephrasing of the article
// and can invent "quotable" lines that sound like Sondra but aren't actually
// in her article. The article body is the source of truth for her words.
export async function generateImageForPost(opts: {
  postType: string;
  postContent: string;
  // The article body is the preferred source for quote extraction. Only
  // optional for backward compatibility; every current caller passes it.
  articleBody?: string;
  authorHandle?: string;
  // When provided, override the auto-extracted text with the user's edit.
  // For quote/headline/confession cards, this replaces the main text. For
  // stat cards, use customNumber+customLabel. For framework cards, use
  // customItems.
  customText?: string;
  customNumber?: string;
  customLabel?: string;
  customItems?: string[];
  customEyebrow?: string;
  // Free-text direction for the AI quote picker (quote cards only). When
  // provided and no customText, AI chooses a verbatim quote from the article
  // body based on this guidance.
  direction?: string;
  // Quotes to avoid picking. Used by regen to cycle through candidates
  // instead of returning the same top-scored line every time.
  excludeQuotes?: string[];
  // Force a specific image type, overriding the default for this post type.
  // Lets the user regenerate a quote card as a headline, etc.
  imageTypeOverride?: LinkedInImageType;
}): Promise<GeneratedLinkedInImage> {
  const imageType = opts.imageTypeOverride || defaultImageTypeForPost(opts.postType);
  const handle = opts.authorHandle || AUTHOR_HANDLE;

  switch (imageType) {
    case 'stat': {
      // For stat cards, prefer extracting the number+label from the article
      // body since that's where the statistic was originally cited. The post
      // content is fine as a fallback.
      let number: string;
      let label: string;
      if (opts.customNumber || opts.customLabel) {
        number = opts.customNumber || '?';
        label = opts.customLabel || '';
      } else if (opts.articleBody) {
        ({ number, label } = extractStatFromPost(opts.articleBody));
      } else {
        ({ number, label } = extractStatFromPost(opts.postContent));
      }
      return renderStatCard({
        text: `${number} — ${label}`,
        number,
        label,
        authorHandle: handle,
      });
    }

    case 'headline': {
      // Headline card: the post's hook treated as a magazine cover line.
      // Source priority: customText → first line of post → first article sentence.
      const hook = opts.customText?.trim() || extractHookFromPost(opts.postContent) || extractQuoteFromPost(opts.postContent);
      return renderHeadlineCard({
        text: hook,
        eyebrow: opts.customEyebrow || eyebrowForPostType(opts.postType),
        authorHandle: handle,
      });
    }

    case 'framework': {
      // Framework card: needs a title + list items. If custom items were
      // provided, use them. Otherwise extract a numbered list from the post.
      let title: string;
      let items: string[];
      if (opts.customItems && opts.customItems.length >= 2) {
        title = opts.customText?.trim() || extractHookFromPost(opts.postContent) || 'A framework';
        items = opts.customItems;
      } else {
        const extracted = extractFrameworkFromPost(opts.postContent);
        title = opts.customText?.trim() || extracted.title;
        items = extracted.items;
      }

      // If extraction failed to find a usable list (fewer than 2 items),
      // gracefully fall back to a quote card. Framework card on 1 item
      // would be worse than a mismatched-but-readable quote.
      if (items.length < 2) {
        console.warn(`[linkedInImages] Framework extraction yielded <2 items, falling back to quote card`);
        const fallback = opts.articleBody
          ? extractQuoteFromArticleBody(opts.articleBody, opts.excludeQuotes || [])
          : extractQuoteFromPost(opts.postContent);
        return renderQuoteCard({ text: fallback, authorHandle: handle });
      }

      return renderFrameworkCard({
        text: title,
        items,
        eyebrow: opts.customEyebrow || eyebrowForPostType(opts.postType),
        authorHandle: handle,
      });
    }

    case 'confession': {
      // Confession card: the vulnerable admission from the post. Source
      // priority: customText → confession-shaped extraction from the post.
      const prose = opts.customText?.trim() || extractConfessionFromPost(opts.postContent);
      return renderConfessionCard({
        text: prose,
        authorHandle: handle,
      });
    }

    case 'quote':
    default: {
      // Quote card — source priority: customText → AI with direction →
      // article body extraction (with exclude list for regen variety) →
      // post content.
      const excludeQuotes = opts.excludeQuotes || [];
      let quoteText: string;
      if (opts.customText && opts.customText.trim().length > 0) {
        quoteText = opts.customText;
      } else if (opts.direction && opts.direction.trim().length > 0 && opts.articleBody) {
        quoteText = await pickQuoteWithDirection({
          articleBody: opts.articleBody,
          direction: opts.direction.trim(),
          excludeQuotes,
        });
      } else if (opts.articleBody) {
        quoteText = extractQuoteFromArticleBody(opts.articleBody, excludeQuotes);
        if (!quoteText) quoteText = extractQuoteFromPost(opts.postContent);
      } else {
        quoteText = extractQuoteFromPost(opts.postContent);
      }

      return renderQuoteCard({
        text: quoteText,
        authorHandle: handle,
      });
    }
  }
}

// Pick a sensible eyebrow kicker based on post type. Lives in one place so
// changing the vocabulary is a single edit. Kept short and declarative —
// these appear in ALL CAPS at small size, so longer phrases get unreadable.
function eyebrowForPostType(postType: string): string {
  switch (postType) {
    case 'hot-take':   return 'HOT TAKE';
    case 'framework':  return 'A FRAMEWORK';
    case 'confession': return 'NOTE TO SELF';
    case 'story':      return 'TRUE STORY';
    case 'data':       return 'BY THE NUMBERS';
    default:           return 'ON AI';
  }
}

// Pull the hook line out of a LinkedIn post for the Headline card. The
// first non-empty line of a LinkedIn post IS the hook — it's what the algo-
// rithm truncates to, and what the writer structured to land the stop.
// Strip hashtags and trailing emoji flourishes that don't belong in a
// headline treatment.
function extractHookFromPost(content: string): string {
  if (!content) return '';
  const firstLine = content.trim().split(/\n+/).find(l => l.trim().length > 0) || '';
  // Strip LinkedIn-style hashtag runs at end of hook, and any wrapping quotes.
  const clean = firstLine
    .replace(/\s*(#\w+\s*)+$/g, '')
    .replace(/^["\u201C\u201D'']+|["\u201C\u201D'']+$/g, '')
    .trim();
  return clean;
}

// Extract a title + numbered list from a framework-style LinkedIn post.
// The post structure: a hook, then a numbered or bulleted list of steps/
// principles, then a CTA. We want the title and the list items.
//
// Detection is deliberately permissive — LinkedIn posts vary in formatting.
// We scan for lines matching "1.", "1)", "→", "—", "•", or "-" as markers.
// Title falls back to the first non-list line before the list begins.
export function extractFrameworkFromPost(content: string): { title: string; items: string[] } {
  if (!content) return { title: 'A framework', items: [] };

  const lines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);

  // List-item pattern matchers, broad enough to catch common LinkedIn styles.
  const isListItem = (l: string): boolean => /^(\d+[.)]|[-•→—]|\*)\s+/.test(l);

  // Strip the marker, leaving just the item text.
  const stripMarker = (l: string): string =>
    l.replace(/^(\d+[.)]|[-•→—]|\*)\s+/, '').trim();

  // Find the first line that looks like a list item.
  const firstListIndex = lines.findIndex(isListItem);

  if (firstListIndex === -1) {
    // No list detected — framework post might be rendered as plain paragraphs.
    // Fall back: use the first line as title, skip the list entirely so the
    // caller falls back to a different card type.
    return { title: lines[0] || 'A framework', items: [] };
  }

  // Gather consecutive list items (stop at the first non-list line after the
  // list begins, to avoid pulling CTA lines in).
  const items: string[] = [];
  for (let i = firstListIndex; i < lines.length; i++) {
    if (isListItem(lines[i])) {
      items.push(stripMarker(lines[i]));
    } else if (items.length >= 2) {
      break;
    }
    // If we haven't found 2 items yet, keep scanning past intervening text.
  }

  // Title: prefer a line a few before the list that looks titular. Fall back
  // to the first non-empty line of the post.
  let title = lines[0] || '';
  if (firstListIndex > 0) {
    // Look backwards from the list start for a line that ends with a colon
    // or looks like a short declarative lead-in. "Here's the framework:" is
    // a common LinkedIn pattern.
    for (let i = firstListIndex - 1; i >= 0; i--) {
      const l = lines[i];
      if (l.endsWith(':') || /^[A-Z].{10,80}$/.test(l)) {
        title = l.replace(/:$/, '').trim();
        break;
      }
    }
  }

  return { title, items };
}

// Extract a confession-shaped passage from a LinkedIn post. Confession posts
// typically open with a vulnerable admission in the first 1–3 lines, before
// pivoting to lesson or advice. We pull those opening lines together as one
// piece of prose.
export function extractConfessionFromPost(content: string): string {
  if (!content) return '';
  const lines = content.trim().split(/\n+/).map(l => l.trim()).filter(Boolean);

  // Take up to the first 3 lines, stopping early if we hit a structural
  // marker (→, bullet, numbered list) that signals the pivot to advice.
  const confessionLines: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    if (/^(\d+[.)]|[-•→]|\*)\s+/.test(l)) break;
    confessionLines.push(l);
    if (confessionLines.length >= 3) break;
  }

  const joined = confessionLines.join(' ').trim();
  // Cap at 240 chars to fit the card.
  if (joined.length > 240) {
    return joined.slice(0, 237).replace(/\s+\S*$/, '') + '...';
  }
  return joined;
}
