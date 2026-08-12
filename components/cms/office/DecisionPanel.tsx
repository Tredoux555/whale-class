'use client';

// components/cms/office/DecisionPanel.tsx
// ============================================================================
// THE ONE PLACE IN CMS WHERE A BUTTON CHANGES ANOTHER PRODUCT.
// ============================================================================
// Accept creates a child in Montree and mints a family's login code; decline
// closes an application with a note the family never sees. Both are POSTs to
// routes that re-derive every fact from the session — this component sends no
// child id, no school id and no room id, because it has no authority to name
// one.
//
// 🚨 THE OUTCOME IS SHOWN, NOT ASSUMED. Every state the accept route can return
// has its own sentence here: connected, already accepted, invite pending,
// school not connected, room not connected, activation failed. A single "Done"
// toast would hide precisely the cases the office needs to act on — and
// "invite pending" is actionable: the same Accept button becomes Retry, and
// pressing it mints the code without duplicating the child.
//
// After a decision the page is refreshed (`router.refresh()`), not patched:
// the status badge, the queue section and the stored code are all server-
// rendered, and a client that painted its own optimistic version of them would
// be a second source of truth about whether a child has a Montree account.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';

/** Every terminal state the two routes can report, mapped to one sentence. */
const RESULT_KEY: Record<string, TranslationKey> = {
  linked: 'office.result.accepted',
  already_accepted: 'office.result.alreadyAccepted',
  accepted_unlinked: 'office.result.acceptedUnlinked',
  room_not_linked: 'office.result.acceptedRoomUnlinked',
  invite_pending: 'office.result.invitePending',
  accepted_activation_failed: 'office.result.activationFailed',
  declined: 'office.result.declined',
  already_declined: 'office.result.declined',
  waitlisted: 'office.result.waitlisted',
  already_waitlisted: 'office.result.waitlisted',
};

type Tone = 'success' | 'amber' | 'danger';

interface Outcome {
  key: TranslationKey;
  tone: Tone;
  /** True when pressing Accept again is the useful next move. */
  retryable: boolean;
}

export function DecisionPanel({
  enrollmentId,
  status,
  schoolLinked,
  roomLinked,
  hasInviteCode,
  demo,
}: {
  enrollmentId: string;
  status: string;
  schoolLinked: boolean;
  roomLinked: boolean;
  hasInviteCode: boolean;
  /** Demo mode writes nothing; the buttons say so instead of 503-ing. */
  demo: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const decided = status === 'accepted' || status === 'declined' || status === 'withdrawn';
  // A waitlisted application is still open: it may be accepted or declined
  // later, it just may not be waitlisted again.
  const waitlisted = status === 'waitlisted';
  const canActivate = schoolLinked && roomLinked;
  // Accepted but no code yet — the retry path exists precisely for this row.
  const pending = status === 'accepted' && canActivate && !hasInviteCode;

  async function post(path: string, body?: unknown) {
    if (busy || demo) return;
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch(`/api/cms/office/enrollments/${enrollmentId}/${path}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        state?: string;
        reason?: string;
      };

      if (!res.ok || !json.ok) {
        setOutcome({ key: 'office.result.error', tone: 'danger', retryable: true });
        return;
      }

      // `reason` refines `accepted_unlinked` into WHICH half is missing, so the
      // office reads the true sentence rather than a generic one.
      const code =
        json.state === 'accepted_unlinked' && json.reason === 'room_not_linked'
          ? 'room_not_linked'
          : json.state ?? '';
      const key = RESULT_KEY[code] ?? 'office.result.accepted';
      const tone: Tone =
        code === 'invite_pending' || code === 'accepted_activation_failed' ? 'amber' : 'success';
      setOutcome({ key, tone, retryable: tone === 'amber' });
      setDeclining(false);
      setNote('');
      router.refresh();
    } catch {
      setOutcome({ key: 'office.result.error', tone: 'danger', retryable: true });
    } finally {
      setBusy(false);
    }
  }

  const toneClass =
    outcome?.tone === 'danger'
      ? 'cms-tone-danger'
      : outcome?.tone === 'amber'
        ? 'cms-tone-amber'
        : 'cms-tone-success';

  return (
    <div>
      <p className="text-[13px] text-harbor-muted leading-relaxed mt-0 mb-4 max-w-[62ch]">
        {canActivate ? t('office.decision.body') : t('office.decision.bodyUnlinked')}
      </p>

      {outcome ? (
        <div className={`cms-tag ${toneClass} !block !text-[12.5px] !leading-relaxed p-3 mb-4`}>
          {t(outcome.key)}
        </div>
      ) : null}

      {declining ? (
        <div className="mb-4">
          <label className="cms-label mb-1.5 block" htmlFor="cms-decline-note">
            {t('office.decision.noteLabel')}
          </label>
          <textarea
            id="cms-decline-note"
            className="cms-input"
            dir="auto"
            rows={3}
            value={note}
            maxLength={2000}
            placeholder={t('office.decision.notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        {declining ? (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-md cms-btn-danger"
              disabled={busy || demo}
              onClick={() => void post('decline', { note })}
            >
              {busy ? t('office.decision.working') : t('office.decision.confirmDecline')}
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-md cms-btn-ghost cms-btn-outline"
              disabled={busy}
              onClick={() => setDeclining(false)}
            >
              {t('office.decision.cancel')}
            </button>
          </>
        ) : (
          <>
            {/* One button, two jobs: it is Accept until the child exists without
                a code, and Retry afterwards. Two buttons would imply two
                different actions, and it is the same idempotent POST. */}
            {!decided || pending ? (
              <button
                type="button"
                className="cms-btn cms-btn-md cms-btn-primary"
                disabled={busy || demo}
                onClick={() => void post('accept')}
              >
                {busy
                  ? t('office.decision.working')
                  : pending
                    ? t('office.result.retry')
                    : t('office.decision.accept')}
              </button>
            ) : null}
            {/* The third answer: not now, but not no. A pure CMS status move —
                it mints nothing and creates nothing in Montree, which is why it
                sits beside Accept rather than behind a confirmation. */}
            {!decided && !waitlisted ? (
              <button
                type="button"
                className="cms-btn cms-btn-md cms-btn-secondary"
                disabled={busy || demo}
                onClick={() => void post('waitlist')}
              >
                {t('office.decision.waitlist')}
              </button>
            ) : null}
            {!decided ? (
              <button
                type="button"
                className="cms-btn cms-btn-md cms-btn-ghost cms-btn-outline"
                disabled={busy || demo}
                onClick={() => setDeclining(true)}
              >
                {t('office.decision.decline')}
              </button>
            ) : null}
          </>
        )}
      </div>

      {demo ? (
        <p className="text-[12px] text-harbor-muted leading-relaxed mt-3.5 mb-0">
          {t('office.result.demo')}
        </p>
      ) : null}
    </div>
  );
}
