// Deterministic keyword placement verifier + targeted fix-up.
//
// Runs AFTER the SEO optimization pass in startArticle. Even with tightened
// prompt guidance, the model still sometimes ships articles missing the
// focus keyword in places where Sondra expects it. This module catches
// those failures and either fixes them with a cheap targeted rewrite or
// flags them loudly in logs if they can't be auto-fixed.
//
// Philosophy: we don't want to throw the whole article away because the
// keyword isn't in one heading. But we also don't want to ship articles
// where 5 of 6 SEO checks fail, which is what was happening before this
// module existed. This is belt-and-suspenders for the most important SEO
// lever: keyword presence.

import { mindstudio } from '@mindstudio-ai/agent';

export interface KeywordPlacement {
  inTitle: boolean;
  inExcerpt: boolean;
  inOgDescription: boolean;
  inFirst150Words: boolean;
  inAtLeastOneHeading: boolean;
  bodyOccurrences: number;
  missingLocations: string[];
}

// Check where a focus keyword does and doesn't appear. Returns a structured
// result the caller can act on (decide whether to auto-fix or accept the
// article as-is based on severity).
export function analyzeKeywordPlacement(opts: {
  keyword: string;
  title: string;
  excerpt: string;
  ogDescription: string;
  body: string;
}): KeywordPlacement {
  const keyword = opts.keyword.trim().toLowerCase();

  // Normalize whitespace for matching. This catches "AI tools not saving
  // time" even if the article has line breaks or multiple spaces in between.
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

  const titleNorm = normalize(opts.title);
  const excerptNorm = normalize(opts.excerpt);
  const ogNorm = normalize(opts.ogDescription);
  const bodyNorm = normalize(opts.body);

  // First 150 words of the body, excluding the sign-off if present
  const bodyWords = opts.body
    .replace(/Don'?t overthink it,?\s*SP\s*$/i, '')
    .split(/\s+/)
    .filter((w) => w.trim().length > 0);
  const first150 = bodyWords.slice(0, 150).join(' ').toLowerCase();

  // Check each H2 heading
  const headings = (opts.body.match(/^##\s+(.+)$/gm) || []).map((h) =>
    h.replace(/^##\s+/, '').trim().toLowerCase()
  );

  // Count body occurrences (whole article, not just content paragraphs)
  const bodyOccurrences = (bodyNorm.match(new RegExp(escapeRegExp(keyword), 'g')) || []).length;

  const inTitle = titleNorm.includes(keyword);
  const inExcerpt = excerptNorm.includes(keyword);
  const inOgDescription = ogNorm.includes(keyword);
  const inFirst150Words = first150.includes(keyword);
  const inAtLeastOneHeading = headings.some((h) => h.includes(keyword));

  const missingLocations: string[] = [];
  if (!inTitle) missingLocations.push('title');
  if (!inExcerpt) missingLocations.push('excerpt');
  if (!inOgDescription) missingLocations.push('og-description');
  if (!inFirst150Words) missingLocations.push('first-150-words');
  if (!inAtLeastOneHeading) missingLocations.push('any-heading');
  if (bodyOccurrences < 4) missingLocations.push('body-density');

  return {
    inTitle,
    inExcerpt,
    inOgDescription,
    inFirst150Words,
    inAtLeastOneHeading,
    bodyOccurrences,
    missingLocations,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface FixUpResult {
  title: string;
  excerpt: string;
  body: string;
  ogDescription: string;
  wasFixedUp: boolean;
  locationsFixed: string[];
}

// Run a targeted fix-up pass that focuses exclusively on weaving the keyword
// into missing locations. Cheaper and more reliable than a full SEO re-pass
// because the model has one job: place the keyword naturally in the specific
// spots that failed. Returns the updated article parts.
//
// If fewer than 2 locations are missing, we skip the AI pass entirely and
// return the original content — the savings aren't worth the risk of the
// model making unwanted changes.
export async function fixUpMissingKeywordPlacements(opts: {
  keyword: string;
  title: string;
  excerpt: string;
  ogDescription: string;
  body: string;
  placement: KeywordPlacement;
}): Promise<FixUpResult> {
  const missing = opts.placement.missingLocations;
  const locationsFixed: string[] = [];

  // No issues? Return unchanged.
  if (missing.length === 0) {
    return {
      title: opts.title,
      excerpt: opts.excerpt,
      body: opts.body,
      ogDescription: opts.ogDescription,
      wasFixedUp: false,
      locationsFixed: [],
    };
  }

  console.log(`[fixUpKeyword] Missing keyword "${opts.keyword}" in: ${missing.join(', ')}`);

  // Build a focused prompt that tells the model EXACTLY which pieces to
  // fix and which to leave alone.
  const instructions: string[] = [];
  if (missing.includes('title')) {
    instructions.push(`Rewrite the TITLE to include the exact phrase "${opts.keyword}" naturally. Keep the title compelling and human.`);
  }
  if (missing.includes('excerpt')) {
    instructions.push(`Rewrite the EXCERPT to include the exact phrase "${opts.keyword}" naturally. Keep it 1-2 sentences.`);
  }
  if (missing.includes('og-description')) {
    instructions.push(`Rewrite the OG_DESCRIPTION to include the exact phrase "${opts.keyword}" naturally. Keep it 140-160 characters.`);
  }
  if (missing.includes('first-150-words')) {
    instructions.push(`Rewrite ONLY the opening paragraphs of the BODY so the exact phrase "${opts.keyword}" appears within the first 150 words. Preserve the opening's hook and voice.`);
  }
  if (missing.includes('any-heading')) {
    instructions.push(`Rewrite ONE of the existing ## headings to include the exact phrase "${opts.keyword}" or a close variant. Pick a section where the keyword naturally belongs. Do NOT add new headings.`);
  }
  if (missing.includes('body-density')) {
    instructions.push(`Naturally weave 1-2 more mentions of the exact phrase "${opts.keyword}" into the body. Find places where the concept is already being discussed and use the exact phrase instead of a paraphrase. Do NOT add fluff or repeat the keyword unnaturally.`);
  }

  const { content } = await mindstudio.generateText({
    message: `Fix the following SEO issue with this article. The focus keyword "${opts.keyword}" is missing from required locations.

## Current Title
${opts.title}

## Current Excerpt
${opts.excerpt}

## Current OG Description
${opts.ogDescription}

## Current Body
${opts.body}

## What to fix

${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n\n')}

## Rules

- Only fix the specific issues listed above. Leave EVERYTHING else exactly as it is — same voice, same structure, same links, same images, same sign-off.
- If a piece is not mentioned in the fix list, do NOT touch it.
- Preserve the canonical sign-off at the end of the body: blank line, then "Don't overthink it," on one line, then "SP" on the next.
- Plain, direct voice. No em dashes. No hype words. No filler.
- Do NOT force the keyword in awkwardly. If a sentence reads badly with the keyword, rewrite the sentence so it reads naturally WITH the keyword — don't shoehorn it in.

## Output Format

Return the fixed article in this exact format:

TITLE: [title text, one line]
EXCERPT: [excerpt text, 1-2 sentences]
OG_DESCRIPTION: [140-160 char description]
BODY:
[full body markdown, preserving all sections, links, images, and sign-off]`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.3,
      maxResponseTokens: 16000,
    },
  });

  // Parse the structured response
  const titleMatch = content.match(/^TITLE:\s*(.+?)$/m);
  const excerptMatch = content.match(/^EXCERPT:\s*(.+?)$/m);
  const ogMatch = content.match(/^OG_DESCRIPTION:\s*(.+?)$/m);
  const bodyMatch = content.match(/^BODY:\s*\n([\s\S]+?)$/);

  const newTitle = titleMatch ? titleMatch[1].trim() : opts.title;
  const newExcerpt = excerptMatch ? excerptMatch[1].trim() : opts.excerpt;
  const newOgDescription = ogMatch ? ogMatch[1].trim() : opts.ogDescription;
  const newBody = bodyMatch ? bodyMatch[1].trim() : opts.body;

  // Verify the fix actually worked. If the model returned placements but
  // they still don't contain the keyword, log loudly and return what we
  // have (the article is still better than before, just not perfect).
  const recheck = analyzeKeywordPlacement({
    keyword: opts.keyword,
    title: newTitle,
    excerpt: newExcerpt,
    ogDescription: newOgDescription,
    body: newBody,
  });

  for (const loc of missing) {
    if (!recheck.missingLocations.includes(loc)) {
      locationsFixed.push(loc);
    }
  }

  if (recheck.missingLocations.length > 0) {
    console.warn(`[fixUpKeyword] After fix-up, still missing: ${recheck.missingLocations.join(', ')}`);
  } else {
    console.log(`[fixUpKeyword] All ${locationsFixed.length} missing placements fixed`);
  }

  return {
    title: newTitle,
    excerpt: newExcerpt,
    body: newBody,
    ogDescription: newOgDescription,
    wasFixedUp: true,
    locationsFixed,
  };
}
