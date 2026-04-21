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
  // When provided, override the auto-extracted text with the user's edit
  customText?: string;
  customNumber?: string;
  customLabel?: string;
  // Free-text direction for the AI quote picker. When provided and no
  // customText, AI chooses a verbatim quote from the article body based
  // on this guidance (e.g., "something more confessional, not a data point").
  direction?: string;
  // Quotes to avoid picking. Used by regen to cycle through candidates
  // instead of returning the same top-scored line every time.
  excludeQuotes?: string[];
}): Promise<GeneratedLinkedInImage> {
  const imageType = defaultImageTypeForPost(opts.postType);
  const handle = opts.authorHandle || AUTHOR_HANDLE;

  if (imageType === 'stat') {
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

  // Quote card — source priority: customText → AI with direction → article
  // body extraction (with exclude list for regen variety) → post content
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
    if (!quoteText) {
      quoteText = extractQuoteFromPost(opts.postContent);
    }
  } else {
    quoteText = extractQuoteFromPost(opts.postContent);
  }

  return renderQuoteCard({
    text: quoteText,
    authorHandle: handle,
  });
}
