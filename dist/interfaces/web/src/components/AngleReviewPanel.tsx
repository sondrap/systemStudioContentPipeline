import { useState } from 'react';
import { IconCheck, IconLoader2, IconPencil, IconBook, IconListNumbers, IconLink } from '@tabler/icons-react';
import { Article } from '../api';

// Angle Review panel. Shown when an article's status is 'angle-review' — the
// pipeline paused after a re-research pass so Sondra can approve the new
// angle before drafting. The pipeline stays paused until she clicks Approve
// or Refine.
//
// Layout: a big card that fills the reading column. Three sections:
//   1. Angle notes she provided (the steering that drove the research)
//   2. Proposed outline (4-6 bullets of what the writer intends to do)
//   3. Research brief summary + source count
// Followed by two actions: Approve & Draft, or Refine with new notes.
export function AngleReviewPanel({
  article,
  onApprove,
  onRefine,
  approving,
  refining,
}: {
  article: Article;
  onApprove: (optionalAngleNotes?: string) => Promise<void>;
  onRefine: (newAngleNotes: string) => Promise<void>;
  approving: boolean;
  refining: boolean;
}) {
  const [showRefine, setShowRefine] = useState(false);
  const [refineNotes, setRefineNotes] = useState('');
  const outline = article.proposedOutline || [];
  const brief = article.researchBrief;
  const angleNotes = article.revisionNotes;

  const busy = approving || refining;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 32,
        marginBottom: 24,
        maxWidth: 780,
      }}
    >
      {/* Header — explains what the user is looking at and why it matters. */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(184, 146, 91, 0.15)',
            color: '#8A6B3D',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Awaiting your approval
        </div>
        <h2
          style={{
            fontFamily: "'Bespoke Serif', serif",
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1.25,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Does this angle work?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Research is complete. Before the writer invests in a full draft, review the proposed
          direction below. If it lands, approve it and drafting kicks off. If not, refine with
          new notes and research will run again.
        </p>
      </div>

      {/* Angle notes that steered this research pass */}
      {angleNotes && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeader icon={<IconPencil size={14} stroke={1.5} />} label="Angle you asked for" />
          <div
            style={{
              padding: 14,
              background: 'var(--bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {angleNotes}
          </div>
        </section>
      )}

      {/* Proposed outline — the meat of the review. 4-6 bullets describing
          the article the writer proposes to build from this research. */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeader icon={<IconListNumbers size={14} stroke={1.5} />} label="Proposed outline" />
        {outline.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Outline unavailable. Judge the angle from the research brief below.
          </div>
        ) : (
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {outline.map((bullet, i) => {
              // Split on first ":" so the section title is visually distinct
              // from the one-line description. Falls back gracefully if the
              // writer didn't use the colon pattern.
              const colonIndex = bullet.indexOf(':');
              const title = colonIndex > 0 ? bullet.substring(0, colonIndex).trim() : bullet;
              const desc = colonIndex > 0 ? bullet.substring(colonIndex + 1).trim() : '';
              return (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '2px 0',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {title}
                    </div>
                    {desc && (
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.55,
                          marginTop: 2,
                        }}
                      >
                        {desc}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Research brief summary + source list — so Sondra can gut-check what
          the writer will actually be working from. */}
      {brief && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeader icon={<IconBook size={14} stroke={1.5} />} label="Research brief" />
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-primary)',
              marginBottom: 14,
            }}
          >
            {brief.summary}
          </div>
          {brief.sources && brief.sources.length > 0 && (
            <details style={{ cursor: 'pointer' }}>
              <summary
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 0',
                  userSelect: 'none',
                }}
              >
                <IconLink size={12} stroke={1.5} />
                {brief.sources.length} source{brief.sources.length === 1 ? '' : 's'} found
              </summary>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '10px 0 0 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {brief.sources.slice(0, 10).map((src, i) => (
                  <li key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--deep-current)', textDecoration: 'underline' }}
                    >
                      {src.title || src.url}
                    </a>
                    {src.relevance && (
                      <span style={{ color: 'var(--text-secondary)' }}> — {src.relevance}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
        }}
      >
        {!showRefine ? (
          <>
            <button
              className="btn btn-primary"
              onClick={() => onApprove()}
              disabled={busy}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 16px',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {approving ? (
                <>
                  <IconLoader2 size={16} className="spinner" /> Kicking off drafting...
                </>
              ) : (
                <>
                  <IconCheck size={16} stroke={2} /> Approve angle & draft
                </>
              )}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowRefine(true)}
              disabled={busy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <IconPencil size={14} stroke={1.5} /> Refine the angle
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                What should be different?
              </label>
              <textarea
                value={refineNotes}
                onChange={(e) => setRefineNotes(e.target.value)}
                placeholder="e.g. I want it to focus more on the cost angle for founders, not the technical comparison. Find case studies of people who tried both approaches."
                rows={5}
                className="input"
                style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.55 }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Research will run again with these notes as steering. You'll come back here to
                approve the new angle before drafting starts.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  if (!refineNotes.trim()) return;
                  await onRefine(refineNotes.trim());
                }}
                disabled={!refineNotes.trim() || busy}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {refining ? (
                  <>
                    <IconLoader2 size={14} className="spinner" /> Re-researching...
                  </>
                ) : (
                  'Run research again'
                )}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowRefine(false);
                  setRefineNotes('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
      }}
    >
      {icon}
      {label}
    </div>
  );
}
