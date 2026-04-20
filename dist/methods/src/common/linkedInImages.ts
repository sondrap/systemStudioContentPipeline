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

export type LinkedInImageType = 'quote' | 'stat';

export interface LinkedInImagePayload {
  // The text used to render the card. For quote cards, this is the quote
  // itself. For stat cards, this is the headline number + label combined.
  text: string;
  // For stat cards: the headline number (e.g., "73%", "$2.3M", "10x").
  // Optional for quote cards.
  number?: string;
  // For stat cards: the label after the number (e.g., "of B2B buyers research
  // online before any purchase decision"). Optional for quote cards.
  label?: string;
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
// Bespoke Serif for quote/number (the visual punch), Satoshi for supporting text.
const FONT_IMPORTS = `@import url('https://api.fontshare.com/v2/css?f[]=bespoke-serif@500,700&family=satoshi@500,600&display=swap');`;

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
  background-color: ${BRAND.deepCurrent};
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
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.4;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
</style>
</head>
<body>
  <div class="accent"></div>
  <p class="quote">{{quoteText}}</p>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">SystemStudio</span>
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
.brand {
  font-family: 'Satoshi', sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: ${BRAND.deepCurrent};
  opacity: 0.4;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
</style>
</head>
<body>
  <div class="eyebrow">By the numbers</div>
  <div class="number">{{number}}</div>
  <div class="label">{{label}}</div>
  <div class="footer">
    <span class="handle">{{handle}}</span>
    <span class="brand">SystemStudio</span>
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

// Decide which image type best fits a given LinkedIn post type. The mapping
// follows what the user already asked for: data posts -> stat card, all
// others -> quote card.
export function defaultImageTypeForPost(postType: string): LinkedInImageType {
  return postType === 'data' ? 'stat' : 'quote';
}

// Extract the punchiest line from a LinkedIn post for use as a quote.
// Heuristic: the first 1-2 sentences of the post (the hook is designed to
// be the most quotable line — that's the whole point of the LinkedIn
// hook formula). Caps at 220 chars so it fits the card.
export function extractQuoteFromPost(content: string): string {
  // Strip surrounding whitespace and the often-included opening quote chars
  const lines = content.trim().split(/\n+/);
  // Take the first non-empty line as the hook
  const hook = lines.find(l => l.trim().length > 0) || content.trim();

  // If the hook is short (< 120 chars), it's probably a single punchy line —
  // use it as-is. If longer, just take the first sentence.
  if (hook.length < 120) return hook;

  const firstSentenceMatch = hook.match(/^[^.!?\n]+[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : hook;

  // Final cap — 220 chars max so it fits the card layout
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

// Generate the appropriate image for a LinkedIn post. Used by both the
// initial generation flow (in startArticle / generateLinkedInPosts) and
// the per-variant regenerate flow.
export async function generateImageForPost(opts: {
  postType: string;
  postContent: string;
  authorHandle?: string;
  // When provided, override the auto-extracted text with the user's edit
  customText?: string;
  customNumber?: string;
  customLabel?: string;
}): Promise<GeneratedLinkedInImage> {
  const imageType = defaultImageTypeForPost(opts.postType);
  const handle = opts.authorHandle || AUTHOR_HANDLE;

  if (imageType === 'stat') {
    const { number, label } = opts.customNumber || opts.customLabel
      ? { number: opts.customNumber || '?', label: opts.customLabel || '' }
      : extractStatFromPost(opts.postContent);
    return renderStatCard({
      text: `${number} — ${label}`,
      number,
      label,
      authorHandle: handle,
    });
  }

  // Quote card
  const quoteText = opts.customText || extractQuoteFromPost(opts.postContent);
  return renderQuoteCard({
    text: quoteText,
    authorHandle: handle,
  });
}
