import { db } from '@mindstudio-ai/agent';

interface Topic {
  title: string;
  description?: string;
  sourceUrls?: string[];
  priority: 'high' | 'normal';
  status: 'backlog' | 'in-pipeline';
  articleId?: string;
  suggestedBy: 'agent' | 'manual';
  reasoning?: string;
}

export const Topics = db.defineTable<Topic>('topics', {
  defaults: { priority: 'normal', status: 'backlog', suggestedBy: 'manual' },
});
