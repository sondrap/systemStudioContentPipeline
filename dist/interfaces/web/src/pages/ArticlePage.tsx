import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useStore } from '../store';
import { api, Article } from '../api';
import { IconArrowLeft, IconLoader2, IconCheck, IconExternalLink, IconPhoto, IconTrash, IconPencil, IconHighlight, IconUsers, IconEye, IconCode, IconCloudOff, IconCloudUpload, IconBrandLinkedin } from '@tabler/icons-react';
import { Streamdown } from 'streamdown';
import TextareaAutosize from 'react-textarea-autosize';
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
  const [republishing, setRepublishing] = useState(false);
  // Image concept editor state. When true, the Image Concept panel switches
  // from read-only display to editable form for objects + composition + alt
  // text. Submitting the form regenerates the image with the user's overrides
  // instead of using the AI concept picker.
  const [editingConcept, setEditingConcept] = useState(false);
  const [conceptObjects, setConceptObjects] = useState('');
  const [conceptComposition, setConceptComposition] = useState('');
  const [conceptAltText, setConceptAltText] = useState('');
  // Short-lived success toast that appears after a republish completes so
  // Sondra knows the re-POST went through (since 'Published' badge doesn't
  // change state between before/after republish).
  const [republishedAt, setRepublishedAt] = useState<number | null>(null);
  const [highlightKeywords, setHighlightKeywords] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  // Sidebar tab — splits the dense metadata column into two focused views
  // so Sondra doesn't have to scroll through 4000px of stacked panels.
  // 'edit' = article writing/review work (status, critiques, SEO, image, actions).
  // 'linkedin' = LinkedIn post variants, uses the full sidebar height.
  const [sidebarTab, setSidebarTab] = useState<'edit' | 'linkedin'>('edit');
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

  // Standard regenerate — AI picks the concept. Used by the "Regenerate
  // Image" button and the close of the custom concept editor.
  const handleRegenerateImage = async (customConcept?: {
    objects?: string[];
    composition?: string;
    altText?: string;
  }) => {
    if (!articleId || regenerating) return;
    setRegenerating(true);
    try {
      const { article: updated } = await api.regenerateImage({ id: articleId, customConcept });
      updateArticleLocal(articleId, {
        imageUrl: updated.imageUrl,
        coverImageAlt: updated.coverImageAlt,
        heroImageObjects: updated.heroImageObjects,
      });
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

  // Re-POST an already-published article to systemstudio.ai. Useful if the
  // article somehow disappeared from the live site, the site dev redeployed
  // and lost content, or the user just wants to push the latest version up.
  // The systemstudio.ai API is upsert-on-slug so re-POSTing is safe — it
  // updates the existing record or creates a new one.
  const handleRepublish = async () => {
    if (!articleId || republishing) return;
    setRepublishing(true);
    try {
      const { article: updated } = await api.publishArticle({ id: articleId });
      updateArticleLocal(articleId, updated);
      setRepublishedAt(Date.now());
      // Clear the success toast after a few seconds so it doesn't linger
      setTimeout(() => setRepublishedAt(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Republish failed. Check the logs for details.');
    } finally {
      setRepublishing(false);
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
              <button className="btn btn-ghost btn-sm" onClick={() => handleRegenerateImage()} disabled={regenerating}>
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
              <Streamdown
                // Streamdown defaults to showing a "Open external link?"
                // confirmation modal on every link click. Sondra's articles
                // are authored links (sources from her research, not user
                // input), so this friction is not needed. Disable it so
                // links just open in a new tab directly.
                linkSafety={{ enabled: false }}
              >{body}</Streamdown>
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
            <TextareaAutosize
              value={body}
              onChange={handleBodyChange}
              placeholder="Start writing, or wait for the AI to draft..."
              minRows={20}
              // TextareaAutosize measures scrollHeight on every value change
              // and sets the height to match, so word-wrapped long paragraphs
              // are fully visible. No manual \n counting or overflow clipping.
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
              }}
            />
          )}
        </div>
      </div>

      {/* Metadata panel */}
      <div style={{
        width: 320,
        minWidth: 320,
        height: '100%',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Tab header — sticky at the top so tab switching is always one
            click away regardless of scroll position in either tab. */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarTab('edit')}
            style={{
              flex: 1,
              padding: '14px 12px',
              border: 'none',
              background: 'transparent',
              color: sidebarTab === 'edit' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              borderBottom: sidebarTab === 'edit' ? '2px solid var(--deep-current, #365367)' : '2px solid transparent',
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <IconPencil size={13} stroke={1.8} />
            Edit
          </button>
          <button
            onClick={() => setSidebarTab('linkedin')}
            style={{
              flex: 1,
              padding: '14px 12px',
              border: 'none',
              background: 'transparent',
              color: sidebarTab === 'linkedin' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              borderBottom: sidebarTab === 'linkedin' ? '2px solid #0A66C2' : '2px solid transparent',
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <IconBrandLinkedin size={13} stroke={1.8} />
            LinkedIn
            {(article.linkedInPosts?.length || 0) > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                marginLeft: 2,
              }}>
                {article.linkedInPosts!.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content area — scrolls independently of the tab header */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
        {/* EDIT TAB — article-level work: status, critiques, SEO, image, actions */}
        {sidebarTab === 'edit' && <>
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

        {/* Draft Critique Panel — voice, audience fit, structure, flow.
            Accepts flushSave so the critique always runs against the
            latest body (not a stale debounced-save version). */}
        <DraftCritiquePanel article={article} flushSave={handleManualSave} />

        {/* SEO Critique Panel — strategic, search-performance adversarial review */}
        <SeoCritiquePanel article={article} flushSave={handleManualSave} />

        {/* SEO Panel — deterministic checks + editable fields */}
        <SeoPanel
          article={article}
          title={title}
          body={body}
          highlightKeywords={highlightKeywords}
          onToggleHighlight={setHighlightKeywords}
        />

        {/* LinkedIn Posts panel moved to the LinkedIn sidebar tab. */}

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

        {/* Image concept — read-only by default, editable on demand. The
            edit form lets Sondra override the AI's object selection and
            composition with her own taste-level choices before regenerating. */}
        {article.imageUrl && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="overline">Image Concept</span>
              {!editingConcept && (
                <button
                  onClick={() => {
                    // Pre-populate the form with current values so the user
                    // edits from where the article is, not a blank slate
                    setConceptObjects((article.heroImageObjects || []).join('\n'));
                    setConceptComposition('');
                    setConceptAltText(article.coverImageAlt || '');
                    setEditingConcept(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  title="Edit the image concept and regenerate with your specific direction"
                >
                  <IconPencil size={11} stroke={1.5} /> Edit
                </button>
              )}
            </div>

            {!editingConcept ? (
              <div style={{
                marginTop: 8, fontSize: 12, lineHeight: 1.5,
                color: 'var(--text-secondary)', fontStyle: 'italic',
                padding: '10px 12px', background: 'var(--bg)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                {article.coverImageAlt || 'No description set yet.'}
                {article.heroImageObjects && article.heroImageObjects.length > 0 && (
                  <div style={{
                    marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                    fontStyle: 'normal', fontSize: 11, color: 'var(--text-tertiary)',
                  }}>
                    <strong>Objects:</strong> {article.heroImageObjects.join(' · ')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                marginTop: 8,
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                    Objects (one per line)
                  </label>
                  <textarea
                    value={conceptObjects}
                    onChange={(e) => setConceptObjects(e.target.value)}
                    placeholder={'Glass vessel with pale liquid\nFolded handmade paper\nSingle brass key'}
                    rows={4}
                    style={{
                      width: '100%', padding: '6px 10px',
                      fontSize: 12, lineHeight: 1.5,
                      borderRadius: 6, border: '1px solid var(--border)',
                      background: 'white', color: 'var(--text-primary)',
                      outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    From the brand bank: ceramic sphere · river stones · glass cube · glass vessel · folded paper · linen rope · botanical stems · brass shapes · wooden blocks · brass key
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                    Composition (optional)
                  </label>
                  <textarea
                    value={conceptComposition}
                    onChange={(e) => setConceptComposition(e.target.value)}
                    placeholder={'Objects clustered tightly in the center, single key positioned slightly forward casting a long shadow.'}
                    rows={3}
                    style={{
                      width: '100%', padding: '6px 10px',
                      fontSize: 12, lineHeight: 1.5,
                      borderRadius: 6, border: '1px solid var(--border)',
                      background: 'white', color: 'var(--text-primary)',
                      outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                    Alt text (for accessibility + SEO)
                  </label>
                  <input
                    value={conceptAltText}
                    onChange={(e) => setConceptAltText(e.target.value)}
                    placeholder="A glass vessel, folded paper, and a brass key on warm linen."
                    style={{
                      width: '100%', padding: '6px 10px',
                      fontSize: 12, lineHeight: 1.5,
                      borderRadius: 6, border: '1px solid var(--border)',
                      background: 'white', color: 'var(--text-primary)',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      // Parse objects: one per line, trim whitespace, filter blanks
                      const objects = conceptObjects
                        .split('\n')
                        .map(l => l.trim())
                        .filter(l => l.length > 0);
                      if (objects.length === 0) {
                        alert('Add at least one object name.');
                        return;
                      }
                      setEditingConcept(false);
                      await handleRegenerateImage({
                        objects,
                        composition: conceptComposition || undefined,
                        altText: conceptAltText || undefined,
                      });
                    }}
                    disabled={regenerating}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--deep-current)',
                      background: 'var(--deep-current)',
                      color: 'white',
                      fontSize: 12, fontWeight: 600,
                      cursor: regenerating ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {regenerating
                      ? <><IconLoader2 size={12} className="spinner" /> Generating...</>
                      : <>Generate with these objects</>}
                  </button>
                  <button
                    onClick={() => setEditingConcept(false)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Always show the image button — label switches between "Generate"
              and "Regenerate" depending on whether an image exists yet. This
              catches the case where drafting failed to produce an image and
              the user has no way to trigger one otherwise. */}
          <button className="btn btn-ghost btn-sm" onClick={() => handleRegenerateImage()} disabled={regenerating} style={{ width: '100%' }}>
            {regenerating
              ? <><IconLoader2 size={14} className="spinner" /> Generating...</>
              : article.imageUrl ? 'Regenerate Image' : 'Generate Image'}
          </button>

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

              {/* Republish: re-POST to systemstudio.ai. Useful when the
                  article needs to be resent (site rebuild wiped data,
                  content was edited after publish, etc.). Safe — the API
                  is upsert-on-slug. */}
              <button
                onClick={handleRepublish}
                disabled={republishing || unpublishing}
                title="Push the current article to systemstudio.ai again. Safe — updates the existing post rather than duplicating."
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${republishedAt ? 'var(--accent)' : 'var(--deep-current)'}`,
                  background: republishedAt ? '#57726715' : 'transparent',
                  color: republishedAt ? 'var(--accent)' : 'var(--deep-current)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: republishing ? 'wait' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {republishing
                  ? <><IconLoader2 size={14} className="spinner" /> Republishing...</>
                  : republishedAt
                    ? <><IconCheck size={14} stroke={2} /> Re-sent to site</>
                    : <><IconCloudUpload size={14} stroke={1.5} /> Republish to site</>}
              </button>

              <button
                onClick={handleUnpublish}
                onMouseLeave={() => { if (confirmUnpublish && !unpublishing) setConfirmUnpublish(false); }}
                disabled={unpublishing || republishing}
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
        </>}
        {/* END EDIT TAB */}

        {/* LINKEDIN TAB — LinkedIn post variants get the full sidebar
            height, so the user sees multiple cards without scrolling
            through the article metadata. */}
        {sidebarTab === 'linkedin' && <>
          <LinkedInPostsPanel article={article} />
        </>}
        {/* END LINKEDIN TAB */}

        </div>
        {/* END TAB CONTENT AREA */}
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
