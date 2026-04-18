// Sondra's signature sign-off is the canonical close for every article.
// This module centralizes the logic for enforcing it after any AI stage
// that produces or rewrites article bodies. Used by:
//
//   - startArticle.ts (after the SEO optimization pass)
//   - sendBack.ts (after revision rewrites)
//
// The canonical form is: "Don't overthink it,\nSP" preceded by a blank line.
// Whatever mess the model produces, clean text comes out.

export const CANONICAL_SIGNOFF = "Don't overthink it,\nSP";

// Normalize the sign-off in an article body. Handles three common failure
// modes the AI stages can introduce:
//   1. Missing sign-off entirely → appended at the end
//   2. Sign-off placed mid-article (with more content after it) → removed
//      from the middle, appended at the end
//   3. Sign-off written as a single line ("Don't overthink it, SP") instead
//      of two lines → rewritten into the canonical two-line format
//
// Also handles smart apostrophes vs straight apostrophes, since both can
// show up after copy-paste from various sources or AI model quirks.
export function normalizeSignoff(body: string): string {
  // Match any instance of the sign-off in any common formatting:
  //   - straight apostrophe or smart apostrophe (\u2019)
  //   - period or comma after "it"
  //   - one line or two lines
  //   - trailing whitespace (including blank lines) consumed after the match
  //
  // Deliberately does NOT consume leading whitespace. The paragraph
  // separator before a mid-article sign-off must be preserved so the
  // previous paragraph and the next heading stay separated after removal.
  const signoffRegex = /[Dd]on[\u2019']t overthink it[,.]?\s*\n?\s*SP\.?\s*/gm;

  // Strip ALL matches from anywhere in the body. This handles mid-article
  // misplacement AND duplicates in one pass. trimEnd() cleans up trailing
  // whitespace left behind when the sign-off was already at the end.
  const withoutAnySignoff = body.replace(signoffRegex, '').trimEnd();

  // Canonical form: exactly two lines preceded by a blank line.
  return `${withoutAnySignoff}\n\n${CANONICAL_SIGNOFF}`;
}
