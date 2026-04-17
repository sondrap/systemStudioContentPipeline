import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './common/voiceProfile';

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
Output ONLY the revised article body in markdown. No preamble, no explanation.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.6,
      maxResponseTokens: 16000,
    },
  });

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  await Articles.update(articleId, {
    body: content,
    wordCount,
    status: 'review',
    revisionNotes: undefined, // Clear notes after rewrite
  });

  console.log(`[${articleId}] Rewrite complete (${wordCount} words).`);
}
