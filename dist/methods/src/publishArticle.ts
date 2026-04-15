import { db, auth, mindstudio } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

export async function publishArticle(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');
  if (article.status === 'published') throw new Error('Article is already published.');

  // Generate slug if missing
  const slug = article.slug || article.title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const publishedAt = db.now();

  // Try to publish to the main site API
  const apiUrl = process.env.PUBLISH_API_URL;
  const apiToken = process.env.PUBLISH_API_TOKEN;

  let publishedUrl: string | undefined;

  if (apiUrl && apiToken) {
    try {
      const response = await mindstudio.httpRequest({
        url: apiUrl,
        method: 'POST',
        headers: JSON.stringify({
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          title: article.title,
          slug,
          excerpt: article.excerpt || article.metaDescription || '',
          body: article.body || '',
          tags: article.tags || [],
          publishedAt: new Date(publishedAt).toISOString(),
          coverImageUrl: article.imageUrl || '',
          coverImageAlt: article.coverImageAlt || article.title,
          ogDescription: article.ogDescription || article.excerpt || '',
        }),
      });

      // Try to extract published URL from response
      try {
        const responseData = JSON.parse(response.response as string);
        publishedUrl = responseData.url || responseData.publishedUrl;
      } catch {
        // Response wasn't JSON, that's OK
      }

      if (!publishedUrl) {
        publishedUrl = `https://systemstudio.msagent.ai/journal/${slug}`;
      }
    } catch (err) {
      console.error('Failed to publish to main site:', err);
      throw new Error('Publishing failed. Check that the API endpoint is configured correctly.');
    }
  } else {
    // Dry run mode: mark as published locally
    console.log('Dry run: No PUBLISH_API_URL configured. Marking as published locally.');
    publishedUrl = `https://systemstudio.msagent.ai/journal/${slug}`;
  }

  const updated = await Articles.update(input.id, {
    status: 'published',
    publishedAt,
    publishedUrl,
    slug,
  });

  return { article: updated };
}
