import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '../store';
import { api, Article, ArticleStatus } from '../api';
import { IconLayoutKanban, IconRefresh, IconDots, IconTrash } from '@tabler/icons-react';

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

function ArticleCard({ article }: { article: Article }) {
  const [, navigate] = useLocation();
  const removeArticle = useStore((s) => s.removeArticle);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}
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
    </div>
  );
}

function PipelineColumn({ status, label, dotColor, articles }: {
  status: ArticleStatus;
  label: string;
  dotColor: string;
  articles: Article[];
}) {
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
          {articles.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}

export function PipelinePage() {
  const articles = useStore((s) => s.articles);
  const loading = useStore((s) => s.loading);
  const loadData = useStore((s) => s.loadData);
  const [, navigate] = useLocation();

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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 500 }}>Content Pipeline</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          </div>
        </div>
      ) : (
        /* Pipeline columns */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, alignItems: 'start' }}>
          {STAGES.map(({ status, label, dotColor }) => (
            <PipelineColumn
              key={status}
              status={status}
              label={label}
              dotColor={dotColor}
              articles={articles.filter((a) => a.status === status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
