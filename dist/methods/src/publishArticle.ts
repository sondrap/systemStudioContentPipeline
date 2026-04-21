import { db, auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { withDbRetry } from './common/retry';

// Load publish API credentials. In production, these come from process.env
// (set via `mindstudio-prod secrets set PUBLISH_API_URL --dev ... --prod ...`).
// In the dev sandbox, process.env is not currently being populated by the
// tunnel, so we fall back to a gitignored local config file. The file is
// never committed, so production never reads from it.
async function getPublishCredentials() {
  const env = (globalThis as any).process?.env ?? {};
  const envUrl = env.PUBLISH_API_URL;
  const envToken = env.PUBLISH_API_TOKEN;
  if (envUrl && envToken) {
    return { url: envUrl, token: envToken, source: 'env' as const };
  }

  // ESM sandbox: dynamic import of node:fs to read local config fallback.
  try {
    const fs = await import('node:fs');
    const cwd = (globalThis as any).process?.cwd?.() ?? '.';
    const filePath = `${cwd}/.publish-config.json`;
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(raw);
      if (config.PUBLISH_API_URL && config.PUBLISH_API_TOKEN) {
        return {
          url: envUrl || config.PUBLISH_API_URL,
          token: envToken || config.PUBLISH_API_TOKEN,
          source: 'config-file' as const,
        };
      }
    }
  } catch {
    // Fall through to missing
  }

  return { url: envUrl, token: envToken, source: 'missing' as const };
}

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

  // Try to publish to the main site API. Credentials come from process.env
  // in production or from .publish-config.json in the dev sandbox.
  const { url: apiUrl, token: apiToken, source: credentialSource } = await getPublishCredentials();
  console.log(`Publish credentials source: ${credentialSource}`);

  let publishedUrl: string | undefined;

  if (apiUrl && apiToken) {
    try {
      // Payload matches systemstudio.ai Journal API spec (see
      // src/references/journal-content-spec.md). The API upserts on slug,
      // so re-publishing the same article updates the existing post.
      const payload = {
        title: article.title,
        slug,
        excerpt: article.excerpt || article.metaDescription || '',
        body: article.body || '',
        tags: article.tags || [],
        publishedAt: new Date(publishedAt).toISOString(),
        coverImageUrl: article.imageUrl || '',
        coverImageAlt: article.coverImageAlt || article.title,
        ogDescription: article.ogDescription || article.excerpt || '',
        isPublished: true,
        // Additional SEO metadata — sent for the blog to use in structured
        // data and future SEO features. Ignored if the blog doesn't use them.
        metaDescription: article.metaDescription || article.ogDescription || article.excerpt || '',
        focusKeyword: article.focusKeyword || '',
        seoKeywords: article.seoKeywords || [],
      };

      // Wrap the fetch in withDbRetry so transient Cloudflare timeouts
      // (524, 522) and other intermittent network errors get retried
      // automatically. The systemstudio.ai journal API is upsert-on-slug,
      // so retrying is safe — a duplicate POST for the same slug just
      // updates the existing post rather than creating two.
      const { responseText } = await withDbRetry(
        async () => {
          const fetchStart = Date.now();
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              // MindStudio reserves the Authorization header for its own auth,
              // so the journal API uses X-API-Key for app-level authentication.
              'X-API-Key': apiToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          const fetchDuration = Date.now() - fetchStart;

          console.log(`Publish API: ${response.status} ${response.statusText} in ${fetchDuration}ms. Body: ${responseText.slice(0, 500)}`);

          if (!response.ok) {
            // Including the HTTP code in the thrown error so isRetryable()
            // in the retry helper can pattern-match on it.
            throw new Error(`Publishing failed: ${response.status} ${response.statusText}. ${responseText.slice(0, 300)}`);
          }

          return { responseText };
        },
        { label: 'publishArticle.fetch', attempts: 3 },
      );

      // Parse the response to extract the published URL
      try {
        const responseData = JSON.parse(responseText);
        publishedUrl = responseData.url || responseData.publishedUrl;
      } catch {
        // Response wasn't JSON, fall back below
      }

      if (!publishedUrl) {
        publishedUrl = `https://systemstudio.msagent.ai/journal/${slug}`;
      }
    } catch (err: any) {
      console.error('Failed to publish to main site:', err);
      throw new Error(err?.message || 'Publishing failed. Check that the API endpoint is configured correctly.');
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
