// Shared helpers for generating editorial still life images.
// Used by startArticle (hero + body images) and regenerateImage (hero only).

import { mindstudio } from '@mindstudio-ai/agent';
import { IMAGE_STYLE_ANCHOR } from './voiceProfile';

export interface ImageConcept {
  objects: { name: string; meaning: string }[];
  altText: string;
  composition: string;
}

// Pick 3-4 objects from the curated brand object bank and explain WHY each fits
// this specific context. Returns structured JSON with objects, alt text, and composition.
//
// `context` should describe what this image needs to represent (article as a whole
// for hero, specific section for body images). `avoidObjects` lets callers exclude
// object names already used elsewhere in the article, so hero and body images use
// different combinations.
export async function pickImageConcept(opts: {
  context: string;
  avoidObjects?: string[];
}): Promise<ImageConcept> {
  const avoidLine = opts.avoidObjects && opts.avoidObjects.length > 0
    ? `\n\nAVOID these objects (already used elsewhere in this article): ${opts.avoidObjects.join(', ')}. Pick from the other objects in the bank instead.`
    : '';

  const exampleConcept: ImageConcept = {
    objects: [
      { name: 'Glass vessel with pale liquid', meaning: 'The proprietary dataset, contained but dormant.' },
      { name: 'Stacked flat river stones', meaning: 'Three approaches layered on top of each other.' },
      { name: 'Single brass key', meaning: 'Unlocking value from data that has been sitting unused.' },
    ],
    altText: 'A glass vessel, stacked river stones, and a brass key arranged on warm linen.',
    composition: 'The vessel sits off-center left, the stones are centered, and the key rests in front casting a soft shadow.',
  };

  const { content } = await mindstudio.generateText({
    message: `${opts.context}${avoidLine}

Choose 3-4 objects from the bank whose combined meanings tell a clear visual story.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.7,
      maxResponseTokens: 16000,
      preamble: `You are the art director for SystemStudio's Journal, a premium editorial blog. Choose objects from the brand's curated object bank that metaphorically represent a specific idea.

CRITICAL: Choose ONLY from this exact object bank. Do not invent new objects.

## Object Bank

- Smooth ceramic sphere (deep teal): completeness, self-contained systems, unity
- Stacked flat river stones (teal and sage): layering, foundations, building up over time
- Frosted glass cube (pale blue): transparency, containment, data, precision
- Glass vessel with pale liquid (pale blue): containment, volume, proprietary data, a reservoir
- Folded handmade paper (blush pink): drafts, documents, iterating, unfinished work
- Coiled linen rope or thread (natural linen): connection, sequence, pipelines, continuity
- Dried botanical stems (sage green): growth, organic processes, natural emergence
- Small brass geometric shapes (pyramids, cubes): precision, engineering, structure, small components
- Smooth wooden blocks (sage stone): building blocks, modularity, composable units
- Single brass key: access, unlocking, proprietary, hidden value

## Rules

- Choose 3-4 objects, not more, not fewer.
- The combination must tell a coherent visual story tied to the specific context provided.
- Each object's meaning must explicitly connect to the context. Don't just repeat the bank description. Say what THIS object means HERE.
- altText: one sentence under 140 chars describing the composition for screen readers and SEO.
- composition: one sentence describing spatial arrangement.
- No text, screens, devices, hands, or people.
- Plain, direct voice. No em dashes, no hype.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(exampleConcept),
  });

  return JSON.parse(content) as ImageConcept;
}

// Generate the actual image from a concept. Returns the CDN URL.
export async function renderStillLife(concept: ImageConcept): Promise<string> {
  const objectDescriptions = concept.objects?.map(o => o.name).join(', ') ||
    'smooth ceramic sphere, folded handmade paper, coiled linen rope';
  const composition = concept.composition ||
    'Objects arranged with generous negative space and thoughtful spacing.';

  const { imageUrl } = await mindstudio.generateImage({
    prompt: `${IMAGE_STYLE_ANCHOR} Objects in the composition: ${objectDescriptions}. ${composition} Each object rendered with clear, recognizable silhouettes so viewers immediately understand what they are. Arranged thoughtfully with generous negative space. Composition should feel intentional and meaningful, as if each object was carefully placed to tell a story.`,
    imageModelOverride: {
      model: 'seedream-4.5',
      config: {
        width: 2048,
        height: 1076,
      },
    },
  });

  return imageUrl as string;
}
