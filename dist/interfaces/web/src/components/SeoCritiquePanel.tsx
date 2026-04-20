import { useState } from 'react';
import { IconAlertOctagon, IconAlertTriangle, IconInfoCircle, IconRefresh, IconChevronDown, IconChevronUp, IconLoader2, IconSparkles } from '@tabler/icons-react';
import { Article, api } from '../api';
import { useStore } from '../store';

type Severity = 'critical' | 'should-fix' | 'nice-to-have';
type Area = 'headline' | 'opening' | 'meta-description' | 'structure' | 'differentiation' | 'intent-match';

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; icon: typeof IconAlertOctagon }> = {
  'critical': {
    label: 'Critical',
    color: '#C25D42',
    bg: '#C25D4215',
    icon: IconAlertOctagon,
  },
  'should-fix': {
    label: 'Should Fix',
    color: '#C9932D',
    bg: '#D4A01720',
    icon: IconAlertTriangle,
  },
  'nice-to-have': {
    label: 'Nice to Have',
    color: 'var(--text-secondary)',
    bg: 'var(--surface-hover)',
    icon: IconInfoCircle,
  },
};

const AREA_LABELS: Record<Area, string> = {
  'headline': 'Headline',
  'opening': 'Opening',
  'meta-description': 'Meta Description',
  'structure': 'Structure',
  'differentiation': 'Differentiation',
  'intent-match': 'Intent Match',
};

interface SeoCritiquePanelProps {
  article: Article;
  // Flush any pending body/title autosave before re-running so the
  // critique always evaluates the latest content (not a stale DB copy).
  flushSave?: () => void;
}

export function SeoCritiquePanel({ article, flushSave }: SeoCritiquePanelProps) {
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const [expanded, setExpanded] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const critique = article.seoCritique;

  // Stale when the article has been edited after the critique was generated.
  const STALE_TOLERANCE_MS = 5_000;
  const isStale = critique
    ? article.updated_at > (critique.generatedAt + STALE_TOLERANCE_MS)
    : false;

  const handleRerun = async () => {
    setRerunning(true);
    setRerunError(null);
    try {
      if (flushSave) flushSave();
      await new Promise(r => setTimeout(r, 500));

      const result = await api.reviewSeo({ id: article.id });
      if (result.critique) {
        updateArticleLocal(article.id, { seoCritique: result.critique });
      }
    } catch (err: any) {
      console.error('SEO critique failed:', err);
      setRerunError(err?.message || 'Re-run failed. Try again.');
    } finally {
      setRerunning(false);
    }
  };

  // Sort issues by severity (critical first, nice-to-have last)
  const severityOrder: Record<Severity, number> = { 'critical': 0, 'should-fix': 1, 'nice-to-have': 2 };
  const sortedIssues = critique?.issues
    ? [...critique.issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    : [];

  const criticalCount = sortedIssues.filter(i => i.severity === 'critical').length;
  const shouldFixCount = sortedIssues.filter(i => i.severity === 'should-fix').length;

  // Count summary for the header
  const summaryText = critique
    ? criticalCount > 0
      ? `${criticalCount} critical${shouldFixCount > 0 ? `, ${shouldFixCount} should-fix` : ''}`
      : sortedIssues.length > 0
        ? `${sortedIssues.length} suggestion${sortedIssues.length === 1 ? '' : 's'}`
        : 'Ready to publish'
    : 'Not yet run';

  const summaryColor = critique
    ? criticalCount > 0
      ? '#C25D42'
      : sortedIssues.length > 0
        ? '#C9932D'
        : 'var(--accent)'
    : 'var(--text-tertiary)';

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: summaryColor + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IconSparkles size={16} stroke={1.8} color={summaryColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SEO Critique</div>
          <div style={{ fontSize: 11, color: summaryColor, marginTop: 2, fontWeight: 500 }}>
            {summaryText}
          </div>
        </div>
        {expanded ? <IconChevronUp size={16} color="var(--text-tertiary)" /> : <IconChevronDown size={16} color="var(--text-tertiary)" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {!critique ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                An adversarial SEO review hasn't run on this article yet. Click below to check for strategic issues (headline, opening hook, search intent match, competitive differentiation).
              </p>
              <button
                onClick={handleRerun}
                disabled={rerunning}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--deep-current, #365367)',
                  background: 'var(--deep-current, #365367)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: rerunning ? 'wait' : 'pointer',
                  opacity: rerunning ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {rerunning
                  ? <><IconLoader2 size={13} className="spinner" /> Reviewing...</>
                  : <><IconSparkles size={13} /> Run SEO Review</>}
              </button>
            </div>
          ) : (
            <>
              {/* Stale warning when the article has been edited since the
                  critique was generated. Tells Sondra that the feedback may
                  reference content no longer in the draft. */}
              {isStale && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#D4A01715',
                  border: '1px solid #D4A01740',
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ fontSize: 12, color: '#8C6710', lineHeight: 1.5 }}>
                    <strong>This review is out of date.</strong> The article has been edited since this review was generated ({formatRelativeTime(critique.generatedAt)}). Some feedback below may reference content that is no longer in the draft.
                  </div>
                  <button
                    onClick={handleRerun}
                    disabled={rerunning}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #C9932D',
                      background: '#C9932D',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: rerunning ? 'wait' : 'pointer',
                      opacity: rerunning ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {rerunning
                      ? <><IconLoader2 size={12} className="spinner" /> Re-reviewing...</>
                      : <><IconRefresh size={12} /> Re-review now</>}
                  </button>
                </div>
              )}

              {rerunError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#C25D4215',
                  border: '1px solid #C25D4230',
                  marginBottom: 12,
                  fontSize: 12,
                  color: '#9A4531',
                  lineHeight: 1.5,
                }}>
                  Re-run failed: {rerunError}
                </div>
              )}

              {/* Overall assessment */}
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Overall
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {critique.overallAssessment}
                </div>
              </div>

              {/* Issues */}
              {sortedIssues.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                  No issues flagged. This article is in good shape.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} />
                  ))}
                </div>
              )}

              {/* Footer — re-run button + timestamp */}
              <div style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Run {formatRelativeTime(critique.generatedAt)}
                </div>
                <button
                  onClick={handleRerun}
                  disabled={rerunning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: rerunning ? 'wait' : 'pointer',
                    opacity: rerunning ? 0.6 : 1,
                  }}
                >
                  {rerunning ? <IconLoader2 size={11} className="spinner" /> : <IconRefresh size={11} />}
                  {rerunning ? 'Running...' : 'Re-run'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: { severity: Severity; area: Area; issue: string; suggestion: string } }) {
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${config.color}30`,
      background: config.bg,
      overflow: 'hidden',
    }}>
      {/* Row 1: severity badge + area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px 6px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: config.color,
      }}>
        <Icon size={12} stroke={2} />
        {config.label}
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>— {AREA_LABELS[issue.area]}</span>
      </div>

      {/* The issue itself */}
      <div style={{
        padding: '0 12px 8px',
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.5,
      }}>
        {issue.issue}
      </div>

      {/* The suggestion — distinct background to separate it */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.5)',
        borderTop: `1px dashed ${config.color}25`,
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.5,
      }}>
        <span style={{ fontWeight: 600, color: config.color }}>Try: </span>
        {issue.suggestion}
      </div>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
