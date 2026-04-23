import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { runResearchAndDraft } from './startArticle';

// Send an article all the way back to the research stage with a new angle.
//
// Different from sendBack() which reuses the existing research brief: this
// method re-runs the entire research phase with Sondra's angle notes as
// steering context, then re-drafts from the fresh brief. Use this when the
// existing brief is missing the raw material the new article needs (new
// definitions, new examples, new sources) rather than just being written
// from the wrong angle.
//
// State transitions:
//   1. Article flipped to 'researching' immediately so the pipeline page
//      shows the right status.
//   2. Stale artifacts cleared (critiques, LinkedIn posts, images). The body
//      is left in place so Sondra can still see what she's replacing until
//      the new draft lands.
//   3. runResearchAndDraft fires in the background. It overwrites body,
//      excerpt, critiques, image, LinkedIn posts as each stage completes.
export async function sendBackToResearch(input: { id: string; revisionNotes: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (!input.revisionNotes?.trim()) {
    throw new Error('Angle notes are required when sending back to research.');
  }

  // Flip to researching and clear stale artifacts. Body/excerpt/title are
  // preserved so Sondra still sees the previous version while the pipeline
  // reruns. They'll be overwritten naturally as the new pipeline progresses.
  await Articles.update(input.id, {
    status: 'researching',
    revisionNotes: input.revisionNotes.trim(),
    // Everything below this line is about to be regenerated from scratch.
    seoCritique: undefined,
    draftCritique: undefined,
    linkedInPosts: undefined,
    // Research brief itself will be overwritten by the new research pass,
    // but clearing it up front means if the user inspects the record mid-
    // flight they won't see a stale brief that no longer matches the new
    // angle.
    researchBrief: undefined,
  });

  // Fire-and-forget. Always pause for angle review on this path — if Sondra
  // is sending it back to research, she's explicitly uncertain about the
  // angle, and she should approve the next direction before drafting burns
  // another full cycle.
  //
  // If the pipeline dies, the article gets flipped back to review with an
  // error message so the user can retry via the Resume button.
  runResearchAndDraft(
    input.id,
    article.title,
    article.excerpt || '',
    article.focusKeyword || '',
    input.revisionNotes.trim(),
    { pauseForAngleReview: true },
  ).catch(async (err) => {
    console.error(`[${input.id}] Re-research pipeline failed:`, err);
    await Articles.update(input.id, {
      status: 'review',
      revisionNotes: 'Re-research failed: ' + (err?.message || 'Unknown error. Try again with Resume.'),
    });
  });

  return { status: 'researching' };
}
