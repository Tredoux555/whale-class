// components/montree/photo-audit/ThisIsSheet.tsx
//
// Full-screen bottom sheet that replaces the Fix + Accept + AcceptDraftModal
// tangle on the Photo Audit page. One card button "This is…" opens this
// sheet, the teacher answers the question ONCE via one of three paths,
// the photo leaves the queue. End.
//
// Three resolution paths — all end in `teacher_confirmed=true` server-side:
//
//   A. existing    — teacher picks a curriculum work from search / recents
//   B. new_custom  — teacher types a new name, picks an area, photo attaches
//                    to a freshly-created custom work. Sonnet enrichment
//                    runs fire-and-forget in the background.
//   C. confirm_ai  — teacher taps the "AI thinks X" chip when the draft is
//                    already correct. One tap, done.
//
// The parent (photo-audit/page.tsx) owns the server call — this component
// just collects a `Resolution` and hands it back via `onResolve`.

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useClassroomWorks, ClassroomWork } from '@/lib/montree/hooks/useClassroomWorks';

const AREAS: Array<{ key: string; label: string; color: string }> = [
  { key: 'practical_life', label: 'Practical Life', color: '#10b981' },
  { key: 'sensorial', label: 'Sensorial', color: '#f59e0b' },
  { key: 'mathematics', label: 'Mathematics', color: '#6366f1' },
  { key: 'language', label: 'Language', color: '#ec4899' },
  { key: 'cultural', label: 'Cultural', color: '#8b5cf6' },
];

export type Resolution =
  | { type: 'existing'; work_id: string; work_name: string; area_key: string }
  | { type: 'new_custom'; name: string; area_key: string }
  | { type: 'confirm_ai'; work_id?: string; work_name: string; area_key: string };

export interface ThisIsSheetPhoto {
  id: string;
  url: string | null;
  child_name: string;
  captured_at: string;
  // The currently-guessed work (from Haiku auto-tag OR Sonnet draft OR a
  // prior teacher action). Any/all may be null.
  current_work_id?: string | null;
  current_work_name?: string | null;
  current_area?: string | null;
  sonnet_draft?: {
    proposed_name?: string;
    suggested_area?: string;
    closest_existing_match?: { work_name?: string; similarity?: number } | null;
    confidence?: number;
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: Resolution) => Promise<void>;
  photo: ThisIsSheetPhoto | null;
  classroomId: string;
}

export default function ThisIsSheet({
  isOpen,
  onClose,
  onResolve,
  photo,
  classroomId,
}: Props) {
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addMode, setAddMode] = useState(false); // user tapped "add as new work"
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkArea, setNewWorkArea] = useState<string>('practical_life');
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the classroom's full works list on first open of the sheet.
  const { works, loading: worksLoading } = useClassroomWorks(
    classroomId,
    isOpen
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setAddMode(false);
      setNewWorkName('');
      setNewWorkArea('practical_life');
      setSubmitting(false);
    } else {
      // Autofocus search when opened
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Pre-seed the "new work area" from Sonnet's suggested_area if available
  useEffect(() => {
    const suggested = photo?.sonnet_draft?.suggested_area;
    if (suggested && AREAS.some(a => a.key === suggested)) {
      setNewWorkArea(suggested);
    }
  }, [photo]);

  // --- derive the "AI guess" shortcut row ---
  // Prefer an already-attached work (photo.current_work_*) because that is
  // ground truth. Fall back to closest_existing_match. Fall back to
  // proposed_name (new-work suggestion — but this can't be confirm_ai since
  // there's no work_id, so we skip the chip in that case).
  const aiGuess = useMemo<null | {
    work_name: string;
    work_id?: string;
    area_key: string;
    source: 'attached' | 'match';
  }>(() => {
    if (!photo) return null;
    if (photo.current_work_id && photo.current_work_name) {
      return {
        work_name: photo.current_work_name,
        work_id: photo.current_work_id,
        area_key: photo.current_area || photo.sonnet_draft?.suggested_area || 'other',
        source: 'attached',
      };
    }
    const match = photo.sonnet_draft?.closest_existing_match;
    if (match?.work_name) {
      // We don't know the work_id from the draft cache alone, but we can
      // resolve it against the loaded classroom works list below.
      const resolved = works.find(
        w => w.name.trim().toLowerCase() === match.work_name!.trim().toLowerCase()
      );
      if (resolved) {
        return {
          work_name: resolved.name,
          work_id: resolved.id,
          area_key: resolved.area_key,
          source: 'match',
        };
      }
    }
    return null;
  }, [photo, works]);

  // --- derive filtered search results ---
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query: show up to 10 works, prefer alphabetical
      return works.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
    }
    const matches = works.filter(w => w.name.toLowerCase().includes(q));
    // Rank: startsWith first, then includes
    matches.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    });
    return matches.slice(0, 20);
  }, [query, works]);

  // Did the query exactly match an existing work name?
  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return works.some(w => w.name.toLowerCase() === q);
  }, [query, works]);

  // --- handlers ---
  const handlePickExisting = async (work: ClassroomWork) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onResolve({
        type: 'existing',
        work_id: work.id,
        work_name: work.name,
        area_key: work.area_key,
      });
    } catch (err) {
      console.error('[ThisIsSheet] pick existing failed:', err);
      setSubmitting(false);
    }
  };

  const handleConfirmAI = async () => {
    if (submitting || !aiGuess) return;
    setSubmitting(true);
    try {
      await onResolve({
        type: 'confirm_ai',
        work_id: aiGuess.work_id,
        work_name: aiGuess.work_name,
        area_key: aiGuess.area_key,
      });
    } catch (err) {
      console.error('[ThisIsSheet] confirm AI failed:', err);
      setSubmitting(false);
    }
  };

  const handleEnterAddMode = () => {
    setAddMode(true);
    setNewWorkName(query.trim());
  };

  const handleCreateNew = async () => {
    const name = newWorkName.trim();
    if (submitting || !name) return;
    setSubmitting(true);
    try {
      await onResolve({
        type: 'new_custom',
        name,
        area_key: newWorkArea,
      });
    } catch (err) {
      console.error('[ThisIsSheet] create new failed:', err);
      setSubmitting(false);
    }
  };

  if (!isOpen || !photo) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px 10px',
            borderBottom: '1px solid #eee',
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              padding: 4,
              color: '#666',
            }}
            aria-label="Close"
          >
            ←
          </button>
          <div style={{ fontWeight: 600, fontSize: 17, color: '#222' }}>
            This is…
          </div>
          <div style={{ flex: 1 }} />
          {photo.url && (
            <img
              src={photo.url}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                objectFit: 'cover',
                border: '1px solid #ddd',
              }}
            />
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            {photo.child_name}
            {' · '}
            {new Date(photo.captured_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          {!addMode && (
            <>
              {/* AI guess shortcut row */}
              {aiGuess && (
                <button
                  onClick={handleConfirmAI}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '12px 14px',
                    marginBottom: 12,
                    background: '#eef2ff',
                    border: '1.5px solid #6366f1',
                    borderRadius: 12,
                    cursor: submitting ? 'wait' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 22 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                      AI thinks
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>
                      {aiGuess.work_name}
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#6366f1',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    ✓ Yes
                  </div>
                </button>
              )}

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search or type a new work name…"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    fontSize: 16,
                    border: '1.5px solid #ddd',
                    borderRadius: 12,
                    outline: 'none',
                    background: '#fafafa',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 16,
                    color: '#888',
                    pointerEvents: 'none',
                  }}
                >
                  🔍
                </div>
              </div>

              {/* Results list */}
              {worksLoading && (
                <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                  Loading curriculum…
                </div>
              )}

              {!worksLoading && results.length === 0 && query.trim() && (
                <div
                  style={{
                    padding: 14,
                    background: '#fef3c7',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#92400e',
                    marginBottom: 10,
                  }}
                >
                  No curriculum match found.
                </div>
              )}

              {!worksLoading && results.length > 0 && (
                <div
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  {results.map(w => (
                    <button
                      key={w.id}
                      onClick={() => handlePickExisting(w)}
                      disabled={submitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '12px 14px',
                        background: '#fff',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: submitting ? 'wait' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: '#222' }}>{w.name}</div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 10,
                          background: w.area_color + '22',
                          color: w.area_color,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {w.area_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* "Add as new work" row — always shown when there's a query
                  AND the query doesn't exactly match an existing work */}
              {query.trim() && !exactMatch && !worksLoading && (
                <button
                  onClick={handleEnterAddMode}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '14px',
                    background: '#f5f3ff',
                    border: '1.5px dashed #8b5cf6',
                    borderRadius: 12,
                    cursor: submitting ? 'wait' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 22 }}>➕</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
                      Add as new work
                    </div>
                    <div style={{ fontSize: 15, color: '#222', fontWeight: 500 }}>
                      “{query.trim()}”
                    </div>
                  </div>
                </button>
              )}
            </>
          )}

          {addMode && (
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                New work name
              </div>
              <input
                value={newWorkName}
                onChange={e => setNewWorkName(e.target.value)}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 16,
                  border: '1.5px solid #8b5cf6',
                  borderRadius: 12,
                  marginBottom: 14,
                  outline: 'none',
                }}
              />

              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                Which area?
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {AREAS.map(a => {
                  const active = newWorkArea === a.key;
                  return (
                    <button
                      key={a.key}
                      onClick={() => setNewWorkArea(a.key)}
                      disabled={submitting}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: active ? `2px solid ${a.color}` : '1.5px solid #ddd',
                        background: active ? a.color + '22' : '#fff',
                        color: active ? a.color : '#555',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setAddMode(false)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#fff',
                    border: '1.5px solid #ddd',
                    borderRadius: 12,
                    fontSize: 15,
                    cursor: 'pointer',
                    color: '#555',
                  }}
                >
                  ← Back to search
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={submitting || !newWorkName.trim()}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: submitting || !newWorkName.trim() ? '#ccc' : '#8b5cf6',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: submitting || !newWorkName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Creating…' : '✓ Create and attach'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
