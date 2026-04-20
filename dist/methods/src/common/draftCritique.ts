// Adversarial DRAFT reviewer. Complements the SEO critique by focusing on
// the article's craft rather than its search performance.
//
// - SEO Critique asks: "will this rank and get clicked?"
// - Draft Critique asks: "is this a Sondra article that will land with her ICP?"
//
// Different failure modes, different fixes. Both run automatically and surface
// as separate panels so Sondra can act on each independently.

import { mindstudio } from '@mindstudio-ai/agent';
import { AUDIENCE_PROFILE, VOICE_PROFILE } from './voiceProfile';

export interface DraftCritique {
  overallAssessment: string;
  issues: Array<{
    severity: 'critical' | 'should-fix' | 'nice-to-have';
    area: 'opening-hook' | 'audience-fit' | 'voice-consistency' | 'section-focus' | 'flow' | 'closing-payoff';
    issue: string;
    suggestion: string;
  }>;
  generatedAt: number;
}

interface ReviewInput {
  title: string;
  body: string;
  excerpt: string;
}

export async function reviewDraftCritique(input: ReviewInput): Promise<DraftCritique> {
  const example: DraftCritique = {
    overallAssessment: 'Strong article with real conviction. The Sondra voice is intact and the ICP framing holds through the first two-thirds. Two areas drift: the middle section on pricing math sounds more like a B2B pricing consultant than a friend at a kitchen table, and the ending trails off before landing a concrete takeaway.',
    issues: [
      {
        severity: 'critical',
        area: 'closing-payoff',
        issue: 'The article ends with a data point about market shifts, not with a takeaway the reader can act on Monday morning. After reading "AI subscription costs are rising," the reader needs one specific thing to do, not more context on the problem.',
        suggestion: 'Add a short "Here\'s what to do this week" closing section with 2-3 concrete actions: (1) pull the credit card statement and list every AI subscription, (2) mark which ones your team actually opened last month, (3) cancel the ones nobody used. Keep it in your voice, with the confidence-first-then-detail pattern you use elsewhere.',
      },
      {
        severity: 'should-fix',
        area: 'voice-consistency',
        issue: 'The section titled "The Pricing Math" reads like a consulting deliverable. Sentences like "This represents a 34% cost increase in the cohort" are accurate but they are not you. The ICP is smart but not a B2B pricing analyst.',
        suggestion: 'Keep the numbers, reframe the voice. Instead of "34% cost increase," try "which means the AI tools you signed up for last quarter just got one-third more expensive. No memo. No warning."',
      },
      {
        severity: 'should-fix',
        area: 'audience-fit',
        issue: 'Paragraph 6 uses the phrase "enterprise procurement team" to describe what small businesses don\'t have. That lands as an "other people have this problem" signal rather than a "you are here" signal, and small business readers disengage.',
        suggestion: 'Swap "enterprise procurement team" for something like "the person in your business whose job is to watch AI costs (that is you, by the way, and also nobody)." Keeps the point, reframes so the reader is inside the scene.',
      },
    ],
    generatedAt: Date.now(),
  };

  // Wrap the body in clear delimiters so the model can't get confused about
  // where the article begins and ends. Without these, the model sometimes
  // hallucinates that the article is truncated mid-sentence (it isn't —
  // it gets confused by the prompt instructions appearing after the body).
  // Also include the body length so the model can sanity-check its read.
  const bodyTruncated = input.body.substring(0, 20000);
  const truncationNote = input.body.length > 20000
    ? ` (truncated from ${input.body.length} chars)`
    : '';

  const { content } = await mindstudio.generateText({
    message: `# Article to Review

## Title
${input.title}

## Excerpt
${input.excerpt}

## Body (${bodyTruncated.length} characters${truncationNote})

The full article body is contained between the BEGIN and END markers below. Read all of it before assessing. The article ends at the END marker — do NOT claim the article is incomplete or cut off mid-sentence unless you have read all the way to the END marker and verified the last paragraph is genuinely incomplete.

<<<BEGIN_ARTICLE_BODY>>>
${bodyTruncated}
<<<END_ARTICLE_BODY>>>

Review this draft critically. Focus on voice, audience fit, structure, flow, and whether it delivers a real takeaway. Identify specific issues with specific fixes. If the article is strong, say so and return an empty issues array.

Before flagging any issue about the article ending early or being incomplete, double-check that the END marker is truly preceded by an unfinished sentence. If the article ends with a complete paragraph followed by Sondra's signature sign-off ("Don't overthink it," / "SP"), the article is complete and you should NOT flag it as truncated.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.4,
      maxResponseTokens: 16000,
      preamble: `You are an adversarial draft reviewer for Sondra Patton's articles. Your job is to catch CRAFT issues that the reader would feel but can't articulate: voice drift, audience miss, weak opening, unfocused sections, flow problems, endings that fizzle.

You are NOT reviewing for SEO or search performance (a separate critique handles that). You are reviewing for whether this article LANDS with a non-technical founder reading at 11pm on their phone.

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

## Six Review Areas

**1. Opening Hook (first paragraph)** — Would a non-technical founder earn paragraph 2 from paragraph 1? Does the opening VALIDATE their overwhelm before instructing? Does it feel like a friend talking, or a consultant pitching? Articles that open with "AI is transforming business" lose readers before they get to the actual point. The opening needs to make the reader feel seen.

**2. Audience Fit** — Are examples anchored in small-business reality (payroll for 12 people, missed follow-ups, tool sprawl) or did enterprise/practitioner examples creep in? Is jargon translated or avoided? Does the tone validate-before-instruct? Does it sound like it was written FOR a founder, or AT them?

**3. Voice Consistency** — Does Sondra's voice hold the whole way through? Parenthetical asides, dramatic sentence length variation, self-deprecating humor, specificity over abstraction? Watch for the "drift into corporate" trap where the middle of the article starts sounding like a whitepaper.

**4. Section Focus** — Does each H2 earn its place? Does the section deliver on its heading's implicit promise? Are there sections that should be cut, merged, or moved? Weak sections dilute strong ones.

**5. Flow** — Do transitions between sections feel earned, or abrupt? Is there a stretch where the reader would disengage? Does the argument build, or does it stall?

**6. Closing Payoff** — Does the article end with something concrete the reader can act on? Or does it trail off with more context on the problem? Sondra's best articles give the reader one specific thing to DO. A piece that diagnoses without prescribing leaves the reader with more anxiety, not less.

**Note on the signature sign-off:** Every Sondra article ends with her signature close — the two lines "Don't overthink it," followed by "SP" on their own. This is the CORRECT closing and is the signature move. Do NOT flag it as misplaced or unusual when it appears at the very end of the article. Only flag it if (a) it is missing entirely, or (b) it appears mid-article with other content below it, or (c) it is written as a single line instead of two.

## Severity Levels

- **critical** — The article has a real problem that will meaningfully hurt how it lands. Fix before publish.
- **should-fix** — The article works but would be materially stronger with this fix.
- **nice-to-have** — Marginal improvement. Optional.

## Hard Rules

- Every suggestion MUST preserve Sondra's voice. Suggestions that push toward generic, safe, or corporate-sounding prose are rejected.
- Every suggestion MUST preserve the audience orientation. Do not suggest framings that would resonate with practitioners or enterprise. The reader is a non-technical founder.
- Be SPECIFIC. "Strengthen the middle" is useless. "Replace paragraph 3 with X because Y" is useful. Quote specific sentences when pointing at a problem.
- Be HONEST. If the article is strong, say so and return an empty issues array. Do not invent issues to seem thorough.
- NEVER suggest adding hype, clickbait, or generic openings like "In today's world...".
- NEVER suggest cuts or rewrites that would lose the signature Sondra moves: parenthetical asides, ALL CAPS emphasis, rhetorical questions, sentence-length drama.
- Return 0-5 issues. Short and actionable beats long and vague.
- Plain voice. No em dashes. No filler.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  const parsed = JSON.parse(content) as Omit<DraftCritique, 'generatedAt'>;
  return {
    ...parsed,
    generatedAt: Date.now(),
  };
}
