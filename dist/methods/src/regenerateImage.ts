import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { IMAGE_STYLE_ANCHOR } from './common/voiceProfile';

export async function regenerateImage(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  try {
    const { imageUrl } = await mindstudio.generateImage({
      prompt: `${IMAGE_STYLE_ANCHOR} Objects that metaphorically relate to the topic: "${article.title}". Choose 3-4 abstract objects from: smooth ceramic spheres, stacked river stones, frosted glass cubes, glass vessels with pale liquid, folded handmade paper, coiled linen thread, dried botanical stems, small brass geometric shapes, smooth wooden blocks, brass keys. Arrange thoughtfully with generous negative space.`,
      imageModelOverride: {
        model: 'seedream-4.5',
        config: {
          width: 2048,
          height: 1076,
        },
      },
    });

    const updated = await Articles.update(input.id, { imageUrl: imageUrl as string });
    return { article: updated };
  } catch (err) {
    console.error('Image regeneration failed:', err);
    throw new Error('Image generation failed. Try again.');
  }
}
