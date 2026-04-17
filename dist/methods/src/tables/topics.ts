import { db } from '@mindstudio-ai/agent';

interface Topic {
  title: string;
  description?: string;
  sourceUrls?: string[];
  sources?: { url: string; title: string; date?: string }[];
  priority: 'high' | 'normal';
  status: 'backlog' | 'in-pipeline';
  articleId?: string;
  suggestedBy: 'agent' | 'manual';
  reasoning?: string;
  // SEO fields
  seoOpportunity?: 'high' | 'moderate' | 'low';
  suggestedKeyword?: string;
}

export const Topics = db.defineTable<Topic>('topics', {
  defaults: { priority: 'normal', status: 'backlog', suggestedBy: 'manual' },
});
