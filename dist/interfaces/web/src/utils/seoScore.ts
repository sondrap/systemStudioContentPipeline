// SEO scoring utility — computes a 0-100 score from article fields, all client-side.

export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  weight: number; // how much this contributes to the total score
}

export interface SeoScoreResult {
  score: number; // 0-100
  checks: SeoCheck[];
}

export function computeSeoScore(opts: {
  title: string;
  body: string;
  focusKeyword: string;
  metaDescription: string;
  excerpt: string;
  slug: string;
  wordCount: number;
}): SeoScoreResult {
  const { title, body, focusKeyword, metaDescription, excerpt, slug, wordCount } = opts;
  const kw = focusKeyword.toLowerCase().trim();
  const bodyLower = body.toLowerCase();
  const titleLower = title.toLowerCase();
  const checks: SeoCheck[] = [];

  // 1. Focus keyword exists
  checks.push({
    id: 'has-keyword',
    label: 'Focus keyword set',
    passed: kw.length > 0,
    detail: kw.length > 0 ? `"${focusKeyword}"` : 'No focus keyword. Set one to guide optimization.',
    weight: 10,
  });

  if (kw.length > 0) {
    // 2. Keyword in title
    checks.push({
      id: 'keyword-in-title',
      label: 'Keyword in title',
      passed: titleLower.includes(kw),
      detail: titleLower.includes(kw)
        ? 'Focus keyword appears in the title.'
        : `Title doesn't contain "${focusKeyword}". Try to include it naturally.`,
      weight: 15,
    });

    // 3. Keyword in first 150 words
    const first150 = bodyLower.split(/\s+/).slice(0, 150).join(' ');
    const kwInFirst150 = first150.includes(kw);
    checks.push({
      id: 'keyword-in-intro',
      label: 'Keyword in introduction',
      passed: kwInFirst150,
      detail: kwInFirst150
        ? 'Focus keyword appears in the first 150 words.'
        : `"${focusKeyword}" doesn't appear in the first 150 words. Introduce it earlier.`,
      weight: 15,
    });

    // 4. Keyword density (1-3% is ideal)
    const kwRegex = new RegExp(escapeRegex(kw), 'gi');
    const kwCount = (bodyLower.match(kwRegex) || []).length;
    const totalWords = Math.max(1, wordCount);
    const kwWordCount = kw.split(/\s+/).length;
    const density = (kwCount * kwWordCount) / totalWords * 100;
    const densityOk = density >= 0.5 && density <= 3.5;
    checks.push({
      id: 'keyword-density',
      label: 'Keyword density',
      passed: densityOk,
      detail: kwCount === 0
        ? `"${focusKeyword}" doesn't appear in the body.`
        : `Appears ${kwCount} time${kwCount === 1 ? '' : 's'} (${density.toFixed(1)}%). ${densityOk ? 'Good range.' : density < 0.5 ? 'A bit low. Try adding it 1-2 more times.' : 'A bit high. Ease off to avoid keyword stuffing.'}`,
      weight: 10,
    });

    // 5. Keyword in H2 headings
    const h2s = body.match(/^##\s+.+$/gm) || [];
    const kwInH2 = h2s.some(h => h.toLowerCase().includes(kw));
    checks.push({
      id: 'keyword-in-headings',
      label: 'Keyword in headings',
      passed: kwInH2,
      detail: h2s.length === 0
        ? 'No H2 headings found. Add section headings for structure and SEO.'
        : kwInH2
          ? 'At least one heading includes the focus keyword.'
          : 'No headings contain the focus keyword. Consider adding it to a section title.',
      weight: 10,
    });

    // 6. Keyword in excerpt
    checks.push({
      id: 'keyword-in-excerpt',
      label: 'Keyword in excerpt',
      passed: excerpt.toLowerCase().includes(kw),
      detail: !excerpt
        ? 'No excerpt set.'
        : excerpt.toLowerCase().includes(kw)
          ? 'Excerpt includes the focus keyword.'
          : 'Excerpt doesn\'t contain the focus keyword. This affects search snippets.',
      weight: 5,
    });
  }

  // 7. Meta description length (140-160 chars is ideal)
  const metaLen = metaDescription.length;
  const metaOk = metaLen >= 120 && metaLen <= 165;
  checks.push({
    id: 'meta-description',
    label: 'Meta description length',
    passed: metaOk,
    detail: metaLen === 0
      ? 'No meta description. Write 140-160 characters for search results.'
      : `${metaLen} characters. ${metaOk ? 'Good length.' : metaLen < 120 ? 'Too short. Aim for 140-160 characters.' : 'A bit long. Trim to under 160 characters.'}`,
    weight: 10,
  });

  // 8. Word count (aim for 800+)
  const wordCountOk = wordCount >= 800;
  checks.push({
    id: 'word-count',
    label: 'Article length',
    passed: wordCountOk,
    detail: wordCount === 0
      ? 'No content yet.'
      : `${wordCount.toLocaleString()} words. ${wordCountOk ? 'Good length for SEO.' : 'Under 800 words. Longer articles tend to rank better.'}`,
    weight: 10,
  });

  // 9. Has slug
  checks.push({
    id: 'has-slug',
    label: 'URL slug set',
    passed: (slug || '').length > 0,
    detail: slug ? `/${slug}` : 'No slug. One will be generated from the title on publish.',
    weight: 5,
  });

  // 10. Outbound links — linking to authoritative sources is a real SEO signal
  // and also just better journalism. Research already gathered these URLs; they
  // should be making their way into the article body as hyperlinks.
  // We count [text](http...) markdown links, excluding image syntax (![alt](url))
  // and excluding the author's own domain (systemstudio.ai).
  const outboundLinkRegex = /(?<!!)\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
  const outboundLinks: string[] = [];
  let linkMatch;
  while ((linkMatch = outboundLinkRegex.exec(body)) !== null) {
    const url = linkMatch[1];
    // Exclude self-links (the author's own published articles)
    if (!url.includes('systemstudio.ai')) {
      outboundLinks.push(url);
    }
  }
  const outboundCount = outboundLinks.length;
  checks.push({
    id: 'outbound-links',
    label: 'Outbound links',
    passed: outboundCount >= 2,
    detail: outboundCount === 0
      ? 'No outbound links. Linking to sources and authoritative references improves SEO and credibility.'
      : outboundCount === 1
        ? '1 outbound link. Add 1-2 more links to source material for stronger credibility signal.'
        : `${outboundCount} outbound links. Good credibility signal.`,
    weight: 10,
  });

  // 11. Has H2 structure
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  checks.push({
    id: 'heading-structure',
    label: 'Section headings',
    passed: h2Count >= 2,
    detail: h2Count === 0
      ? 'No section headings. Add ## headings to break up the content.'
      : h2Count === 1
        ? '1 heading. Consider adding more sections for readability and SEO.'
        : `${h2Count} headings. Good structure.`,
    weight: 10,
  });

  // Calculate weighted score
  const maxPossible = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;

  return { score, checks };
}

// Count keyword occurrences in text for highlighting
export function findKeywordPositions(text: string, keyword: string): { start: number; end: number }[] {
  if (!keyword.trim()) return [];
  const positions: { start: number; end: number }[] = [];
  const regex = new RegExp(escapeRegex(keyword), 'gi');
  let match;
  while ((match = regex.exec(text)) !== null) {
    positions.push({ start: match.index, end: match.index + match[0].length });
  }
  return positions;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
