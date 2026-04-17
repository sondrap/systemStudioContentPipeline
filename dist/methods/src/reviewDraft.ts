import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { reviewDraftCritique } from './common/draftCritique';

// Manually trigger an adversarial draft review. Runs automatically at the
// end of startArticle and after sendBack, but can be re-run anytime.
export async function reviewDraft(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (!article.body || !article.title) {
    throw new Error('Article must have title and body before draft review.');
  }

  const critique = await reviewDraftCritique({
    title: article.title,
    body: article.body,
    excerpt: article.excerpt || '',
  });

  const updated = await Articles.update(input.id, { draftCritique: critique });
  return { article: updated, critique };
}
