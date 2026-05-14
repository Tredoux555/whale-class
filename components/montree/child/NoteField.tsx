'use client';

// components/montree/child/NoteField.tsx
//
// Per-focus-work note textarea with mic + Save button. Extracted from
// FocusWorksSection in Session 111 perf push.
//
// 🚨 WHY THIS EXISTS:
// The child page (/montree/dashboard/[childId]) is 1040+ lines as one
// component. Before this extraction, every keystroke in any focus work's note
// field bubbled to the parent via setNotes(record), triggering a re-render of:
//   - The page itself
//   - FocusWorksSection (full re-render — all focus work rows re-renderered)
//   - Sibling components (GamePlanCard, photo strip, evidence badges, etc.)
// Mobile CPU thrashed during dictation. NoteField holds its own local text
// state and only escalates to the parent on save (POSTing the text directly).
// Memoized so its render scope is just itself, not the whole work row.
//
// CONTRACT:
//   - onSave(workName, text) MUST return Promise<boolean> — true on success
//   - On true, NoteField clears its local text
//   - On false, local text is preserved so the teacher can retry
//   - The mic transcript path is fully internal — ChildVoiceNote's
//     onTranscript appends to local state, never to parent
//   - Style tokens mirror FocusWorksSection (C, SANS) so the visual hasn't
//     changed

import { memo, useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';

const C = {
  border:      'rgba(52,211,153,0.15)',
  emerald:     '#34d399',
  textPrimary: 'rgba(255,255,255,0.85)',
};
const SANS = "'Inter', -apple-system, system-ui, sans-serif";

interface NoteFieldProps {
  workName: string;
  childId: string;
  childName?: string;
  /** Show the mic button (false for homeschool parents per existing rule). */
  showMic?: boolean;
  /** Currently saving this work's note. Disables Save + shows spinner. */
  saving?: boolean;
  /** Smart-note Haiku currently parsing this note. Shows 🧠 ellipsis. */
  smartProcessing?: boolean;
  /** Placeholder + button labels (passed in so i18n stays in parent). */
  placeholder: string;
  saveLabel: string;
  /** Save handler. Receives the text from local state. Must return true on
   *  success so NoteField knows to clear; false preserves text for retry. */
  onSave: (workName: string, text: string) => Promise<boolean>;
  /** Anchor a data attribute on the first textarea for the onboarding guide. */
  guideAnchor?: boolean;
}

function NoteFieldImpl({
  workName,
  childId,
  childName,
  showMic = true,
  saving = false,
  smartProcessing = false,
  placeholder,
  saveLabel,
  onSave,
  guideAnchor = false,
}: NoteFieldProps) {
  const [text, setText] = useState('');

  const handleAppendTranscript = useCallback((transcript: string) => {
    setText(prev => (prev ? prev + ' ' + transcript : transcript));
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    const ok = await onSave(workName, trimmed);
    if (ok) setText('');
  }, [text, saving, onSave, workName]);

  const disabled = !text.trim() || saving;
  const buttonLabel = saving ? '...' : smartProcessing ? '…' : saveLabel;

  return (
    <div
      {...(guideAnchor ? { 'data-guide': 'notes-area' } : {})}
      style={{ position: 'relative' }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px 40px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
          fontSize: 13,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
          fontFamily: SANS,
        }}
      />
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {showMic && (
          <ChildVoiceNote
            childId={childId}
            childName={childName}
            onTranscript={handleAppendTranscript}
          />
        )}
        <button
          onClick={handleSave}
          disabled={disabled}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #34d399, #059669)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            border: 0,
            cursor: disabled ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: disabled ? 0.45 : 1,
            transition: 'opacity 140ms ease',
            fontFamily: SANS,
          }}
        >
          <Check size={12} strokeWidth={2.5} />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Memoized so the field doesn't re-render when its parent re-renders for
 * unrelated reasons. The save callback identity matters — pass a stable
 * useCallback'd handler from the parent.
 */
const NoteField = memo(NoteFieldImpl);
export default NoteField;
