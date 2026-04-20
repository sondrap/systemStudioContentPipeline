import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { generateSinglePost, LinkedInPostType } from './common/linkedInPosts';
import { generateImageForPost } from './common/linkedInImages';
import { withDbRetry } from './common/retry';

// Regenerate a single LinkedIn post variant by id, keeping the rest of the
// variants intact. Used when Sondra doesn't like the angle of one variant
// but wants to preserve her edits to the others. Also regenerates the
// matching social card image since the post content changed.
export async function regenerateLinkedInPost(input: { articleId: string; variantId: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.articleId);
  if (!article) throw new Error('Article not found.');

  const variants = article.linkedInPosts || [];
  const existing = variants.find(v => v.id === input.variantId);
  if (!existing) throw new Error('LinkedIn variant not found.');

  // Regenerate the post text first
  const newPost = await generateSinglePost(existing.postType as LinkedInPostType, {
    articleTitle: article.title,
    articleBody: article.body || '',
    articleExcerpt: article.excerpt || '',
    focusKeyword: article.focusKeyword,
  });

  // Then regenerate the image based on the new content. Image failure
  // doesn't block the post regeneration — the post is still useful even
  // without an updated image.
  let imageFields: any = {};
  try {
    const image = await generateImageForPost({
      postType: newPost.postType,
      postContent: newPost.content,
    });
    imageFields = {
      imageUrl: image.imageUrl,
      imageType: image.imageType,
      imageText: image.text,
      imageNumber: image.number,
      imageLabel: image.label,
    };
  } catch (err) {
    console.error('[regenerateLinkedInPost] image regeneration failed:', err);
  }

  const newVariant = { ...newPost, ...imageFields, notes: existing.notes };

  // Replace the variant in-place so the order stays stable
  const updatedVariants = variants.map(v =>
    v.id === input.variantId ? newVariant : v
  );

  const updated = await withDbRetry(
    () => Articles.update(input.articleId, { linkedInPosts: updatedVariants }),
    { label: 'regenerateLinkedInPost.save' },
  );
  return { article: updated, post: newVariant };
}
