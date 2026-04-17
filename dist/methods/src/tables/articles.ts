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
    competitorInsights?: {
      topArticles: { url: string; title: string; focusKeyword?: string; wordCount?: number }[];
      commonKeywords: string[];
      gaps: string[];
    };
  };
  imageUrl?: string;
  seoKeywords?: string[];
  focusKeyword?: string;
  metaDescription?: string;
  ogDescription?: string;
  revisionNotes?: string;
  publishedAt?: number;
  publishedUrl?: string;
  wordCount?: number;
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
  tags?: string[];
  coverImageAlt?: string;
  // List of objects chosen from the brand bank for this article's hero image.
  // Used to avoid repeating object combinations in future articles.
  heroImageObjects?: string[];
}

export const Articles = db.defineTable<Article>('articles');
