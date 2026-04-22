import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { reviewSeoCritique } from './common/seoCritique';
import { withDbRetry } from './common/retry';

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

  // Same retry rationale as reviewDraft: the critique took ~25s to generate.
  // Don't throw away expensive AI work because of a transient Redis blip.
  // Restamp generatedAt at save time so the freshness check in the UI
  // compares against when the critique was saved, not when it started
  // running ~25s earlier. Otherwise the critique appears stale the moment
  // it lands.
  const freshCritique = { ...critique, generatedAt: Date.now() };
  const updated = await withDbRetry(
    () => Articles.update(input.id, { seoCritique: freshCritique }),
    { label: 'reviewSeo.save' },
  );
  return { article: updated, critique: freshCritique };
}
