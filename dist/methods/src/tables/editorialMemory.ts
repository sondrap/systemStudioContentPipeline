import { db } from '@mindstudio-ai/agent';

// Editorial memory — accumulated corrections Sondra makes via Send Back.
// An extractor agent writes a new row here after every successful
// revision, capturing the pattern so future drafts can avoid repeating
// the mistake.
//
// Read by: the drafting prompt in startArticle and the revision prompt
// in sendBack. Both load a formatted digest of active patterns and
// inject it as context so the writer inherits Sondra's accumulated taste.
//
// Written by: the extractor agent in sendBack, after the revision
// rewrite succeeds and a fresh critique runs clean.
export interface EditorialMemory {
  // Short, specific correction in imperative voice. Example:
  //   "Always weave 2-5 inline links to research sources in the body
  //    prose, never pile them at the end as a sources section."
  pattern: string;
  // Which pipeline stage this pattern most applies to. Used to route
  // the right patterns to the right prompts (drafting prompts get
  // 'drafting' and 'voice' patterns, SEO pass gets 'seo', etc.).
  stage: 'drafting' | 'revision' | 'seo' | 'voice' | 'structure' | 'links' | 'general';
  // Article ID the correction came from. For traceability so Sondra
  // can click back to see the original context.
  sourceArticleId: string;
  // What the user's revision notes said that led to this pattern. Quoted
  // verbatim from the original Send Back notes. Kept short (truncated
  // at 300 chars by the extractor) to keep the digest compact.
  sourceNotes: string;
  // Active patterns flow into future drafts. Deactivated patterns (Sondra
  // explicitly retired them, or they contradicted newer feedback) stay
  // in the DB for audit but don't affect new work.
  active: boolean;
}

export const EditorialMemories = db.defineTable<EditorialMemory>('editorial_memories', {
  defaults: { active: true, stage: 'general' },
});
