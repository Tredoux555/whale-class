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

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

// TYPE A: Locale-keyed labels
const SHEET_LABELS: Record<string, Record<string, string>> = {
  en: {
    aiThinks: 'AI thinks',
    createNewInstead: 'Create new work instead',
    addAsNew: 'Add as new work',
    changeArea: 'change area',
  },
  zh: {
    aiThinks: '人工智能认为',
    createNewInstead: '改为创建新工作',
    addAsNew: '添加为新工作',
    changeArea: '更改区域',
  },
  es: {
    aiThinks: 'IA piensa',
    createNewInstead: 'Crear nuevo trabajo',
    addAsNew: 'Agregar como nuevo trabajo',
    changeArea: 'cambiar área',
  },
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
    _source?: string;  // 'haiku_pass2' for haiku drafts, undefined/other for Sonnet drafts
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
  onDiscussionFlag?: (photoId: string) => void;
  photo: ThisIsSheetPhoto | null;
  // The parent (photo-audit/page.tsx) sometimes passes null when classroom
  // state hasn't yet loaded. useClassroomWorks already accepts null, but the
  // sheet itself becomes useless without a classroom — render nothing so we
  // don't show a broken modal with no curriculum to search.
  classroomId: string | null;
}

export default function ThisIsSheet({
  isOpen,
  onClose,
  onResolve,
  onDiscussionFlag,
  photo,
  classroomId,
}: Props) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addMode, setAddMode] = useState(false); // user tapped "add as new work"
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkArea, setNewWorkArea] = useState<string>('practical_life');
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Merge mode state ---
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergeStep, setMergeStep] = useState<'select' | 'confirm'>('select');
  const [mergeWinnerId, setMergeWinnerId] = useState<string | null>(null);
  const [mergeWinnerArea, setMergeWinnerArea] = useState<string>('practical_life');
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mergedLoserIds, setMergedLoserIds] = useState<Set<string>>(new Set());

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
  //
  // 🚨 Dep array uses photo?.id (NOT photo) — the parent passes a fresh
  // object literal every render, so depending on `photo` itself caused this
  // effect to re-run on every parent re-render and wipe the teacher's typed
  // value back to the AI's pre-seed. photo?.id is stable per photo so the
  // effect runs once per photo as intended.
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setAddMode(false);
      setNewWorkName('');
      setNewWorkArea('practical_life');
      setSubmitting(false);
      setMergeMode(false);
      setMergeSelected(new Set());
      setMergeStep('select');
      setMergeWinnerId(null);
      setMerging(false);
      setMergeResult(null);
      setMergedLoserIds(new Set());
    } else {
      // Pre-seed the search bar with the AI's proposed_name (editable).
      //
      // Session 113 photo pipeline audit recommendation #10: only pre-seed
      // for Sonnet drafts (sonnet_drafted), NOT for Haiku drafts. Sonnet's
      // proposed_name is the result of deep deliberation with all context
      // — when it suggests a work name, it has thought about it. Haiku's
      // proposed_name is faster + cheaper but more guessy; pre-seeding
      // Haiku output into the search bar nudges the teacher toward
      // accidental duplicate-work creation when Haiku's guess is wrong
      // but PLAUSIBLE-sounding. Better to start with an empty search bar
      // for Haiku drafts so the teacher types the real name.
      //
      // Confidence floor (>= 0.4) preserved — below that, neither source
      // should pre-seed.
      const isSonnetDraft = photo?.sonnet_draft?._source !== 'haiku_pass2' && photo?.sonnet_draft?._source !== 'haiku_pass2_matched';
      const proposed = photo?.sonnet_draft?.proposed_name?.trim() || '';
      const confidence = photo?.sonnet_draft?.confidence ?? 0;
      if (proposed && confidence >= 0.4 && isSonnetDraft) setQuery(proposed);
      // Autofocus and select-all so a quick edit is one keypress away.
      // Using setTimeout to ensure DOM has rendered and focus can persist.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, photo?.id]);

  // Pre-seed the "new work area" from Sonnet's suggested_area if available.
  // Same dep-stability fix as above — depend on the scalar suggested_area,
  // not the whole photo object.
  useEffect(() => {
    const suggested = photo?.sonnet_draft?.suggested_area;
    if (suggested && (AREA_KEYS as readonly string[]).includes(suggested)) {
      setNewWorkArea(suggested);
    }
  }, [photo?.sonnet_draft?.suggested_area]);

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
    // Filter out any works that were just merged away (losers)
    const available = mergedLoserIds.size > 0
      ? works.filter(w => !mergedLoserIds.has(w.id))
      : works;
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query: show up to 10 works, prefer alphabetical
      return available.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
    }
    const matches = available.filter(w => w.name.toLowerCase().includes(q));
    // Rank: startsWith first, then includes
    matches.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    });
    return matches.slice(0, 20);
  }, [query, works, mergedLoserIds]);

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
  // All resolve handlers close the sheet INSTANTLY and fire the server
  // call in the background. The parent (photo-audit/page.tsx) handles
  // success/error toasts via handleResolvePhoto. This makes the UI feel
  // instant for the teacher — no "Creating…" spinner.
  const fireAndClose = (resolution: Resolution) => {
    onClose();
    onResolve(resolution).catch(err => {
      console.error('[ThisIsSheet] background resolve failed:', err);
    });
  };

  const handlePickExisting = (work: ClassroomWork) => {
    if (submitting) return;
    fireAndClose({
      type: 'existing',
      work_id: work.id,
      work_name: work.name,
      area_key: work.area_key,
    });
  };

  const handleConfirmAI = () => {
    if (submitting || !aiGuess) return;
    fireAndClose({
      type: 'confirm_ai',
      work_id: aiGuess.work_id,
      work_name: aiGuess.work_name,
      area_key: aiGuess.area_key,
    });
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
  const handleQuickCreateFromQuery = () => {
    const name = query.trim();
    if (submitting || !name) return;
    fireAndClose({
      type: 'new_custom',
      name,
      area_key: newWorkArea,
    });
  };

  const handleCreateNew = () => {
    const name = newWorkName.trim();
    if (submitting || !name) return;
    fireAndClose({
      type: 'new_custom',
      name,
      area_key: newWorkArea,
    });
  };

  const handleDiscussionFlag = () => {
    if (!photo || !onDiscussionFlag) return;
    onDiscussionFlag(photo.id);
    onClose();
  };

  // Session 113: "Save as Other" — photo is worth keeping but isn't a
  // Montessori curriculum work (snack time, art moment, group activity,
  // parent pickup, etc.). No curriculum row created. No visual memory
  // write. No progress observation. The photo is just removed from the
  // audit queue with sonnet_draft.is_other=true as the discriminator.
  const handleSaveAsOther = () => {
    if (submitting) return;
    fireAndClose({ type: 'other' });
  };

  // --- Merge handlers ---
  const toggleMergeSelect = useCallback((workId: string) => {
    setMergeSelected(prev => {
      const next = new Set(prev);
      if (next.has(workId)) next.delete(workId); else next.add(workId);
      return next;
    });
  }, []);

  const mergeSelectedWorks = useMemo(() => {
    return works.filter(w => mergeSelected.has(w.id));
  }, [works, mergeSelected]);

  const enterMergeConfirm = useCallback(() => {
    if (mergeSelected.size < 2) return;
    // Default winner = first selected work (teacher can change)
    const first = mergeSelectedWorks[0];
    if (first) {
      setMergeWinnerId(first.id);
      setMergeWinnerArea(first.area_key);
    }
    setMergeStep('confirm');
  }, [mergeSelected, mergeSelectedWorks]);

  const handleMerge = useCallback(async () => {
    if (!mergeWinnerId || mergeSelected.size < 2 || merging) return;
    const loserIds = [...mergeSelected].filter(id => id !== mergeWinnerId);
    if (loserIds.length === 0) return;

    setMerging(true);
    setMergeResult(null);
    try {
      // If the winner's area needs to change, update it first
      const winner = works.find(w => w.id === mergeWinnerId);
      if (winner && mergeWinnerArea !== winner.area_key) {
        // Find the correct area_id for the target area from any work in that area
        const areaWork = works.find(w => w.area_key === mergeWinnerArea && w.area_id);
        if (areaWork) {
          const areaRes = await fetch('/api/montree/curriculum', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              work_id: mergeWinnerId,
              area_id: areaWork.area_id,
            }),
          });
          if (!areaRes.ok) {
            setMergeResult({ success: false, message: 'Failed to update area — try again' });
            return;
          }
        }
      }

      // Now merge: POST to duplicates consolidation endpoint
      const res = await fetch('/api/montree/curriculum/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          winner_id: mergeWinnerId,
          loser_ids: loserIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMergeResult({ success: false, message: data.error || 'Merge failed' });
        return;
      }
      // Immediately hide losers from search results and exit merge mode
      setMergedLoserIds(new Set(loserIds));
      setMergeMode(false);
      setMergeSelected(new Set());
      setMergeStep('select');
      setMergeWinnerId(null);
      setMerging(false);
      setMergeResult(null);
      // Pre-fill search with winner name so teacher can tap to tag the photo
      const winnerName = data.winner?.name || winner?.name || '';
      if (winnerName) setQuery(winnerName);
      // Background reload to sync works list from DB (mergedLoserIds filters until complete)
      reloadWorks();
    } catch (err) {
      console.error('[ThisIsSheet] merge failed:', err);
      setMergeResult({ success: false, message: 'Network error — try again' });
    } finally {
      setMerging(false);
    }
  }, [mergeWinnerId, mergeSelected, mergeWinnerArea, merging, works, reloadWorks]);

  const exitMergeMode = useCallback(() => {
    setMergeMode(false);
    setMergeSelected(new Set());
    setMergeStep('select');
    setMergeWinnerId(null);
    setMerging(false);
    setMergeResult(null);
  }, []);

  if (!isOpen || !photo || !classroomId) return null;

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
          {onDiscussionFlag && (
            <button
              onClick={handleDiscussionFlag}
              title={t('thisIsSheet.flagForDiscussion')}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 16,
                color: '#3b82f6',
              }}
            >
              💬
            </button>
          )}
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
                      {SHEET_LABELS[locale]?.aiThinks || SHEET_LABELS.en.aiThinks}
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

              {/* Search bar + New work button side by side */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      // Allow Escape to close the modal
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        onClose();
                      }
                    }}
                    placeholder="Search works…"
                    disabled={submitting}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      fontSize: 16,
                      // Explicit color so typed text is unambiguously dark against
                      // the off-white background — without this, browser defaults
                      // can render value text in a faded grey that looks like
                      // placeholder, leading teachers to think the input is broken.
                      color: '#0f172a',
                      caretColor: '#8b5cf6',
                      border: '1.5px solid #c4b5fd',
                      borderRadius: 12,
                      outline: 'none',
                      background: '#ffffff',
                      boxShadow: '0 0 0 3px rgba(139,92,246,0.12)',
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
                <button
                  onClick={() => {
                    setAddMode(true);
                    setNewWorkName(query.trim() || photo?.sonnet_draft?.proposed_name?.trim() || '');
                  }}
                  disabled={submitting}
                  style={{
                    padding: '0 16px',
                    background: '#f5f3ff',
                    border: '1.5px solid #8b5cf6',
                    borderRadius: 12,
                    cursor: 'pointer',
                    color: '#8b5cf6',
                    fontWeight: 700,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  ＋ New
                </button>
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
                  <div style={{ fontWeight: 600 }}>No curriculum match for "{query.trim()}"</div>
                  {photo?.sonnet_draft?._source === 'haiku_pass2' && (
                    <div style={{ fontSize: 12, marginTop: 4, color: '#b45309' }}>
                      💡 Haiku's suggestion may be wrong — clear the search and type the correct work name to find it.
                    </div>
                  )}
                </div>
              )}

              {/* Merge toggle — show when 2+ search results */}
              {!worksLoading && results.length >= 2 && !mergeMode && (
                <button
                  onClick={() => setMergeMode(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    marginBottom: 8,
                    background: 'none',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#888',
                    cursor: 'pointer',
                  }}
                >
                  🔀 Merge duplicates
                </button>
              )}

              {/* Merge mode banner */}
              {mergeMode && mergeStep === 'select' && (
                <div style={{
                  padding: '10px 14px',
                  background: '#fef3c7',
                  borderRadius: 12,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                      🔀 Select works to merge
                    </div>
                    <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                      Tap the works that are duplicates ({mergeSelected.size} selected)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {mergeSelected.size >= 2 && (
                      <button
                        onClick={enterMergeConfirm}
                        style={{
                          padding: '6px 14px',
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Next →
                      </button>
                    )}
                    <button
                      onClick={exitMergeMode}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#666',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Merge confirm step */}
              {mergeMode && mergeStep === 'confirm' && (
                <div style={{
                  padding: 14,
                  background: '#fef3c7',
                  borderRadius: 12,
                  marginBottom: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>
                    🔀 Which name should we keep?
                  </div>
                  {mergeSelectedWorks.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setMergeWinnerId(w.id); setMergeWinnerArea(w.area_key); }}
                      disabled={merging}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 12px',
                        marginBottom: 6,
                        background: mergeWinnerId === w.id ? '#dcfce7' : '#fff',
                        border: mergeWinnerId === w.id ? '2px solid #22c55e' : '1px solid #e5e7eb',
                        borderRadius: 10,
                        cursor: merging ? 'wait' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {mergeWinnerId === w.id && (
                        <span style={{ fontSize: 16 }}>✅</span>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>
                          {locale === 'zh' && w.name_chinese ? w.name_chinese : w.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>
                          {locale === 'zh' && w.area_name_zh ? w.area_name_zh : w.area_name}
                          {mergeWinnerId === w.id ? ' — keeper' : ' — will be absorbed'}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Area correction — show when winner selected */}
                  {mergeWinnerId && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
                        Correct area for the merged work:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {AREA_KEYS.map(key => {
                          const active = mergeWinnerArea === key;
                          const color = AREA_COLORS[key] || '#888';
                          return (
                            <button
                              key={key}
                              onClick={() => setMergeWinnerArea(key)}
                              disabled={merging}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 999,
                                border: active ? `2px solid ${color}` : '1px solid #ddd',
                                background: active ? color + '22' : '#fff',
                                color: active ? color : '#888',
                                fontWeight: active ? 700 : 400,
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              {getAreaLabel(key, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Merge result message */}
                  {mergeResult && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: mergeResult.success ? '#dcfce7' : '#fee2e2',
                      color: mergeResult.success ? '#166534' : '#991b1b',
                      fontSize: 13,
                    }}>
                      {mergeResult.success ? '✓ ' : '✕ '}{mergeResult.message}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => setMergeStep('select')}
                      disabled={merging}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 10,
                        fontSize: 13,
                        cursor: 'pointer',
                        color: '#555',
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleMerge}
                      disabled={merging || !mergeWinnerId}
                      style={{
                        flex: 2,
                        padding: '10px',
                        background: merging || !mergeWinnerId ? '#ccc' : '#f59e0b',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        cursor: merging || !mergeWinnerId ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {merging ? 'Merging…' : `Merge ${mergeSelected.size} works into one`}
                    </button>
                  </div>
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
                      onClick={() => mergeMode && mergeStep === 'select'
                        ? toggleMergeSelect(w.id)
                        : handlePickExisting(w)
                      }
                      disabled={submitting || (mergeMode && mergeStep === 'confirm')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '12px 14px',
                        background: mergeSelected.has(w.id) ? '#fef9c3' : '#fff',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: submitting ? 'wait' : 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {/* Merge checkbox */}
                      {mergeMode && mergeStep === 'select' && (
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: mergeSelected.has(w.id) ? '2px solid #f59e0b' : '2px solid #ccc',
                          background: mergeSelected.has(w.id) ? '#fbbf24' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 13,
                          color: '#fff',
                          fontWeight: 700,
                        }}>
                          {mergeSelected.has(w.id) ? '✓' : ''}
                        </div>
                      )}
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
                        {locale === 'zh' && w.area_name_zh ? w.area_name_zh : w.area_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick-create from search bar — shows when query has text
                  and doesn't exactly match an existing work. */}
              {query.trim() && !exactMatch && !worksLoading && (
                <div>
                  {/* Fuzzy duplicate guardrail */}
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
                          {locale === 'zh' && fuzzyNearMatch.area_name_zh ? fuzzyNearMatch.area_name_zh : fuzzyNearMatch.area_name} — {t('thisIsSheet.tapToUseInstead')}
                        </div>
                      </div>
                    </button>
                  )}
                  {/* No exact match — offer to add as new custom work.
                      Goes through addMode (edit form) instead of instant fire-and-close,
                      so the teacher can confirm/edit the name before committing. This
                      prevents accidental creation of wrong custom works when the AI's
                      proposed name is pre-seeded but wrong. */}
                  <button
                    onClick={handleEnterAddMode}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '14px',
                      background: fuzzyNearMatch ? '#fafafa' : '#f5f3ff',
                      border: fuzzyNearMatch ? '1px dashed #ccc' : '1.5px solid #8b5cf6',
                      borderRadius: 12,
                      cursor: submitting ? 'wait' : 'pointer',
                      textAlign: 'left',
                      opacity: fuzzyNearMatch ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontSize: 22 }}>➕</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: fuzzyNearMatch ? '#888' : '#8b5cf6', fontWeight: 600 }}>
                        {fuzzyNearMatch ? (SHEET_LABELS[locale]?.createNewInstead || SHEET_LABELS.en.createNewInstead) : (SHEET_LABELS[locale]?.addAsNew || SHEET_LABELS.en.addAsNew)}
                      </div>
                      <div style={{ fontSize: 15, color: '#222', fontWeight: 600 }}>
                        “{query.trim()}”
                      </div>
                      <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 2 }}>
                        Tap to name and confirm
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Session 113: Save as Other.
                  Subtle fallback for photos that are worth keeping but
                  aren't curriculum (snack time, art, group photo, parent
                  pickup, classroom event). Muted styling — not competing
                  with the primary "this work" CTAs above. */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                <button
                  onClick={handleSaveAsOther}
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    cursor: submitting ? 'wait' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 18, color: '#6b7280' }}>📌</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                      Save as Other
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                      Not curriculum — snack time, art, group photo, etc. Keeps the photo on the child without tagging a work.
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {addMode && (
            <div>
              <div style={{
                padding: '10px 14px',
                background: '#f5f3ff',
                borderRadius: 12,
                marginBottom: 14,
                fontSize: 13,
                color: '#6b21a8',
              }}>
                ➕ Add a new work to your classroom curriculum
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 600 }}>
                What is the work called?
              </div>
              <input
                value={newWorkName}
                onChange={e => setNewWorkName(e.target.value)}
                disabled={submitting}
                autoFocus
                placeholder="e.g. Baric Tablets, Farm Animal Matching…"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 16,
                  // Explicit dark text + visible caret — without these the
                  // browser default colours can make the input look frozen.
                  color: '#0f172a',
                  caretColor: '#8b5cf6',
                  background: '#ffffff',
                  border: '1.5px solid #8b5cf6',
                  borderRadius: 12,
                  marginBottom: 14,
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(139,92,246,0.12)',
                }}
              />

              <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 600 }}>
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
