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
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel, AREA_KEYS } from '@/lib/montree/i18n/area-labels';

const AREA_COLORS: Record<string, string> = {
  practical_life: '#10b981',
  sensorial: '#f59e0b',
  mathematics: '#6366f1',
  language: '#ec4899',
  cultural: '#8b5cf6',
};

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
  const { locale } = useI18n();
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addMode, setAddMode] = useState(false); // user tapped "add as new work"
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkArea, setNewWorkArea] = useState<string>('practical_life');
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the classroom's full works list on first open of the sheet.
  const { works, loading: worksLoading, reload: reloadWorks } = useClassroomWorks(
    classroomId,
    isOpen
  );

  // Reload the works list each time the sheet opens for a new photo,
  // so custom works just added via "Add as new" are immediately searchable.
  const prevPhotoId = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen && photo?.id && photo.id !== prevPhotoId.current) {
      prevPhotoId.current = photo?.id || null;
      reloadWorks();
    }
  }, [isOpen, photo?.id, reloadWorks]);

  // Reset on close / pre-seed on open
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setAddMode(false);
      setNewWorkName('');
      setNewWorkArea('practical_life');
      setSubmitting(false);
    } else {
      // Pre-seed the search bar with Sonnet's proposed_name (editable),
      // BUT only when confidence is reasonable (>= 0.4). Low-confidence
      // suggestions mislead the teacher into one-tap creating a wrong
      // work name — better to start with an empty search bar so they
      // type the correct name from scratch.
      const proposed = photo?.sonnet_draft?.proposed_name?.trim() || '';
      const confidence = photo?.sonnet_draft?.confidence ?? 0;
      if (proposed && confidence >= 0.4) setQuery(proposed);
      // Autofocus and select-all so a quick edit is one keypress away.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen, photo]);

  // Pre-seed the "new work area" from Sonnet's suggested_area if available
  useEffect(() => {
    const suggested = photo?.sonnet_draft?.suggested_area;
    if (suggested && (AREA_KEYS as readonly string[]).includes(suggested)) {
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
    work_name_chinese?: string;
    work_id?: string;
    area_key: string;
    source: 'attached' | 'match';
  }>(() => {
    if (!photo) return null;
    if (photo.current_work_id && photo.current_work_name) {
      // Try to find Chinese name from loaded works
      const resolved = works.find(w => w.id === photo.current_work_id);
      return {
        work_name: photo.current_work_name,
        work_name_chinese: resolved?.name_chinese || undefined,
        work_id: photo.current_work_id,
        area_key: photo.current_area || photo.sonnet_draft?.suggested_area || 'other',
        source: 'attached',
      };
    }
    const match = photo.sonnet_draft?.closest_existing_match;
    // Only trust the closest_existing_match shortcut when similarity is
    // high enough to avoid nudging the teacher toward a bad match (e.g.
    // "Paper Shredding and Cutting" → "Cutting" at 45% is NOT the same
    // work). Below the threshold, fall through to the editable search
    // bar pre-seeded with proposed_name so the teacher can create the
    // new work in one tap instead.
    const MATCH_CONFIDENCE_THRESHOLD = 0.75;
    const sim = typeof match?.similarity === 'number' ? match.similarity : 0;
    if (match?.work_name && sim >= MATCH_CONFIDENCE_THRESHOLD) {
      // We don't know the work_id from the draft cache alone, but we can
      // resolve it against the loaded classroom works list below.
      const resolved = works.find(
        w => w.name.trim().toLowerCase() === match.work_name!.trim().toLowerCase()
      );
      if (resolved) {
        return {
          work_name: resolved.name,
          work_name_chinese: resolved.name_chinese || undefined,
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

  // Fuzzy duplicate guardrail: find the best near-match to the current
  // query so we can warn the teacher before they create a near-duplicate
  // custom work. Uses token overlap scoring — if most words in the query
  // already appear in an existing work name, it's likely a duplicate.
  const fuzzyNearMatch = useMemo<ClassroomWork | null>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 3 || exactMatch) return null;
    const qTokens = q.split(/[\s\-_]+/).filter(t => t.length >= 2);
    if (qTokens.length === 0) return null;

    let bestWork: ClassroomWork | null = null;
    let bestScore = 0;
    for (const w of works) {
      const wLower = w.name.toLowerCase();
      // Skip exact matches (already handled by results list)
      if (wLower === q) continue;
      const wTokens = wLower.split(/[\s\-_]+/).filter(t => t.length >= 2);
      if (wTokens.length === 0) continue;
      // Count how many query tokens appear in the work name
      let hits = 0;
      for (const qt of qTokens) {
        if (wTokens.some(wt => wt.includes(qt) || qt.includes(wt))) hits++;
      }
      const score = hits / Math.max(qTokens.length, 1);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestWork = w;
      }
    }
    return bestWork;
  }, [query, works, exactMatch]);

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

  // One-tap: create a new custom work directly from whatever is in the
  // search bar, using the sonnet_draft's suggested_area. The resolve
  // route copies the cached Sonnet draft's parent_description,
  // why_it_matters, and key_materials onto the new curriculum row, so
  // the created work carries exactly the description the teacher sees
  // on this card.
  const handleQuickCreateFromQuery = async () => {
    const name = query.trim();
    if (submitting || !name) return;
    setSubmitting(true);
    try {
      await onResolve({
        type: 'new_custom',
        name,
        area_key: newWorkArea,
      });
    } catch (err) {
      console.error('[ThisIsSheet] quick create failed:', err);
      setSubmitting(false);
    }
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
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          height: 'min(720px, 90vh)',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 12px 48px rgba(0,0,0,0.35)',
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
            {photo.captured_at && !isNaN(new Date(photo.captured_at).getTime()) && (
              <>
                {' · '}
                {new Date(photo.captured_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
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
                      {locale === 'zh' && aiGuess.work_name_chinese ? aiGuess.work_name_chinese : aiGuess.work_name}
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
                        <div style={{ fontSize: 15, color: '#222' }}>{locale === 'zh' && w.name_chinese ? w.name_chinese : w.name}</div>
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

              {/* “Add as new work” row — one-tap create. Uses the current
                  search bar text (pre-seeded from Sonnet's proposed_name
                  but fully editable) and the area pre-seeded from the
                  draft's suggested_area. The resolve route stamps the
                  cached Sonnet description onto the new curriculum row. */}
              {query.trim() && !exactMatch && !worksLoading && (
                <div>
                  {/* Fuzzy duplicate guardrail: if a close match exists,
                      show the existing work as the preferred option ABOVE
                      the create button so the teacher picks it instead of
                      accidentally creating a near-duplicate. */}
                  {fuzzyNearMatch && (
                    <button
                      onClick={() => handlePickExisting(fuzzyNearMatch)}
                      disabled={submitting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '12px 14px',
                        marginBottom: 8,
                        background: '#fef3c7',
                        border: '1.5px solid #f59e0b',
                        borderRadius: 12,
                        cursor: submitting ? 'wait' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 18 }}>⚠️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                          Did you mean this existing work?
                        </div>
                        <div style={{ fontSize: 14, color: '#222', fontWeight: 600, marginTop: 2 }}>
                          {locale === 'zh' && fuzzyNearMatch.name_chinese
                            ? fuzzyNearMatch.name_chinese
                            : fuzzyNearMatch.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>
                          {fuzzyNearMatch.area_name} — tap to use this instead
                        </div>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={handleQuickCreateFromQuery}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: fuzzyNearMatch ? '10px 14px' : '14px',
                      background: fuzzyNearMatch ? '#fafafa' : '#f5f3ff',
                      border: fuzzyNearMatch ? '1px dashed #ccc' : '1.5px dashed #8b5cf6',
                      borderRadius: 12,
                      cursor: submitting ? 'wait' : 'pointer',
                      textAlign: 'left',
                      opacity: fuzzyNearMatch ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontSize: fuzzyNearMatch ? 16 : 22 }}>➕</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: fuzzyNearMatch ? '#888' : '#8b5cf6', fontWeight: 600 }}>
                        {submitting ? 'Creating…' : fuzzyNearMatch ? 'No, create a new work instead' : 'Add as new work (with AI description)'}
                      </div>
                      <div style={{ fontSize: fuzzyNearMatch ? 13 : 15, color: '#222', fontWeight: 600 }}>
                        “{query.trim()}”
                      </div>
                      <div style={{ fontSize: 11, color: fuzzyNearMatch ? '#999' : '#8b5cf6', marginTop: 2 }}>
                        Area:{' '}
                        {getAreaLabel(newWorkArea, locale)}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={handleEnterAddMode}
                    disabled={submitting}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8b5cf6',
                      fontSize: 12,
                      padding: '6px 4px',
                      marginTop: 4,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Change area…
                  </button>
                </div>
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
                {AREA_KEYS.map(key => {
                  const active = newWorkArea === key;
                  const color = AREA_COLORS[key] || '#888';
                  return (
                    <button
                      key={key}
                      onClick={() => setNewWorkArea(key)}
                      disabled={submitting}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: active ? `2px solid ${color}` : '1.5px solid #ddd',
                        background: active ? color + '22' : '#fff',
                        color: active ? color : '#555',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {getAreaLabel(key, locale)}
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
