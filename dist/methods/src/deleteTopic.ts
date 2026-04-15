import { auth } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';

export async function deleteTopic(input: { id: string }) {
  auth.requireRole('admin');

  const topic = await Topics.get(input.id);
  if (!topic) throw new Error('Topic not found.');

  await Topics.remove(input.id);
  return { deleted: true };
}
