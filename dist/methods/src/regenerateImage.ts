import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { pickImageConcept, renderStillLife, ImageConcept } from './common/generateStillLife';

// Regenerate the hero image for an article.
//
// Two modes:
//
//   1. AI mode (default): the AI picks objects from the curated bank and
//      writes the composition. Used when the user just hits "Regenerate
//      Image" with no overrides — they trust the system to pick something
//      good and different from recent articles.
//
//   2. Custom mode: the user provides their own object selection and/or
//      composition. The AI concept-picker step is skipped entirely; we go
//      straight to image rendering with the user's overrides. This is for
//      moments when Sondra has specific taste-level direction the AI would
//      never reach on its own.
export async function regenerateImage(input: {
  id: string;
  // Optional override. When provided, skips the AI concept picker and uses
  // the user's selection directly. Either field is optional — if only
  // objects is provided, we synthesize a generic composition; if only
  // composition, we keep the existing objects.
  customConcept?: {
    objects?: string[];           // object names from the brand bank
    composition?: string;          // free-text description of arrangement
    altText?: string;              // alt text for the rendered image
  };
}) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  let concept: ImageConcept;

  if (input.customConcept && (input.customConcept.objects?.length || input.customConcept.composition)) {
    // CUSTOM MODE — user is steering, skip the AI concept picker.
    const objectNames = input.customConcept.objects && input.customConcept.objects.length > 0
      ? input.customConcept.objects
      : (article.heroImageObjects || []);

    if (objectNames.length === 0) {
      throw new Error('At least one object name is required for custom regeneration.');
    }

    concept = {
      objects: objectNames.map(name => ({
        name,
        // Meaning isn't used by renderStillLife (only the name is sent to
        // the image model), but it's part of the ImageConcept shape so we
        // populate a placeholder.
        meaning: 'User-specified object selection.',
      })),
      composition: input.customConcept.composition?.trim() ||
        'Objects arranged with generous negative space, soft directional light from upper left.',
      altText: input.customConcept.altText?.trim() ||
        `Editorial still life for "${article.title}"`,
    };

    console.log(`[regenerateImage] Using custom concept: ${objectNames.join(', ')}`);
  } else {
    // AI MODE — the original behavior. Pick fresh, avoid recent combinations.
    const recentArticles = await Articles
      .filter(a => a.heroImageObjects !== null && a.heroImageObjects !== undefined && a.id !== input.id)
      .sortBy(a => a.created_at)
      .reverse()
      .take(6);
    const recentCombinations = recentArticles
      .map(a => a.heroImageObjects)
      .filter((c): c is string[] => Array.isArray(c) && c.length > 0);

    if (article.heroImageObjects && article.heroImageObjects.length > 0) {
      recentCombinations.unshift(article.heroImageObjects);
    }

    concept = await pickImageConcept({
      context: `Article title: ${article.title}
Focus keyword: ${article.focusKeyword || 'n/a'}
Excerpt: ${article.excerpt || 'n/a'}
Article opening:
${(article.body || '').split('\n').slice(0, 12).join('\n').substring(0, 600)}

This is the HERO image for the article. It should represent the article's overall core idea, not one specific section. This is a REGENERATION, so use a different combination from what the article currently has.`,
      recentCombinations,
    });
  }

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
