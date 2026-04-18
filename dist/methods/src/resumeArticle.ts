import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { pickImageConcept, renderStillLife } from './common/generateStillLife';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { generateAllLinkedInPosts } from './common/linkedInPosts';

// Resume an article stuck in 'drafting' status. This happens when the
// fire-and-forget background chain in startArticle gets interrupted — most
// commonly by a deploy restarting the execution environment while the chain
// is still running, but also by any other error that kills the chain after
// the body has been written but before the status flips to 'review'.
//
// The body already exists (drafting completed). We just need to finish the
// remaining post-drafting stages: hero image, critiques, LinkedIn posts.
// We deliberately skip body images here — the body may have been edited,
// and inserting images into edited content is fragile. Hero is enough for
// recovery; user can regenerate body images later if they want.
export async function resumeArticle(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  // Guard: must actually be stuck in drafting. If status is 'review' or
  // 'published', there's nothing to resume.
  if (article.status !== 'drafting') {
    throw new Error(`Article is in '${article.status}' status, not stuck. Nothing to resume.`);
  }
  if (!article.body || article.body.length < 200) {
    throw new Error('Article body is missing or too short to resume. The draft needs to be re-generated from scratch.');
  }

  // Kick off all the post-drafting stages in parallel. Same error-handling
  // pattern as startArticle: each task catches its own failure so one bad
  // actor doesn't kill the whole recovery.
  console.log(`[resume] Starting recovery for ${article.id}: "${article.title.slice(0, 60)}..."`);

  // Hero image concept + recent-combinations awareness so the recovered
  // article still fits the visual rotation across the blog.
  const recentArticles = await Articles
    .filter(a => a.heroImageObjects !== null && a.heroImageObjects !== undefined && a.id !== input.id)
    .sortBy(a => a.created_at)
    .reverse()
    .take(6);
  const recentCombinations = recentArticles
    .map(a => a.heroImageObjects)
    .filter((c): c is string[] => Array.isArray(c) && c.length > 0);

  const heroConceptPromise = pickImageConcept({
    context: `Article title: ${article.title}
Focus keyword: ${article.focusKeyword || 'n/a'}
Excerpt: ${article.excerpt || 'n/a'}
Article opening:
${article.body.split('\n').slice(0, 15).join('\n').substring(0, 800)}

This is the HERO image for the article. It should represent the article's overall core idea.`,
    recentCombinations,
  }).catch(err => {
    console.error(`[resume] Hero concept failed:`, err);
    return null;
  });

  // Image rendering depends on the concept finishing first, so we chain it
  // inside a helper promise rather than trying to parallelize further.
  const heroImagePromise = heroConceptPromise.then(async (concept) => {
    if (!concept) return null;
    try {
      const url = await renderStillLife(concept);
      return { url, concept };
    } catch (err) {
      console.error(`[resume] Hero image render failed:`, err);
      return null;
    }
  });

  // The critiques and LinkedIn posts run purely on the existing body text,
  // so they can fire immediately in parallel with the image work.
  const [imageResult, seoCritiqueResult, draftCritiqueResult, linkedInPostsResult] = await Promise.all([
    heroImagePromise,
    reviewSeoCritique({
      title: article.title,
      body: article.body,
      excerpt: article.excerpt || '',
      focusKeyword: article.focusKeyword || '',
      metaDescription: article.ogDescription || article.metaDescription || '',
      competitorInsights: article.researchBrief?.competitorInsights,
    }).catch(err => {
      console.error(`[resume] SEO critique failed:`, err);
      return null;
    }),
    reviewDraftCritique({
      title: article.title,
      body: article.body,
      excerpt: article.excerpt || '',
    }).catch(err => {
      console.error(`[resume] Draft critique failed:`, err);
      return null;
    }),
    generateAllLinkedInPosts({
      articleTitle: article.title,
      articleBody: article.body,
      articleExcerpt: article.excerpt || '',
      focusKeyword: article.focusKeyword,
    }).catch(err => {
      console.error(`[resume] LinkedIn post generation failed:`, err);
      return [];
    }),
  ]);

  // Build the updates object. Only touch fields that actually produced
  // results — anything that failed gets left as-is so partial recovery
  // is still useful (e.g., critiques succeed even if image fails).
  const updates: any = {};

  if (imageResult) {
    updates.imageUrl = imageResult.url;
    updates.coverImageAlt = imageResult.concept.altText;
    updates.heroImageObjects = imageResult.concept.objects.map(o => o.name);
  }
  if (seoCritiqueResult) {
    updates.seoCritique = seoCritiqueResult;
  }
  if (draftCritiqueResult) {
    updates.draftCritique = draftCritiqueResult;
  }
  if (linkedInPostsResult && linkedInPostsResult.length > 0) {
    updates.linkedInPosts = linkedInPostsResult;
  }

  // Always flip status to 'review' — even if everything else failed, the
  // user can see the article and fix it manually. The whole point of this
  // method is to unstick.
  updates.status = 'review';

  const updated = await Articles.update(input.id, updates);
  console.log(`[resume] Recovered ${article.id}. Image: ${imageResult ? 'yes' : 'skip'}. SEO: ${seoCritiqueResult ? 'yes' : 'skip'}. Draft: ${draftCritiqueResult ? 'yes' : 'skip'}. LinkedIn: ${linkedInPostsResult?.length || 0} posts.`);

  return {
    article: updated,
    recovered: {
      heroImage: !!imageResult,
      seoCritique: !!seoCritiqueResult,
      draftCritique: !!draftCritiqueResult,
      linkedInPosts: linkedInPostsResult?.length || 0,
    },
  };
}
