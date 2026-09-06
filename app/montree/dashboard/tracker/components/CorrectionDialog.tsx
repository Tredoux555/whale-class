'use client';

// Rule 4's only downward door.
//
// A correction takes a work DOWN the ladder, and it is the single change in the
// whole system that a machine may not make. So it asks two things and refuses
// on either: which rung, and WHY. The Save button stays disabled until the
// reason has real characters in it — and tracker-actions.correctionEvent()
// checks again before it posts, because a disabled button is a courtesy, not a
// guarantee.

import { useState } from 'react';
import { correctionTargets, STATUS_LABEL } from './tracker-actions';
import { cardStyle, ctaBtn, ghostBtn, T, TAP } from './theme';
import type { Status } from './types';

export default function CorrectionDialog({
  childName,
  workLabel,
  current,
  onCancel,
  onSave,
  busy,
}: {
  childName: string;
  workLabel: string;
  current: Status;
  onCancel: () => void;
  onSave: (status: Status, reason: string) => void;
  busy?: boolean;
}) {
  const targets = correctionTargets(current);
  const [status, setStatus] = useState<Status | null>(targets[targets.length - 1] ?? null);
  const [reason, setReason] = useState('');
  const canSave = !!status && reason.trim().length > 0 && !busy;

  return (
    <div
      role="dialog"
      aria-label="Correct the record"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3,10,6,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 60,
      }}
    >
      <div style={{ ...cardStyle, background: T.cardSolid, maxWidth: 520, width: '100%' }}>
        <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.text, margin: '0 0 4px' }}>
          Correct the record
        </h2>
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: '0 0 14px' }}>
          {childName} · {workLabel} · currently {STATUS_LABEL[current].toLowerCase()}
        </p>

        {targets.length === 0 ? (
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted }}>
            This work is at the bottom of the ladder — there is nothing to correct downward.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {targets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    ...ghostBtn,
                    minHeight: TAP,
                    borderColor: status === s ? T.gold : 'rgba(255,255,255,0.12)',
                    color: status === s ? T.gold : T.text,
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <label
              htmlFor="correction-reason"
              style={{ display: 'block', fontFamily: T.sans, fontSize: 13, color: T.text, marginBottom: 6 }}
            >
              Why is it coming down? (required)
            </label>
            <textarea
              id="correction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. ticked on the wrong child"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 10,
                color: T.text,
                fontFamily: T.sans,
                fontSize: 15,
                padding: 12,
                resize: 'vertical',
              }}
            />
            <p style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, margin: '8px 0 14px' }}>
              The reason is journalled with the change. Nothing is deleted — the old rung stays in the child&apos;s history.
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ ...ghostBtn, minHeight: TAP }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => status && onSave(status, reason)}
            style={{ ...ctaBtn, minHeight: TAP, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            {busy ? 'Saving…' : 'Save correction'}
          </button>
        </div>
      </div>
    </div>
  );
}
