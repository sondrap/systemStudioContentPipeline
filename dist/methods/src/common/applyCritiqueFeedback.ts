// Reconciliation agent: apply critique feedback to an article draft.
//
// This is the core of the Auto-Revise loop. Given an article and the
// critical/should-fix issues from both reviewers (SEO critique + Draft
// critique), this helper produces a revised article that addresses those
// issues while preserving Sondra's voice.
//
// Design rules baked into the prompt:
//   1. Only address critical and should-fix issues. Nice-to-have issues
//      are opinions, not errors — those are explicitly excluded from the
//      input so the model can't drift into addressing them.
//   2. Voice lock. If fixing an issue would require sanding down the
//      signature voice (ALL CAPS emphasis, parentheticals, self-deprecating
//      humor, dramatic sentence-length variation), the model returns the
//      issue UNFIXED with a reason, rather than fixing it and breaking voice.
//   3. Surgical, not wholesale. The prompt tells the model to rewrite only
//      the specific sentences/sections tied to each issue, leaving the rest
//      of the article untouched (including sign-off, images, links).

import { mindstudio } from '@mindstudio-ai/agent';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './voiceProfile';

// Shape of an individual critique issue. Matches both SEO and Draft
// critique formats — they share the same severity/issue/suggestion fields.
interface CritiqueIssue {
  severity: 'critical' | 'should-fix' | 'nice-to-have';
  area: string;       // e.g. 'headline', 'opening', 'audience-fit', etc.
  issue: string;
  suggestion: string;
}

export interface CritiqueBundle {
  seo?: { overallAssessment?: string; issues: CritiqueIssue[] };
  draft?: { overallAssessment?: string; issues: CritiqueIssue[] };
}

export interface ReconciliationResult {
  title: string;
  excerpt: string;
  body: string;
  ogDescription: string;
  // Issues the reconciliation agent explicitly chose NOT to fix because
  // fixing would have required breaking Sondra's voice. Passed back to
  // the loop so it doesn't try again on the next iteration (would produce
  // the same "decline" response and waste tokens).
  skippedIssues: Array<{ area: string; issue: string; reasonSkipped: string }>;
  // Did this pass actually modify the article? If false, the loop can stop
  // early — no point re-critiquing an unchanged article.
  anyChanges: boolean;
}

// Collect only the actionable issues from both critiques. Nice-to-haves
// are intentionally excluded so the reconciliation agent doesn't address
// what are effectively opinions.
function collectActionableIssues(bundle: CritiqueBundle): CritiqueIssue[] {
  const issues: CritiqueIssue[] = [];
  for (const critique of [bundle.seo, bundle.draft]) {
    if (!critique?.issues) continue;
    for (const issue of critique.issues) {
      if (issue.severity === 'critical' || issue.severity === 'should-fix') {
        issues.push(issue);
      }
    }
  }
  return issues;
}

export function hasActionableIssues(bundle: CritiqueBundle): boolean {
  return collectActionableIssues(bundle).length > 0;
}

export async function applyCritiqueFeedback(opts: {
  title: string;
  excerpt: string;
  body: string;
  ogDescription: string;
  focusKeyword?: string;
  critiques: CritiqueBundle;
  // Issues the prior iteration explicitly skipped. Passed so the agent
  // doesn't try to re-address them (waste of tokens — it's already made
  // its voice-preservation judgment).
  alreadySkipped?: Array<{ area: string; issue: string }>;
}): Promise<ReconciliationResult> {
  const actionableIssues = collectActionableIssues(opts.critiques);

  // Filter out issues that were already skipped by the prior pass so we
  // don't burn tokens getting the same "can't fix without breaking voice"
  // response again.
  const skippedSet = new Set(
    (opts.alreadySkipped || []).map((s) => `${s.area}||${s.issue}`)
  );
  const remainingIssues = actionableIssues.filter(
    (i) => !skippedSet.has(`${i.area}||${i.issue}`)
  );

  if (remainingIssues.length === 0) {
    // Nothing to fix — return the article unchanged.
    return {
      title: opts.title,
      excerpt: opts.excerpt,
      body: opts.body,
      ogDescription: opts.ogDescription,
      skippedIssues: [],
      anyChanges: false,
    };
  }

  // Build the issue list for the prompt. Severity is preserved so the
  // model can prioritize critical over should-fix when there's tension.
  const issuesText = remainingIssues
    .map(
      (issue, i) =>
        `### Issue ${i + 1} — [${issue.severity.toUpperCase()}] ${issue.area}

${issue.issue}

**Suggestion from reviewer:** ${issue.suggestion}`
    )
    .join('\n\n');

  const example: ReconciliationResult = {
    title: 'Rewritten Title Text',
    excerpt: 'Rewritten excerpt text.',
    body: 'Full revised article body in markdown, with sign-off at the end...',
    ogDescription: 'Revised meta description between 140-160 chars.',
    skippedIssues: [
      {
        area: 'voice-consistency',
        issue: 'The middle section could be more direct.',
        reasonSkipped: 'The suggested rewrite would have stripped the parenthetical asides that are a signature Sondra move. The current prose is intentionally conversational and I judged this against the voice lock rule.',
      },
    ],
    anyChanges: true,
  };

  const { content } = await mindstudio.generateText({
    message: `Apply the reviewer feedback below to this article. Address ONLY the issues listed. Leave everything else exactly as it is.

# Article to Revise

## Title
${opts.title}

## Excerpt
${opts.excerpt}

## OG Description (${opts.ogDescription.length} chars)
${opts.ogDescription}

${opts.focusKeyword ? `## Focus Keyword (locked)\n${opts.focusKeyword}\n\n` : ''}## Body
${opts.body}

# Issues to Address

${issuesText}`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.4,
      maxResponseTokens: 16000,
      preamble: `You are the reconciliation agent for Sondra Patton's article pipeline. Your job is to apply reviewer feedback to an article draft surgically, without breaking anything else.

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

## Your Rules

**1. Only address the specific issues listed.** Do not rewrite other sections. Do not rephrase sentences that weren't flagged. Do not "improve" things the reviewer didn't mention. Surgical edits only.

**2. Preserve Sondra's voice above all.** If addressing an issue would require stripping out one of her signature moves (ALL CAPS emphasis, parenthetical asides, self-deprecating humor, dramatic sentence-length variation, rhetorical questions, specificity over abstraction), REFUSE the fix and add it to \`skippedIssues\` with a clear reason. Voice is more important than any reviewer suggestion. A reader engaged with Sondra's voice is worth more than a reader satisfied by a standard SEO checklist.

**3. Preserve the canonical sign-off.** The body ends with a blank line, then "Don't overthink it," on one line, then "SP" on the next. This must remain the VERY LAST thing in the body, unchanged. Never move it, merge it, or rewrite it.

**4. Preserve images and outbound links.** Lines starting with \`![alt](url)\` are inline images that were placed deliberately — do not remove or move them. Outbound links \`[text](url)\` in the prose should stay unless the reviewer specifically flagged one.

**5. Respect the focus keyword if locked.** If a focus keyword is provided in the input, any rewrites must preserve (not reduce) its placement in the article. The SEO critique likely already asked for keyword placement fixes — those should be applied naturally, not forced.

**6. Length discipline.** Do not pad the article. Fixing an issue should not make the article longer than necessary. If a fix requires adding a sentence, remove another one of roughly equal weight elsewhere in the section.

**7. Plain voice.** No em dashes, no hype language, no filler phrases, no emojis.

## What To Return

Return JSON matching the example shape:

- **title**: the revised title (or the original if no title issues were raised)
- **excerpt**: the revised excerpt (or the original if no excerpt issues)
- **body**: the full revised article body in markdown, including the canonical sign-off at the end
- **ogDescription**: the revised OG description between 140-160 chars (or the original if no description issues)
- **skippedIssues**: an array of issues you CHOSE not to fix because fixing would have broken voice. Each entry has area, issue (copied from input), and reasonSkipped (your specific justification). If you fixed everything, return an empty array.
- **anyChanges**: true if you changed anything, false if you decided every listed issue was better left alone. If false, the article stays exactly as the input.

Be honest about skips. If you genuinely think a reviewer's suggestion would hurt the article, say so in skippedIssues and don't apply it. That's what the skip list is for.`,
    },
    structuredOutputType: 'json',
    structuredOutputExample: JSON.stringify(example),
  });

  const parsed = JSON.parse(content) as ReconciliationResult;

  // Defensive: ensure required fields exist even if the model forgot them.
  return {
    title: parsed.title || opts.title,
    excerpt: parsed.excerpt || opts.excerpt,
    body: parsed.body || opts.body,
    ogDescription: parsed.ogDescription || opts.ogDescription,
    skippedIssues: Array.isArray(parsed.skippedIssues) ? parsed.skippedIssues : [],
    anyChanges: parsed.anyChanges !== false,
  };
}
