import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '../store';
import { Article } from '../api';
import { IconSearch, IconExternalLink, IconCalendar, IconFileText, IconTag } from '@tabler/icons-react';

// Archive of all published articles. Pipeline view shows only articles from
// the last 30 days; everything older lives here. Searchable and sortable.

type SortMode = 'newest' | 'oldest' | 'alphabetical';

export function ArchivePage() {
  const articles = useStore((s) => s.articles);
  const loading = useStore((s) => s.loading);
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const publishedArticles = useMemo(() => {
    return articles.filter((a) => a.status === 'published');
  }, [articles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? publishedArticles.filter((a) => {
          return (
            a.title.toLowerCase().includes(q) ||
            (a.excerpt || '').toLowerCase().includes(q) ||
            (a.focusKeyword || '').toLowerCase().includes(q) ||
            (a.tags || []).some((t) => t.toLowerCase().includes(q))
          );
        })
      : publishedArticles;

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortMode === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      const aDate = a.publishedAt || a.created_at;
      const bDate = b.publishedAt || b.created_at;
      return sortMode === 'newest' ? bDate - aDate : aDate - bDate;
    });
  }, [publishedArticles, search, sortMode]);

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500 }}>Archive</h1>
          <span className="overline">
            {publishedArticles.length} published article{publishedArticles.length === 1 ? '' : 's'}
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.5 }}>
          Every article you've published. Search for a topic, sort to find what you're looking for, or click to open any article for editing or reference.
        </p>
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          padding: '8px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}>
          <IconSearch size={14} stroke={1.8} color="var(--text-tertiary)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, topic, keyword, or tag..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                border: 'none', background: 'transparent',
                color: 'var(--text-tertiary)', cursor: 'pointer',
                fontSize: 18, padding: 0, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={{
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="alphabetical">A-Z</option>
        </select>
      </div>

      {/* Empty states */}
      {loading && publishedArticles.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : publishedArticles.length === 0 ? (
        <EmptyState
          title="Nothing archived yet"
          message="Once you publish articles, they'll show up here. Your published library grows over time."
          onCta={() => navigate('/')}
          ctaLabel="Go to Pipeline"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          message={`Nothing matching "${search}". Try a different term.`}
          onCta={() => setSearch('')}
          ctaLabel="Clear search"
        />
      ) : (
        /* Article list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((article) => (
            <ArticleRow key={article.id} article={article} onClick={() => navigate(`/articles/${article.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleRow({ article, onClick }: { article: Article; onClick: () => void }) {
  const date = new Date(article.publishedAt || article.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const wordCount = article.wordCount || 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--deep-current)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Thumbnail */}
      {article.imageUrl ? (
        <img
          src={`${article.imageUrl}?w=120&h=90&fit=cover&dpr=2`}
          alt={article.coverImageAlt || ''}
          style={{
            width: 120,
            height: 90,
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 120,
          height: 90,
          borderRadius: 8,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IconFileText size={22} stroke={1.2} color="var(--text-tertiary)" />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          fontFamily: "'Bespoke Serif', serif",
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {article.title}
        </div>

        {article.excerpt && (
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {article.excerpt}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2, flexWrap: 'wrap' }}>
          <MetaItem icon={IconCalendar} text={formattedDate} />
          {wordCount > 0 && <MetaItem icon={IconFileText} text={`${wordCount.toLocaleString()} words`} />}
          {article.focusKeyword && <MetaItem icon={IconTag} text={article.focusKeyword} />}
          {article.publishedUrl && (
            <a
              href={article.publishedUrl}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--deep-current)',
                textDecoration: 'none',
                fontWeight: 500,
                marginLeft: 'auto',
              }}
            >
              View live <IconExternalLink size={11} stroke={1.8} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, text }: { icon: typeof IconCalendar; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
      <Icon size={11} stroke={1.5} />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ title, message, onCta, ctaLabel }: {
  title: string;
  message: string;
  onCta: () => void;
  ctaLabel: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.5, marginBottom: 16 }}>
        {message}
      </p>
      <button className="btn btn-ghost" onClick={onCta}>
        {ctaLabel}
      </button>
    </div>
  );
}
