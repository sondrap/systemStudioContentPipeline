import { useState, useEffect, useRef } from 'react';
import {
  IconBrandLinkedin,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconRefresh,
  IconCopy,
  IconCheck,
  IconTrash,
  IconEdit,
  IconX,
  IconClipboardCheck,
  IconMessage,
  IconFlame,
  IconListNumbers,
  IconChartBar,
  IconHeartHandshake,
  IconArrowsMaximize,
  IconPhoto,
  IconDownload,
  IconWand,
} from '@tabler/icons-react';
import { Article, api } from '../api';
import { useStore } from '../store';
import { friendlyErrorMessage } from '../utils/errorMessages';

type LinkedInPost = NonNullable<Article['linkedInPosts']>[number];
type PostType = LinkedInPost['postType'];

// Each post type gets its own icon, color, and label. These anchor the user
// visually while scanning the list of variants.
const POST_TYPE_CONFIG: Record<PostType, { label: string; icon: typeof IconMessage; color: string }> = {
  'story': { label: 'Story', icon: IconMessage, color: '#365367' },
  'hot-take': { label: 'Hot Take', icon: IconFlame, color: '#C25D42' },
  'framework': { label: 'Framework', icon: IconListNumbers, color: '#577267' },
  'data': { label: 'Data', icon: IconChartBar, color: '#3d5a80' },
  'confession': { label: 'Confession', icon: IconHeartHandshake, color: '#8B5A6B' },
};

interface LinkedInPostsPanelProps {
  article: Article;
}

export function LinkedInPostsPanel({ article }: LinkedInPostsPanelProps) {
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const [expanded, setExpanded] = useState(true);
  const [generating, setGenerating] = useState(false);

  const posts = article.linkedInPosts || [];

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const result = await api.generateLinkedInPosts({ id: article.id });
      if (result.article.linkedInPosts) {
        updateArticleLocal(article.id, { linkedInPosts: result.article.linkedInPosts });
      }
    } catch (err) {
      console.error('LinkedIn generation failed:', err);
      alert(friendlyErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const postedCount = posts.filter(p => p.postedAt).length;

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
          background: '#0A66C215',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IconBrandLinkedin size={16} color="#0A66C2" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>LinkedIn Posts</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {posts.length === 0
              ? 'Not yet generated'
              : postedCount > 0
                ? `${posts.length} variants · ${postedCount} posted`
                : `${posts.length} variants ready`}
          </div>
        </div>
        {expanded ? <IconChevronUp size={16} color="var(--text-tertiary)" /> : <IconChevronDown size={16} color="var(--text-tertiary)" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {posts.length === 0 ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                Generate 5 LinkedIn post variants from this article — one of each type: story, hot-take, framework, data, and confession. Each fits the 2026 algorithm and your voice. Edit, regenerate, or copy directly to Typefully.
              </p>
              <button
                onClick={handleGenerateAll}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #0A66C2',
                  background: '#0A66C2',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {generating
                  ? <><IconLoader2 size={13} className="spinner" /> Generating variants... (~20-30s)</>
                  : <><IconBrandLinkedin size={13} /> Generate Posts</>}
              </button>
            </div>
          ) : (
            <>
              {/* Per-variant images now live inside each PostVariantCard
                  below. Each post gets its own custom social card (quote
                  card or stat card) generated programmatically with brand
                  fonts and colors. The article hero image is no longer
                  shown here since it serves a different purpose (blog
                  post + OG share preview, not LinkedIn social cards). */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {posts.map((post) => (
                  <PostVariantCard
                    key={post.id}
                    post={post}
                    articleId={article.id}
                  />
                ))}
              </div>

              {/* Regenerate all — dangerous, tucked in the footer */}
              <div style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Copy into Typefully or LinkedIn directly
                </div>
                <button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  title="Regenerate ALL variants — loses edits"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: generating ? 'wait' : 'pointer',
                    opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? <IconLoader2 size={11} className="spinner" /> : <IconRefresh size={11} />}
                  {generating ? 'Generating...' : 'Regenerate all'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PostVariantCard({ post, articleId }: { post: LinkedInPost; articleId: string }) {
  const updateArticleLocal = useStore((s) => s.updateArticleLocal);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(post.content);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Expanded modal view — gives Sondra a roomy fullscreen-ish editor for
  // long posts (1500+ chars) that are hard to read in the cramped card.
  const [expanded, setExpanded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Image regeneration state — separate from post regeneration so the user
  // can regenerate just the social card without rewriting the post.
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [editingImageText, setEditingImageText] = useState(false);
  // "Direct the AI" input — free-text guidance that steers the AI's quote
  // pick (e.g., "focus on the pricing angle", "pick something more
  // confessional"). Separate from Edit text, which is full manual override.
  const [showingDirection, setShowingDirection] = useState(false);
  const [directionDraft, setDirectionDraft] = useState('');
  // Local form state for image text edits before submitting
  const [imageTextDraft, setImageTextDraft] = useState(post.imageText || '');
  const [imageNumberDraft, setImageNumberDraft] = useState(post.imageNumber || '');
  const [imageLabelDraft, setImageLabelDraft] = useState(post.imageLabel || '');

  // Sync the local form state when the post's image fields change externally
  // (e.g., regeneration completes)
  useEffect(() => {
    setImageTextDraft(post.imageText || '');
    setImageNumberDraft(post.imageNumber || '');
    setImageLabelDraft(post.imageLabel || '');
  }, [post.imageText, post.imageNumber, post.imageLabel]);

  // Close the modal on Escape so it feels native
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // When the post data changes externally (e.g., regenerate), sync the draft
  useEffect(() => {
    if (!editing) setDraftContent(post.content);
  }, [post.content, editing]);

  const typeConfig = POST_TYPE_CONFIG[post.postType];
  const Icon = typeConfig.icon;

  // Character count color: green at ideal range, amber warning beyond targets
  const charCount = editing ? draftContent.length : post.characterCount;
  const charColor = charCount > 3000 ? '#C25D42' : charCount > 2000 ? '#C9932D' : charCount < 400 ? '#C9932D' : 'var(--text-tertiary)';

  // How much of the hook will be visible before the "See more" cutoff
  const hookPreview = (editing ? draftContent : post.content).slice(0, 210);
  const hasTruncation = (editing ? draftContent : post.content).length > 210;

  const handleSaveEdit = async (value: string) => {
    try {
      // Update local store optimistically
      const updatedPosts = (useStore.getState().articles.find(a => a.id === articleId)?.linkedInPosts || []).map(p =>
        p.id === post.id
          ? { ...p, content: value, characterCount: value.length, edited: true }
          : p
      );
      updateArticleLocal(articleId, { linkedInPosts: updatedPosts });

      await api.updateLinkedInPost({
        articleId,
        variantId: post.id,
        content: value,
      });
    } catch (err) {
      console.error('Edit save failed:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      // Auto-mark as "ready to post" on copy — user can still toggle later
      if (!post.postedAt) {
        // Just flag the copy event, don't mark as posted yet (user may be
        // copying to Typefully for scheduling, not posting immediately)
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Copy failed. Please select the text and copy manually.');
    }
  };

  const handleTogglePosted = async () => {
    const newPostedAt = post.postedAt ? null : Date.now();
    try {
      const updatedPosts = (useStore.getState().articles.find(a => a.id === articleId)?.linkedInPosts || []).map(p =>
        p.id === post.id
          ? { ...p, postedAt: newPostedAt === null ? undefined : newPostedAt }
          : p
      );
      updateArticleLocal(articleId, { linkedInPosts: updatedPosts });

      await api.updateLinkedInPost({
        articleId,
        variantId: post.id,
        postedAt: newPostedAt,
      });
    } catch (err) {
      console.error('Posted toggle failed:', err);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await api.regenerateLinkedInPost({ articleId, variantId: post.id });
      if (result.article.linkedInPosts) {
        updateArticleLocal(articleId, { linkedInPosts: result.article.linkedInPosts });
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
      alert(friendlyErrorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  // Regenerate ONLY the social card image, optionally with edited text.
  // The post content stays untouched. Used when the user wants a different
  // quote on the image without rewriting the post itself.
  const handleRegenerateImage = async (overrides?: {
    customText?: string;
    customNumber?: string;
    customLabel?: string;
    direction?: string;
  }) => {
    setRegeneratingImage(true);
    try {
      const result = await api.regenerateLinkedInImage({
        articleId,
        variantId: post.id,
        ...overrides,
      });
      if (result.article.linkedInPosts) {
        updateArticleLocal(articleId, { linkedInPosts: result.article.linkedInPosts });
      }
      setEditingImageText(false);
      // Clear the direction input after a successful AI-directed regen so
      // the next click is a fresh prompt, not a re-run of old instructions
      setDirectionDraft('');
      setShowingDirection(false);
    } catch (err) {
      console.error('Image regenerate failed:', err);
      alert(friendlyErrorMessage(err));
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      const updatedPosts = (useStore.getState().articles.find(a => a.id === articleId)?.linkedInPosts || [])
        .filter(p => p.id !== post.id);
      updateArticleLocal(articleId, { linkedInPosts: updatedPosts });

      await api.updateLinkedInPost({
        articleId,
        variantId: post.id,
        delete: true,
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Save on blur with debounce in case user keeps typing
  const handleContentChange = (value: string) => {
    setDraftContent(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => handleSaveEdit(value), 1500);
  };

  return (
    <>
    <div style={{
      borderRadius: 10,
      border: `1px solid ${post.postedAt ? '#57726740' : 'var(--border)'}`,
      background: post.postedAt ? '#57726705' : 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* Type + status row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        background: typeConfig.color + '08',
      }}>
        <Icon size={13} stroke={2} color={typeConfig.color} />
        <span style={{ fontSize: 11, fontWeight: 600, color: typeConfig.color, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {typeConfig.label}
        </span>
        {post.edited && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>edited</span>
        )}
        {post.postedAt && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--success)',
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <IconCheck size={10} stroke={3} /> Posted
          </span>
        )}
        {!post.postedAt && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: charColor }}>
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* Content — either preview or textarea */}
      {editing ? (
        <textarea
          value={draftContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            handleSaveEdit(draftContent);
            setEditing(false);
          }}
          autoFocus
          style={{
            width: '100%',
            minHeight: 240,
            padding: '10px 12px',
            border: 'none',
            background: 'white',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            resize: 'vertical',
            outline: 'none',
            fontFamily: "'Satoshi', sans-serif",
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{
            padding: '10px 12px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            cursor: 'text',
            minHeight: 80,
          }}
        >
          {/* First 210 chars highlighted as the "hook" (above-the-fold on LinkedIn) */}
          <span style={{
            background: hasTruncation ? 'rgba(10, 102, 194, 0.06)' : 'transparent',
            borderRadius: 3,
            padding: hasTruncation ? '0 2px' : 0,
            margin: hasTruncation ? '0 -2px' : 0,
          }}>
            {hookPreview}
          </span>
          {hasTruncation && (
            <>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500, marginLeft: 4 }}>
                │ see more ↓
              </span>
              {post.content.slice(210)}
            </>
          )}
        </div>
      )}

      {/* Social card image preview — quote card or stat card.
          Always present (after first generation) and editable. */}
      {post.imageUrl && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(247, 244, 242, 0.5)',  // soft Linen tint
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {/* Image label + edit toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconPhoto size={11} stroke={1.8} />
              {post.imageType === 'stat' ? 'Stat Card' : 'Quote Card'}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, opacity: 0.7 }}>· 1080×1080</span>
            </span>
            {!editingImageText && (
              <button
                onClick={() => setEditingImageText(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <IconEdit size={10} stroke={1.5} />
                Edit text
              </button>
            )}
          </div>

          {/* Image thumbnail (clickable to open full size in new tab) */}
          <a
            href={post.imageUrl}
            target="_blank"
            rel="noopener"
            style={{ display: 'block', borderRadius: 6, overflow: 'hidden', position: 'relative' }}
            title="Click to open full-size image in new tab"
          >
            <img
              src={`${post.imageUrl}?w=600&dpr=2&fm=webp`}
              alt={post.imageText || ''}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                display: 'block',
                background: '#F7F4F2',
              }}
            />
            {regeneratingImage && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(247, 244, 242, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--deep-current, #365367)',
                fontSize: 12,
                fontWeight: 600,
              }}>
                <IconLoader2 size={14} className="spinner" />
                Regenerating image...
              </div>
            )}
          </a>

          {/* Edit text form (collapsed by default) */}
          {editingImageText && (
            <div style={{
              padding: 10,
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {post.imageType === 'stat' ? (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
                      Headline number
                    </label>
                    <input
                      value={imageNumberDraft}
                      onChange={(e) => setImageNumberDraft(e.target.value)}
                      placeholder="73%"
                      style={{
                        width: '100%', padding: '5px 8px',
                        fontSize: 12, borderRadius: 4,
                        border: '1px solid var(--border)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
                      Label (one short line)
                    </label>
                    <textarea
                      value={imageLabelDraft}
                      onChange={(e) => setImageLabelDraft(e.target.value)}
                      placeholder="of B2B buyers research online before any purchase decision"
                      rows={2}
                      style={{
                        width: '100%', padding: '5px 8px',
                        fontSize: 12, lineHeight: 1.4, borderRadius: 4,
                        border: '1px solid var(--border)',
                        outline: 'none', fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
                    Quote text
                  </label>
                  <textarea
                    value={imageTextDraft}
                    onChange={(e) => setImageTextDraft(e.target.value)}
                    placeholder="The single line that should appear as the quote on the card"
                    rows={3}
                    style={{
                      width: '100%', padding: '5px 8px',
                      fontSize: 12, lineHeight: 1.4, borderRadius: 4,
                      border: '1px solid var(--border)',
                      outline: 'none', fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    Keep it under ~220 characters. Shorter quotes look more impactful.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    if (post.imageType === 'stat') {
                      handleRegenerateImage({
                        customNumber: imageNumberDraft.trim(),
                        customLabel: imageLabelDraft.trim(),
                      });
                    } else {
                      handleRegenerateImage({ customText: imageTextDraft.trim() });
                    }
                  }}
                  disabled={regeneratingImage}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: '1px solid var(--deep-current, #365367)',
                    background: 'var(--deep-current, #365367)',
                    color: 'white',
                    fontSize: 11, fontWeight: 600,
                    cursor: regeneratingImage ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {regeneratingImage
                    ? <><IconLoader2 size={11} className="spinner" /> Generating...</>
                    : 'Regenerate image'}
                </button>
                <button
                  onClick={() => {
                    setEditingImageText(false);
                    // Reset to original values
                    setImageTextDraft(post.imageText || '');
                    setImageNumberDraft(post.imageNumber || '');
                    setImageLabelDraft(post.imageLabel || '');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Quick actions row: Regen (cycles through candidates), Direct
              the AI (steer the pick with free-text guidance), Download.
              Hidden when Edit text form is open to reduce clutter. */}
          {!editingImageText && !showingDirection && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleRegenerateImage()}
                disabled={regeneratingImage}
                title="Pick a different quote from the article"
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 500,
                  cursor: regeneratingImage ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {regeneratingImage ? <IconLoader2 size={11} className="spinner" /> : <IconRefresh size={11} />}
                Regen
              </button>
              <button
                onClick={() => setShowingDirection(true)}
                disabled={regeneratingImage}
                title="Tell the AI what kind of quote to pick"
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 500,
                  cursor: regeneratingImage ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                <IconWand size={11} />
                Direct AI
              </button>
              <a
                href={post.imageUrl}
                target="_blank"
                rel="noopener"
                download
                title="Download full-size image"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '5px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <IconDownload size={11} />
              </a>
            </div>
          )}

          {/* Direct the AI form — appears when the Direct AI button is
              clicked. User types free-text direction, AI re-picks a
              verbatim quote from the article body guided by that input. */}
          {showingDirection && !editingImageText && (
            <div style={{
              padding: 10,
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3 }}>
                  Tell the AI what to pick
                </label>
                <textarea
                  value={directionDraft}
                  onChange={(e) => setDirectionDraft(e.target.value)}
                  placeholder={'Focus on the pricing angle. Pick something more confessional than a data point.'}
                  rows={3}
                  autoFocus
                  style={{
                    width: '100%', padding: '6px 8px',
                    fontSize: 12, lineHeight: 1.4, borderRadius: 4,
                    border: '1px solid var(--border)',
                    outline: 'none', fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  The AI will pick a verbatim line from your article body matching your direction. Edit text directly if you want exact control.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    if (!directionDraft.trim()) return;
                    handleRegenerateImage({ direction: directionDraft.trim() });
                  }}
                  disabled={regeneratingImage || !directionDraft.trim()}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: '1px solid var(--deep-current, #365367)',
                    background: directionDraft.trim() ? 'var(--deep-current, #365367)' : 'var(--surface-hover)',
                    color: directionDraft.trim() ? 'white' : 'var(--text-tertiary)',
                    fontSize: 11, fontWeight: 600,
                    cursor: regeneratingImage ? 'wait' : (directionDraft.trim() ? 'pointer' : 'default'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {regeneratingImage
                    ? <><IconLoader2 size={11} className="spinner" /> Picking...</>
                    : <><IconWand size={11} /> Pick with this direction</>}
                </button>
                <button
                  onClick={() => {
                    setShowingDirection(false);
                    setDirectionDraft('');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 5,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 500,
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

      {/* Show "Generate image" button when post exists but image hasn't
          been generated yet (e.g., older posts created before the image
          system existed). */}
      {!post.imageUrl && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(247, 244, 242, 0.5)',
        }}>
          <button
            onClick={() => handleRegenerateImage()}
            disabled={regeneratingImage}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px dashed var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
              cursor: regeneratingImage ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {regeneratingImage
              ? <><IconLoader2 size={12} className="spinner" /> Generating image...</>
              : <><IconPhoto size={12} stroke={1.8} /> Generate {post.postType === 'data' ? 'stat' : 'quote'} card image</>}
          </button>
        </div>
      )}

      {/* Actions row */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 10px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <button
          onClick={handleCopy}
          title="Copy post text to clipboard (then paste into Typefully or LinkedIn)"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px',
            borderRadius: 6,
            border: copied ? '1px solid var(--accent)' : '1px solid var(--deep-current)',
            background: copied ? '#57726715' : 'var(--deep-current)',
            color: copied ? 'var(--accent)' : 'white',
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          {copied ? <><IconClipboardCheck size={11} /> Copied</> : <><IconCopy size={11} /> Copy</>}
        </button>

        <button
          onClick={() => setEditing(!editing)}
          title={editing ? 'Finish editing' : 'Edit this variant'}
          style={actionButtonStyle}
        >
          {editing ? <><IconX size={11} /> Done</> : <><IconEdit size={11} /> Edit</>}
        </button>

        <button
          onClick={() => setExpanded(true)}
          title="Open in a larger window — easier to read and edit long posts"
          style={actionButtonStyle}
        >
          <IconArrowsMaximize size={11} />
          Expand
        </button>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          title="Regenerate this variant with a different angle"
          style={actionButtonStyle}
        >
          {regenerating ? <IconLoader2 size={11} className="spinner" /> : <IconRefresh size={11} />}
          {regenerating ? '' : 'Regen'}
        </button>

        <button
          onClick={handleTogglePosted}
          title={post.postedAt ? 'Unmark as posted' : 'Mark this as posted (tracking only)'}
          style={{
            ...actionButtonStyle,
            borderColor: post.postedAt ? 'var(--accent)' : 'var(--border)',
            color: post.postedAt ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <IconCheck size={11} /> {post.postedAt ? 'Posted' : 'Mark posted'}
        </button>

        <button
          onClick={handleDelete}
          title={confirmDelete ? 'Click again to delete' : 'Delete this variant'}
          style={{
            ...actionButtonStyle,
            marginLeft: 'auto',
            borderColor: confirmDelete ? '#C25D42' : 'var(--border)',
            color: confirmDelete ? '#C25D42' : 'var(--text-tertiary)',
          }}
        >
          <IconTrash size={11} />
        </button>
      </div>
    </div>

    {/* Fullscreen expand modal — same edit/copy/regen actions as the card,
        just with much more room. Closes on backdrop click or Escape key. */}
    {expanded && (
      <ExpandedPostModal
        post={post}
        articleId={articleId}
        draftContent={draftContent}
        onChange={(value) => {
          setDraftContent(value);
          setEditing(true);
          // Same debounced save as the inline editor
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => handleSaveEdit(value), 1500);
        }}
        onCopy={handleCopy}
        copied={copied}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
        onTogglePosted={handleTogglePosted}
        onClose={() => {
          // Flush any pending save before closing
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            handleSaveEdit(draftContent);
          }
          setExpanded(false);
        }}
      />
    )}
    </>
  );
}

// Fullscreen modal view of a single LinkedIn post variant. Roomy editor for
// long-form posts that are hard to read in the cramped sidebar card. Shares
// all action handlers with the parent card so edits, copies, regens, and
// posted-status toggles all flow through the same code paths.
function ExpandedPostModal({
  post,
  articleId,
  draftContent,
  onChange,
  onCopy,
  copied,
  onRegenerate,
  regenerating,
  onTogglePosted,
  onClose,
}: {
  post: LinkedInPost;
  articleId: string;
  draftContent: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  copied: boolean;
  onRegenerate: () => void;
  regenerating: boolean;
  onTogglePosted: () => void;
  onClose: () => void;
}) {
  const typeConfig = POST_TYPE_CONFIG[post.postType];
  const Icon = typeConfig.icon;
  const charCount = draftContent.length;
  const charColor = charCount > 3000 ? '#C25D42' : charCount > 2000 ? '#C9932D' : charCount < 400 ? '#C9932D' : 'var(--text-tertiary)';

  // Quiet `articleId` unused warning — it's part of the prop contract for
  // future enhancement (e.g., passing through to a regenerate-with-context
  // call) but not needed for current rendering.
  void articleId;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 20, 20, 0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 24px',
        overflow: 'auto',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          maxWidth: 720,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header — type label, character count, close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: typeConfig.color + '08',
        }}>
          <Icon size={16} stroke={2} color={typeConfig.color} />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: typeConfig.color,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {typeConfig.label} Post
          </span>
          {post.edited && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>edited</span>
          )}
          {post.postedAt && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--success)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <IconCheck size={11} stroke={3} /> Posted
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: charColor, fontWeight: 500 }}>
            {charCount.toLocaleString()} characters
          </span>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        {/* Body — full-size textarea, plenty of room */}
        <div style={{ padding: 20 }}>
          {/* Hook indicator: anything under the 210-char fold gets a subtle
              tint so Sondra can see where LinkedIn cuts off the preview. */}
          {draftContent.length > 210 && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginBottom: 8,
              fontStyle: 'italic',
            }}>
              First {Math.min(210, draftContent.length)} characters show in the LinkedIn feed before "see more". The rest expands when readers click.
            </div>
          )}

          <textarea
            value={draftContent}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              minHeight: 380,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'white',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'var(--text-primary)',
              resize: 'vertical',
              outline: 'none',
              fontFamily: "'Satoshi', sans-serif",
            }}
          />
        </div>

        {/* Action footer */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <button
            onClick={onCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: copied ? '1px solid var(--accent)' : '1px solid var(--deep-current)',
              background: copied ? '#57726715' : 'var(--deep-current)',
              color: copied ? 'var(--accent)' : 'white',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {copied ? <><IconClipboardCheck size={14} /> Copied to clipboard</> : <><IconCopy size={14} /> Copy to clipboard</>}
          </button>

          <button
            onClick={onRegenerate}
            disabled={regenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
              cursor: regenerating ? 'wait' : 'pointer',
            }}
          >
            {regenerating ? <IconLoader2 size={13} className="spinner" /> : <IconRefresh size={13} />}
            {regenerating ? 'Regenerating...' : 'Regenerate with different angle'}
          </button>

          <button
            onClick={onTogglePosted}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: post.postedAt ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: post.postedAt ? '#57726715' : 'transparent',
              color: post.postedAt ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <IconCheck size={13} />
            {post.postedAt ? 'Posted' : 'Mark posted'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared style for small action buttons in the post card footer
const actionButtonStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 4,
  padding: '5px 8px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer' as const,
  transition: 'all 150ms',
};
