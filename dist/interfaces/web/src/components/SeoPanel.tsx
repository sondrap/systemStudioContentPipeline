import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { IconCheck, IconAlertTriangle, IconChevronDown, IconChevronUp, IconSearch, IconHighlight } from '@tabler/icons-react';
import { computeSeoScore, SeoCheck } from '../utils/seoScore';
import { Article, api } from '../api';
import { useStore } from '../store';

interface SeoPanelProps {
  article: Article;
  title: string;
  body: string;
  highlightKeywords: boolean;
  onToggleHighlight: (on: boolean) => void;
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? 'var(--accent)' : score >= 40 ? '#D4A017' : '#C25D42';

  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 400ms ease, stroke 400ms ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 600, color,
        transition: 'color 400ms ease',
      }}>
        {score}
      </div>
    </div>
  );
}

function CheckItem({ check }: { check: SeoCheck }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0' }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: check.passed ? '#57726715' : '#C25D4215',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {check.passed
          ? <IconCheck size={11} stroke={2.5} color="var(--accent)" />
          : <IconAlertTriangle size={11} stroke={2} color="#C25D42" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{check.label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 1 }}>{check.detail}</div>
      </div>
    </div>
  );
}

export function SeoPanel({ article, title, body, highlightKeywords, onToggleHighlight }: SeoPanelProps) {
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const [expanded, setExpanded] = useState(true);

  // Editable SEO fields. The article has two separate description fields
  // in the database (metaDescription for Google search snippets,
  // ogDescription for social link previews) but almost every real article
  // wants them to say the same thing. We treat them as a single field here
  // — reading from either (preferring whichever is populated), and writing
  // to both on every save so they never drift apart. If one is set and the
  // other isn't, use the populated one as the canonical source.
  const initialDescription = article.ogDescription || article.metaDescription || '';
  const [focusKeyword, setFocusKeyword] = useState(article.focusKeyword || '');
  const [metaDescription, setMetaDescription] = useState(initialDescription);
  const [slug, setSlug] = useState(article.slug || '');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync from article when it changes externally (e.g., pipeline produced new values)
  useEffect(() => {
    setFocusKeyword(article.focusKeyword || '');
    setMetaDescription(article.ogDescription || article.metaDescription || '');
    setSlug(article.slug || '');
  }, [article.id]);

  const wordCount = useMemo(() => body.split(/\s+/).filter(Boolean).length, [body]);

  // Compute SEO score from current state (live as user edits)
  const seoResult = useMemo(() => computeSeoScore({
    title,
    body,
    focusKeyword,
    metaDescription,
    excerpt: article.excerpt || '',
    slug,
    wordCount,
  }), [title, body, focusKeyword, metaDescription, article.excerpt, slug, wordCount]);

  // Debounced save for SEO field changes. Accepts both ogDescription and
  // metaDescription but editing the description UI field sends the value
  // to BOTH so they never drift apart.
  const saveSeoFields = useCallback((fields: {
    focusKeyword?: string;
    ogDescription?: string;
    metaDescription?: string;
    slug?: string;
  }) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.updateArticle({ id: article.id, ...fields });
        updateArticleLocal(article.id, fields);
      } catch (err) {
        console.error('Failed to save SEO fields:', err);
      }
    }, 1500);
  }, [article.id, updateArticleLocal]);

  const handleKeywordChange = (val: string) => {
    setFocusKeyword(val);
    saveSeoFields({ focusKeyword: val });
  };

  const handleMetaChange = (val: string) => {
    setMetaDescription(val);
    // Write to BOTH fields so the search snippet (metaDescription) and the
    // social preview (ogDescription) stay in sync. This is the behavior the
    // user expects — almost every real article wants the same text in both.
    saveSeoFields({ ogDescription: val, metaDescription: val });
  };

  const handleSlugChange = (val: string) => {
    // Clean slug: lowercase, alphanumeric + hyphens only
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    saveSeoFields({ slug: clean });
  };

  const passedCount = seoResult.checks.filter(c => c.passed).length;
  const totalCount = seoResult.checks.length;

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header with score */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <ScoreRing score={seoResult.score} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SEO Score</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {passedCount}/{totalCount} checks passing
          </div>
        </div>
        {expanded ? <IconChevronUp size={16} color="var(--text-tertiary)" /> : <IconChevronDown size={16} color="var(--text-tertiary)" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Keyword highlight toggle */}
          <button
            onClick={() => onToggleHighlight(!highlightKeywords)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '8px 10px', marginBottom: 12,
              borderRadius: 8, border: '1px solid var(--border)',
              background: highlightKeywords ? '#36536710' : 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              color: highlightKeywords ? 'var(--deep-current)' : 'var(--text-secondary)',
              transition: 'all 150ms',
            }}
          >
            <IconHighlight size={14} stroke={1.5} />
            {highlightKeywords ? 'Keyword highlights on' : 'Show keyword highlights'}
          </button>

          {/* Editable SEO fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                <IconSearch size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                Focus Keyword
              </label>
              <input
                value={focusKeyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                placeholder="e.g., AI for small business"
                style={{
                  width: '100%', padding: '6px 10px',
                  fontSize: 13, borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                Description <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(search + social)</span>
                <span style={{ fontWeight: 400, color: metaDescription.length > 165 ? '#C25D42' : metaDescription.length >= 120 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {metaDescription.length}/160
                </span>
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => handleMetaChange(e.target.value)}
                placeholder="Write a compelling description (140-160 chars). Used for both Google search snippets and LinkedIn/Twitter link previews."
                rows={3}
                style={{
                  width: '100%', padding: '6px 10px',
                  fontSize: 12, lineHeight: 1.5, borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-primary)',
                  outline: 'none', resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                URL Slug
              </label>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ flexShrink: 0 }}>/journal/</span>
                <input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="article-slug"
                  style={{
                    flex: 1, padding: '4px 6px',
                    fontSize: 12, borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Checks list */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Optimization Checklist
            </div>
            {seoResult.checks.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </div>

          {/* Competitor insights (if available) */}
          {article.researchBrief?.competitorInsights && (
            <CompetitorInsights insights={article.researchBrief.competitorInsights} />
          )}
        </div>
      )}
    </div>
  );
}

function CompetitorInsights({ insights }: { insights: NonNullable<Article['researchBrief']>['competitorInsights'] }) {
  const [open, setOpen] = useState(false);
  if (!insights) return null;

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, width: '100%',
          border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        Competitor Analysis
        {open ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.commonKeywords && insights.commonKeywords.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>Common Keywords</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {insights.commonKeywords.map((kw) => (
                  <span key={kw} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: 'var(--surface-hover)', color: 'var(--text-secondary)',
                  }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
          {insights.gaps && insights.gaps.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>Content Gaps (Your Opportunity)</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {insights.gaps.map((gap, i) => (
                  <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
          {insights.topArticles && insights.topArticles.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>Top Competing Articles</div>
              {insights.topArticles.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener" style={{
                  display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.3,
                }}>
                  {a.title}{a.wordCount ? ` (${a.wordCount} words)` : ''}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
