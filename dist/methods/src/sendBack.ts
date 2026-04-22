import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './common/voiceProfile';
import { normalizeSignoff } from './common/signoff';
import { stripPaywalledLinks } from './common/paywall';
import { loadEditorialMemoryDigest, extractAndStoreMemory } from './common/editorialMemory';

export async function sendBack(input: { id: string; revisionNotes: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (!input.revisionNotes?.trim()) {
    throw new Error('Revision notes are required when sending back.');
  }

  // Save notes and move to drafting
  await Articles.update(input.id, {
    status: 'drafting',
    revisionNotes: input.revisionNotes.trim(),
  });

  // Fire-and-forget rewrite
  rewriteArticle(input.id, article, input.revisionNotes.trim()).catch(async (err) => {
    console.error('Rewrite failed:', err);
    await Articles.update(input.id, {
      status: 'review',
      revisionNotes: `Rewrite failed: ${err?.message || 'Unknown error'}. Original notes: ${input.revisionNotes}`,
    });
  });

  return { status: 'drafting' };
}

async function rewriteArticle(
  articleId: string,
  article: any,
  revisionNotes: string,
) {
  console.log(`[${articleId}] Rewriting with notes: ${revisionNotes}`);

  // Include source URLs so revision notes that ask for inline links (e.g.,
  // "add links to the research sources") have the actual URLs to work with.
  const researchContext = article.researchBrief
    ? `\n\n## Research Brief\n${article.researchBrief.summary}\n\nKey Findings:\n${article.researchBrief.keyFindings?.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}\n\nSources (available for inline linking):\n${(article.researchBrief.sources || []).map((s: any) => `- [${s.title}](${s.url}): ${s.relevance}`).join('\n')}${article.researchBrief.quotes?.length ? `\n\nQuotes:\n${article.researchBrief.quotes.map((q: any) => `- "${q.text}" — ${q.attribution}`).join('\n')}` : ''}`
    : '';

  const seoContext = article.focusKeyword
    ? `\n\n## SEO Context\nFocus keyword: "${article.focusKeyword}". Keep this keyword in the title, first paragraph, and used naturally 2-3 more times. If revision notes conflict with keyword placement, prioritize the revision notes (the user's edits take precedence over SEO).`
    : '';

  // Load Sondra's accumulated editorial preferences. The revision prompt
  // gets all stages since revision touches every aspect of the article.
  const editorialMemoryDigest = await loadEditorialMemoryDigest({
    stages: ['drafting', 'revision', 'seo', 'voice', 'structure', 'links', 'general'],
  });

  // Capture the pre-revision state for the memory extractor later
  const beforeBody = article.body || '';
  const beforeTitle = article.title;

  const { content } = await mindstudio.generateText({
    message: `Rewrite the following article based on the revision notes.

## Current Draft
${article.body || '(empty)'}

## Revision Notes
${revisionNotes}
${researchContext}
${seoContext}

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

${editorialMemoryDigest}

## Format
Write in Markdown. Use ## for major sections, ### for subsections. Short punchy paragraphs.
Keep the same general structure unless the revision notes say otherwise.
Preserve the audience orientation. Even when revising, stay speaking TO a non-technical founder, not ABOUT a technology. If the revision notes conflict with the audience lens, prioritize the revision notes (Sondra's judgment wins), but do not introduce new technical jargon or enterprise examples that the original draft avoided.
**Preserve inline images** already in the draft (lines like \`![alt](https://i.mscdn.ai/...)\`) unless the revision notes explicitly say to remove them. The images were placed at specific break points for visual rhythm.
**Preserve existing outbound links** and add more where revision notes request them. When referencing specific data, quotes, surveys, or claims, link inline using markdown link syntax. The sources listed in the Research Brief above have the URLs to use.
**Never link to paywalled publications.** Avoid Forbes, WSJ, NYT, Bloomberg, FT, Harvard Business Review, The Atlantic, Economist, Business Insider, Wired, Substack subscriber-only posts, Medium members-only posts, and any other source that hides content behind a subscribe wall. If the existing draft or research brief contains a paywalled link, replace it with a freely-accessible equivalent (primary source, press release, company blog, or free coverage of the same story) OR remove the link and mention the publication by name in prose. Sending a reader to a paywall is worse than having no citation at all.
**The article MUST end with Sondra's signature sign-off.** The very last thing in the article body, after the final content paragraph, must be a blank line and then these two lines on their own:

Don't overthink it,
SP

Never put the sign-off mid-article. Never write it as a single line. If the original draft has the sign-off in the wrong place (e.g., mid-article), move it to the end. If the draft is missing it entirely, add it. The canonical form is two lines with "SP" alone on the last line.
Output ONLY the revised article body in markdown. No preamble, no explanation.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.6,
      maxResponseTokens: 16000,
    },
  });

  // Belt-and-suspenders: normalize the sign-off after the rewrite. If the
  // model forgot it, added it mid-article, or wrote it on a single line,
  // this makes it canonical. Runs deterministically so every revision ships
  // with the correct close regardless of what the model does.
  // Normalize signature sign-off, then strip any paywalled links the rewrite
  // introduced. Both are belt-and-suspenders filters applied after the AI
  // stage — the prompt tells the model not to do these things, but we don't
  // trust that guarantee alone for things that affect every reader.
  const signoffNormalized = normalizeSignoff(content);
  const { body: normalizedContent, strippedUrls } = stripPaywalledLinks(signoffNormalized);
  if (strippedUrls.length > 0) {
    console.log(`[${articleId}] Send-back rewrite: stripped ${strippedUrls.length} paywalled link(s)`);
  }
  const wordCount = normalizedContent.split(/\s+/).filter(Boolean).length;

  // Save the rewritten article and clear the stale critiques. Sondra's
  // revision notes ARE the editorial direction for this pass — the AI
  // critics should not second-guess her judgment by re-flagging issues
  // on the rewrite. If she wants a fresh AI opinion later, both critique
  // panels have a Re-run button.
  await Articles.update(articleId, {
    body: normalizedContent,
    wordCount,
    status: 'review',
    revisionNotes: undefined,
    // Clear the previous critiques. They were about the old draft and
    // would be misleading to display alongside the new body.
    seoCritique: undefined,
    draftCritique: undefined,
  });

  console.log(`[${articleId}] Rewrite complete (${wordCount} words). Critiques cleared — Sondra's notes are the editorial direction for this pass.`);

  // Editorial memory extraction — fire-and-forget. The extractor looks
  // at what Sondra asked for via revision notes and decides if the
  // correction is a pattern worth remembering for future articles.
  // Conservative by design: when in doubt, skips storing rather than
  // adding noise to future drafts.
  if (revisionNotes && revisionNotes.trim().length > 10) {
    extractAndStoreMemory({
      articleId,
      revisionNotes,
      beforeBody,
      afterBody: normalizedContent,
      beforeTitle,
      afterTitle: article.title,
    }).catch((err) => {
      console.error(`[${articleId}] Editorial memory extraction failed (non-blocking):`, err);
    });
  }
}
