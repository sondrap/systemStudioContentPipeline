import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { pickImageConcept, renderStillLife } from './common/generateStillLife';

export async function regenerateImage(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  // Gather object combinations from other recent articles PLUS this article's
  // current hero objects, so the regeneration is guaranteed to come back
  // different from whatever is already there.
  const recentArticles = await Articles
    .filter(a => a.heroImageObjects !== null && a.heroImageObjects !== undefined && a.id !== input.id)
    .sortBy(a => a.created_at)
    .reverse()
    .take(6);
  const recentCombinations = recentArticles
    .map(a => a.heroImageObjects)
    .filter((c): c is string[] => Array.isArray(c) && c.length > 0);

  // Include the current article's existing hero objects so the regeneration
  // won't just return the same combination.
  if (article.heroImageObjects && article.heroImageObjects.length > 0) {
    recentCombinations.unshift(article.heroImageObjects);
  }

  // Pick a new concept, then render the image. Shared with startArticle so
  // regenerations use the same brand bank and concept-first approach.
  const concept = await pickImageConcept({
    context: `Article title: ${article.title}
Focus keyword: ${article.focusKeyword || 'n/a'}
Excerpt: ${article.excerpt || 'n/a'}
Article opening:
${(article.body || '').split('\n').slice(0, 12).join('\n').substring(0, 600)}

This is the HERO image for the article. It should represent the article's overall core idea, not one specific section. This is a REGENERATION, so use a different combination from what the article currently has.`,
    recentCombinations,
  });

  try {
    const imageUrl = await renderStillLife(concept);
    const updated = await Articles.update(input.id, {
      imageUrl,
      coverImageAlt: concept.altText,
      heroImageObjects: concept.objects.map(o => o.name),
    });
    return { article: updated };
  } catch (err) {
    console.error('Image regeneration failed:', err);
    throw new Error('Image generation failed. Try again.');
  }
}
