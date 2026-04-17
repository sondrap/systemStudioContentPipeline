import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

// Unpublish an article: call DELETE on the systemstudio.ai journal API
// to remove it from the live site, then reset the article in the pipeline
// back to 'review' status. The article data stays in the pipeline so it can
// be edited and re-published later.
export async function unpublishArticle(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');
  if (!article.slug) throw new Error('Article has no slug. Was it ever published?');

  // Get publish credentials. Same pattern as publishArticle — process.env in
  // production, fallback to .publish-config.json in dev sandbox.
  const { apiBase, token, source } = await getCredentials();
  console.log(`[unpublish] Credential source: ${source}`);

  if (!apiBase || !token) {
    // No credentials configured. Just reset the pipeline status, log a
    // warning. The user will see a "dry run" indicator in the response.
    console.warn('[unpublish] No publish credentials. Running in dry-run mode.');
    const updated = await Articles.update(input.id, {
      status: 'review',
      publishedAt: undefined,
      publishedUrl: undefined,
    });
    return { article: updated, dryRun: true };
  }

  // Call the DELETE endpoint. 404 is not an error here — it means the post
  // was already removed (or never made it), so we still want to reset the
  // pipeline status.
  const deleteUrl = `${apiBase.replace(/\/+$/, '')}/${encodeURIComponent(article.slug)}`;
  console.log(`[unpublish] DELETE ${deleteUrl}`);

  let response: Response;
  try {
    response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'X-API-Key': token },
    });
  } catch (err: any) {
    console.error('[unpublish] Network error:', err);
    throw new Error(`Failed to reach systemstudio.ai: ${err?.message || 'network error'}`);
  }

  const bodyText = await response.text();
  console.log(`[unpublish] ${response.status} ${response.statusText}: ${bodyText.slice(0, 200)}`);

  // 200 = deleted, 404 = already gone. Both are fine. Anything else is a failure.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unpublish failed: ${response.status} ${response.statusText}. ${bodyText.slice(0, 300)}`);
  }

  // Reset the pipeline record so the article shows up in review again
  const updated = await Articles.update(input.id, {
    status: 'review',
    publishedAt: undefined,
    publishedUrl: undefined,
  });

  return { article: updated, wasAlreadyMissing: response.status === 404 };
}

// Resolve the journal API base URL (without the /:slug) and the API token.
// In production these come from process.env. In dev sandbox they come from
// a local .publish-config.json (gitignored). ESM-compatible dynamic import
// of node:fs to match the pattern in publishArticle.ts.
async function getCredentials() {
  const env = (globalThis as any).process?.env ?? {};
  const cwd = (globalThis as any).process?.cwd?.() ?? '.';

  let url = env.PUBLISH_API_URL;
  let token = env.PUBLISH_API_TOKEN;
  let source: 'env' | 'config-file' | 'missing' = url && token ? 'env' : 'missing';

  if (!url || !token) {
    try {
      const fs = await import('node:fs');
      const filePath = `${cwd}/.publish-config.json`;
      if (fs.existsSync(filePath)) {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        url = url || config.PUBLISH_API_URL;
        token = token || config.PUBLISH_API_TOKEN;
        if (url && token) source = 'config-file';
      }
    } catch {
      // Ignore — credentials stay missing
    }
  }

  if (!url || !token) return { apiBase: null, token: null, source };

  // The URL is the POST endpoint (ends with /posts). For DELETE we append
  // /:slug. Both patterns derive from the same base.
  return { apiBase: url, token, source };
}
