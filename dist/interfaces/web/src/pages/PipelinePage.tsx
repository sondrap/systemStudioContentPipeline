import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '../store';
import { api, Article, ArticleStatus } from '../api';
import { IconLayoutKanban, IconRefresh, IconDots, IconTrash, IconDownload, IconLoader2, IconAlertTriangle, IconPlayerPlay } from '@tabler/icons-react';

const STAGES: { status: ArticleStatus; label: string; dotColor: string }[] = [
  { status: 'researching', label: 'Researching', dotColor: '#365367' },
  { status: 'drafting', label: 'Drafting', dotColor: '#577267' },
  { status: 'review', label: 'Review', dotColor: '#ECD8DC' },
  { status: 'published', label: 'Published', dotColor: '#577267' },
];

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// An article is considered "stuck" when it has been sitting in 'drafting' or
// 'researching' for longer than the threshold below. The most common cause
// is a deploy restarting the execution environment while the fire-and-forget
// background chain was still running. Resume kicks the remaining stages
// (hero image + critiques + LinkedIn posts) back into motion.
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

function isArticleStuck(article: Article): boolean {
  if (article.status !== 'drafting' && article.status !== 'researching') return false;
  const elapsed = Date.now() - article.updated_at;
  return elapsed > STUCK_THRESHOLD_MS;
}

// Format a duration like "16h 4m" for the "stuck" label. We only care about
// hours and minutes — anything in days would be VERY stuck and the label
// gets capped at "24h+" because exact numbers past a day stop mattering.
function formatStuckDuration(updatedAt: number): string {
  const elapsedMs = Date.now() - updatedAt;
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const minutes = Math.floor((elapsedMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) return '24h+';
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function ArticleCard({ article }: { article: Article }) {
  const [, navigate] = useLocation();
  const removeArticle = useStore((s) => s.removeArticle);
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const loadData = useStore((s) => s.loadData);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const stuck = isArticleStuck(article);
  // Resume now handles both 'drafting' (body exists, just finish the rest)
  // AND 'researching' / 'drafting-with-empty-body' (restart from the topic).
  // So canResume is true for any stuck article that has a topic to recover from.
  const canResume = stuck && (article.status === 'drafting' || article.status === 'researching');

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResuming(true);
    setResumeError(null);
    try {
      const result = await api.resumeArticle({ id: article.id });
      // If the resume took the "restart from scratch" path OR the server
      // said the article is already completed (user clicked Restart twice,
      // first one succeeded, UI still shows stale state), reload the full
      // dashboard so the stale card disappears and the current state is
      // reflected.
      if (result.recovered?.restarted || (result.recovered as any)?.alreadyCompleted) {
        await loadData();
      } else if (result.article) {
        // Post-drafting recovery path: same article ID, just merge the
        // new fields.
        updateArticleLocal(article.id, {
          status: result.article.status,
          imageUrl: result.article.imageUrl,
          coverImageAlt: result.article.coverImageAlt,
          heroImageObjects: result.article.heroImageObjects,
          seoCritique: result.article.seoCritique,
          draftCritique: result.article.draftCritique,
          linkedInPosts: result.article.linkedInPosts,
          updated_at: result.article.updated_at,
        });
      }
    } catch (err: any) {
      console.error('Resume failed:', err);
      setResumeError(err?.message || 'Resume failed. Try again.');
    } finally {
      setResuming(false);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.deleteArticle({ id: article.id });
      removeArticle(article.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleting(false);
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  return (
    <div
      className="card card-interactive"
      onClick={() => navigate(`/articles/${article.id}`)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        // Subtle amber accent for stuck cards — draws attention without alarming
        ...(stuck ? { borderColor: '#C9932D50', background: '#D4A0170A' } : {}),
      }}
    >
      {/* Three-dot menu */}
      <div ref={menuRef} style={{ position: 'absolute', top: 12, right: 12 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setConfirmDelete(false); }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: menuOpen ? 'var(--background)' : 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            opacity: menuOpen ? 1 : 0,
            transition: 'opacity 150ms, background 150ms',
          }}
          className="card-menu-btn"
        >
          <IconDots size={14} stroke={1.5} />
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            minWidth: 160,
            padding: 4,
            zIndex: 50,
          }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                borderRadius: 6,
                background: confirmDelete ? '#fee2e2' : 'transparent',
                color: confirmDelete ? '#dc2626' : 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: deleting ? 'wait' : 'pointer',
                transition: 'background 150ms',
              }}
            >
              <IconTrash size={14} stroke={1.5} />
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm delete' : 'Delete article'}
            </button>
          </div>
        )}
      </div>

      <h4 style={{
        fontFamily: "'Bespoke Serif', serif",
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 1.3,
        paddingRight: 28,
      }}>
        {article.title}
      </h4>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: 'var(--text-secondary)',
      }}>
        <span>{formatDate(article.updated_at)}</span>
        {article.wordCount ? (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{article.wordCount.toLocaleString()} words</span>
          </>
        ) : null}
      </div>
      <span className={`tag tag-${article.status}`}>
        {article.status}
      </span>

      {/* Stuck indicator + resume button. Only appears when the article has
          been sitting in drafting/researching for 15+ minutes, signaling the
          background pipeline was interrupted. */}
      {stuck && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 4,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(201, 147, 45, 0.1)',
            border: '1px solid rgba(201, 147, 45, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <IconAlertTriangle size={13} stroke={2} color="#C9932D" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#C9932D', lineHeight: 1.3 }}>
                Stuck for {formatStuckDuration(article.updated_at)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 2 }}>
                {!canResume
                  ? 'Background pipeline was interrupted and this article has no topic to recover from. Delete and re-start from the Backlog.'
                  : article.status === 'researching' || !article.wordCount
                    ? 'Pipeline died during research or drafting. Resume will restart from the topic (takes ~3 minutes).'
                    : 'Background pipeline was interrupted. Resume to finish generating images, critiques, and LinkedIn posts.'}
              </div>
            </div>
          </div>

          {canResume && (
            <button
              onClick={handleResume}
              disabled={resuming}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #C9932D',
                background: resuming ? '#C9932D30' : '#C9932D',
                color: resuming ? '#C9932D' : 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: resuming ? 'wait' : 'pointer',
                transition: 'all 150ms',
              }}
            >
              {resuming
                ? <><IconLoader2 size={12} className="spinner" /> Resuming...</>
                : <><IconPlayerPlay size={12} stroke={2} />
                    {article.status === 'researching' || !article.wordCount ? 'Restart pipeline' : 'Resume pipeline'}
                  </>}
            </button>
          )}

          {resumeError && (
            <div style={{ fontSize: 11, color: '#C25D42', lineHeight: 1.4 }}>
              {resumeError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineColumn({ status, label, dotColor, articles, totalCount, archiveOverflow, onArchiveClick }: {
  status: ArticleStatus;
  label: string;
  dotColor: string;
  articles: Article[];
  totalCount?: number;
  archiveOverflow?: number;
  onArchiveClick?: () => void;
}) {
  // If we have overflow, show the total count in the header but render only
  // the visible subset. The user sees "16" in the header and "+13 in archive"
  // at the bottom of the column.
  const displayCount = totalCount ?? articles.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          border: status === 'review' ? '1px solid #365367' : undefined,
        }} />
        <span style={{
          fontFamily: "'Bespoke Serif', serif",
          fontSize: 18,
          fontWeight: 500,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}>
          {displayCount}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
      {archiveOverflow && archiveOverflow > 0 && onArchiveClick ? (
        <button
          onClick={onArchiveClick}
          style={{
            marginTop: 4,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px dashed var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.color = 'var(--deep-current)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          +{archiveOverflow} more in archive →
        </button>
      ) : null}
    </div>
  );
}

export function PipelinePage() {
  const articles = useStore((s) => s.articles);
  const loading = useStore((s) => s.loading);
  const loadData = useStore((s) => s.loadData);
  const [, navigate] = useLocation();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Trigger import from systemstudio.ai for the empty-state case, used once
  // per production app to pull already-published articles into the pipeline.
  const handleImport = async () => {
    setImporting(true);
    setImportMessage(null);
    try {
      const result = await api.importPublishedArticles();
      if (result.imported > 0) {
        setImportMessage(`Imported ${result.imported} article${result.imported === 1 ? '' : 's'} from your site.`);
        await loadData();
      } else if (result.totalOnSite === 0) {
        setImportMessage("No articles on your site yet. Publish one first.");
      } else {
        setImportMessage(`All ${result.totalOnSite} article${result.totalOnSite === 1 ? '' : 's'} on your site are already in the pipeline.`);
        await loadData();
      }
    } catch (err: any) {
      setImportMessage(err?.message || 'Import failed. Check credentials and try again.');
    } finally {
      setImporting(false);
    }
  };

  // Auto-refresh every 30s if there are articles in researching/drafting
  const hasInProgress = articles.some((a) => a.status === 'researching' || a.status === 'drafting');
  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [hasInProgress, loadData]);

  const hasArticles = articles.length > 0;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* Toast for import results (auto-dismisses when user takes another action) */}
      {importMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 100,
          padding: '10px 16px',
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          fontSize: 13,
          color: 'var(--text-primary)',
          maxWidth: 320,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ flex: 1 }}>{importMessage}</span>
          <button
            onClick={() => setImportMessage(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              fontSize: 16,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 500 }}>Content Pipeline</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleImport}
            disabled={importing}
            title="Import any articles published on systemstudio.ai that aren't in the pipeline yet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 12,
              fontWeight: 500,
              cursor: importing ? 'wait' : 'pointer',
              transition: 'all 150ms',
            }}
          >
            {importing
              ? <><IconLoader2 size={13} className="spinner" /> Syncing...</>
              : <><IconDownload size={13} stroke={1.8} /> Sync from site</>}
          </button>
          <button
            onClick={() => loadData()}
            title="Refresh pipeline"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              transition: 'all 150ms',
            }}
          >
            <IconRefresh size={14} stroke={1.5} />
          </button>
          <span className="overline">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {loading ? (
        /* Skeleton loading */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
              {i < 2 && <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />}
            </div>
          ))}
        </div>
      ) : !hasArticles ? (
        /* Empty state */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
        }}>
          <div className="card" style={{
            maxWidth: 580,
            padding: '48px 40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
              <IconLayoutKanban size={24} stroke={1.5} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 500 }}>A blank slate</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 380 }}>
              No articles in the pipeline yet. Start one from the backlog, or brainstorm with the agent.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => navigate('/backlog')}>Browse Backlog</button>
              <button className="btn btn-ghost" onClick={() => navigate('/chat')}>Open Chat</button>
            </div>
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Have articles already published on systemstudio.ai?
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: importing ? 'wait' : 'pointer',
                }}
              >
                {importing
                  ? <><IconLoader2 size={13} className="spinner" /> Importing...</>
                  : <><IconDownload size={13} stroke={1.8} /> Import from site</>}
              </button>
              {importMessage && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 380, textAlign: 'center' }}>
                  {importMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Pipeline columns */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, alignItems: 'start' }}>
          {STAGES.map(({ status, label, dotColor }) => {
            const columnArticles = articles.filter((a) => a.status === status);

            // Published column: only show articles from the last 30 days.
            // Older articles live in the Archive. Compute the overflow count
            // so the column can link to the archive when there are more.
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const isPublished = status === 'published';
            const visible = isPublished
              ? columnArticles.filter((a) => {
                  const publishedTime = a.publishedAt || a.created_at;
                  return now - publishedTime < THIRTY_DAYS_MS;
                })
              : columnArticles;
            const archiveOverflow = isPublished ? columnArticles.length - visible.length : 0;

            return (
              <PipelineColumn
                key={status}
                status={status}
                label={label}
                dotColor={dotColor}
                articles={visible}
                totalCount={columnArticles.length}
                archiveOverflow={archiveOverflow}
                onArchiveClick={() => navigate('/archive')}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
