import { auth, db } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { Users } from './tables/users';

export async function getDashboardData(input?: { slim?: boolean }) {
  auth.requireRole('admin');

  const [articles, topics] = await db.batch(
    Articles.sortBy(a => a.created_at).reverse(),
    Topics.sortBy(t => t.created_at).reverse(),
  );

  // Slim mode strips heavy fields (body, research brief, LinkedIn posts,
  // critiques) so the result stays small enough for the chat agent's Claude
  // context. Without this, calling get-dashboard-data from the chat can
  // balloon past Claude's request body limit and surface as:
  //   "The request body is not valid JSON: unexpected end of data"
  //
  // The chat agent gets enough info to reason about the pipeline (what
  // exists, at what stage, what focus keyword) and uses get-article if it
  // needs the full body of a specific piece. The web UI keeps the full
  // payload so the dashboard and article editor don't need extra calls.
  if (input?.slim) {
    const slimArticles = articles.map(a => ({
      id: a.id,
      title: a.title,
      status: a.status,
      slug: a.slug,
      focusKeyword: a.focusKeyword,
      excerpt: a.excerpt,
      wordCount: a.wordCount,
      publishedAt: a.publishedAt,
      publishedUrl: a.publishedUrl,
      created_at: a.created_at,
      updated_at: a.updated_at,
      hasImage: !!a.imageUrl,
      linkedInPostCount: a.linkedInPosts?.length || 0,
    }));
    const slimTopics = topics.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      articleId: t.articleId,
      suggestedBy: t.suggestedBy,
      suggestedKeyword: t.suggestedKeyword,
      seoOpportunity: t.seoOpportunity,
      created_at: t.created_at,
    }));

    // Load editorial direction from the auth user if present
    let editorialDirection = '';
    if (auth.userId) {
      const user = await Users.get(auth.userId);
      editorialDirection = user?.editorialDirection || '';
    }

    return {
      articles: slimArticles,
      topics: slimTopics,
      editorialDirection,
    };
  }

  // Full payload for the web UI — unchanged from the previous behavior.
  let editorialDirection = '';
  if (auth.userId) {
    const user = await Users.get(auth.userId);
    editorialDirection = user?.editorialDirection || '';
  }

  return { articles, topics, editorialDirection };
}
