import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { reviewSeoCritique } from './common/seoCritique';

// Manually trigger an adversarial SEO review. Also runs automatically at the
// end of startArticle and after sendBack, but Sondra can re-run it anytime
// from the editor after her own edits.
export async function reviewSeo(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (!article.body || !article.title) {
    throw new Error('Article must have title and body before SEO review.');
  }

  const critique = await reviewSeoCritique({
    title: article.title,
    body: article.body,
    excerpt: article.excerpt || '',
    focusKeyword: article.focusKeyword || '',
    metaDescription: article.ogDescription || article.metaDescription || '',
    competitorInsights: article.researchBrief?.competitorInsights,
  });

  const updated = await Articles.update(input.id, { seoCritique: critique });
  return { article: updated, critique };
}
