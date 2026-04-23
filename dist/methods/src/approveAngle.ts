import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { runResearchAndDraft } from './startArticle';

// Approve the proposed angle on an article currently in angle-review status.
// Kicks off the drafting pipeline using the research brief that's already on
// the article. No new research, no new outline — just draft → SEO → images +
// critiques + LinkedIn posts → review.
//
// Companion to sendBackToResearch: that one pauses the pipeline so Sondra
// can approve the angle; this one says "yes, draft it" and lets the rest of
// the pipeline run.
//
// Optional angleNotes lets Sondra tweak the direction at approval time
// without triggering another research pass. The notes steer the drafting
// prompt only.
export async function approveAngle(input: { id: string; angleNotes?: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  if (article.status !== 'angle-review') {
    throw new Error(
      `Article is in '${article.status}', not 'angle-review'. Approve only works on articles paused at angle review.`,
    );
  }

  if (!article.researchBrief) {
    throw new Error('Article has no research brief. Cannot draft without research.');
  }

  // Flip to drafting up front so the UI reflects the new state immediately,
  // even before the background pipeline starts running.
  await Articles.update(input.id, {
    status: 'drafting',
    // Clear the outline — it's been consumed. Drafting will produce real prose.
    proposedOutline: undefined,
  });

  // Fire-and-forget: drafting phase only. skipResearch=true makes
  // runResearchAndDraft read the brief from the DB and jump straight to
  // drafting. If the pipeline dies, flip back to review with an error note
  // so Sondra can retry via Resume.
  runResearchAndDraft(
    input.id,
    article.title,
    '',
    article.focusKeyword || '',
    input.angleNotes?.trim() || '',
    { skipResearch: true },
  ).catch(async (err) => {
    console.error(`[${input.id}] Drafting pipeline failed after angle approval:`, err);
    await Articles.update(input.id, {
      status: 'review',
      revisionNotes: 'Drafting failed: ' + (err?.message || 'Unknown error. Try again with Resume.'),
    });
  });

  return { status: 'drafting' };
}
