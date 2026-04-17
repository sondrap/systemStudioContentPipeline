import { db, auth } from '@mindstudio-ai/agent';
import { Articles } from './tables/articles';
import { Topics } from './tables/topics';
import { Users } from './tables/users';

export async function getDashboardData() {
  auth.requireRole('admin');

  const [articles, topics, user] = await db.batch(
    Articles.sortBy(a => a.updated_at).reverse(),
    Topics.sortBy(t => t.created_at).reverse(),
    Users.get(auth.userId!),
  );

  return {
    articles,
    topics,
    editorialDirection: user?.editorialDirection || '',
  };
}
