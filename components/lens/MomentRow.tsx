// components/lens/MomentRow.tsx
// One moment in the timeline, with edit and delete in place.
//
// Editing happens HERE rather than on a detail route because the correction she
// makes most often is a Whisper mishearing, and it is made seconds after the
// note was taken while she is still standing where she took it. A page
// transition in the middle of that is a page transition too many.

'use client';

import { useState } from 'react';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, clockLocal } from '@/lib/lens/ui';
import {
  AREA_LABELS,
  RATING_LABELS,
  RATING_LEVELS,
  SUBJECT_LABELS,
  type LensClassroom,
  type LensMoment,
  type LensStaff,
} from '@/lib/lens/types';

export interface MomentWithUrl extends LensMoment {
  media_url?: string | null;
}

export function MomentRow({
  moment,
  staff,
  classrooms,
  onChanged,
  readOnly,
}: {
  moment: MomentWithUrl;
  staff: LensStaff[];
  classrooms: LensClassroom[];
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [caption, setCaption] = useState(moment.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const room = classrooms.find((c) => c.id === moment.classroom_id);
  const person = staff.find((s) => s.id === moment.staff_id);
  const rating = moment.rating ? RATING_LEVELS[moment.rating - 1] : null;
  const text = moment.transcript ?? moment.body ?? '';

  const tagLine = [
    clockLocal(moment.ts),
    moment.kind,
    room?.name,
    moment.subject ? SUBJECT_LABELS[moment.subject] : null,
    moment.area ? AREA_LABELS[moment.area] : null,
    person?.name,
    rating ? RATING_LABELS[rating] : null,
    moment.child_alias,
  ]
    .filter(Boolean)
    .join(' · ');

  function beginEdit() {
    setDraft(text);
    setCaption(moment.caption ?? '');
    setEditing(true);
    setError(null);
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      // Write back to the field the moment actually carries: a voice note's text
      // is its transcript, a typed note's is its body. Putting an edited
      // transcript into `body` would silently create a second copy and leave the
      // original mishearing in the evidence the report reads.
      const patch: Record<string, unknown> = { caption };
      if (moment.kind === 'voice') patch.transcript = draft;
      else if (moment.kind === 'photo') patch.body = draft;
      else patch.body = draft;
      await lensApi(`/api/lens/moments/${moment.id}`, { method: 'PATCH', json: patch });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not save that edit.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await lensApi(`/api/lens/moments/${moment.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not delete that moment.');
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div
      id={`moment-${moment.id}`}
      className="rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-3 py-2.5"
    >
      <p className="text-[11px] uppercase tracking-wide text-forest-muted">{tagLine}</p>

      {moment.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={moment.media_url}
          alt={moment.caption || 'Observation photograph'}
          loading="lazy"
          className="mt-2 max-h-56 w-full rounded-lg object-cover"
        />
      )}

      {editing ? (
        <div className="mt-2">
          <textarea
            className="ln-field"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          {moment.kind === 'photo' && (
            <input
              className="ln-field mt-2"
              placeholder="Caption — what this photograph shows"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}
          <div className="mt-2 flex gap-2">
            <button type="button" className={BTN_PRIMARY} onClick={saveEdit} disabled={busy}>
              Save
            </button>
            <button type="button" className={BTN_GHOST} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {text && <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-snug text-forest-text">{text}</p>}
          {moment.caption && moment.kind === 'photo' && (
            <p className="mt-1 text-[13px] italic text-forest-muted">{moment.caption}</p>
          )}
          {!text && !moment.caption && moment.kind === 'chip' && (
            <p className="mt-1 text-[13px] italic text-forest-muted">Tag only.</p>
          )}
          {!readOnly && (
            <div className="mt-1.5 flex gap-1">
              <button type="button" className={BTN_GHOST} onClick={beginEdit}>
                Edit
              </button>
              {confirming ? (
                <>
                  <button type="button" className={BTN_DANGER} onClick={remove} disabled={busy}>
                    Delete for good
                  </button>
                  <button type="button" className={BTN_GHOST} onClick={() => setConfirming(false)}>
                    Keep
                  </button>
                </>
              ) : (
                // Two taps, never a native confirm(): a browser dialog in a
                // silent classroom is a modal she has to look at.
                <button type="button" className={BTN_GHOST} onClick={() => setConfirming(true)}>
                  Delete
                </button>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="mt-1 text-[12px] text-forest-danger">{error}</p>}
    </div>
  );
}
