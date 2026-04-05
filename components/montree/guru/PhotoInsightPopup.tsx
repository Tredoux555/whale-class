'use client';

// components/montree/guru/PhotoInsightPopup.tsx
// Sprint 2 — Teacher OS: Non-blocking popup for photo classification results
//
// Shows as a persistent toast after CLIP identifies a work in a photo.
// Teacher picks status (Presented / Practicing / Mastered) or "Just Save".
// "Wrong? Fix →" opens WorkWheelPicker for corrections.
// Subscribes to photo-insight-store for pending entries.
//
// Popup behavior:
// - Non-blocking toast (not modal) — teacher can keep taking photos
// - Persists until teacher taps a button (no auto-dismiss)
// - Max 3 visible at once — overflow shows "+N more" badge
// - Status buttons: Presented / Practicing / Mastered / Save
// - "Wrong? Fix →" opens correction flow
// - No-match case: shows "Help me tag it" with direct WorkWheelPicker

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import { montreeApi } from '@/lib/montree/api';
import {
  subscribe,
  getPendingEntries,
  setTeacherStatusChoice,
  type InsightEntry,
  type TeacherStatusChoice,
} from '@/lib/montree/photo-insight-store';

// ============================================================
// TYPES
// ============================================================

interface PhotoInsightPopupProps {
  /** Current child ID — filters entries to this child only */
  childId: string;
  /** Classroom ID — needed for corrections API */
  classroomId?: string;
  /** Called after teacher picks a status — parent refreshes progress data */
  onStatusPicked?: (mediaId: string, childId: string, status: TeacherStatusChoice, workName: string) => void;
  /**
   * Called when teacher taps "Wrong? Fix →" — parent MUST:
   * 1. Open WorkWheelPicker for corrected selection
   * 2. Get corrected work_name + area from teacher
   * 3. Call updateEntryAfterCorrection(mediaId, childId, correctedWorkName, correctedArea)
   * The store will reset teacherStatusChoice and re-show popup with corrected suggestion.
   */
  onCorrect?: (mediaId: string, childId: string, originalWorkName: string | null, originalArea: string | null) => void;
  /** Called when teacher taps "Help me tag" on no-match — parent opens WorkWheelPicker */
  onTagManually?: (mediaId: string, childId: string) => void;
}

/** Max visible popup cards at once — overflow shows "+N more" */
const MAX_VISIBLE = 3;

// ============================================================
// COMPONENT
// ============================================================

export default function PhotoInsightPopup({
  childId,
  classroomId,
  onStatusPicked,
  onCorrect,
  onTagManually,
}: PhotoInsightPopupProps) {
  const { t } = useI18n();
  const mountedRef = useRef(true);

  // Subscribe to store — get pending entries for this child
  const pendingSelector = useCallback(() => getPendingEntries(childId), [childId]);
  const pending = useSyncExternalStore(subscribe, pendingSelector, pendingSelector);

  // Track which popup is currently processing a status action (prevent double-tap)
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const processingKeyRef = useRef<string | null>(null);
  // Track which popup's action just completed (brief success indicator)
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  // Track errors per entry
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Expanded state — show all pending when teacher taps "+N more"
  const [expanded, setExpanded] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Reset expanded when pending count drops below threshold
  useEffect(() => {
    if (pending.length <= MAX_VISIBLE) setExpanded(false);
  }, [pending.length]);

  // Clear completed indicator after 1.5s
  useEffect(() => {
    if (!completedKey) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setCompletedKey(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [completedKey]);

  // Clear error indicator after 3s
  useEffect(() => {
    if (!errorKey) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setErrorKey(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [errorKey]);

  // ---- Status button handler ----
  const handleStatusPick = useCallback(async (entry: InsightEntry, status: TeacherStatusChoice) => {
    const key = `${entry.mediaId}:${entry.childId}`;
    if (processingKeyRef.current === key) return; // Prevent double-tap on THIS entry (sibling popups stay interactive)
    processingKeyRef.current = key;
    setProcessingKey(key);

    try {
      const workName = entry.result?.work_name;
      const area = entry.result?.area;

      // 1. Update progress on server (skip for 'save' — just tag, no progress change)
      if (status !== 'save' && workName && area) {
        const progressRes = await montreeApi('/api/montree/progress/update', {
          method: 'POST',
          body: JSON.stringify({
            child_id: entry.childId,
            work_name: workName,
            area,
            status,
            notes: `[Smart Capture — Teacher confirmed] ${entry.result?.insight || ''}`,
          }),
        });
        if (!mountedRef.current) return;
        if (!progressRes.ok) {
          console.error('[PhotoInsightPopup] Progress update failed:', progressRes.status);
          setErrorKey(key);
          setProcessingKey(null);
          return;
        }
      }

      // 2. Mark as confirmed in accuracy EMA (fire-and-forget, non-fatal)
      if (classroomId && workName && area) {
        montreeApi('/api/montree/guru/corrections', {
          method: 'POST',
          body: JSON.stringify({
            child_id: entry.childId,
            media_id: entry.mediaId,
            original_work_name: workName,
            original_area: area,
            action: 'confirm',
          }),
        }).then((res) => {
          if (!res.ok) console.error('[PhotoInsightPopup] Confirm accuracy EMA failed:', res.status);
        }).catch((err) => {
          console.error('[PhotoInsightPopup] Confirm accuracy EMA error (non-fatal):', err);
        });
      }

      if (!mountedRef.current) return;

      // 3. Update store with teacher's choice
      setTeacherStatusChoice(entry.mediaId, entry.childId, status);

      // 4. Notify parent component
      if (onStatusPicked && workName) {
        onStatusPicked(entry.mediaId, entry.childId, status, workName);
      }

      setCompletedKey(key);
    } catch (err) {
      console.error('[PhotoInsightPopup] Status pick error:', err);
      if (mountedRef.current) setErrorKey(key);
    } finally {
      processingKeyRef.current = null;
      if (mountedRef.current) setProcessingKey(null);
    }
  }, [classroomId, onStatusPicked]);

  // ---- Correction handler ----
  const handleCorrect = useCallback((entry: InsightEntry) => {
    if (onCorrect) {
      onCorrect(
        entry.mediaId,
        entry.childId,
        entry.result?.work_name ?? null,
        entry.result?.area ?? null,
      );
    }
  }, [onCorrect]);

  // ---- No-match manual tag handler ----
  const handleTagManually = useCallback((entry: InsightEntry) => {
    if (onTagManually) {
      onTagManually(entry.mediaId, entry.childId);
    }
  }, [onTagManually]);

  // ---- Dismiss handler (swipe away / close) ----
  const handleDismiss = useCallback((entry: InsightEntry) => {
    // Set status to 'save' silently (just remove from pending without progress update)
    setTeacherStatusChoice(entry.mediaId, entry.childId, 'save');
  }, []);

  // Nothing to show
  if (pending.length === 0) return null;

  // Split into visible and overflow
  const visibleEntries = expanded ? pending : pending.slice(0, MAX_VISIBLE);
  const overflowCount = expanded ? 0 : Math.max(0, pending.length - MAX_VISIBLE);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto z-50 flex flex-col gap-2 max-w-sm pointer-events-none overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Overflow badge */}
      {overflowCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="pointer-events-auto self-end bg-gray-800 text-white text-sm px-3 py-1.5 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        >
          +{overflowCount} {t('popup.morePending')}
        </button>
      )}

      {/* Popup cards — newest at bottom (closest to thumb on mobile) */}
      {visibleEntries.map((entry) => {
        const key = `${entry.mediaId}:${entry.childId}`;
        const isProcessing = processingKey === key;
        const isCompleted = completedKey === key;
        const isError = errorKey === key;

        return (
          <PopupCard
            key={key}
            entry={entry}
            t={t}
            isProcessing={isProcessing}
            isCompleted={isCompleted}
            isError={isError}
            onStatusPick={(status) => handleStatusPick(entry, status)}
            onCorrect={() => handleCorrect(entry)}
            onTagManually={() => handleTagManually(entry)}
            onDismiss={() => handleDismiss(entry)}
          />
        );
      })}
    </div>
  );
}

// ============================================================
// POPUP CARD (individual toast)
// ============================================================

interface PopupCardProps {
  entry: InsightEntry;
  t: (key: string, params?: Record<string, string | number>) => string;
  isProcessing: boolean;
  isCompleted: boolean;
  isError: boolean;
  onStatusPick: (status: TeacherStatusChoice) => void;
  onCorrect: () => void;
  onTagManually: () => void;
  onDismiss: () => void;
}

function PopupCard({
  entry, t, isProcessing, isCompleted, isError,
  onStatusPick, onCorrect, onTagManually, onDismiss,
}: PopupCardProps) {
  const isIdentified = entry.status === 'identified';
  const isNoMatch = entry.status === 'no_match';
  const confidence = entry.result?.confidence ?? 0;
  const workName = entry.result?.work_name;
  const area = entry.result?.area;

  // Success state — brief green flash
  if (isCompleted) {
    return (
      <div className="pointer-events-auto bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-xl animate-fadeIn flex items-center gap-2">
        <span className="text-lg">✓</span>
        <span className="font-medium text-sm">
          {t('popup.confirmed')}
        </span>
      </div>
    );
  }

  // Error state — red flash with message
  if (isError) {
    return (
      <div className="pointer-events-auto bg-red-600 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2">
        <span className="text-lg">✗</span>
        <span className="font-medium text-sm">
          {t('popup.failed')}
        </span>
      </div>
    );
  }

  // ---- IDENTIFIED: CLIP found a match ----
  if (isIdentified && workName && area) {
    return (
      <div className="pointer-events-auto bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden relative">
        {/* Header: tappable work name (opens correction picker) + area badge + close */}
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <AreaBadge area={area} size="sm" />
          <button
            className="flex-1 min-w-0 text-left active:bg-gray-50 rounded -mx-1 px-1 -my-0.5 py-0.5 transition-colors"
            onClick={onCorrect}
            disabled={isProcessing}
          >
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {workName}
              </p>
              {/* Pencil icon — signals tappability */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400 flex-shrink-0">
                <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {Math.round(confidence * 100)}% {t('popup.sure')}
              {' · '}
              {t('popup.pickStatus')}
            </p>
          </button>
          {/* Close/dismiss button */}
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 p-0.5 -mt-0.5 -mr-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Status buttons row */}
        <div className="px-3 pb-2 flex gap-1.5">
          <StatusButton
            label={t('popup.presented')}
            emoji="📋"
            status="presented"
            isProcessing={isProcessing}
            onClick={() => onStatusPick('presented')}
            color="bg-amber-100 text-amber-800 hover:bg-amber-200"
          />
          <StatusButton
            label={t('popup.practicing')}
            emoji="🔄"
            status="practicing"
            isProcessing={isProcessing}
            onClick={() => onStatusPick('practicing')}
            color="bg-blue-100 text-blue-800 hover:bg-blue-200"
          />
          <StatusButton
            label={t('popup.mastered')}
            emoji="⭐"
            status="mastered"
            isProcessing={isProcessing}
            onClick={() => onStatusPick('mastered')}
            color="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          />
        </div>

        {/* Bottom row: Just Save (centered) */}
        <div className="px-3 pb-3 flex items-center justify-center">
          <button
            onClick={() => onStatusPick('save')}
            disabled={isProcessing}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {t('popup.justSave')}
          </button>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // ---- NO MATCH: CLIP confidence too low ----
  if (isNoMatch) {
    return (
      <div className="pointer-events-auto bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden relative">
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs flex-shrink-0">?</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {t('popup.notSure')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('popup.helpTag')}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 p-0.5 -mt-0.5 -mr-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={onTagManually}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
          >
            {t('popup.pickWork')}
          </button>
        </div>
      </div>
    );
  }

  // ---- ANALYZING state — show mini spinner toast ----
  if (entry.status === 'analyzing') {
    return (
      <div className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-sm text-gray-600">
          {t('popup.identifying')}
        </span>
      </div>
    );
  }

  // ---- ERROR state ----
  if (entry.status === 'error') {
    return (
      <div className="pointer-events-auto bg-white rounded-xl shadow-lg border border-red-200 px-4 py-3 flex items-center gap-3">
        <span className="text-red-500 text-lg flex-shrink-0">⚠</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">
            {entry.errorType === 'timeout'
              ? t('popup.tookTooLong')
              : entry.errorType === 'network'
                ? t('popup.connectionError')
                : t('popup.identificationFailed')}
          </p>
        </div>
        <button
          onClick={onTagManually}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex-shrink-0"
        >
          {t('popup.tagManually')}
        </button>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
}

// ============================================================
// STATUS BUTTON
// ============================================================

interface StatusButtonProps {
  label: string;
  emoji: string;
  status: TeacherStatusChoice;
  isProcessing: boolean;
  onClick: () => void;
  color: string;
}

function StatusButton({ label, emoji, status, isProcessing, onClick, color }: StatusButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      <span className="block text-center">
        <span className="text-sm">{emoji}</span>
        <span className="block mt-0.5 leading-tight">{label}</span>
      </span>
    </button>
  );
}
