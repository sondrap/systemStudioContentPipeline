import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { generateImageForPost } from './common/linkedInImages';
import { withDbRetry } from './common/retry';

// Regenerate ONLY the social card image for a LinkedIn post variant —
// keeps the post text untouched. Used when Sondra wants to:
//
//   - Try a different quote line on the image (without rewriting the post)
//   - Edit the stat number or label on a stat card
//   - Re-render after a brand color change to the template
//
// If customText / customNumber / customLabel are provided, those override
// the auto-extracted values. Otherwise the extractor picks fresh values
// from the current post content.
export async function regenerateLinkedInImage(input: {
  articleId: string;
  variantId: string;
  // Optional overrides for the image content. For quote cards: customText.
  // For stat cards: customNumber + customLabel.
  customText?: string;
  customNumber?: string;
  customLabel?: string;
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.articleId);
  if (!article) throw new Error('Article not found.');

  const variants = article.linkedInPosts || [];
  const existing = variants.find(v => v.id === input.variantId);
  if (!existing) throw new Error('LinkedIn variant not found.');

  const image = await generateImageForPost({
    postType: existing.postType,
    postContent: existing.content,
    // Always pass the article body so the extractor can pull a verbatim
    // quote from Sondra's actual writing rather than falling back to the
    // AI-rephrased post content.
    articleBody: article.body || '',
    customText: input.customText,
    customNumber: input.customNumber,
    customLabel: input.customLabel,
  });

  // Replace the image fields in-place, keeping all other variant fields
  // (post text, edit status, posted status, notes) untouched.
  const updatedVariants = variants.map(v =>
    v.id === input.variantId
      ? {
          ...v,
          imageUrl: image.imageUrl,
          imageType: image.imageType,
          imageText: image.text,
          imageNumber: image.number,
          imageLabel: image.label,
        }
      : v
  );

  const updated = await withDbRetry(
    () => Articles.update(input.articleId, { linkedInPosts: updatedVariants }),
    { label: 'regenerateLinkedInImage.save' },
  );
  return { article: updated, image };
}
