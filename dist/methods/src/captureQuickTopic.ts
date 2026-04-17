import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';
import { AUDIENCE_PROFILE } from './common/voiceProfile';

// Quick Capture: paste a URL or a one-liner, and the pipeline researches it,
// frames it for the ICP, and drops a fully-prepared topic in the backlog.
//
// This is the "something happened, I want to write about it" path.
// For deliberate planning, Sondra still has the full Add Topic form.
export async function captureQuickTopic(input: { rawInput: string }) {
  auth.requireRole('admin');

  const raw = (input.rawInput || '').trim();
  if (!raw) throw new Error('Please provide a URL or a description.');

  // Detect whether the input is a URL. Accept common formats: https://,
  // http://, or a bare domain starting with www.
  const urlMatch = raw.match(/https?:\/\/\S+|\bwww\.\S+/);
  const maybeUrl = urlMatch ? urlMatch[0].replace(/^www\./, 'https://www.') : null;

  let sourceContext = '';
  const sources: { url: string; title: string; date?: string }[] = [];

  if (maybeUrl) {
    // Scrape the URL to gather context. Don't fail the whole request if
    // scrape fails — fall back to using the raw input text.
    try {
      const result = await mindstudio.scrapeUrl({ url: maybeUrl });
      // scrapeUrl returns content as a union (string | object | array).
      // For single-URL scrapes it's an object with `text` and `metadata`.
      let markdown = '';
      let title = '';
      if (typeof result.content === 'string') {
        markdown = result.content;
      } else if (!Array.isArray(result.content)) {
        markdown = result.content.text || '';
        title = result.content.metadata?.title || '';
      }
      sourceContext = `URL: ${maybeUrl}\nPage title: ${title || 'Unknown'}\nPage content (truncated):\n${markdown.substring(0, 6000)}`;
      sources.push({ url: maybeUrl, title: title || maybeUrl });
    } catch (err) {
      console.error('[captureQuickTopic] scrapeUrl failed, falling back to raw input:', err);
      sourceContext = `URL (could not fetch): ${maybeUrl}\nUser's note: ${raw}`;
      sources.push({ url: maybeUrl, title: raw.substring(0, 80) });
    }
  } else {
    sourceContext = `User's note: ${raw}`;
  }

  // Generate a structured topic proposal framed for the ICP.
  const example = {
    title: 'The New Claude Tool That Turns Your Ideas Into Designs Without Hiring a Designer',
    description: 'Anthropic just released Claude Design, a tool that generates visual designs from plain-language descriptions. Small business owners without a designer on staff can now create marketing materials, landing pages, and brand assets by typing what they want. Here is what it actually does and what you can use it for on Monday morning.',
    reasoning: 'This is a concrete, useful AI release that directly serves a small business pain point: needing visual design without having a designer. The ICP will see this on LinkedIn this week and wonder if it matters. Framed as a "here is what this means for you" explainer.',
    priority: 'high' as const,
    suggestedKeyword: 'Claude Design tool',
    seoOpportunity: 'high' as const,
  };

  const { content } = await mindstudio.generateText({
    message: `Based on this source material, generate a topic proposal for Sondra's content pipeline.

${sourceContext}

Do the following:
1. Figure out what is actually happening in the source (if it's a URL) or what the user is pointing at (if it's a note).
2. Decide if this is something a non-technical founder would care about.
3. Write a title in ICP language — what would a non-technical founder actually type into Google or click on LinkedIn? NOT "Anthropic launches Claude Design" but "The New Claude Tool That Turns Your Ideas Into Designs Without Hiring a Designer."
4. Write a 2-3 sentence description that frames BOTH what happened AND why the ICP should care.
5. Reasoning: explain why this is a good topic for Sondra's audience.
6. Pick a focus keyword (2-4 words) a founder would actually search.
7. Rate SEO opportunity (high/moderate/low) based on your sense of how competitive this keyword is.
8. Set priority to 'high' if this is time-sensitive (a new release, a major announcement, a news event) or if the ICP pain is acute. Otherwise 'normal'.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.5,
      maxResponseTokens: 16000,
      preamble: `You are Sondra's editorial assistant. Your job is to take raw source material (a URL or a note) and turn it into a pipeline-ready topic proposal framed for her ICP.

${AUDIENCE_PROFILE}

Rules:
- Title: ICP language, not practitioner language. No jargon. Never "Anthropic launches X" — always "The new X that does Y for your business."
- Description: 2-3 sentences. Frame what happened AND why ICP cares.
- Reasoning: 2-3 sentences. Explain why this connects to the ICP's actual pain.
- No em dashes. No hype. No emoji. Plain direct voice.
- If the user's note or URL is truly not ICP-relevant, STILL write the best topic you can — you're not the gatekeeper, Sondra decides what to write.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  const proposal = JSON.parse(content);

  // Create the topic in the backlog. Mark as manual so it doesn't get
  // confused with agent-scanned topics.
  const topic = await Topics.push({
    title: proposal.title,
    description: proposal.description,
    sourceUrls: maybeUrl ? [maybeUrl] : [],
    sources,
    priority: proposal.priority === 'high' ? 'high' : 'normal',
    status: 'backlog',
    suggestedBy: 'manual',
    reasoning: proposal.reasoning,
    suggestedKeyword: proposal.suggestedKeyword || undefined,
    seoOpportunity: ['high', 'moderate', 'low'].includes(proposal.seoOpportunity)
      ? proposal.seoOpportunity
      : 'moderate',
  });

  return { topic };
}
