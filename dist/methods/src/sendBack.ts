import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { VOICE_PROFILE } from './common/voiceProfile';

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

  const researchContext = article.researchBrief
    ? `\n\n## Research Brief\n${article.researchBrief.summary}\n\nKey Findings:\n${article.researchBrief.keyFindings?.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}`
    : '';

  const { content } = await mindstudio.generateText({
    message: `Rewrite the following article based on the revision notes.

## Current Draft
${article.body || '(empty)'}

## Revision Notes
${revisionNotes}
${researchContext}

${VOICE_PROFILE}

## Format
Write in Markdown. Use ## for major sections, ### for subsections. Short punchy paragraphs.
Keep the same general structure unless the revision notes say otherwise.
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
