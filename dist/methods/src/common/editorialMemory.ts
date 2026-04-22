// Editorial memory system (Tier 1).
//
// When Sondra sends an article back for revision with notes, those notes
// are signals about her taste. Before this system, each note was used
// once to revise that one article and then discarded — so the same
// mistakes kept appearing in future drafts.
//
// This module persists those signals:
//
//   1. loadEditorialMemoryDigest() — loads active memories from the DB
//      and formats them as a prompt block that drafting + revision
//      prompts can inject. The formatting puts the most stage-relevant
//      patterns first so the writer sees what applies to their current
//      task.
//
//   2. extractAndStoreMemory() — runs after a successful Send Back. Takes
//      the user's revision notes, calls an AI extractor that decides
//      whether the correction is a one-off fix or a pattern likely to
//      recur. If it's a pattern, a new EditorialMemory row is written
//      for future drafts to read.
//
// Design rules baked in:
//   - Extractor is conservative. We'd rather miss a pattern than create
//     a noisy memory. Prompt explicitly says "when in doubt, skip."
//   - Patterns are stored in imperative voice so the writer can apply
//     them directly ("Always X", "Never Y").
//   - Each memory carries a sourceArticleId so Sondra can trace it back.

import { mindstudio } from '@mindstudio-ai/agent';
import { EditorialMemories } from '../tables/editorialMemory';

// Stages we tag memories with. The drafting prompt loads drafting + voice +
// structure + links + general. The SEO pass loads seo + links + general.
// The revision prompt loads everything.
type MemoryStage = 'drafting' | 'revision' | 'seo' | 'voice' | 'structure' | 'links' | 'general';

// Load active editorial memories as a formatted prompt block. Returns an
// empty string if there are no memories yet (new installs, fresh dev DBs).
//
// `stages` filters which categories to include — each caller passes the
// stages relevant to its work. Always include 'general' in the list so
// broad patterns flow everywhere.
export async function loadEditorialMemoryDigest(opts: {
  stages: MemoryStage[];
}): Promise<string> {
  try {
    const stageSet = new Set(opts.stages);
    const memories = await EditorialMemories
      .filter(m => m.active === true)
      .sortBy(m => m.created_at)
      .reverse();

    const relevant = memories.filter(m => stageSet.has(m.stage as MemoryStage));
    if (relevant.length === 0) return '';

    // Cap at 30 memories in a single digest — past that the prompt bloats
    // and marginal memories crowd out the important ones. When the DB
    // grows past 30, we'd move to Tier 2 (structured categories with
    // confidence scoring and auto-retirement of stale patterns).
    const CAP = 30;
    const included = relevant.slice(0, CAP);

    const lines = included.map(m => `- ${m.pattern}`).join('\n');

    return `## Sondra's Editorial Preferences (accumulated from past corrections)

These are patterns Sondra has corrected in past articles. Apply them when writing. They reflect her taste — treat them as higher-priority than the general drafting guidelines below when they conflict.

${lines}

${relevant.length > CAP ? `(${relevant.length - CAP} additional patterns not shown to keep the prompt focused.)` : ''}`;
  } catch (err) {
    // Loading memory should never block a draft or revision. If the table
    // doesn't exist yet, or any other error, return empty and continue.
    console.error('[editorialMemory] Failed to load digest, continuing without it:', err);
    return '';
  }
}

// Extract a pattern from a successful Send Back and store it for future use.
// Runs AFTER the revision rewrite completed and the article was saved, so
// we know the correction was a real revision the system applied.
//
// The extractor is deliberately conservative — see the prompt rules below.
// We'd rather miss a real pattern than create memory noise that makes
// future drafts worse.
export async function extractAndStoreMemory(opts: {
  articleId: string;
  revisionNotes: string;
  beforeBody: string;
  afterBody: string;
  beforeTitle?: string;
  afterTitle?: string;
}): Promise<{ stored: boolean; pattern?: string; stage?: MemoryStage }> {
  const example = {
    isPattern: true,
    pattern: 'Always include 2-5 inline links to research sources woven into the body prose. Never skip them or pile them in a final sources section.',
    stage: 'links' as MemoryStage,
    reasoning: 'The revision notes explicitly asked for source links to be added. This is the kind of thing a drafting agent will keep forgetting without a persistent reminder.',
  };

  const { content } = await mindstudio.generateText({
    message: `An article has just been revised based on user feedback. Decide whether the correction represents a PATTERN worth remembering for future articles, or a ONE-OFF fix specific to this article.

## User's revision notes
${opts.revisionNotes}

## Before (truncated)
Title: ${opts.beforeTitle || '(unchanged)'}

${opts.beforeBody.substring(0, 3000)}

## After (truncated)
Title: ${opts.afterTitle || '(unchanged)'}

${opts.afterBody.substring(0, 3000)}

Decide:

1. Is this a PATTERN likely to recur across future articles, or a ONE-OFF fix for this specific piece?

Signals of a PATTERN: the user's notes describe a general preference ("always", "never", "avoid", "include"). The correction is about structure, voice, format, or habits the drafting agent might repeat. The fix could apply to many different topics.

Signals of a ONE-OFF fix: the user's notes reference specific facts, sentences, or claims in THIS article. The correction is about content accuracy, a specific quote, or a specific section. No one else's article would benefit from this rule.

2. If it IS a pattern, state the pattern as a short imperative rule (1-2 sentences, in Sondra's voice — direct, no filler). Use "Always X" or "Never Y" or similar.

3. Pick the most relevant stage:
   - drafting: how the initial article is written (openings, structure, flow)
   - voice: word choices, tone, signature moves
   - seo: keyword placement, meta descriptions, headings for search
   - links: outbound links, sources, citations
   - structure: section organization, headings, closing patterns
   - revision: things to fix during Send Back rewrites specifically
   - general: applies broadly across all stages

Be conservative. When in doubt, prefer isPattern: false. A smaller, higher-quality memory is worth more than a noisy one that pollutes future drafts.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.3,
      maxResponseTokens: 2000,
      preamble: `You are the editorial memory extractor for Sondra Patton's content pipeline. Your job is to watch what she corrects in articles and decide which corrections represent lasting patterns worth remembering.

The memory you write becomes part of every future article's drafting prompt. So you have to be careful: a noisy memory makes future drafts worse. An empty memory is fine. A good memory is small, specific, and represents real recurring taste, not one-off fixes.

Your output is structured JSON matching the example.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  let parsed: { isPattern: boolean; pattern?: string; stage?: MemoryStage; reasoning?: string };
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error('[editorialMemory] Failed to parse extractor output, skipping store:', content.slice(0, 200));
    return { stored: false };
  }

  if (!parsed.isPattern || !parsed.pattern) {
    console.log('[editorialMemory] Extractor judged this a one-off fix, not storing. Reasoning:', parsed.reasoning);
    return { stored: false };
  }

  // Truncate the source notes so a single long Send Back doesn't bloat
  // the memory row
  const sourceNotes = opts.revisionNotes.length > 300
    ? opts.revisionNotes.slice(0, 297) + '...'
    : opts.revisionNotes;

  try {
    await EditorialMemories.push({
      pattern: parsed.pattern,
      stage: (parsed.stage || 'general') as MemoryStage,
      sourceArticleId: opts.articleId,
      sourceNotes,
      active: true,
    });
    console.log(`[editorialMemory] Stored new ${parsed.stage || 'general'} pattern: "${parsed.pattern.slice(0, 80)}..."`);
    return { stored: true, pattern: parsed.pattern, stage: parsed.stage };
  } catch (err) {
    console.error('[editorialMemory] Failed to store pattern, continuing:', err);
    return { stored: false };
  }
}
