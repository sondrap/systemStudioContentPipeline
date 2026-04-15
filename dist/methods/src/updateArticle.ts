import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

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
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  const updates: Record<string, any> = {};
  const fields = [
    'title', 'subtitle', 'body', 'excerpt', 'status',
    'seoKeywords', 'metaDescription', 'ogDescription',
    'tags', 'articleType', 'coverImageAlt',
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

  const updated = await Articles.update(input.id, updates);
  return { article: updated };
}
