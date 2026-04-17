import { auth, db } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

// One-time utility: fetch all posts from systemstudio.ai's journal API and
// import any that aren't already in the pipeline. Used when the production
// pipeline is fresh and Sondra's live articles need to be visible again.
//
// Matches on slug. For each post not already present:
//   - Creates an Articles record with status: published
//   - Copies title, slug, excerpt, body, tags, cover image, publishedAt, url
//
// Re-running is safe: existing articles are not duplicated or overwritten.
export async function importPublishedArticles() {
  auth.requireRole('admin');

  const { apiBase, token } = await getCredentials();
  if (!apiBase || !token) {
    throw new Error('Journal API credentials not configured. Set PUBLISH_API_URL and PUBLISH_API_TOKEN.');
  }

  // Fetch the list of published posts
  console.log('[import] Fetching posts from', apiBase);
  const listResponse = await fetch(apiBase, {
    method: 'GET',
    headers: { 'X-API-Key': token },
  });
  if (!listResponse.ok) {
    const body = await listResponse.text();
    throw new Error(`Failed to fetch posts: ${listResponse.status}. ${body.slice(0, 200)}`);
  }
  const listData = await listResponse.json();
  const posts = listData.posts || [];
  console.log(`[import] Found ${posts.length} posts on systemstudio.ai`);

  const results = {
    imported: [] as { slug: string; title: string; id: string }[],
    skipped: [] as { slug: string; reason: string }[],
    failed: [] as { slug: string; error: string }[],
  };

  for (const listItem of posts) {
    const slug = listItem.slug;
    try {
      // Check if we already have this article in the pipeline
      const existing = await Articles.findOne(a => a.slug === slug);
      if (existing) {
        results.skipped.push({ slug, reason: 'already in pipeline' });
        continue;
      }

      // Fetch the full post (the list endpoint doesn't include the body)
      const detailUrl = `${apiBase.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`;
      const detailResponse = await fetch(detailUrl, {
        method: 'GET',
        headers: { 'X-API-Key': token },
      });
      if (!detailResponse.ok) {
        results.failed.push({ slug, error: `GET returned ${detailResponse.status}` });
        continue;
      }
      const detail = await detailResponse.json();
      const post = detail.post || detail;

      // Create the pipeline record in published state. Preserve original
      // publishedAt timestamp so the pipeline's date sort is correct.
      const publishedAtMs = post.publishedAt
        ? new Date(post.publishedAt).getTime()
        : db.now();

      const article = await Articles.push({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        body: post.body || '',
        tags: post.tags || [],
        status: 'published',
        publishedAt: publishedAtMs,
        publishedUrl: post.url || `${apiBase.replace(/\/_\/api\/journal\/posts.*$/, '')}/insights/${post.slug}`,
        imageUrl: post.coverImageUrl || undefined,
        coverImageAlt: post.coverImageAlt || undefined,
        ogDescription: post.ogDescription || undefined,
        metaDescription: post.metaDescription || post.ogDescription || undefined,
        focusKeyword: post.focusKeyword || undefined,
        seoKeywords: post.seoKeywords || [],
        wordCount: (post.body || '').split(/\s+/).filter(Boolean).length,
      });

      results.imported.push({ slug, title: post.title, id: article.id });
      console.log(`[import] Imported: ${slug}`);
    } catch (err: any) {
      console.error(`[import] Failed on ${slug}:`, err);
      results.failed.push({ slug, error: err?.message || 'unknown' });
    }
  }

  return {
    totalOnSite: posts.length,
    imported: results.imported.length,
    skipped: results.skipped.length,
    failed: results.failed.length,
    details: results,
  };
}

// Same credential resolver as publishArticle.ts and unpublishArticle.ts:
// process.env in prod, .publish-config.json fallback in dev sandbox.
async function getCredentials() {
  const env = (globalThis as any).process?.env ?? {};
  const cwd = (globalThis as any).process?.cwd?.() ?? '.';

  let url = env.PUBLISH_API_URL;
  let token = env.PUBLISH_API_TOKEN;

  if (!url || !token) {
    try {
      const fs = await import('node:fs');
      const filePath = `${cwd}/.publish-config.json`;
      if (fs.existsSync(filePath)) {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        url = url || config.PUBLISH_API_URL;
        token = token || config.PUBLISH_API_TOKEN;
      }
    } catch {
      // Ignore — credentials stay missing
    }
  }

  return { apiBase: url, token };
}
