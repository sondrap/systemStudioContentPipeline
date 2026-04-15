import { auth } from '@mindstudio-ai/agent';
import { Topics } from './tables/topics';

export async function createTopic(input: {
  title: string;
  description?: string;
  sourceUrls?: string[];
  priority?: 'high' | 'normal';
  suggestedBy?: 'agent' | 'manual';
  reasoning?: string;
}) {
  auth.requireRole('admin');

  if (!input.title?.trim()) {
    throw new Error('Topic title is required.');
  }

  const topic = await Topics.push({
    title: input.title.trim(),
    description: input.description?.trim(),
    sourceUrls: input.sourceUrls || [],
    priority: input.priority || 'normal',
    status: 'backlog',
    suggestedBy: input.suggestedBy || 'manual',
    reasoning: input.reasoning,
  });

  return { topic };
}
