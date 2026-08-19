'use client';

/**
 * Parent booking form for a Dark Phonics Live class.
 *
 * POST /api/montree/dark-phonics-live/book
 *   body { childId, scheduledStart (ISO), durationMinutes: 25 }
 *   201 { appointment, creditsRemaining }
 *   402 { error: 'insufficient_credits', creditsRemaining }
 *
 * Native date/time inputs on purpose: they are the pickers Chinese parents
 * already know from WeChat mini-programs, they need no dependency, and they
 * work offline. The wall-clock they produce is read as Beijing time.
 */

import { useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';

import {
  CLASS_DURATION_MINUTES,
  CLASS_TZ_LABEL,
  PT,
  formatClassDateTime,
  inputStyle,
  postJson,
  primaryButtonStyle,
  shanghaiDateInputValue,
  shanghaiLocalToIso,
  type ParentChild,
} from './portal-shared';

interface BookResponse {
  appointment?: { id?: string; scheduled_start?: string };
  creditsRemaining?: number;
  error?: string;
}

interface Props {
  /** Not named `children` — this is a data list, not slot content. */
  childOptions: ParentChild[];
  /** childId → credit balance, so we can show "no classes left" before the POST. */
  balances: Record<string, number>;
  /** Fired on 201 with the server's remaining balance. */
  onBooked: (childId: string, creditsRemaining: number | null, startIso: string) => void;
}

type Outcome =
  | { kind: 'idle' }
  | { kind: 'booked'; startIso: string; creditsRemaining: number | null }
  | { kind: 'noCredits'; balance: number }
  | { kind: 'error'; message: string };

export default function BookClassForm({ childOptions, balances, onBooked }: Props) {
  const [childId, setChildId] = useState(childOptions[0]?.id ?? '');
  const [date, setDate] = useState(shanghaiDateInputValue(new Date()));
  const [time, setTime] = useState('17:00');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  const today = shanghaiDateInputValue(new Date());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOutcome({ kind: 'idle' });

    if (!childId) {
      setOutcome({ kind: 'error', message: 'Choose a child first.' });
      return;
    }
    const scheduledStart = shanghaiLocalToIso(date, time);
    if (!scheduledStart) {
      setOutcome({ kind: 'error', message: 'Pick a date and a time.' });
      return;
    }
    if (new Date(scheduledStart).getTime() <= Date.now()) {
      setOutcome({ kind: 'error', message: 'Please choose a time in the future.' });
      return;
    }

    setBusy(true);
    const { status, data } = await postJson<BookResponse>('/api/montree/dark-phonics-live/book', {
      childId,
      scheduledStart,
      durationMinutes: CLASS_DURATION_MINUTES,
    });
    setBusy(false);

    if (status === 201 || status === 200) {
      const remaining = typeof data?.creditsRemaining === 'number' ? data.creditsRemaining : null;
      setOutcome({ kind: 'booked', startIso: scheduledStart, creditsRemaining: remaining });
      onBooked(childId, remaining, scheduledStart);
      return;
    }
    if (status === 402) {
      const remaining =
        typeof data?.creditsRemaining === 'number' ? data.creditsRemaining : balances[childId] ?? 0;
      setOutcome({ kind: 'noCredits', balance: remaining });
      return;
    }
    if (status === 404) {
      setOutcome({ kind: 'error', message: 'Online Classes is not available on this account yet.' });
      return;
    }
    if (status === 401 || status === 403) {
      setOutcome({ kind: 'error', message: 'Your session expired — please sign in again.' });
      return;
    }
    setOutcome({
      kind: 'error',
      message: data?.error ? `Booking failed (${data.error}).` : 'Booking failed. Please try again.',
    });
  }

  const selectedBalance = balances[childId];
  const knownEmpty = typeof selectedBalance === 'number' && selectedBalance <= 0;

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 180px', minWidth: 150 }}>
          <span style={{ display: 'block', fontSize: 11, color: PT.textMuted, marginBottom: 5 }}>
            Child 孩子
          </span>
          <select
            value={childId}
            onChange={(e) => {
              setChildId(e.target.value);
              setOutcome({ kind: 'idle' });
            }}
            style={inputStyle}
            disabled={busy || childOptions.length === 0}
          >
            {childOptions.length === 0 && <option value="">No children on file</option>}
            {childOptions.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#0a1a0f' }}>
                {c.nickname || c.name}
                {typeof balances[c.id] === 'number' ? ` — ${balances[c.id]} left` : ''}
              </option>
            ))}
          </select>
        </label>

        <label style={{ flex: '1 1 150px', minWidth: 140 }}>
          <span style={{ display: 'block', fontSize: 11, color: PT.textMuted, marginBottom: 5 }}>
            Date 日期
          </span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
            disabled={busy}
          />
        </label>

        <label style={{ flex: '0 1 130px', minWidth: 120 }}>
          <span style={{ display: 'block', fontSize: 11, color: PT.textMuted, marginBottom: 5 }}>
            Time 时间
          </span>
          <input
            type="time"
            value={time}
            step={300}
            onChange={(e) => setTime(e.target.value)}
            style={inputStyle}
            disabled={busy}
          />
        </label>
      </div>

      <div style={{ fontSize: 12, color: PT.textFaint }}>
        Every class is {CLASS_DURATION_MINUTES} minutes, 1-on-1 with Teacher Tredoux. Times are{' '}
        {CLASS_TZ_LABEL}.
      </div>

      <div>
        <button
          type="submit"
          disabled={busy || childOptions.length === 0}
          style={{ ...primaryButtonStyle, opacity: busy || childOptions.length === 0 ? 0.6 : 1 }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
          {busy ? 'Booking…' : 'Book this class 预约'}
        </button>
      </div>

      {/* Pre-flight nudge: we already know this child has nothing left. */}
      {knownEmpty && outcome.kind === 'idle' && (
        <NoCreditsNotice balance={selectedBalance ?? 0} />
      )}

      {outcome.kind === 'noCredits' && <NoCreditsNotice balance={outcome.balance} />}

      {outcome.kind === 'booked' && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: PT.emeraldSoft,
            border: '1px solid rgba(52,211,153,0.30)',
            fontSize: 13.5,
            color: PT.textSecondary,
            lineHeight: 1.6,
          }}
        >
          <b style={{ color: PT.emerald }}>Booked 已预约</b> ·{' '}
          {formatClassDateTime(outcome.startIso)}
          {typeof outcome.creditsRemaining === 'number' && (
            <>
              <br />
              {outcome.creditsRemaining} class{outcome.creditsRemaining === 1 ? '' : 'es'} left on
              this child&apos;s account.
            </>
          )}
        </div>
      )}

      {outcome.kind === 'error' && (
        <div style={{ fontSize: 13, color: PT.red, lineHeight: 1.55 }}>{outcome.message}</div>
      )}
    </form>
  );
}

/** Shared "top-up needed" state — shown pre-flight and on a 402. */
function NoCreditsNotice({ balance }: { balance: number }) {
  return (
    <div
      style={{
        padding: '13px 15px',
        borderRadius: 12,
        background: PT.goldSoft,
        border: '1px solid rgba(232,201,106,0.30)',
        fontSize: 13.5,
        color: PT.textSecondary,
        lineHeight: 1.65,
      }}
    >
      <b style={{ color: PT.gold }}>No classes left 课时已用完</b>
      <br />
      Balance: {balance} credit{balance === 1 ? '' : 's'}. Message Teacher Tredoux to top up — he
      adds your classes as soon as payment arrives.
      <br />
      <span style={{ color: PT.textFaint, fontSize: 12.5 }}>
        请联系 Tredoux 老师充值课时。
      </span>
    </div>
  );
}
