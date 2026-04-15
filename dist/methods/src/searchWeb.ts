import { auth, mindstudio } from '@mindstudio-ai/agent';

export async function searchWeb(input: { query: string }) {
  auth.requireRole('admin');

  if (!input.query?.trim()) {
    throw new Error('Search query is required.');
  }

  const results = await mindstudio.searchGoogle({
    query: input.query.trim(),
  });

  return { results: results.results };
}
