import { useState } from 'react';
import { useStore } from '../store';
import { api, Topic } from '../api';
import { IconPlus, IconSearch, IconArchive, IconLoader2, IconDots, IconRocket, IconTrash, IconRadar2, IconRefresh, IconTrendingUp, IconKey, IconBolt, IconSend } from '@tabler/icons-react';
import { useLocation } from 'wouter';

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function BacklogPage() {
  const allTopics = useStore((s) => s.topics);
  const addTopic = useStore((s) => s.addTopic);
  const removeTopic = useStore((s) => s.removeTopic);
  const updateTopicLocal = useStore((s) => s.updateTopicLocal);
  const addArticle = useStore((s) => s.addArticle);
  const loading = useStore((s) => s.loading);
  const [, navigate] = useLocation();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high'>('normal');
  const [adding, setAdding] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [startingResearch, setStartingResearch] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Filter to backlog topics and sort
  const topics = allTopics
    .filter((t) => t.status === 'backlog')
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
      return b.created_at - a.created_at;
    });

  const filtered = topics.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const { topic } = await api.createTopic({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
      });
      addTopic(topic);
      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('normal');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleStartResearch = async (topic: Topic) => {
    setStartingResearch(topic.id);
    try {
      const { article } = await api.startArticle({ topicId: topic.id });
      addArticle(article);
      updateTopicLocal(topic.id, { status: 'in-pipeline', articleId: article.id });
      setSelectedTopic(null);
      navigate('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStartingResearch(null);
    }
  };

  const handleDelete = async (topicId: string) => {
    setDeleting(topicId);
    try {
      await api.deleteTopic({ id: topicId });
      removeTopic(topicId);
      if (selectedTopic?.id === topicId) setSelectedTopic(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const loadData = useStore((s) => s.loadData);

  const handleRefreshTopic = async (topicId: string) => {
    if (refreshing) return;
    setRefreshing(topicId);
    try {
      const { topic: updated } = await api.refreshTopic({ topicId });
      updateTopicLocal(topicId, updated);
      setSelectedTopic(updated as Topic);
    } catch (err: any) {
      alert(err.message || 'Could not refresh topic.');
    } finally {
      setRefreshing(null);
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    const topicCountBefore = allTopics.filter(t => t.status === 'backlog').length;
    try {
      await api.scanTopics();
      // Poll for new topics every 5 seconds (scan takes 2-4 minutes)
      const pollInterval = setInterval(async () => {
        await loadData();
        const currentCount = useStore.getState().topics.filter(t => t.status === 'backlog').length;
        if (currentCount > topicCountBefore) {
          // New topics arrived
          clearInterval(pollInterval);
          setScanning(false);
        }
      }, 5000);
      // Stop polling after 5 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        setScanning(false);
      }, 300000);
    } catch (err: any) {
      alert(err.message || 'Topic scan failed.');
      setScanning(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, flex: 1 }}>Topic Backlog</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '6px 14px',
            width: 220,
          }}>
            <IconSearch size={14} stroke={1.5} color="var(--text-secondary)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, flex: 1, color: 'var(--text-primary)' }}
            />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleScan}
            disabled={scanning}
            title="Scan the web for trending topics"
          >
            {scanning ? <IconLoader2 size={14} className="spinner" /> : <IconRadar2 size={14} stroke={1.5} />}
            {scanning ? 'Scanning the web...' : 'Scan for Topics'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <IconPlus size={14} stroke={2} /> Add Topic
          </button>
        </div>

        {/* Quick Capture — paste a URL or a sentence, pipeline researches and frames it */}
        <div style={{ padding: '0 24px 16px' }}>
          <QuickCapture onCaptured={(topic) => {
            // Optimistically add the new topic to the top of the list
            addTopic(topic);
          }} />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '1.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IconArchive size={24} stroke={1.5} color="var(--text-secondary)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 500 }}>No topics yet</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 380 }}>
                  Add one manually, or ask the agent what's worth writing about this week.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
                    {scanning ? <><IconLoader2 size={14} className="spinner" /> Scanning...</> : 'Scan for Topics'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowAddModal(true)}>Add Manually</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 8px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                    background: selectedTopic?.id === topic.id ? 'var(--surface)' : 'transparent',
                    borderRadius: selectedTopic?.id === topic.id ? 8 : 0,
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: topic.priority === 'high' ? 'var(--deep-current)' : 'var(--text-tertiary)',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topic.title}
                      </span>
                      {topic.suggestedBy === 'agent' && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', flexShrink: 0 }}>Suggested</span>
                      )}
                    </div>
                    {topic.suggestedKeyword && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 11, color: 'var(--text-tertiary)' }}>
                        <IconKey size={10} stroke={1.5} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.suggestedKeyword}</span>
                      </div>
                    )}
                  </div>
                  {topic.seoOpportunity && <SeoOpportunityBadge level={topic.seoOpportunity} />}
                  <span className="overline" style={{ flexShrink: 0, fontSize: 11 }}>{formatDate(topic.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedTopic && (
        <div style={{
          width: 320,
          minWidth: 320,
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          padding: 20,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.3 }}>{selectedTopic.title}</h3>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selectedTopic.priority === 'high' && (
              <span className="tag tag-review">High Priority</span>
            )}
            {selectedTopic.seoOpportunity && (
              <SeoOpportunityBadge level={selectedTopic.seoOpportunity} detailed />
            )}
          </div>

          {selectedTopic.suggestedKeyword && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <IconKey size={12} stroke={1.5} /> Suggested Keyword
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedTopic.suggestedKeyword}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Starting keyword target. The AI will refine it during drafting.
              </div>
            </div>
          )}

          {selectedTopic.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedTopic.description}</p>
          )}

          {selectedTopic.reasoning && (
            <div style={{ padding: 12, background: 'var(--surface-hover)', borderRadius: 8 }}>
              <span className="overline" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Why This Topic</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedTopic.reasoning}</p>
            </div>
          )}

          {/* Rich sources with dates */}
          {selectedTopic.sources && selectedTopic.sources.length > 0 ? (
            <div>
              <span className="overline">Sources</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedTopic.sources.map((source, i) => (
                  <a key={i} href={source.url} target="_blank" rel="noopener" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3 }}>{source.title || new URL(source.url).hostname}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {source.date ? `${source.date} · ` : ''}{new URL(source.url).hostname}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : selectedTopic.sourceUrls && selectedTopic.sourceUrls.length > 0 ? (
            <div>
              <span className="overline">Sources</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedTopic.sourceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    {new URL(url).hostname}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => handleStartResearch(selectedTopic)}
              disabled={startingResearch === selectedTopic.id}
              style={{ width: '100%' }}
            >
              {startingResearch === selectedTopic.id ? <IconLoader2 size={14} className="spinner" /> : <IconRocket size={14} stroke={1.5} />}
              Start Research
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleRefreshTopic(selectedTopic.id)}
              disabled={refreshing === selectedTopic.id}
              style={{ width: '100%' }}
            >
              {refreshing === selectedTopic.id ? <><IconLoader2 size={14} className="spinner" /> Finding recent sources...</> : <><IconRefresh size={14} stroke={1.5} /> Find Recent Sources</>}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(selectedTopic.id)}
              disabled={deleting === selectedTopic.id}
              style={{ width: '100%' }}
            >
              {deleting === selectedTopic.id ? <IconLoader2 size={14} className="spinner" /> : <IconTrash size={14} stroke={1.5} />}
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Add topic modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            width: 440,
            maxWidth: '90vw',
            background: 'var(--surface)',
            borderRadius: 16,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 500 }}>Add Topic</h3>
            <div>
              <label className="overline" style={{ display: 'block', marginBottom: 6 }}>Title</label>
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Article topic" autoFocus />
            </div>
            <div>
              <label className="overline" style={{ display: 'block', marginBottom: 6 }}>Description (optional)</label>
              <textarea className="input" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What angle makes this interesting?" rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="overline" style={{ display: 'block', marginBottom: 6 }}>Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['normal', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`btn btn-sm ${newPriority === p ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={!newTitle.trim() || adding}>
                {adding ? <IconLoader2 size={14} className="spinner" /> : 'Add Topic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeoOpportunityBadge({ level, detailed }: { level: 'high' | 'moderate' | 'low'; detailed?: boolean }) {
  const config = {
    high: { label: 'High SEO', color: 'var(--accent)', bg: '#57726720' },
    moderate: { label: 'Moderate SEO', color: '#D4A017', bg: '#D4A01720' },
    low: { label: 'Low SEO', color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' },
  }[level];

  if (detailed) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 4,
        fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
        background: config.bg, color: config.color,
      }}>
        <IconTrendingUp size={11} stroke={2} />
        {config.label}
      </span>
    );
  }

  // Compact (list row) version: just a colored pill with short label
  return (
    <span style={{
      flexShrink: 0,
      padding: '2px 7px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: config.bg, color: config.color,
    }}>
      {level === 'high' ? 'SEO↑' : level === 'moderate' ? 'SEO~' : 'SEO↓'}
    </span>
  );
}

// Quick Capture — lightweight input for pasting a URL or a sentence. The
// pipeline researches it, frames it for the ICP, and drops a fully-prepared
// topic in the backlog. Complement to the deliberate "Add Topic" form.
function QuickCapture({ onCaptured }: { onCaptured: (topic: Topic) => void }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!value.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { topic } = await api.captureQuickTopic({ rawInput: value.trim() });
      onCaptured(topic);
      setValue('');
    } catch (err: any) {
      setError(err?.message || 'Capture failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--surface)',
        transition: 'border-color 150ms',
      }}>
        <IconBolt size={14} stroke={1.8} color="var(--accent)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={loading}
          placeholder="Heard something? Paste a URL or a sentence and I'll research + frame it for your audience."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--text-primary)',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            background: value.trim() && !loading ? 'var(--deep-current, #365367)' : 'var(--surface-hover)',
            color: value.trim() && !loading ? 'white' : 'var(--text-tertiary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: value.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 150ms',
          }}
        >
          {loading
            ? <><IconLoader2 size={12} className="spinner" /> Capturing...</>
            : <><IconSend size={12} stroke={2} /> Capture</>}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#C25D42', marginTop: 6, paddingLeft: 4 }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, paddingLeft: 4, fontStyle: 'italic' }}>
          Researching and framing for your audience. Usually takes 10-20 seconds.
        </div>
      )}
    </div>
  );
}
