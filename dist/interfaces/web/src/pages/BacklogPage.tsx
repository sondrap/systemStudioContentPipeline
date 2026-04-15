import { useState } from 'react';
import { useStore } from '../store';
import { api, Topic } from '../api';
import { IconPlus, IconSearch, IconArchive, IconLoader2, IconDots, IconRocket, IconTrash } from '@tabler/icons-react';
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <IconPlus size={14} stroke={2} /> Add Topic
          </button>
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
                  <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Topic</button>
                  <button className="btn btn-ghost" onClick={() => navigate('/chat')}>Ask the Agent</button>
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
                  </div>
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

          {selectedTopic.priority === 'high' && (
            <span className="tag tag-review" style={{ alignSelf: 'flex-start' }}>High Priority</span>
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

          {selectedTopic.sourceUrls && selectedTopic.sourceUrls.length > 0 && (
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
          )}

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
