import { db } from '@mindstudio-ai/agent';

interface Article {
  title: string;
  subtitle?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  status: 'researching' | 'angle-review' | 'drafting' | 'review' | 'published';
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
  // 4-6 bullet outline of the article the drafting agent will write. Populated
  // only when the research pipeline pauses at angle-review. Sondra approves
  // or refines this before drafting begins, so she never invests a full draft
  // cycle in an angle she's not sold on. Cleared when drafting starts.
  proposedOutline?: string[];
  publishedAt?: number;
  publishedUrl?: string;
  wordCount?: number;
  articleType?: 'thought-leadership' | 'educational' | 'commentary' | 'mixed';
  tags?: string[];
  coverImageAlt?: string;
  // List of objects chosen from the brand bank for this article's hero image.
  // Used to avoid repeating object combinations in future articles.
  heroImageObjects?: string[];
  // Adversarial SEO critique generated after the SEO optimization pass.
  // Issues are strategic and voice-aware, not deterministic checklist items
  // (those are computed client-side in the SEO score panel).
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
  // Adversarial draft review — complements the SEO critique by focusing on
  // voice, audience fit, flow, and structure instead of search performance.
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
  // LinkedIn post variants generated from the article. One article yields up
  // to 5 posts (one per post type), each editable and tagged with metadata.
  // Sondra publishes them one at a time to Typefully or LinkedIn over weeks.
  linkedInPosts?: Array<{
    id: string;                    // stable id so the UI can track variants
    postType: 'story' | 'hot-take' | 'framework' | 'data' | 'confession';
    hookPattern: string;           // which hook pattern was used (for learning)
    content: string;               // the full post text, ready to copy/paste
    characterCount: number;        // computed on generation, updated on edit
    generatedAt: number;
    edited: boolean;               // true once Sondra modifies content
    postedAt?: number;             // set when she marks it posted
    notes?: string;                // her notes about performance, etc.
    // LinkedIn social card image generated for this variant. Each post type
    // gets its own image (quote card for most types, stat card for data).
    // Image is rendered programmatically (HTML -> PNG) so text is always
    // pixel-perfect on brand. The text fields (imageText / imageNumber /
    // imageLabel) reflect what's CURRENTLY shown on the image, so the user
    // can edit them and regenerate.
    imageUrl?: string;
    // Five card types for visual variety across the 5 post variants. Each
    // has its own fields for what's rendered:
    //   quote / headline / confession: imageText holds the main prose
    //   stat: imageNumber + imageLabel
    //   framework: imageItems holds the numbered list, imageText the title
    //   headline / framework: imageEyebrow holds the uppercase kicker
    imageType?: 'quote' | 'stat' | 'headline' | 'framework' | 'confession';
    imageText?: string;            // main prose: quote, hook, confession prose, or framework title
    imageNumber?: string;          // for stat cards: the headline number
    imageLabel?: string;           // for stat cards: the supporting label
    imageItems?: string[];         // for framework cards: 3-4 numbered items
    imageEyebrow?: string;         // for headline / framework cards: the uppercase kicker
    // Verbatim quote pulled from the article body by the LinkedIn generator.
    // Distinct from imageText (which reflects whatever is on the card right
    // now — could be AI-picked or user-edited). Used as the "preferred
    // quote" on first generation; also added to the exclude list on regen
    // so the UI can cycle to a different line.
    imageQuote?: string;
  }>;
}

export const Articles = db.defineTable<Article>('articles');
