'use client';

/**
 * Inline "Grant credits" form for the teacher's Online Classes admin table.
 *
 * POST /api/montree/dark-phonics-live/credits/grant  { childId, credits, note? }
 *   → 201 { balance }
 *
 * The caller (app/montree/dashboard/online-classes/page.tsx) applies an
 * optimistic +credits to the row the moment we submit, then reconciles with the
 * authoritative `balance` this form hands back.
 */

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import {
  PT,
  ghostButtonStyle,
  inputStyle,
  postJson,
  primaryButtonStyle,
} from './portal-shared';

interface Props {
  childId: string;
  childName: string;
  /** Called the instant we submit, so the table can move before the server does. */
  onOptimistic: (childId: string, delta: number) => void;
  /** Called with the server's authoritative balance (or null if the grant failed). */
  onSettled: (childId: string, balance: number | null) => void;
  onClose: () => void;
}

export default function GrantCreditsForm({
  childId,
  childName,
  onOptimistic,
  onSettled,
  onClose,
}: Props) {
  const [credits, setCredits] = useState('4');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(credits);
    if (!Number.isInteger(n) || n === 0) {
      setError('Enter a whole number of credits (negatives are allowed to correct a mistake).');
      return;
    }
    setError(null);
    setBusy(true);
    onOptimistic(childId, n);

    const { status, data } = await postJson<{ balance?: number; error?: string }>(
      '/api/montree/dark-phonics-live/credits/grant',
      { childId, credits: n, note: note.trim() || undefined }
    );

    setBusy(false);

    if (status === 201 || status === 200) {
      onSettled(childId, typeof data?.balance === 'number' ? data.balance : null);
      onClose();
      return;
    }

    // Roll the optimistic move back, then explain.
    onOptimistic(childId, -n);
    onSettled(childId, null);
    if (status === 404) setError('Online Classes is switched off for this school.');
    else if (status === 401 || status === 403) setError('Your session expired — sign in again.');
    else if (status === 409 && data?.error === 'no_parent_linked') {
      setError(`${childName} has no linked parent account yet, so credits can't be attributed. Link a parent first, then try again.`);
    } else setError(data?.error ? `Could not grant credits (${data.error}).` : 'Could not grant credits.');
  }

  return (
    <form
      onSubmit={submit}
      style={{
        marginTop: 10,
        padding: 14,
        borderRadius: 12,
        background: 'rgba(0,0,0,0.25)',
        border: PT.inputBorder,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12.5, color: PT.textSecondary }}>
        Grant credits to <b style={{ color: PT.textPrimary }}>{childName}</b>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ flex: '0 0 110px' }}>
          <span style={{ display: 'block', fontSize: 11, color: PT.textMuted, marginBottom: 4 }}>
            Credits
          </span>
          <input
            type="number"
            step={1}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            style={inputStyle}
            disabled={busy}
          />
        </label>
        <label style={{ flex: '1 1 220px', minWidth: 180 }}>
          <span style={{ display: 'block', fontSize: 11, color: PT.textMuted, marginBottom: 4 }}>
            Note (optional)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="WeChat ¥1200 2026-08-19"
            style={inputStyle}
            disabled={busy}
          />
        </label>
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: PT.red, lineHeight: 1.5 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={busy} style={{ ...primaryButtonStyle, padding: '9px 18px', fontSize: 13.5 }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {busy ? 'Granting…' : 'Grant'}
        </button>
        <button type="button" onClick={onClose} disabled={busy} style={ghostButtonStyle}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}
