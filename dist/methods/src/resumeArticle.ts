import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { pickImageConcept, renderStillLife } from './common/generateStillLife';
import { reviewSeoCritique } from './common/seoCritique';
import { reviewDraftCritique } from './common/draftCritique';
import { generateAllLinkedInPosts } from './common/linkedInPosts';
import { startArticle } from './startArticle';

// Resume an article stuck in 'drafting' or 'researching' status. Two
// different failure modes, two different recovery paths:
//
//   1. BODY EXISTS but status is still 'drafting' (post-drafting chain died):
//      Run the remaining stages — hero image, critiques, LinkedIn posts —
//      on the existing body and flip status to 'review'. This is the happy
//      path for the most common failure (deploy mid-pipeline).
//
//   2. BODY MISSING but research brief exists (drafting died before writing):
//      Delete this failed attempt and re-fire startArticle against the
//      original topic. Research will rerun too, which isn't ideal, but it's
//      the simplest safe recovery. The alternative (restart drafting from
//      the stored brief) would require extracting the drafting prompt into
//      a helper, which is higher-risk refactoring.
//
//   3. RESEARCHING STUCK: same as case 2 — the article never got past
//      research, so we restart from scratch against the topic.
export async function resumeArticle(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  // Guard: must actually be stuck. If status is 'review' or 'published',
  // there's nothing to resume.
  if (article.status !== 'drafting' && article.status !== 'researching') {
    throw new Error(`Article is in '${article.status}' status, not stuck. Nothing to resume.`);
  }

  // Recovery path 2 + 3: body missing means drafting or research died before
  // producing content. Re-fire startArticle against the original topic so
  // the user gets a fresh attempt automatically instead of having to delete
  // and start over manually.
  if (!article.body || article.body.length < 200) {
    if (!article.topicId) {
      throw new Error('This article has no body AND no linked topic, so there is nothing to recover from. Please delete it and start fresh from the Backlog.');
    }

    const topic = await Topics.get(article.topicId);
    if (!topic) {
      throw new Error('This article has no body and its linked topic was also deleted. Please delete this article and start fresh from the Backlog.');
    }

    console.log(`[resume] Article ${article.id} has no body — re-firing startArticle against topic ${article.topicId}`);

    // Delete the failed attempt so the topic isn't marked "in-pipeline" with
    // a dead article pointing to it.
    await Articles.remove(article.id);
    // Reset the topic so startArticle will accept it
    await Topics.update(article.topicId, { status: 'backlog', articleId: undefined });

    // Re-fire startArticle. This creates a fresh Article row and runs the
    // full pipeline (research → draft → ...) from the beginning. startArticle
    // returns synchronously after the record is created; the research pipeline
    // runs fire-and-forget, so the caller sees the new article in
    // 'researching' state immediately and can watch it progress.
    const fresh = await startArticle({ topicId: article.topicId });

    return {
      article: fresh.article,
      recovered: { restarted: true },
    };
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
