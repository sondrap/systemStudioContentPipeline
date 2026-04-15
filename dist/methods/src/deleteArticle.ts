import { auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';

export async function deleteArticle(input: { id: string }) {
  auth.requireRole('admin');

  const article = await Articles.get(input.id);
  if (!article) throw new Error('Article not found.');

  const { deleted } = await Articles.remove(input.id);
  return { deleted };
}
