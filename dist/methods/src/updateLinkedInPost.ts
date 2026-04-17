import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

// Update a LinkedIn post variant — content edits, marking posted, adding
// notes about performance, or deleting the variant entirely (delete=true).
//
// Kept as a single method so the frontend doesn't need three separate
// endpoints for what is really "edit this variant."
export async function updateLinkedInPost(input: {
  articleId: string;
  variantId: string;
  content?: string;          // edit the post text
  postedAt?: number | null;  // mark posted (or null to unmark)
  notes?: string;            // track performance / notes
  delete?: boolean;          // remove this variant entirely
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.articleId);
  if (!article) throw new Error('Article not found.');

  const variants = article.linkedInPosts || [];
  const existing = variants.find(v => v.id === input.variantId);
  if (!existing) throw new Error('LinkedIn variant not found.');

  let updatedVariants;

  if (input.delete) {
    updatedVariants = variants.filter(v => v.id !== input.variantId);
  } else {
    updatedVariants = variants.map(v => {
      if (v.id !== input.variantId) return v;
      const next = { ...v };
      if (input.content !== undefined) {
        next.content = input.content;
        next.characterCount = input.content.length;
        next.edited = true;
      }
      if (input.postedAt !== undefined) {
        // null means "unmark as posted"; a number is the timestamp
        next.postedAt = input.postedAt === null ? undefined : input.postedAt;
      }
      if (input.notes !== undefined) {
        next.notes = input.notes;
      }
      return next;
    });
  }

  const updated = await Articles.update(input.articleId, { linkedInPosts: updatedVariants });
  return { article: updated };
}
