import { useState, useRef, useEffect, useCallback } from 'react';
import { createAgentChatClient } from '@mindstudio-ai/interface';
import { IconArrowUp, IconLoader2, IconMessageCircle, IconSquare } from '@tabler/icons-react';
import TextareaAutosize from 'react-textarea-autosize';

const chat = createAgentChatClient();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function ChatPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const { threads: list } = await chat.listThreads();
      setThreads(list || []);
      // Auto-select most recent thread
      if (list?.length > 0) {
        selectThread(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const selectThread = async (threadId: string) => {
    setActiveThreadId(threadId);
    try {
      const thread = await chat.getThread(threadId);
      // message.content is a plain string in the Interface SDK, not an array
      // of content blocks. The previous code tried to read m.content[0].text
      // which worked against a different content shape and blanked every
      // message when the shape turned out to be a string (reading char 0 of
      // the string then .text on a single char = undefined).
      const msgs: Message[] = (thread.messages || []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      }));
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  };

  const createNewThread = async () => {
    try {
      const thread = await chat.createThread();
      setThreads((prev) => [thread, ...prev]);
      setActiveThreadId(thread.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
  };

  // Auto-scroll behavior
  const scrollToBottom = useCallback(() => {
    if (isAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Create thread if needed
    let threadId = activeThreadId;
    if (!threadId) {
      const thread = await chat.createThread();
      setThreads((prev) => [thread, ...prev]);
      threadId = thread.id;
      setActiveThreadId(threadId);
    }

    // Add user message optimistically
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setStreaming(true);

    // Add empty assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const response = chat.sendMessage(threadId, text, {
        onText: (delta) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
            }
            return prev;
          });
        },
        onError: (err) => {
          console.error('Stream error:', err);
        },
      });

      abortRef.current = response;
      await response;

      // Finalize streaming message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return prev;
      });

      // Refresh thread list for title updates
      loadThreads();
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortRef.current?.abort) {
      abortRef.current.abort();
    }
  };

  const STARTER_PROMPTS = [
    'What should I write about this week?',
    'Research a topic for me',
    'What\'s in my pipeline?',
  ];

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar: thread list */}
      <div style={{
        width: 240,
        minWidth: 240,
        height: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          <button className="btn btn-primary btn-sm" onClick={createNewThread} style={{ width: '100%' }}>
            New Conversation
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => selectThread(t.id)}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: 13,
                color: t.id === activeThreadId ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: t.id === activeThreadId ? 'var(--surface-hover)' : 'transparent',
                borderRadius: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'all 150ms',
                margin: '0 8px',
                display: 'block',
              }}
            >
              {t.title || 'New conversation'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflow: 'auto', padding: '24px 0' }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
            {isEmpty && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 16,
                textAlign: 'center',
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '1.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IconMessageCircle size={24} stroke={1.5} color="var(--text-secondary)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 500 }}>Start a conversation</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.6 }}>
                  Brainstorm topics, request research, or ask for a draft. The agent writes in your voice.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); }}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: 20,
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        transition: 'all 150ms',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-active)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 16,
                }}
              >
                <div style={{
                  maxWidth: msg.role === 'user' ? '70%' : '85%',
                  padding: msg.role === 'user' ? '10px 14px' : '0',
                  background: msg.role === 'user' ? 'var(--surface)' : 'transparent',
                  border: msg.role === 'user' ? '1px solid var(--border)' : 'none',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : 0,
                  fontFamily: msg.role === 'user' ? "'Satoshi', sans-serif" : "'Bespoke Serif', serif",
                  fontSize: msg.role === 'user' ? 15 : 16,
                  lineHeight: msg.role === 'user' ? 1.5 : 1.65,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content || (msg.streaming && (
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.4, animation: 'typingPulse 1.2s ease-in-out infinite' }} />
                      <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.4, animation: 'typingPulse 1.2s ease-in-out 0.2s infinite' }} />
                      <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.4, animation: 'typingPulse 1.2s ease-in-out 0.4s infinite' }} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <style>{`
          @keyframes typingPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }
        `}</style>

        {/* Input bar */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Brainstorm a topic, ask for research, or outline an article..."
              minRows={1}
              maxRows={6}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'none',
                color: 'var(--text-primary)',
              }}
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconSquare size={14} fill="white" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: input.trim() ? 'var(--accent)' : 'var(--border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 150ms',
                }}
              >
                <IconArrowUp size={18} stroke={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
