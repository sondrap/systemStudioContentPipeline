import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { withDbRetry } from './common/retry';

export async function updateArticle(input: {
  id: string;
  title?: string;
  subtitle?: string;
  body?: string;
  excerpt?: string;
  status?: 'researching' | 'drafting' | 'review' | 'published';
  seoKeywords?: string[];
  metaDescription?: string;
  ogDescription?: string;
  tags?: string[];
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
  coverImageAlt?: string;
  focusKeyword?: string;
  slug?: string;
  // Hero image override. Set when Sondra uploads her own image via the
  // custom upload flow, or passes an existing CDN URL. Cleared by setting to
  // an empty string to revert to "no image" state.
  imageUrl?: string;
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  const updates: Record<string, any> = {};
  const fields = [
    'title', 'subtitle', 'body', 'excerpt', 'status',
    'seoKeywords', 'metaDescription', 'ogDescription',
    'tags', 'articleType', 'coverImageAlt', 'focusKeyword', 'slug',
    'imageUrl',
  ] as const;

  for (const field of fields) {
    if ((input as any)[field] !== undefined) {
      updates[field] = (input as any)[field];
    }
  }

  // Compute word count if body changed
  if (input.body) {
    updates.wordCount = input.body.split(/\s+/).filter(Boolean).length;
  }

  // Wrap the autosave in retry — this is the most frequently-called write
  // in the app, so transient platform errors here are extra disruptive.
  const updated = await withDbRetry(
    () => Articles.update(input.id, updates),
    { label: 'updateArticle.save' },
  );
  return { article: updated };
}
