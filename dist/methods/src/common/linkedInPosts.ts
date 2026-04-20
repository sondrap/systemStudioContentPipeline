// LinkedIn post generator. Takes a finished article and produces up to 5
// distinct LinkedIn post variants, one per post type (story, hot-take,
// framework, data, confession). Each post is calibrated for the non-technical
// founder audience using Sondra's voice and the 2026 LinkedIn research.
//
// The generator explicitly refuses to produce posts if the article doesn't
// have the raw material for a given type (e.g., no specific story → no
// story post). This keeps quality high over quantity.

import { mindstudio } from '@mindstudio-ai/agent';
import { AUDIENCE_PROFILE, VOICE_PROFILE } from './voiceProfile';

export type LinkedInPostType = 'story' | 'hot-take' | 'framework' | 'data' | 'confession';

export interface GeneratedLinkedInPost {
  id: string;
  postType: LinkedInPostType;
  hookPattern: string;
  content: string;
  characterCount: number;
  generatedAt: number;
  edited: boolean;
  // Optional social card image fields, populated by generateAllLinkedInPosts
  // after the text is written. Quote cards use imageText, stat cards use
  // imageNumber + imageLabel.
  imageUrl?: string;
  imageType?: 'quote' | 'stat';
  imageText?: string;
  imageNumber?: string;
  imageLabel?: string;
}

interface GeneratorInput {
  articleTitle: string;
  articleBody: string;
  articleExcerpt: string;
  focusKeyword?: string;
}

// LinkedIn-specific voice and craft rules baked into the generator prompt.
// These are extracted from src/references/linkedin-posts-research.md. If the
// research changes, update this constant.
const LINKEDIN_VOICE = `
## LinkedIn Craft Rules (2026)

### The 210-Character Hook Rule
LinkedIn truncates at ~210 characters before "See more". The first 2 lines must stop the scroll. They must create tension, curiosity, or promise specific value. They must NEVER explain context, introduce you, or warm up slowly.

### Line Break Rhythm
- Single blank line between every paragraph. No exceptions.
- Maximum 2-3 sentences per paragraph. Ideal is 1-2.
- White space is a reading-speed signal, not aesthetic. It keeps the reader moving.

### Post Length Targets (stay in these ranges)
- Story post: 1,200-1,800 characters
- Framework/List post: 1,400-2,000 characters
- Hot Take post: 1,000-1,600 characters
- Confession post: 1,000-1,600 characters
- Data post: 800-1,400 characters

### CTA Rules
- Story posts: soft question or no CTA — the emotional close IS the close
- Framework posts: "What would you add?"
- Hot Take posts: "Agree or disagree?"
- Confession posts: invite reader's own experience
- NEVER use: "Comment YES if you agree," "Tag someone who needs to see this," "Save this post," generic "What do you think?"

### Penalty Avoidance (Algorithm Actively Suppresses These)
- NO external links in post body
- NO engagement bait phrases
- NO generic AI-sounding language
- NO repeated patterns across posts from the same article

### Hooks That Are Now Overused (READ AS AI — NEVER USE)
- "I need to be honest with you..."
- "Here's what nobody tells you about..."
- "This might be controversial, but..."
- "Let that sink in."
- "Thread 🧵"
- "I've been thinking a lot about..."
- "As a [job title]..."
- "Game changer." / "This is huge."
- Three or more emojis in the first line

### Words to AVOID (read as jargon or generic AI)
leverage, utilize, synergize, game changer, thought leader, crushing it, disrupt, deep dive, unpack, actionable insights, "at the end of the day," "in today's fast-paced world"

### Words and Frames That WORK for Non-Technical Founder Audience
- "Here's what I've learned..."
- "I used to think..."
- "Most [audience] I talk to..."
- "Here's the honest version..."
- "It's simpler than it sounds..."

### The Voice Test
Before returning a post: read it aloud. If it sounds like something Sondra would say to a client over coffee, keep it. If it sounds like a LinkedIn post, rewrite it.
`;

// Hook pattern catalog. The generator picks one per post and records which
// pattern it used (for learning + variety). Each entry includes when it's
// most appropriate.
const HOOK_PATTERNS: Record<string, { description: string; bestFor: LinkedInPostType[]; example: string }> = {
  'contrarian-statement': {
    description: 'Takes a position against conventional wisdom. Creates immediate cognitive dissonance.',
    bestFor: ['hot-take'],
    example: '"More content" is terrible LinkedIn advice.\nHere\'s what actually grows your audience:',
  },
  'specific-number': {
    description: 'Numbers add instant credibility. The more specific, the more credible.',
    bestFor: ['data', 'framework'],
    example: '73% of my closed deals mentioned seeing my content before reaching out.\nAverage time from first view to inquiry: 4.2 months.',
  },
  'pain-point-confession': {
    description: 'Vulnerability before solution. Readers see themselves in the struggle.',
    bestFor: ['confession'],
    example: 'For 18 months, my LinkedIn posts barely reached 200 people.\nThen I discovered the one change that 10x\'d my engagement:',
  },
  'opening-scene': {
    description: 'Drop the reader into a specific moment with sensory detail. No preamble.',
    bestFor: ['story'],
    example: '"We\'re going with your competitor."\nThat email arrived at 6:47 AM on a Tuesday.',
  },
  'pattern-recognition': {
    description: 'Names a pattern the reader has experienced but never articulated.',
    bestFor: ['hot-take', 'framework'],
    example: 'Every founder I talk to makes the same mistake with AI.\nThey automate the wrong things first.',
  },
  'unexpected-comparison': {
    description: 'Novel parallels make abstract concepts concrete.',
    bestFor: ['hot-take', 'story'],
    example: 'Building LinkedIn authority is like compound interest.\nMost people quit right before the hockey stick.',
  },
};

// Structure anatomies, one per post type. These are passed into the generator
// so the output follows proven patterns.
const POST_STRUCTURES: Record<LinkedInPostType, string> = {
  'story': `**Story Post Structure (1,200-1,800 chars)**
[Line 1-2: Opening scene — specific moment, no context yet]

[Lines 3-5: Context — what led to this moment, brief]

[Lines 6-8: The turning point — what changed or what you did]

[Lines 9-11: The lesson — universal insight extracted from the specific]

[Final line: Soft CTA — a question that invites the reader's own experience, OR no CTA if the lesson lands as the close]`,

  'hot-take': `**Hot Take Post Structure (1,000-1,600 chars)**
[Line 1: The contrarian claim — stated plainly, no hedging]

[Lines 2-4: What most people believe (the conventional wisdom you're pushing back on)]

[Lines 5-8: The evidence or experience that contradicts it — 3 specific data points or examples]

[Lines 9-10: The reframe — what the real question actually is]

[Final line: "Agree or disagree?" or similar open debate prompt]`,

  'framework': `**Framework/List Post Structure (1,400-2,000 chars)**
[Line 1-2: Hook — specific number + promise]

[Line 3: Brief context sentence — why this matters]

[Numbered list: 5-7 items, each 1-2 lines. Format: "N. [Point] — [brief explanation]"]

[Line after list: The "biggest surprise" or "most counterintuitive" callout]

[Final line: "What would you add?" or similar contribution prompt]`,

  'data': `**Data/Stat Post Structure (800-1,400 chars)**
[Line 1-2: The striking statistic — the single number that frames everything]

[Lines 3-5: What this number actually means in practice — unpack the implication]

[Lines 6-8: The non-obvious insight or counterintuitive takeaway]

[Final line: Specific question about the reader's experience with the phenomenon]`,

  'confession': `**Confession Post Structure (1,000-1,600 chars)**
[Line 1-2: The confession — what you got wrong, specific and real]

[Lines 3-5: The context — how long, what it cost, why it mattered. Specifics > generalities.]

[Lines 6-9: What changed — the insight, the shift, the lesson]

[Lines 10-12: The universal principle — what this means for the reader]

[Final line: Soft CTA — invite their own experience]`,
};

// Generate all 5 post variants for an article. Runs in parallel for speed.
// Each generation is independent so one failure doesn't kill the others.
// After posts are generated, also generate matching social card images
// (quote card or stat card) for each post — also in parallel.
export async function generateAllLinkedInPosts(input: GeneratorInput): Promise<GeneratedLinkedInPost[]> {
  const types: LinkedInPostType[] = ['story', 'hot-take', 'framework', 'data', 'confession'];

  // Step 1: generate the post text in parallel
  const postResults = await Promise.all(
    types.map(type =>
      generateSinglePost(type, input).catch(err => {
        console.error(`[linkedInPosts] ${type} generation failed:`, err);
        return null;
      })
    )
  );

  const successfulPosts = postResults.filter((p): p is GeneratedLinkedInPost => p !== null);

  // Step 2: generate a social card image for each successful post, in
  // parallel. Failures don't block the post itself — the post is still
  // useful even without an image.
  const { generateImageForPost } = await import('./linkedInImages');
  const postsWithImages = await Promise.all(
    successfulPosts.map(async (post) => {
      try {
        const image = await generateImageForPost({
          postType: post.postType,
          postContent: post.content,
        });
        return {
          ...post,
          imageUrl: image.imageUrl,
          imageType: image.imageType,
          imageText: image.text,
          imageNumber: image.number,
          imageLabel: image.label,
        };
      } catch (err) {
        console.error(`[linkedInPosts] image generation failed for ${post.postType}:`, err);
        return post;
      }
    })
  );

  return postsWithImages;
}

// Generate a single post variant of a specific type. Used for both the
// full-article generation and for individual variant regeneration.
export async function generateSinglePost(
  postType: LinkedInPostType,
  input: GeneratorInput
): Promise<GeneratedLinkedInPost> {
  const relevantHookPatterns = Object.entries(HOOK_PATTERNS)
    .filter(([, info]) => info.bestFor.includes(postType))
    .map(([name, info]) => `**${name}**\n${info.description}\nExample:\n${info.example}`)
    .join('\n\n');

  const structure = POST_STRUCTURES[postType];

  // Return shape that encodes both the post and the hook pattern that was chosen
  const example = {
    content: postType === 'story'
      ? `"We're going with your competitor."\n\nThat email arrived at 6:47 AM on a Tuesday. I'd spent three weeks on that proposal.\n\nI wanted to delete it and move on. Instead, I replied asking one question:\n\n"Would you share what made the difference?"\n\nTheir response changed everything I understood about B2B sales:\n\n"Your product was better. But their founder commented on my LinkedIn posts for six months. When I had budget, I already trusted them."\n\nThat's when I realized:\n\nLinkedIn isn't a lead generation platform.\n\nIt's a trust-building platform.\n\nThe sale happened long before the sales call.\n\nWhat's your "aha moment" about how buyers actually make decisions?`
      : 'Full LinkedIn post text with proper line breaks (use \\n\\n between paragraphs).',
    hookPattern: 'opening-scene',
    rationale: '1-2 sentences explaining why this angle was chosen from the article.',
  };

  const { content } = await mindstudio.generateText({
    message: `# Article to Extract From

## Title
${input.articleTitle}

## Excerpt
${input.articleExcerpt}

${input.focusKeyword ? `## Focus Keyword\n${input.focusKeyword}\n\n` : ''}## Body
${input.articleBody.substring(0, 10000)}

---

Generate a LinkedIn post of type: **${postType}**

Follow the anatomy below and choose one hook pattern from the ones listed. The post MUST extract content from THIS article — find the specific moment, statistic, contrarian claim, list, or confession that fits this post type. Do not invent new material that isn't in the article. If the article genuinely does not contain raw material for this post type (e.g., no personal story for a story post), say so in the rationale and return a content field with "CANNOT_GENERATE: [reason]" so we can skip it.

## Post Type Structure

${structure}

## Hook Patterns for This Post Type

${relevantHookPatterns}

---

Return:
- **content**: the full LinkedIn post, ready to copy/paste. Use \\n\\n between paragraphs (never single \\n). No markdown. No external links. Hashtags at the end (3-5 relevant ones) only if they genuinely fit.
- **hookPattern**: which pattern you used (one of the pattern names above)
- **rationale**: 1-2 sentences explaining which part of the article you extracted and why this angle works for the audience`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.75,
      maxResponseTokens: 16000,
      preamble: `You are a LinkedIn post writer for Sondra Patton. You extract and reshape content from her blog articles into LinkedIn posts calibrated for the non-technical founder audience.

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

${LINKEDIN_VOICE}

## Your Core Mandate

You are extracting, not inventing. Every post must be anchored in content that exists in the article. Your job is to find the strongest single angle for the given post type and reshape it for LinkedIn.

For this specific post type (${postType}), here's what to look for in the article:
- **story**: a specific anecdote, client moment, personal experience, or concrete scene
- **hot-take**: the single most counterintuitive or contrarian claim in the piece
- **framework**: a numbered list, step-by-step process, or set of principles
- **data**: the most striking statistic, number, or data point
- **confession**: a moment where the author admits a past mistake, changed belief, or lesson learned the hard way

If the article genuinely lacks raw material for this post type, return content: "CANNOT_GENERATE: [specific reason]" rather than inventing something generic. Quality over quantity.

## Voice Hard Rules

- Plain, direct voice. No em dashes. No emojis unless they add real meaning.
- No generic AI-sounding phrases (see the voice rules above).
- Every sentence should sound like Sondra saying it to a client. If it sounds like a LinkedIn ghostwriter, rewrite it.
- Specificity beats generality every time. Use the article's specific numbers, names, scenes.

## Format Hard Rules

- Use \\n\\n (double newline as a literal string in JSON) between paragraphs. This renders as blank line on LinkedIn.
- Never use markdown in the post content (no **, no #, no >, no [](), no \`\`\`).
- Arrows → and em dashes — are acceptable as text separators.
- Hashtags at the very end only, 3-5 maximum, only if they genuinely relate.
- Respect the character target for this post type. Going 20% over or under is fine; doubling or halving is not.
- **Do NOT include the article sign-off ("Don't overthink it, SP") in LinkedIn posts.** That's the signature close for blog articles only. LinkedIn posts end with their post-type-appropriate CTA instead (see the CTA Rules above). Strip any sign-off you find in the source article when reshaping for LinkedIn — do not carry it over.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  const parsed = JSON.parse(content) as { content: string; hookPattern: string; rationale: string };

  if (parsed.content.startsWith('CANNOT_GENERATE:')) {
    throw new Error(`${postType}: ${parsed.content.replace('CANNOT_GENERATE:', '').trim()}`);
  }

  // Normalize line endings — the JSON parser delivers literal \n\n, which is
  // what we want for LinkedIn. Trim whitespace.
  const cleanContent = parsed.content.trim();

  return {
    id: generateVariantId(),
    postType,
    hookPattern: parsed.hookPattern || 'unknown',
    content: cleanContent,
    characterCount: cleanContent.length,
    generatedAt: Date.now(),
    edited: false,
  };
}

// Simple variant ID generator. Short, sortable-ish, unique enough.
function generateVariantId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
