'use client';

// components/cms/enroll/TagInput.tsx
// PHASE 3 PRIMITIVE — the chip field. Spec: CMS_DESIGN_SYSTEM.md §10.
//
// Used wherever a family gives a LIST of short things in their own words:
// likes, dislikes, interests, medical conditions, excluded foods. It is not a
// picker — there is no vocabulary to pick from, and there must never be one.
// "Baba's singing" is a perfectly good entry and will never appear in a taxonomy.
//
// Behaviour, in the order a parent discovers it:
//   · type, press Enter (or comma) → the text becomes a chip,
//   · Backspace on an empty field → removes the last chip,
//   · blur with text still in the field → that text is kept, not silently lost
//     (the single most common way a form eats an answer),
//   · ✕ on a chip removes it.
//
// The visible box is `.cms-taginput`, which is `.cms-input` grown to hold chips
// — same border, same focus ring, same radius — so it reads as a field.

import { useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '@/lib/cms/i18n/provider';
import { MAX_TAG, MAX_TAGS } from '@/lib/cms/validation';

export interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Announced to screen readers as the group's name. */
  label: string;
  id?: string;
}

export function TagInput({ value, onChange, placeholder, label, id }: TagInputProps) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** Add whatever is in the field, if it is worth adding. Case-insensitively
   *  de-duplicated here as well as on the server — a parent who types "cars"
   *  twice should see one chip, not an error. */
  function commit(raw: string) {
    const next = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG);
    if (!next) return;
    if (value.length >= MAX_TAGS) return;
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter inside a wizard must not submit anything — the wizard's own
      // buttons own that decision.
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className="cms-taginput"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label={label}
    >
      {value.map((tag) => (
        <span key={tag} className="cms-taginput-chip" dir="auto">
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`${t('common.remove')} — ${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((v) => v !== tag));
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={draft}
        dir="auto"
        autoComplete="off"
        maxLength={MAX_TAG}
        placeholder={value.length >= MAX_TAGS ? '' : placeholder}
        disabled={value.length >= MAX_TAGS}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        // A half-typed tag left in the field is an ANSWER. Keep it.
        onBlur={() => commit(draft)}
      />
    </div>
  );
}
