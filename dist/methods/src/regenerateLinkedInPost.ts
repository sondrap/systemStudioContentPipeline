import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { generateSinglePost, LinkedInPostType } from './common/linkedInPosts';

// Regenerate a single LinkedIn post variant by id, keeping the rest of the
// variants intact. Used when Sondra doesn't like the angle of one variant
// but wants to preserve her edits to the others.
export async function regenerateLinkedInPost(input: { articleId: string; variantId: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.articleId);
  if (!article) throw new Error('Article not found.');

  const variants = article.linkedInPosts || [];
  const existing = variants.find(v => v.id === input.variantId);
  if (!existing) throw new Error('LinkedIn variant not found.');

  const newVariant = await generateSinglePost(existing.postType as LinkedInPostType, {
    articleTitle: article.title,
    articleBody: article.body || '',
    articleExcerpt: article.excerpt || '',
    focusKeyword: article.focusKeyword,
  });

  // Replace the variant in-place so the order stays stable
  const updatedVariants = variants.map(v =>
    v.id === input.variantId
      ? { ...newVariant, notes: existing.notes }  // preserve any notes Sondra wrote
      : v
  );

  const updated = await Articles.update(input.articleId, { linkedInPosts: updatedVariants });
  return { article: updated, post: newVariant };
}
