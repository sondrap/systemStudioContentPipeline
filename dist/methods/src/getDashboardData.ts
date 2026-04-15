import { db, auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';

export async function getDashboardData() {
  auth.requireRole('admin');

  const [articles, topics] = await db.batch(
    Articles.sortBy(a => a.updated_at).reverse(),
    Topics.sortBy(t => t.created_at).reverse(),
  );

  return { articles, topics };
}
