import { auth } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';

export async function updateTopic(input: {
  id: string;
  title?: string;
  description?: string;
  sourceUrls?: string[];
  priority?: 'high' | 'normal';
}) {
  auth.requireRole('admin');

  const topic = await Topics.get(input.id);
  if (!topic) throw new Error('Topic not found.');

  const updates: Record<string, any> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.sourceUrls !== undefined) updates.sourceUrls = input.sourceUrls;
  if (input.priority !== undefined) updates.priority = input.priority;

  const updated = await Topics.update(input.id, updates);
  return { topic: updated };
}
