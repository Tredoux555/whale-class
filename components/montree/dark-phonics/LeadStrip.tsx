'use client';

/**
 * LeadStrip — "new books land every few weeks — get them first."
 *
 * One email, one optional role, one honeypot, one cookie that remembers a
 * dismissal for a year. It appears under the Play and Classroom tabs and never
 * under Community (a discussion board already has the person's attention; a
 * mailing-list strip under it reads as a leaflet in a conversation).
 *
 * 🚨 DOUBLE-SUBMIT SAFE BY DESIGN. The button disables itself while a request
 * is in flight, and the server treats a repeat address as a success rather than
 * a conflict (unique email, ON CONFLICT DO NOTHING), so a second tap says thank
 * you instead of "you already did that".
 */

import { useCallback, useState } from 'react';

import {
  DP_AID_MAX_AGE,
  cookieString,
  readCookie,
} from '@/lib/montree/dark-phonics/attribution';
import { DP_LEAD_ROLES, type DpLeadRole } from '@/lib/montree/dark-phonics/leads';
import { dpTrack } from './Pixel';

const DISMISS_COOKIE = 'dp_lead_dismissed';

/** Read once on mount, hydration-safely: the strip renders open on the server
 *  and folds away on the client if the cookie says so. */
export function leadStripDismissed(): boolean {
  try {
    return readCookie(document.cookie, DISMISS_COOKIE) === '1';
  } catch {
    return false;
  }
}

type State = 'idle' | 'sending' | 'done' | 'error';

export default function LeadStrip({ t, onDismiss }: { t: (key: string) => string; onDismiss: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<DpLeadRole | ''>('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<State>('idle');

  const dismiss = useCallback(() => {
    try {
      document.cookie = cookieString(DISMISS_COOKIE, '1', DP_AID_MAX_AGE);
    } catch {
      /* the strip simply comes back next visit */
    }
    onDismiss();
  }, [onDismiss]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (state === 'sending') return;
      setState('sending');
      try {
        const res = await fetch('/api/dark-phonics/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: role || null, website }),
        });
        if (!res.ok) {
          setState('error');
          return;
        }
        setState('done');
        dpTrack('lead_submit', { props: role ? { role } : undefined });
      } catch {
        setState('error');
      }
    },
    [email, role, website, state],
  );

  if (state === 'done') {
    return (
      <aside className="dp-lead dp-lead-done" aria-live="polite">
        <p className="dp-lead-title">{t('lead.thanks')}</p>
      </aside>
    );
  }

  return (
    <aside className="dp-lead" aria-labelledby="dp-lead-title">
      <form className="dp-lead-form" onSubmit={submit}>
        <p className="dp-lead-title" id="dp-lead-title">
          {t('lead.title')}
        </p>

        <div className="dp-lead-row">
          <label className="dp-sr" htmlFor="dp-lead-email">
            {t('lead.email')}
          </label>
          <input
            id="dp-lead-email"
            className="dp-lead-input"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder={t('lead.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="dp-sr" htmlFor="dp-lead-role">
            {t('lead.role')}
          </label>
          <select
            id="dp-lead-role"
            className="dp-lead-select"
            value={role}
            onChange={(e) => setRole(e.target.value as DpLeadRole | '')}
          >
            <option value="">{t('lead.role')}</option>
            {DP_LEAD_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(r === 'teacher' ? 'lead.roleTeacher' : 'lead.roleParent')}
              </option>
            ))}
          </select>

          <button type="submit" className="dp-btn dp-btn-primary dp-lead-submit" disabled={state === 'sending'}>
            {state === 'sending' ? t('lead.sending') : t('lead.submit')}
          </button>
        </div>

        {/* The honeypot. Hidden from sight AND from the accessibility tree, so
            no screen reader ever offers it to a person who would then fill it. */}
        <div className="dp-honey" aria-hidden="true">
          <label htmlFor="dp-lead-website">Website</label>
          <input
            id="dp-lead-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {state === 'error' ? (
          <p className="dp-lead-error" role="alert">
            {t('lead.error')}
          </p>
        ) : null}
      </form>

      <button type="button" className="dp-lead-dismiss" onClick={dismiss} aria-label={t('lead.dismissLabel')}>
        {t('lead.dismiss')}
      </button>
    </aside>
  );
}
