import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';

export async function refreshTopic(input: { topicId: string }) {
  auth.requireRole('admin');

  const topic = await Topics.get(input.topicId);
  if (!topic) throw new Error('Topic not found.');

  // Step 1: Search for recent developments (append date filter for ~6 weeks)
  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
  const dateStr = sixWeeksAgo.toISOString().split('T')[0];

  const { results } = await mindstudio.searchGoogle({
    query: `${topic.title} recent developments news after:${dateStr}`,
    exportType: 'json',
    numResults: 10,
  });

  if (!results || results.length === 0) {
    throw new Error('No recent sources found for this topic. Try broadening the angle or checking back later.');
  }

  // Format search results for synthesis
  const sourcesText = (results as any[])
    .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description || r.snippet || ''}\nURL: ${r.url || r.link || ''}`)
    .join('\n\n');

  // Step 2: Synthesize into updated topic
  const { content } = await mindstudio.generateText({
    message: `You are a research assistant for a content strategist who writes about AI for non-technical business leaders (founders, CEOs of digital businesses like course creators, coaches, agencies).

A topic idea was flagged earlier but may have stale references. Your job is to refresh it with the most recent developments.

TOPIC: ${topic.title}

EXISTING DESCRIPTION:
${topic.description || '(none)'}

EXISTING REASONING:
${topic.reasoning || '(none)'}

RECENT SEARCH RESULTS (last ~6 weeks):
${sourcesText}

Instructions:
- Write an updated description that incorporates the latest developments. Keep it factual, concise, and accessible to a non-technical audience (2-4 sentences).
- In reasoning, explain what's new and why this topic is worth covering now. Be specific about what changed (2-3 sentences).
- In sourceUrls, include only URLs from the search results that directly support the updated angle. Include 2-5 links.
- If the search results reveal a sharper, more specific angle than the original topic, update the title to reflect it.
- Do not use em dashes, emojis, or hype language.
- Tone: direct, practical, founder-friendly.

Return a JSON object with these fields:
{
  "title": "Updated or original title",
  "description": "Updated 2-4 sentence description",
  "reasoning": "Why this is timely now, 2-3 sentences",
  "sources": [{ "url": "...", "title": "Article title", "date": "Mar 2026" }]
}`,
    source: 'user',
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify({
      title: 'How AI Pricing Is Shifting from Per-Seat to Per-Task in 2026',
      description: 'Major AI platforms are moving away from per-seat licensing toward usage-based pricing, and it is changing how small businesses budget for AI tools. Recent announcements from HubSpot and Intercom signal this is becoming the default model.',
      reasoning: 'Three major platforms shifted pricing models in the last month. This directly affects how Sondra\'s audience budgets for and evaluates AI tools, making it a timely and practical topic.',
      sources: [
        { url: 'https://example.com/hubspot-pricing', title: 'HubSpot restructures AI pricing', date: 'Mar 2026' },
        { url: 'https://example.com/ai-pricing-trends', title: 'The shift to usage-based AI pricing', date: 'Apr 2026' },
      ],
    }),
    modelOverride: {
      model: 'claude-4-5-haiku',
      temperature: 0.3,
      maxResponseTokens: 2000,
    },
  });

  // Parse the structured output
  let updated: { title: string; description: string; reasoning: string; sources: { url: string; title: string; date?: string }[] };
  try {
    updated = JSON.parse(content);
  } catch {
    console.error('Failed to parse refresh output:', content);
    throw new Error('Could not process the refreshed topic. Try again.');
  }

  const sources = updated.sources || [];

  // Update the topic
  const refreshedTopic = await Topics.update(input.topicId, {
    title: updated.title || topic.title,
    description: updated.description || topic.description,
    reasoning: updated.reasoning || topic.reasoning,
    sources,
    sourceUrls: sources.map(s => s.url),
  });

  return { topic: refreshedTopic };
}
