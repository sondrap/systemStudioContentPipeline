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
} from '@tabler/icons-react';
import { Article, api } from '../api';
import { useStore } from '../store';

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
      alert('LinkedIn post generation failed. Try again.');
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      alert(`Regeneration failed: ${(err as Error).message || 'Try again'}`);
    } finally {
      setRegenerating(false);
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
