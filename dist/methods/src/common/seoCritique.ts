// Adversarial SEO reviewer. Reads a finished article and returns a
// prioritized critique focused on strategic, voice-aware issues — things a
// deterministic checklist can't catch: search intent match, click-through
// appeal, competitive differentiation, opening hook strength.
//
// Deliberately NOT a generic "best practice" checker. The audience and voice
// profiles are baked in, so suggestions push the article toward landing
// better with Sondra's ICP, not toward generic SEO drift.

import { mindstudio } from '@mindstudio-ai/agent';
import { AUDIENCE_PROFILE, VOICE_PROFILE } from './voiceProfile';

export interface SeoCritique {
  overallAssessment: string;
  issues: Array<{
    severity: 'critical' | 'should-fix' | 'nice-to-have';
    area: 'headline' | 'opening' | 'meta-description' | 'structure' | 'differentiation' | 'intent-match';
    issue: string;
    suggestion: string;
  }>;
  generatedAt: number;
}

interface ReviewInput {
  title: string;
  body: string;
  excerpt: string;
  focusKeyword: string;
  metaDescription: string;
  competitorInsights?: {
    topArticles: { url: string; title: string; focusKeyword?: string; wordCount?: number }[];
    commonKeywords: string[];
    gaps: string[];
  };
}

export async function reviewSeoCritique(input: ReviewInput): Promise<SeoCritique> {
  const competitorContext = input.competitorInsights
    ? `\n\n## Competitive Landscape\nTop competing articles target: ${input.competitorInsights.commonKeywords?.join(', ') || 'n/a'}\nContent gaps they miss: ${input.competitorInsights.gaps?.join('; ') || 'n/a'}\nTop competitors:\n${input.competitorInsights.topArticles?.map(a => `- "${a.title}"${a.wordCount ? ` (${a.wordCount} words)` : ''}`).join('\n') || 'n/a'}`
    : '';

  const example: SeoCritique = {
    overallAssessment: 'Solid foundation. The keyword is placed well and the article has a clear structure. Two strategic weaknesses worth addressing before publish: the headline leads with a statement rather than a pain, and the opening 150 words delay the reader payoff.',
    issues: [
      {
        severity: 'critical',
        area: 'headline',
        issue: 'The current headline leads with a state-of-the-world observation. For this keyword, the reader searching at 11pm is looking for relief, not confirmation the problem exists. Competing headlines all lead with the same framing.',
        suggestion: 'Try: "The AI Bill You Didn\'t Budget For (And How to See It Coming)". Keeps the focus keyword, leads with the reader\'s pain, and differentiates from the top 5 results which all use variations of "AI costs are rising".',
      },
      {
        severity: 'should-fix',
        area: 'opening',
        issue: 'Focus keyword "AI subscription costs" appears in sentence 4. For a reader who landed here from search, sentence 1 needs to confirm they\'re in the right place.',
        suggestion: 'Rewrite the opening two sentences to lead with "AI subscription costs" in the first sentence. You can keep the "Here\'s a scenario that might feel familiar" hook if you move it to sentence 3.',
      },
      {
        severity: 'nice-to-have',
        area: 'differentiation',
        issue: 'Competitor articles all focus on enterprise AI spend. Your small-business framing is your differentiator but it doesn\'t appear until section 3.',
        suggestion: 'Add one sentence to the opening that anchors this as a small-business piece. Something like "If you\'re running a 12-person business and you\'ve started dreading the AI line on your credit card statement, this is for you."',
      },
    ],
    generatedAt: Date.now(),
  };

  // Wrap the body in clear delimiters so the model can't get confused
  // about where the article begins and ends. Otherwise the model
  // sometimes hallucinates that the article is truncated mid-sentence.
  // Truncation limit raised to 12000 to match draftCritique (was 8000,
  // which silently cut off articles ~1600 words long without telling
  // the reviewer).
  const bodyTruncated = input.body.substring(0, 20000);
  const truncationNote = input.body.length > 20000
    ? ` (truncated from ${input.body.length} chars)`
    : '';

  const { content } = await mindstudio.generateText({
    message: `# Article to Review

## Title
${input.title}

## Focus Keyword
${input.focusKeyword}

## Meta Description (${input.metaDescription.length} chars)
${input.metaDescription}

## Excerpt
${input.excerpt}

## Body (${bodyTruncated.length} characters${truncationNote})

The full article body is contained between the BEGIN and END markers below. Read all of it before assessing. The article ends at the END marker — do NOT claim the article is incomplete or cut off mid-sentence unless you have read all the way to the END marker and verified the last paragraph is genuinely incomplete.

<<<BEGIN_ARTICLE_BODY>>>
${bodyTruncated}
<<<END_ARTICLE_BODY>>>
${competitorContext}

Review this article critically. Identify strategic SEO weaknesses that a deterministic checklist would miss. Prioritize issues by severity. For each issue, explain WHY it matters and suggest a specific, actionable fix.

Before flagging any issue about the article ending early or being incomplete, double-check that the END marker is truly preceded by an unfinished sentence. If the article ends with a complete paragraph followed by Sondra's signature sign-off ("Don't overthink it," / "SP"), the article is complete and you should NOT flag it as truncated.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.4,
      maxResponseTokens: 16000,
      preamble: `You are an adversarial SEO reviewer for Sondra Patton's content. Your job is to find strategic weaknesses that make an article less likely to rank or less likely to convert a search visitor into a reader.

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

## What You're Looking For

You are NOT a deterministic checklist (keyword density, meta length, H2 count are already scored client-side). You are looking for the harder, strategic issues:

**1. Headline (search intent + CTR)** — Would a non-technical founder click this headline over the top 3 competing headlines? Does the headline lead with their pain, or with a statement about the world? Does it promise relief, a framework, or a script they can use?

**2. Opening (first 150 words)** — Does the reader get instant confirmation they're in the right place? Does the keyword appear in sentence 1 or 2? Does the opening VALIDATE their overwhelm before instructing? A reader who landed from search needs to feel seen within 10 seconds.

**3. Meta description** — Is this a compelling hook that earns a click, or is it just keyword-stuffed prose? Does it communicate a specific promise or payoff?

**4. Structure** — Do the H2 headings earn their place? Does each section deliver on its heading's implicit promise? Are there sections that should be cut or merged?

**5. Differentiation** — Does this article actually say something the top competing results don't? Where is Sondra's unique angle most visible in the article, and is it visible EARLY enough?

**6. Intent match** — If someone searches the focus keyword and lands here, does the article deliver what they were actually looking for? Or does it answer a related-but-different question?

## Severity Levels

- **critical** — Would meaningfully hurt search performance or click-through. Fix before publish.
- **should-fix** — Would improve performance noticeably. Worth addressing in revision.
- **nice-to-have** — Marginal improvement. Ignore if you're short on time.

## Hard Rules

- Every suggestion must PRESERVE the article's voice. Do NOT push toward generic "content marketer" prose. Sondra sounds like a sharp friend explaining something at her kitchen table. Suggestions that sand that down are rejected.
- Every suggestion must PRESERVE the audience orientation. Do NOT suggest framing that would resonate with practitioners or enterprise. The reader is a non-technical founder.
- Be SPECIFIC. "Improve the headline" is useless. "Replace X with Y because Z" is useful.
- Be HONEST. If the article is strong, say so. Don't invent issues to seem thorough. A short critique with 1-2 real issues beats a long one with 5 fake ones.
- NEVER suggest keyword stuffing. NEVER suggest generic "optimization" that hurts readability.
- Return 0-5 issues. If the article is in great shape, return an empty issues array with a strong overallAssessment.
- Plain, direct voice. No em dashes, no hype.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  const parsed = JSON.parse(content) as Omit<SeoCritique, 'generatedAt'>;
  return {
    ...parsed,
    generatedAt: Date.now(),
  };
}
