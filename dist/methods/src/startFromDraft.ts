import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { runResearchAndDraft } from './startArticle';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './common/voiceProfile';
import { loadEditorialMemoryDigest } from './common/editorialMemory';
import { normalizeSignoff } from './common/signoff';

// Start an article from Sondra's own draft. Different entry point from
// startArticle:
//   - startArticle: pick a topic, AI researches and writes from scratch
//   - startFromDraft: Sondra pastes her own draft, AI polishes as an editor
//     (preserving her voice, arguments, examples) and then runs all the
//     post-drafting stages (SEO, images, critiques, LinkedIn posts)
//
// Use case: Sondra has ideas bouncing around and writes rough drafts in her
// own time. This lets her hand those off to the pipeline for the finishing
// work without having to generate content she already wrote.
//
// Flow:
//   1. Create article record, status: 'drafting', body: Sondra's raw draft
//   2. Run editor pass: polish while preserving voice and content
//   3. Save polished body to the article
//   4. Fire runResearchAndDraft with skipToSeo:true — runs SEO optimization,
//      images, critiques, LinkedIn posts, flips to review.
export async function startFromDraft(input: {
  title: string;
  draft: string;
  focusKeyword?: string;
}) {
  auth.requireRole('admin');

  if (!input.title?.trim()) {
    throw new Error('Title is required.');
  }
  if (!input.draft?.trim() || input.draft.trim().length < 100) {
    throw new Error('Draft must be at least 100 characters. Paste your full rough article.');
  }

  const title = input.title.trim();
  const rawDraft = input.draft.trim();
  const focusKeyword = input.focusKeyword?.trim() || '';

  // Create the article with the raw draft as its starting body. Status is
  // 'drafting' so it shows up correctly on the Pipeline page while the
  // editor pass runs.
  const article = await Articles.push({
    title,
    body: rawDraft,
    excerpt: '',
    status: 'drafting',
    focusKeyword: focusKeyword || undefined,
    articleType: 'mixed',
    wordCount: rawDraft.split(/\s+/).filter(Boolean).length,
  });

  // Fire-and-forget: run editor pass, then hand off to the SEO + post-drafting
  // pipeline. Errors flip the article back to 'review' with an error note so
  // Sondra can see what happened and hit Resume.
  runEditorPassThenPipeline(article.id, title, rawDraft, focusKeyword).catch(async (err) => {
    console.error(`[${article.id}] Editor pipeline failed:`, err);
    await Articles.update(article.id, {
      status: 'review',
      revisionNotes: 'Editor pipeline failed: ' + (err?.message || 'Unknown error. Try again with Resume.'),
    });
  });

  return { article };
}

// The editor pass + post-drafting handoff. Separated into its own function so
// the error handler in startFromDraft can catch failures from either stage
// without nested try/catch.
async function runEditorPassThenPipeline(
  articleId: string,
  title: string,
  rawDraft: string,
  focusKeyword: string,
) {
  console.log(`[${articleId}] Starting editor pass on ${rawDraft.length}-char draft.`);

  // Load editorial memory so corrections Sondra has made on past articles
  // inform this edit too. Same stages as drafting.
  const editorialMemoryDigest = await loadEditorialMemoryDigest({
    stages: ['drafting', 'voice', 'structure', 'links', 'general'],
  });

  // Editor pass. The prompt is deliberately strict about preservation — the
  // whole point of this flow is to keep Sondra's thinking, her examples, her
  // voice. The editor can improve prose, fix flow, tighten sentences, add
  // section headings. It cannot rewrite arguments or add new content.
  const { content: polishedOutput } = await mindstudio.generateText({
    message: `You are editing a rough draft by Sondra Patton. This is HER writing. Your job is to polish it for publication — not to rewrite it.

## Title
${title}
${focusKeyword ? `\n## Focus keyword\n"${focusKeyword}" — this is the SEO target. Where it fits naturally in the existing prose, make sure it appears. Don't force it in where the draft doesn't support it. A later SEO pass will handle keyword placement more aggressively.\n` : ''}
## Sondra's rough draft

${rawDraft}

---

## Your job

Polish this draft for publication. The reader is a non-technical founder who found this through search or social. The article needs to be clear, well-structured, and publication-ready.

### What you MUST preserve

- Every argument Sondra makes. If she takes a position, keep that position.
- Every specific example, number, quote, or reference. These are her credibility.
- Her voice: parenthetical asides, rhetorical questions, specific word choices, sentence rhythm variety, the sign-off at the end.
- The order of her ideas where the logic works. Don't reorder for the sake of reordering.
- The overall length and depth. If she wrote 1,200 words, don't pad to 2,500.

### What you CAN change

- Clarity: if a sentence is muddled, rewrite it for clarity while keeping the meaning.
- Flow: smooth awkward transitions between paragraphs.
- Word choice: replace weak or repetitive words. Cut filler like "very", "really", "just".
- Section headings: add them if the draft doesn't have them, or revise existing ones to be descriptive (not generic like "Introduction" or "Conclusion").
- Paragraph breaks: split long paragraphs, combine choppy ones.
- Format: markdown headings, bullet lists where appropriate, bold for key phrases.
- Grammar and punctuation: fix errors. Avoid em dashes (use commas, parentheses, or periods).
- Tighten: remove redundant phrases, combine repetitive sentences.

### What you must NOT do

- Add new arguments, new examples, or new claims that aren't in the draft.
- Soften her opinions. If she's blunt about something, keep it blunt.
- Add corporate filler ("leverage", "synergize", "game-changing", "incredibly").
- Add chatbot enthusiasm ("Great question!", "Let's dive in!").
- Write filler paragraphs to pad the article.
- Change the ending or remove the sign-off.

${VOICE_PROFILE}

${AUDIENCE_PROFILE}

${editorialMemoryDigest ? `## Sondra's editorial preferences (learned from past corrections)\n\n${editorialMemoryDigest}\n` : ''}

---

## Output format

Return the polished article in exactly this format:

excerpt: A 1-2 sentence excerpt that would make a founder click. Written in Sondra's voice.

---

[The full polished article body in markdown, starting with the title as an H2 (##).]

---

tags: 3-6 relevant topic tags, comma-separated, lowercase, kebab-case. Examples: strategy, ai-adoption, operations, tools, automation, roi, leadership, implementation.
ogDescription: A 140-160 character meta description. Must be in Sondra's voice. Count the characters. It should land in the 140-160 range.

Nothing else. No preamble. No closing notes. Just excerpt, body, tags and ogDescription in the format above.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.4,
      maxResponseTokens: 16000,
    },
  });

  // Parse the output — same format as the main draft phase in startArticle.
  const parts = polishedOutput.split('---').map((s: string) => s.trim());
  let excerpt = '';
  let body = polishedOutput;
  let tags: string[] = [];
  let ogDescription = '';

  if (parts.length >= 3) {
    const excerptLine = parts[0].replace(/^excerpt:\s*/i, '').trim();
    excerpt = excerptLine;
    body = parts.slice(1, -1).join('\n\n---\n\n').trim();

    const lastPart = parts[parts.length - 1];
    const tagMatch = lastPart.match(/tags:\s*(.+)/i);
    const ogMatch = lastPart.match(/ogDescription:\s*(.+)/i);
    if (tagMatch) tags = tagMatch[1].split(',').map(t => t.trim().toLowerCase());
    if (ogMatch) ogDescription = ogMatch[1].trim();
  }

  // Normalize the sign-off. Sondra may have included it in her draft, the
  // editor may have moved it, or it may be missing. Belt-and-suspenders:
  // every article ships with the canonical close in the right place.
  body = normalizeSignoff(body);

  // Build the slug from the title now that we have a final title.
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Save the polished draft before handing off to the post-drafting pipeline.
  // Everything from SEO optimization onward reads from the DB.
  await Articles.update(articleId, {
    body,
    excerpt,
    slug,
    tags,
    ogDescription,
    wordCount,
    status: 'drafting',
  });

  console.log(`[${articleId}] Editor pass complete (${wordCount} words). Handing off to SEO + post-drafting pipeline.`);

  // Hand off to the rest of the pipeline. skipToSeo:true makes it jump
  // straight to SEO optimization — no research, no draft generation. Same
  // post-drafting stages as a fresh AI draft: SEO tune, hero + body images,
  // SEO critique, draft critique, LinkedIn posts, lands in review.
  await runResearchAndDraft(
    articleId,
    title,
    '',
    focusKeyword,
    '',
    { skipToSeo: true },
  );
}
