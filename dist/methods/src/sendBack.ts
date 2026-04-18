import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './common/voiceProfile';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { normalizeSignoff } from './common/signoff';

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

## Format
Write in Markdown. Use ## for major sections, ### for subsections. Short punchy paragraphs.
Keep the same general structure unless the revision notes say otherwise.
Preserve the audience orientation. Even when revising, stay speaking TO a non-technical founder, not ABOUT a technology. If the revision notes conflict with the audience lens, prioritize the revision notes (Sondra's judgment wins), but do not introduce new technical jargon or enterprise examples that the original draft avoided.
**Preserve inline images** already in the draft (lines like \`![alt](https://i.mscdn.ai/...)\`) unless the revision notes explicitly say to remove them. The images were placed at specific break points for visual rhythm.
**Preserve existing outbound links** and add more where revision notes request them. When referencing specific data, quotes, surveys, or claims, link inline using markdown link syntax. The sources listed in the Research Brief above have the URLs to use.
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
  const normalizedContent = normalizeSignoff(content);
  const wordCount = normalizedContent.split(/\s+/).filter(Boolean).length;

  // Save the rewritten body and clear revision notes first so the user sees
  // results quickly. Then kick off a fresh SEO critique against the new draft.
  await Articles.update(articleId, {
    body: normalizedContent,
    wordCount,
    status: 'review',
    revisionNotes: undefined,
  });

  console.log(`[${articleId}] Rewrite complete (${wordCount} words). Running critiques...`);

  // Run fresh SEO and draft critiques in parallel on the revised article.
  // They're independent, so doing them together saves the user ~20 seconds.
  const [seoResult, draftResult] = await Promise.all([
    reviewSeoCritique({
      title: article.title,
      body: normalizedContent,
      excerpt: article.excerpt || '',
      focusKeyword: article.focusKeyword || '',
      metaDescription: article.ogDescription || article.metaDescription || '',
      competitorInsights: article.researchBrief?.competitorInsights,
    }).catch(err => {
      console.error(`[${articleId}] SEO critique refresh failed:`, err);
      return null;
    }),
    reviewDraftCritique({
      title: article.title,
      body: normalizedContent,
      excerpt: article.excerpt || '',
    }).catch(err => {
      console.error(`[${articleId}] Draft critique refresh failed:`, err);
      return null;
    }),
  ]);

  const critiqueUpdates: any = {};
  if (seoResult) critiqueUpdates.seoCritique = seoResult;
  if (draftResult) critiqueUpdates.draftCritique = draftResult;
  if (Object.keys(critiqueUpdates).length > 0) {
    await Articles.update(articleId, critiqueUpdates);
    console.log(`[${articleId}] Critiques refreshed. SEO: ${seoResult?.issues.length ?? 'failed'}. Draft: ${draftResult?.issues.length ?? 'failed'}.`);
  }
}
