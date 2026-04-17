import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { generateAllLinkedInPosts } from './common/linkedInPosts';

// Generate all 5 LinkedIn post variants for an article. Replaces any existing
// variants. Called from the editor's "Generate posts" button when Sondra
// wants to refresh the whole set, or automatically after the article's SEO
// pass completes.
export async function generateLinkedInPosts(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');
  if (!article.body || !article.title) {
    throw new Error('Article must have title and body before LinkedIn posts can be generated.');
  }

  const posts = await generateAllLinkedInPosts({
    articleTitle: article.title,
    articleBody: article.body,
    articleExcerpt: article.excerpt || '',
    focusKeyword: article.focusKeyword,
  });

  const updated = await Articles.update(input.id, { linkedInPosts: posts });
  return { article: updated, posts };
}
