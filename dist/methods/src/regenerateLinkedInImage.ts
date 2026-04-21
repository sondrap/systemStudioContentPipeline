import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { generateImageForPost } from './common/linkedInImages';
import { withDbRetry } from './common/retry';

// Regenerate ONLY the social card image for a LinkedIn post variant —
// keeps the post text untouched. Used when Sondra wants to:
//
//   - Try a different quote line on the image (without rewriting the post)
//   - Edit the stat number or label on a stat card
//   - Steer the quote pick with free-text direction ("focus on the pricing
//     angle" or "pick something more confessional")
//   - Just hit Regen until she sees one she likes (cycles through top
//     candidates instead of returning the same quote every time)
export async function regenerateLinkedInImage(input: {
  articleId: string;
  variantId: string;
  // Optional overrides for the image content. For quote cards: customText.
  // For stat cards: customNumber + customLabel.
  customText?: string;
  customNumber?: string;
  customLabel?: string;
  // Free-text direction for the AI quote picker. When provided and no
  // customText, AI picks a verbatim quote from the article body based on
  // this guidance. Examples: "focus on the pricing angle", "pick something
  // more personal/confessional", "find the contrarian claim".
  direction?: string;
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.articleId);
  if (!article) throw new Error('Article not found.');

  const variants = article.linkedInPosts || [];
  const existing = variants.find(v => v.id === input.variantId);
  if (!existing) throw new Error('LinkedIn variant not found.');

  // Automatically exclude the current quote so a plain "Regen" click cycles
  // to a different candidate instead of picking the same top-scored line.
  // The customText path ignores this (explicit edit wins).
  const excludeQuotes = [
    existing.imageText,
    existing.imageQuote,
  ].filter((q): q is string => !!q && q.length > 0);

  const image = await generateImageForPost({
    postType: existing.postType,
    postContent: existing.content,
    articleBody: article.body || '',
    customText: input.customText,
    customNumber: input.customNumber,
    customLabel: input.customLabel,
    direction: input.direction,
    excludeQuotes,
  });

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
