import { createClient } from '@mindstudio-ai/interface';

export type ArticleStatus = 'researching' | 'drafting' | 'review' | 'published';
export type ArticleType = 'thought-leadership' | 'educational' | 'commentary' | 'mixed';

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  status: ArticleStatus;
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
  articleType?: ArticleType;
  tags?: string[];
  coverImageAlt?: string;
  heroImageObjects?: string[];
  seoCritique?: {
    overallAssessment: string;
    issues: Array<{
      severity: 'critical' | 'should-fix' | 'nice-to-have';
      area: 'headline' | 'opening' | 'meta-description' | 'structure' | 'differentiation' | 'intent-match';
      issue: string;
      suggestion: string;
    }>;
    generatedAt: number;
  };
  draftCritique?: {
    overallAssessment: string;
    issues: Array<{
      severity: 'critical' | 'should-fix' | 'nice-to-have';
      area: 'opening-hook' | 'audience-fit' | 'voice-consistency' | 'section-focus' | 'flow' | 'closing-payoff';
      issue: string;
      suggestion: string;
    }>;
    generatedAt: number;
  };
  linkedInPosts?: Array<{
    id: string;
    postType: 'story' | 'hot-take' | 'framework' | 'data' | 'confession';
    hookPattern: string;
    content: string;
    characterCount: number;
    generatedAt: number;
    edited: boolean;
    postedAt?: number;
    notes?: string;
  }>;
  created_at: number;
  updated_at: number;
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  sourceUrls?: string[];
  sources?: { url: string; title: string; date?: string }[];
  priority: 'high' | 'normal';
  status: 'backlog' | 'in-pipeline';
  articleId?: string;
  suggestedBy: 'agent' | 'manual';
  reasoning?: string;
  seoOpportunity?: 'high' | 'moderate' | 'low';
  suggestedKeyword?: string;
  created_at: number;
  updated_at: number;
}

export const api = createClient<{
  getDashboardData(): Promise<{ articles: Article[]; topics: Topic[] }>;
  createTopic(input: { title: string; description?: string; sourceUrls?: string[]; priority?: 'high' | 'normal' }): Promise<{ topic: Topic }>;
  updateTopic(input: { id: string; title?: string; description?: string; sourceUrls?: string[]; priority?: 'high' | 'normal' }): Promise<{ topic: Topic }>;
  deleteTopic(input: { id: string }): Promise<{ deleted: boolean }>;
  startArticle(input: { topicId?: string; title?: string; description?: string; articleType?: ArticleType }): Promise<{ article: Article }>;
  getArticle(input: { id: string }): Promise<{ article: Article }>;
  updateArticle(input: { id: string; title?: string; body?: string; excerpt?: string; status?: ArticleStatus; seoKeywords?: string[]; tags?: string[]; articleType?: ArticleType; focusKeyword?: string; ogDescription?: string; slug?: string }): Promise<{ article: Article }>;
  publishArticle(input: { id: string }): Promise<{ article: Article }>;
  unpublishArticle(input: { id: string }): Promise<{ article: Article; dryRun?: boolean; wasAlreadyMissing?: boolean }>;
  sendBack(input: { id: string; revisionNotes: string }): Promise<{ status: string }>;
  regenerateImage(input: { id: string }): Promise<{ article: Article }>;
  reviewSeo(input: { id: string }): Promise<{ article: Article; critique: Article['seoCritique'] }>;
  reviewDraft(input: { id: string }): Promise<{ article: Article; critique: Article['draftCritique'] }>;
  generateLinkedInPosts(input: { id: string }): Promise<{ article: Article; posts: NonNullable<Article['linkedInPosts']> }>;
  regenerateLinkedInPost(input: { articleId: string; variantId: string }): Promise<{ article: Article; post: NonNullable<Article['linkedInPosts']>[number] }>;
  updateLinkedInPost(input: { articleId: string; variantId: string; content?: string; postedAt?: number | null; notes?: string; delete?: boolean }): Promise<{ article: Article }>;
  captureQuickTopic(input: { rawInput: string }): Promise<{ topic: Topic }>;
  importPublishedArticles(): Promise<{ totalOnSite: number; imported: number; skipped: number; failed: number; details: any }>;
  searchWeb(input: { query: string }): Promise<{ results: any[] }>;
  deleteArticle(input: { id: string }): Promise<{ deleted: boolean }>;
  scanTopics(): Promise<{ status: string }>;
  updateEditorialDirection(input: { direction: string }): Promise<{ editorialDirection: string }>;
  refreshTopic(input: { topicId: string }): Promise<{ topic: Topic }>;
}>();
