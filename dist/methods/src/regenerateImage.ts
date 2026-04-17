import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { pickImageConcept, renderStillLife } from './common/generateStillLife';

export async function regenerateImage(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  // Pick a new concept, then render the image. Shared with startArticle so
  // regenerations use the same brand bank and concept-first approach.
  const concept = await pickImageConcept({
    context: `Article title: ${article.title}
Focus keyword: ${article.focusKeyword || 'n/a'}
Excerpt: ${article.excerpt || 'n/a'}
Article opening:
${(article.body || '').split('\n').slice(0, 12).join('\n').substring(0, 600)}

This is the HERO image for the article. It should represent the article's overall core idea, not one specific section. This is a REGENERATION, so try a different combination from what the article currently has if possible.`,
  });

  try {
    const imageUrl = await renderStillLife(concept);
    const updated = await Articles.update(input.id, {
      imageUrl,
      coverImageAlt: concept.altText,
    });
    return { article: updated };
  } catch (err) {
    console.error('Image regeneration failed:', err);
    throw new Error('Image generation failed. Try again.');
  }
}
