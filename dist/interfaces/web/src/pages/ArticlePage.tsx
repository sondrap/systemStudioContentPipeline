import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useStore } from '../store';
import { api, Article } from '../api';
import { IconArrowLeft, IconLoader2, IconCheck, IconExternalLink, IconPhoto, IconTrash, IconPencil, IconHighlight, IconUsers, IconEye, IconCode, IconCloudOff } from '@tabler/icons-react';
import { Streamdown } from 'streamdown';
import { SeoPanel } from '../components/SeoPanel';
import { SeoCritiquePanel } from '../components/SeoCritiquePanel';
import { DraftCritiquePanel } from '../components/DraftCritiquePanel';
import { LinkedInPostsPanel } from '../components/LinkedInPostsPanel';
import { findKeywordPositions } from '../utils/seoScore';

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function readingTime(words?: number) {
  if (!words) return '';
  const mins = Math.max(1, Math.ceil(words / 250));
  return `${mins} min read`;
}

export function ArticlePage() {
  const [, params] = useRoute('/articles/:id');
  const [, navigate] = useLocation();
  const articles = useStore((s) => s.articles);
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const removeArticle = useStore((s) => s.removeArticle);
  const loadData = useStore((s) => s.loadData);

  const articleId = params?.id;
  const article = articles.find((a) => a.id === articleId);

  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);
  const [showSendBack, setShowSendBack] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [confirmDeleteArticle, setConfirmDeleteArticle] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [highlightKeywords, setHighlightKeywords] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Initialize from article
  useEffect(() => {
    if (article) {
      setBody(article.body || '');
      setTitle(article.title || '');
      setPublished(article.status === 'published');
    }
  }, [article?.id]);

  // Auto-save with debounce
  const debouncedSave = useCallback(async (newBody: string, newTitle: string) => {
    if (!articleId) return;
    setSaveStatus('saving');
    try {
      await api.updateArticle({ id: articleId, body: newBody, title: newTitle });
      const wordCount = newBody.split(/\s+/).filter(Boolean).length;
      updateArticleLocal(articleId, { body: newBody, title: newTitle, wordCount });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('unsaved');
    }
  }, [articleId, updateArticleLocal]);

  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    debouncedSave(body, title);
  }, [body, title, debouncedSave]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => debouncedSave(val, title), 2000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => debouncedSave(body, val), 2000);
  };

  const handlePublish = async () => {
    if (!articleId || publishing) return;
    setPublishing(true);
    try {
      const { article: updated } = await api.publishArticle({ id: articleId });
      updateArticleLocal(articleId, updated);
      setPublished(true);
    } catch (err: any) {
      alert(err.message || 'Publishing failed.');
    } finally {
      setPublishing(false);
    }
  };

  const handleSendBack = async () => {
    if (!articleId || !revisionNotes.trim() || sendingBack) return;
    setSendingBack(true);
    try {
      await api.sendBack({ id: articleId, revisionNotes: revisionNotes.trim() });
      updateArticleLocal(articleId, { status: 'drafting', revisionNotes: revisionNotes.trim() });
      setShowSendBack(false);
      setRevisionNotes('');
    } catch (err: any) {
      alert(err.message || 'Send back failed.');
    } finally {
      setSendingBack(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!articleId || regenerating) return;
    setRegenerating(true);
    try {
      const { article: updated } = await api.regenerateImage({ id: articleId });
      updateArticleLocal(articleId, { imageUrl: updated.imageUrl });
    } catch (err: any) {
      alert(err.message || 'Image generation failed.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!articleId) return;
    if (!confirmDeleteArticle) {
      setConfirmDeleteArticle(true);
      return;
    }
    setDeletingArticle(true);
    try {
      await api.deleteArticle({ id: articleId });
      removeArticle(articleId);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Delete failed.');
      setDeletingArticle(false);
      setConfirmDeleteArticle(false);
    }
  };

  const handleUnpublish = async () => {
    if (!articleId) return;
    if (!confirmUnpublish) {
      setConfirmUnpublish(true);
      return;
    }
    setUnpublishing(true);
    try {
      const result = await api.unpublishArticle({ id: articleId });
      // Update local state so the button flips back to "Approve & Publish"
      if (result.article) {
        updateArticleLocal(articleId, {
          status: result.article.status,
          publishedAt: result.article.publishedAt,
          publishedUrl: result.article.publishedUrl,
        });
        setPublished(false);
      }
      setConfirmUnpublish(false);
    } catch (err: any) {
      alert(err.message || 'Unpublish failed. Check the logs for details.');
      setConfirmUnpublish(false);
    } finally {
      setUnpublishing(false);
    }
  };

  if (!article) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          <IconArrowLeft size={16} stroke={1.5} /> Pipeline
        </button>
        <p style={{ color: 'var(--text-secondary)' }}>Article not found.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content column */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Back button */}
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            <IconArrowLeft size={16} stroke={1.5} /> Pipeline
          </button>

          {/* Hero image */}
          {article.imageUrl ? (
            <div style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden', aspectRatio: '1200/630', background: 'var(--border)' }}>
              <img
                src={`${article.imageUrl}?w=1200&dpr=2&fm=webp`}
                alt={article.coverImageAlt || article.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : (
            <div style={{
              marginBottom: 24,
              borderRadius: 16,
              aspectRatio: '1200/630',
              background: 'var(--surface)',
              border: '1px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}>
              <IconPhoto size={32} stroke={1} color="var(--text-tertiary)" />
              <button className="btn btn-ghost btn-sm" onClick={handleRegenerateImage} disabled={regenerating}>
                {regenerating ? <><IconLoader2 size={14} className="spinner" /> Generating...</> : 'Generate Image'}
              </button>
            </div>
          )}

          {/* Title */}
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Article title"
            style={{
              width: '100%',
              fontFamily: "'Bespoke Serif', serif",
              fontSize: 36,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: 'var(--text-primary)',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              marginBottom: 8,
            }}
          />

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 12, fontWeight: 500, letterSpacing: '0.02em', color: 'var(--text-secondary)' }}>
            <span>{formatDate(article.updated_at)}</span>
            {article.wordCount ? (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{article.wordCount.toLocaleString()} words</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{readingTime(article.wordCount)}</span>
              </>
            ) : null}
            <span style={{ marginLeft: 'auto' }} />

            {/* Preview/Edit toggle — renders markdown body with images and formatting */}
            <button
              onClick={() => setPreviewMode(!previewMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: previewMode ? 'var(--deep-current)' : 'var(--surface)',
                color: previewMode ? 'white' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              title={previewMode ? 'Switch back to editing' : 'Preview the rendered article with images'}
            >
              {previewMode
                ? <><IconCode size={12} stroke={1.8} /> Edit</>
                : <><IconEye size={12} stroke={1.8} /> Preview</>}
            </button>

            {saveStatus === 'unsaved' ? (
              <button
                onClick={handleManualSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                Save
              </button>
            ) : saveStatus === 'saving' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                <IconLoader2 size={11} className="spinner" /> Saving...
              </span>
            ) : saveStatus === 'saved' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)' }}>
                <IconCheck size={11} stroke={2} /> Saved
              </span>
            ) : null}
          </div>

          {/* Body — three modes: preview (rendered markdown), highlighted (keywords), or editable textarea */}
          {previewMode ? (
            <div className="article-preview" style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 17,
              lineHeight: 1.65,
              color: 'var(--text-primary)',
              minHeight: 400,
            }}>
              <Streamdown>{body}</Streamdown>
            </div>
          ) : highlightKeywords && article.focusKeyword ? (
            <div style={{ position: 'relative' }}>
              {/* Highlighted preview */}
              <div
                style={{
                  width: '100%',
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: 17,
                  fontWeight: 400,
                  lineHeight: 1.65,
                  color: 'var(--text-primary)',
                  minHeight: 400,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <HighlightedText text={body} keyword={article.focusKeyword} />
              </div>
              <button
                onClick={() => setHighlightKeywords(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  position: 'sticky', bottom: 16,
                  margin: '16px auto 0',
                  padding: '6px 14px', borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <IconPencil size={13} stroke={1.5} /> Back to editing
              </button>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={handleBodyChange}
              placeholder="Start writing, or wait for the AI to draft..."
              style={{
                width: '100%',
                fontFamily: "'Satoshi', sans-serif",
                fontSize: 17,
                fontWeight: 400,
                lineHeight: 1.65,
                color: 'var(--text-primary)',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                minHeight: 400,
                overflow: 'hidden',
              }}
              rows={Math.max(20, (body.match(/\n/g) || []).length + 5)}
            />
          )}
        </div>
      </div>

      {/* Metadata panel */}
      <div style={{
        width: 280,
        minWidth: 280,
        height: '100%',
        overflow: 'auto',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Status */}
        <div>
          <span className="overline">Status</span>
          <div style={{ marginTop: 8 }}>
            <span className={`tag tag-${article.status}`}>{article.status}</span>
          </div>
        </div>

        {/* Writing For — reminds Sondra (and the audience) who this is for */}
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <IconUsers size={14} stroke={1.5} color="var(--text-tertiary)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Writing For
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
              Non-technical founders under $50M revenue. Overwhelmed by AI hype, skeptical of vaporware, want relief not technology.
            </div>
          </div>
        </div>

        {/* Draft Critique Panel — voice, audience fit, structure, flow */}
        <DraftCritiquePanel article={article} />

        {/* SEO Critique Panel — strategic, search-performance adversarial review */}
        <SeoCritiquePanel article={article} />

        {/* SEO Panel — deterministic checks + editable fields */}
        <SeoPanel
          article={article}
          title={title}
          body={body}
          highlightKeywords={highlightKeywords}
          onToggleHighlight={setHighlightKeywords}
        />

        {/* LinkedIn Posts Panel — distribution layer, 5 post variants per article */}
        <LinkedInPostsPanel article={article} />

        {/* Research brief */}
        {article.researchBrief && (
          <div>
            <span className="overline">Research Brief</span>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p>{article.researchBrief.summary}</p>
              {article.researchBrief.keyFindings?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span className="overline" style={{ fontSize: 11 }}>Key Findings</span>
                  <ul style={{ marginTop: 4, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {article.researchBrief.keyFindings.map((f, i) => (
                      <li key={i} style={{ fontSize: 12 }}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {article.researchBrief.sources?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span className="overline" style={{ fontSize: 11 }}>Sources</span>
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {article.researchBrief.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div>
            <span className="overline">Tags</span>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {article.tags.map((t) => (
                <span key={t} className="tag" style={{ background: 'var(--surface-hover)' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Published URL */}
        {article.publishedUrl && (
          <div>
            <span className="overline">Published</span>
            <a href={article.publishedUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginTop: 8 }}>
              View on site <IconExternalLink size={12} stroke={1.5} />
            </a>
          </div>
        )}

        {/* Revision notes */}
        {article.revisionNotes && (
          <div style={{ padding: 12, background: '#ECD8DC20', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span className="overline" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Revision Notes</span>
            {article.revisionNotes}
          </div>
        )}

        {/* Image concept / alt text — helps Sondra understand what the objects mean */}
        {article.imageUrl && article.coverImageAlt && (
          <div>
            <span className="overline">Image Concept</span>
            <div style={{
              marginTop: 8, fontSize: 12, lineHeight: 1.5,
              color: 'var(--text-secondary)', fontStyle: 'italic',
              padding: '10px 12px', background: 'var(--bg)',
              borderRadius: 8, border: '1px solid var(--border)',
            }}>
              {article.coverImageAlt}
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {article.imageUrl && (
            <button className="btn btn-ghost btn-sm" onClick={handleRegenerateImage} disabled={regenerating} style={{ width: '100%' }}>
              {regenerating ? <><IconLoader2 size={14} className="spinner" /> Generating...</> : 'Regenerate Image'}
            </button>
          )}

          {article.status === 'review' && !published && (
            <>
              <button
                className="btn btn-primary"
                onClick={handlePublish}
                disabled={publishing}
                style={{ width: '100%', minHeight: 40 }}
              >
                {publishing ? <IconLoader2 size={16} className="spinner" /> : published ? <><IconCheck size={16} /> Published</> : 'Approve & Publish'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSendBack(!showSendBack)}
                style={{ width: '100%' }}
              >
                Send Back
              </button>
            </>
          )}

          {published && (
            <>
              <div className="btn btn-primary" style={{
                width: '100%',
                background: '#57726720',
                color: 'var(--success)',
                cursor: 'default',
                justifyContent: 'center',
                minHeight: 40,
              }}>
                <IconCheck size={16} /> Published
              </div>
              <button
                onClick={handleUnpublish}
                onMouseLeave={() => { if (confirmUnpublish && !unpublishing) setConfirmUnpublish(false); }}
                disabled={unpublishing}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${confirmUnpublish ? '#C25D42' : 'var(--border)'}`,
                  background: confirmUnpublish ? '#C25D4210' : 'transparent',
                  color: confirmUnpublish ? '#C25D42' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: unpublishing ? 'wait' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {unpublishing
                  ? <><IconLoader2 size={14} className="spinner" /> Unpublishing...</>
                  : confirmUnpublish
                    ? <>Click again to remove from site</>
                    : <><IconCloudOff size={14} stroke={1.5} /> Unpublish from site</>}
              </button>
            </>
          )}

          {showSendBack && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <textarea
                className="input"
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="What should be different?"
                rows={3}
                style={{ resize: 'vertical' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSendBack}
                disabled={!revisionNotes.trim() || sendingBack}
                style={{ width: '100%' }}
              >
                {sendingBack ? <IconLoader2 size={14} className="spinner" /> : 'Send Back to Drafting'}
              </button>
            </div>
          )}

          {/* Delete */}
          <button
            onClick={handleDeleteArticle}
            disabled={deletingArticle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              borderRadius: 8,
              background: confirmDeleteArticle ? '#fee2e2' : 'transparent',
              color: confirmDeleteArticle ? '#dc2626' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: deletingArticle ? 'wait' : 'pointer',
              transition: 'all 150ms',
            }}
          >
            <IconTrash size={14} stroke={1.5} />
            {deletingArticle
              ? 'Deleting...'
              : confirmDeleteArticle
                ? (published
                    ? 'Click again — note: this will NOT remove from your site'
                    : 'Click again to delete')
                : 'Delete from pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Renders text with keyword occurrences highlighted in a mark-like style.
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  const positions = useMemo(() => findKeywordPositions(text, keyword), [text, keyword]);

  if (positions.length === 0) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  positions.forEach((pos, i) => {
    if (pos.start > cursor) {
      parts.push(<span key={`t-${i}`}>{text.slice(cursor, pos.start)}</span>);
    }
    parts.push(
      <mark
        key={`m-${i}`}
        style={{
          background: '#D4A01735',
          color: 'inherit',
          padding: '0 2px',
          borderRadius: 3,
          fontWeight: 600,
          boxShadow: 'inset 0 -2px 0 #D4A017',
        }}
      >
        {text.slice(pos.start, pos.end)}
      </mark>
    );
    cursor = pos.end;
  });
  if (cursor < text.length) {
    parts.push(<span key="t-end">{text.slice(cursor)}</span>);
  }
  return <>{parts}</>;
}
