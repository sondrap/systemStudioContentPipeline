import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { VOICE_PROFILE, AUDIENCE_PROFILE } from './common/voiceProfile';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { normalizeSignoff } from './common/signoff';
import { stripPaywalledLinks } from './common/paywall';
import { applyCritiqueFeedback, hasActionableIssues } from './common/applyCritiqueFeedback';

export async function sendBack(input: { id: string; revisionNotes: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (!input.revisionNotes?.trim()) {
    throw new Error('Revision notes are required when sending back.');
  }

  // Save notes and move to drafting
  await Articles.update(input.id, {
    status: 'drafting',
    revisionNotes: input.revisionNotes.trim(),
  });

  // Fire-and-forget rewrite
  rewriteArticle(input.id, article, input.revisionNotes.trim()).catch(async (err) => {
    console.error('Rewrite failed:', err);
    await Articles.update(input.id, {
      status: 'review',
      revisionNotes: `Rewrite failed: ${err?.message || 'Unknown error'}. Original notes: ${input.revisionNotes}`,
    });
  });

  return { status: 'drafting' };
}

async function rewriteArticle(
  articleId: string,
  article: any,
  revisionNotes: string,
) {
  console.log(`[${articleId}] Rewriting with notes: ${revisionNotes}`);

  // Include source URLs so revision notes that ask for inline links (e.g.,
  // "add links to the research sources") have the actual URLs to work with.
  const researchContext = article.researchBrief
    ? `\n\n## Research Brief\n${article.researchBrief.summary}\n\nKey Findings:\n${article.researchBrief.keyFindings?.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}\n\nSources (available for inline linking):\n${(article.researchBrief.sources || []).map((s: any) => `- [${s.title}](${s.url}): ${s.relevance}`).join('\n')}${article.researchBrief.quotes?.length ? `\n\nQuotes:\n${article.researchBrief.quotes.map((q: any) => `- "${q.text}" — ${q.attribution}`).join('\n')}` : ''}`
    : '';

  const seoContext = article.focusKeyword
    ? `\n\n## SEO Context\nFocus keyword: "${article.focusKeyword}". Keep this keyword in the title, first paragraph, and used naturally 2-3 more times. If revision notes conflict with keyword placement, prioritize the revision notes (the user's edits take precedence over SEO).`
    : '';

  const { content } = await mindstudio.generateText({
    message: `Rewrite the following article based on the revision notes.

## Current Draft
${article.body || '(empty)'}

## Revision Notes
${revisionNotes}
${researchContext}
${seoContext}

${AUDIENCE_PROFILE}

${VOICE_PROFILE}

## Format
Write in Markdown. Use ## for major sections, ### for subsections. Short punchy paragraphs.
Keep the same general structure unless the revision notes say otherwise.
Preserve the audience orientation. Even when revising, stay speaking TO a non-technical founder, not ABOUT a technology. If the revision notes conflict with the audience lens, prioritize the revision notes (Sondra's judgment wins), but do not introduce new technical jargon or enterprise examples that the original draft avoided.
**Preserve inline images** already in the draft (lines like \`![alt](https://i.mscdn.ai/...)\`) unless the revision notes explicitly say to remove them. The images were placed at specific break points for visual rhythm.
**Preserve existing outbound links** and add more where revision notes request them. When referencing specific data, quotes, surveys, or claims, link inline using markdown link syntax. The sources listed in the Research Brief above have the URLs to use.
**Never link to paywalled publications.** Avoid Forbes, WSJ, NYT, Bloomberg, FT, Harvard Business Review, The Atlantic, Economist, Business Insider, Wired, Substack subscriber-only posts, Medium members-only posts, and any other source that hides content behind a subscribe wall. If the existing draft or research brief contains a paywalled link, replace it with a freely-accessible equivalent (primary source, press release, company blog, or free coverage of the same story) OR remove the link and mention the publication by name in prose. Sending a reader to a paywall is worse than having no citation at all.
**The article MUST end with Sondra's signature sign-off.** The very last thing in the article body, after the final content paragraph, must be a blank line and then these two lines on their own:

Don't overthink it,
SP

Never put the sign-off mid-article. Never write it as a single line. If the original draft has the sign-off in the wrong place (e.g., mid-article), move it to the end. If the draft is missing it entirely, add it. The canonical form is two lines with "SP" alone on the last line.
Output ONLY the revised article body in markdown. No preamble, no explanation.`,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.6,
      maxResponseTokens: 16000,
    },
  });

  // Belt-and-suspenders: normalize the sign-off after the rewrite. If the
  // model forgot it, added it mid-article, or wrote it on a single line,
  // this makes it canonical. Runs deterministically so every revision ships
  // with the correct close regardless of what the model does.
  // Normalize signature sign-off, then strip any paywalled links the rewrite
  // introduced. Both are belt-and-suspenders filters applied after the AI
  // stage — the prompt tells the model not to do these things, but we don't
  // trust that guarantee alone for things that affect every reader.
  const signoffNormalized = normalizeSignoff(content);
  const { body: normalizedContent, strippedUrls } = stripPaywalledLinks(signoffNormalized);
  if (strippedUrls.length > 0) {
    console.log(`[${articleId}] Send-back rewrite: stripped ${strippedUrls.length} paywalled link(s)`);
  }
  const wordCount = normalizedContent.split(/\s+/).filter(Boolean).length;

  // Save the rewritten body quickly so the user can see progress, then
  // kick off the critique + auto-revise loop.
  await Articles.update(articleId, {
    body: normalizedContent,
    wordCount,
    status: 'review',
    revisionNotes: undefined,
  });

  console.log(`[${articleId}] Rewrite complete (${wordCount} words). Running critiques...`);

  // Work with a local copy we'll revise through the auto-loop.
  let currentTitle = article.title;
  let currentExcerpt = article.excerpt || '';
  let currentBody = normalizedContent;
  let currentOgDescription = article.ogDescription || article.metaDescription || '';
  const focusKeyword = article.focusKeyword || '';

  // Run fresh SEO and draft critiques in parallel on the revised article.
  const [seoResultInitial, draftResultInitial] = await Promise.all([
    reviewSeoCritique({
      title: currentTitle,
      body: currentBody,
      excerpt: currentExcerpt,
      focusKeyword,
      metaDescription: currentOgDescription,
      competitorInsights: article.researchBrief?.competitorInsights,
    }).catch(err => {
      console.error(`[${articleId}] SEO critique refresh failed:`, err);
      return null;
    }),
    reviewDraftCritique({
      title: currentTitle,
      body: currentBody,
      excerpt: currentExcerpt,
    }).catch(err => {
      console.error(`[${articleId}] Draft critique refresh failed:`, err);
      return null;
    }),
  ]);

  // AUTO-REVISE LOOP — same pattern as startArticle. After a Send Back
  // rewrite, the critiques run and any critical/should-fix issues get
  // reconciled automatically so Sondra doesn't have to do the mechanical
  // compliance work by hand.
  const MAX_REVISION_ITERATIONS = 2;
  let seoResult = seoResultInitial;
  let draftResult = draftResultInitial;
  const skippedIssuesAccumulated: Array<{ area: string; issue: string }> = [];
  let iterationsRun = 0;

  for (let i = 0; i < MAX_REVISION_ITERATIONS; i++) {
    const bundle = {
      seo: seoResult || undefined,
      draft: draftResult || undefined,
    };

    if (!hasActionableIssues(bundle)) {
      console.log(`[${articleId}] Auto-revise: no actionable issues remaining after ${i} iteration(s).`);
      break;
    }

    console.log(`[${articleId}] Auto-revise iteration ${i + 1}/${MAX_REVISION_ITERATIONS}: applying critique feedback...`);

    try {
      const revised = await applyCritiqueFeedback({
        title: currentTitle,
        excerpt: currentExcerpt,
        body: currentBody,
        ogDescription: currentOgDescription,
        focusKeyword: focusKeyword || undefined,
        critiques: bundle,
        alreadySkipped: skippedIssuesAccumulated,
      });

      if (!revised.anyChanges) {
        console.log(`[${articleId}] Auto-revise iteration ${i + 1}: reconciliation declined all remaining issues (voice lock). Stopping loop.`);
        for (const s of revised.skippedIssues) {
          skippedIssuesAccumulated.push({ area: s.area, issue: s.issue });
        }
        break;
      }

      currentTitle = revised.title;
      currentExcerpt = revised.excerpt;
      currentBody = normalizeSignoff(revised.body);
      currentBody = stripPaywalledLinks(currentBody).body;
      currentOgDescription = revised.ogDescription;
      iterationsRun = i + 1;

      for (const s of revised.skippedIssues) {
        skippedIssuesAccumulated.push({ area: s.area, issue: s.issue });
      }

      // Re-critique the revised article for the next iteration
      const [newSeo, newDraft] = await Promise.all([
        reviewSeoCritique({
          title: currentTitle,
          body: currentBody,
          excerpt: currentExcerpt,
          focusKeyword,
          metaDescription: currentOgDescription,
          competitorInsights: article.researchBrief?.competitorInsights,
        }).catch(err => {
          console.error(`[${articleId}] Auto-revise SEO re-critique failed:`, err);
          return seoResult;
        }),
        reviewDraftCritique({
          title: currentTitle,
          body: currentBody,
          excerpt: currentExcerpt,
        }).catch(err => {
          console.error(`[${articleId}] Auto-revise Draft re-critique failed:`, err);
          return draftResult;
        }),
      ]);

      seoResult = newSeo;
      draftResult = newDraft;

      console.log(`[${articleId}] Auto-revise iteration ${i + 1} complete.`);
    } catch (err) {
      console.error(`[${articleId}] Auto-revise iteration ${i + 1} failed, stopping loop:`, err);
      break;
    }
  }

  // Save the final revised article content + critiques
  const finalWordCount = currentBody.split(/\s+/).filter(Boolean).length;
  const critiqueUpdates: any = {
    title: currentTitle,
    excerpt: currentExcerpt,
    body: currentBody,
    ogDescription: currentOgDescription,
    metaDescription: currentOgDescription,
    wordCount: finalWordCount,
  };
  if (seoResult) critiqueUpdates.seoCritique = seoResult;
  if (draftResult) critiqueUpdates.draftCritique = draftResult;

  if (iterationsRun > 0) {
    console.log(`[${articleId}] Auto-revise complete: ${iterationsRun} iteration(s) ran, ${skippedIssuesAccumulated.length} issues preserved for voice.`);
  }

  await Articles.update(articleId, critiqueUpdates);

  {
    console.log(`[${articleId}] Critiques refreshed. SEO: ${seoResult?.issues.length ?? 'failed'}. Draft: ${draftResult?.issues.length ?? 'failed'}.`);
  }
}
