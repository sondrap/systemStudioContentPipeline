import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { VOICE_PROFILE, IMAGE_STYLE_ANCHOR, RESEARCH_SOURCES } from './common/voiceProfile';

export async function startArticle(input: {
  topicId?: string;
  title?: string;
  description?: string;
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
}) {
  auth.requireRole('admin');

  let title = input.title || '';
  let description = input.description || '';

  // If starting from a topic, pull topic details
  if (input.topicId) {
    const topic = await Topics.get(input.topicId);
    if (!topic) throw new Error('Topic not found.');
    title = title || topic.title;
    description = description || topic.description || '';

    // Mark topic as in-pipeline
    await Topics.update(input.topicId, { status: 'in-pipeline' });
  }

  if (!title.trim()) {
    throw new Error('Article needs a title or topic.');
  }

  // Create article in researching state
  const article = await Articles.push({
    title: title.trim(),
    status: 'researching',
    topicId: input.topicId,
    articleType: input.articleType || 'mixed',
  });

  // Link topic to article
  if (input.topicId) {
    await Topics.update(input.topicId, { articleId: article.id });
  }

  // Fire-and-forget: research phase
  runResearchAndDraft(article.id, title, description).catch(async (err) => {
    console.error('Research/draft pipeline failed:', err);
    await Articles.update(article.id, {
      status: 'review',
      revisionNotes: 'Pipeline error: ' + (err?.message || 'Unknown error. Try again.'),
    });
  });

  return { article };
}

// Background pipeline: research → draft → image → review
async function runResearchAndDraft(articleId: string, title: string, description: string) {
  // --- RESEARCH PHASE ---
  console.log(`[${articleId}] Starting research for: ${title}`);

  const researchResult = await mindstudio.runTask<{
    summary: string;
    keyFindings: string[];
    sources: { url: string; title: string; relevance: string }[];
    quotes: { text: string; attribution: string }[];
  }>({
    prompt: `You are a research assistant for an AI systems consultant. Your job is to compile a thorough research brief on a given topic.

Research deeply, not widely. Prioritize understanding 5 quality sources over skimming 20. Focus on practical, actionable information.

${RESEARCH_SOURCES}

Search for the topic from multiple angles: recent developments, expert opinions, practical implications, counterarguments. Scrape the most relevant pages for full content.

Be direct and factual. No filler, no em dashes, no emojis in the brief.`,
    input: {
      topic: title,
      context: description,
    },
    tools: ['searchGoogle', 'scrapeUrl'],
    structuredOutputExample: {
      summary: 'Two to three sentence overview of the key findings',
      keyFindings: [
        'First major finding with specific details',
        'Second finding with data or expert opinion',
        'Third finding addressing practical implications',
      ],
      sources: [
        { url: 'https://example.com/article', title: 'Article Title', relevance: 'Why this source matters' },
      ],
      quotes: [
        { text: 'A relevant direct quote from a source', attribution: 'Author Name, Source' },
      ],
    },
    model: 'claude-4-6-sonnet',
    maxTurns: 15,
  });

  if (!researchResult.parsedSuccessfully) {
    console.error('Research failed to produce structured output:', researchResult.outputRaw);
    throw new Error('Research agent failed to produce structured results.');
  }

  // Save research brief
  await Articles.update(articleId, {
    researchBrief: researchResult.output,
    status: 'drafting',
  });

  console.log(`[${articleId}] Research complete. Starting draft.`);

  // --- DRAFT PHASE ---
  const brief = researchResult.output;
  const { content: articleContent } = await mindstudio.generateText({
    message: `Write a blog article based on the research brief below.

## Topic
${title}

## Research Brief
Summary: ${brief.summary}

Key Findings:
${brief.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Sources:
${brief.sources.map(s => `- ${s.title} (${s.url}): ${s.relevance}`).join('\n')}

Quotes:
${brief.quotes.map(q => `- "${q.text}" — ${q.attribution}`).join('\n')}

${VOICE_PROFILE}

## Format Requirements
- Write in Markdown. Use ## for major sections, ### for subsections. Never use # (the title is separate).
- Short punchy paragraphs (2-4 sentences).
- Include a compelling excerpt (1-2 sentences) at the very beginning, separated by ---.
- End with --- followed by suggested tags from: strategy, ai-adoption, operations, case-study, tools, leadership, methodology
- And an ogDescription (max 160 chars)

## Output format
excerpt: [1-2 sentence hook]
---
[article body in markdown]
---
tags: [comma-separated tags]
ogDescription: [max 160 chars for social sharing]`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.6,
      maxResponseTokens: 16000,
    },
  });

  // Parse the structured output
  const parts = articleContent.split('---').map((s: string) => s.trim());
  let excerpt = '';
  let body = articleContent;
  let tags: string[] = [];
  let ogDescription = '';

  if (parts.length >= 3) {
    // Extract excerpt from first section
    const excerptLine = parts[0].replace(/^excerpt:\s*/i, '').trim();
    excerpt = excerptLine;
    body = parts.slice(1, -1).join('\n\n---\n\n').trim();

    // Parse tags and ogDescription from last section
    const lastPart = parts[parts.length - 1];
    const tagMatch = lastPart.match(/tags:\s*(.+)/i);
    const ogMatch = lastPart.match(/ogDescription:\s*(.+)/i);
    if (tagMatch) tags = tagMatch[1].split(',').map(t => t.trim().toLowerCase());
    if (ogMatch) ogDescription = ogMatch[1].trim();
  }

  // Generate slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Save draft
  await Articles.update(articleId, {
    body,
    excerpt,
    slug,
    tags,
    ogDescription,
    wordCount,
    status: 'drafting', // still drafting until image is done
  });

  console.log(`[${articleId}] Draft complete (${wordCount} words). Generating image.`);

  // --- IMAGE PHASE ---
  try {
    const { imageUrl } = await mindstudio.generateImage({
      prompt: `${IMAGE_STYLE_ANCHOR} Objects that metaphorically relate to the topic: "${title}". Choose 3-4 abstract objects from: smooth ceramic spheres, stacked river stones, frosted glass cubes, glass vessels with pale liquid, folded handmade paper, coiled linen thread, dried botanical stems, small brass geometric shapes, smooth wooden blocks, brass keys. Arrange thoughtfully with generous negative space.`,
      imageModelOverride: {
        model: 'seedream-4.5',
        config: {
          width: 2048,
          height: 1076,
        },
      },
    });

    await Articles.update(articleId, { imageUrl: imageUrl as string });
    console.log(`[${articleId}] Image generated.`);
  } catch (err) {
    console.error(`[${articleId}] Image generation failed:`, err);
    // Non-fatal: article can proceed without image
  }

  // Move to review
  await Articles.update(articleId, { status: 'review' });
  console.log(`[${articleId}] Article ready for review.`);
}
