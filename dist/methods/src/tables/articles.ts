import { db } from '@mindstudio-ai/agent';

interface Article {
  title: string;
  subtitle?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  status: 'researching' | 'drafting' | 'review' | 'published';
  topicId?: string;
  researchBrief?: {
    summary: string;
    keyFindings: string[];
    sources: { url: string; title: string; relevance: string }[];
    quotes: { text: string; attribution: string }[];
  };
  imageUrl?: string;
  seoKeywords?: string[];
  metaDescription?: string;
  ogDescription?: string;
  revisionNotes?: string;
  publishedAt?: number;
  publishedUrl?: string;
  wordCount?: number;
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
  tags?: string[];
  coverImageAlt?: string;
}

export const Articles = db.defineTable<Article>('articles');
