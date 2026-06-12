// components/montree/ParentNotificationPrefs.tsx
//
// Push-notification preference toggles for the parent account page
// (Tier 2 push polish, Jun 2026). Three opt-out switches — reports,
// messages, announcements — backed by
// GET/PATCH /api/montree/parent/account/notification-prefs.
//
// Opt-OUT model: everything defaults to ON; the server stores only explicit
// opt-outs in montree_parents.notification_prefs (migration 255).
// Enforcement lives server-side in sendPushToOwners — this UI is just the
// dial. Renders nothing for invite-based sessions (403: no parent account
// row, and such sessions can't register push devices anyway).
'use client';

import { useEffect, useState } from 'react';

const ROWS = [
  {
    key: 'reports' as const,
    label: 'Reports',
    description: 'When a new progress or weekly report is ready',
  },
  {
    key: 'messages' as const,
    label: 'Messages',
    description: 'When a teacher sends you a message',
  },
  {
    key: 'broadcasts' as const,
    label: 'Announcements',
    description: 'School-wide announcements from your school',
  },
];

type PrefKey = (typeof ROWS)[number]['key'];
type Prefs = Record<PrefKey, boolean>;

export default function ParentNotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [hidden, setHidden] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/montree/parent/account/notification-prefs', { credentials: 'include' })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 403) {
          // Invite-based session — no account row, nothing to configure.
          setHidden(true);
          return;
        }
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.prefs) {
          setError('Could not load notification settings.');
          return;
        }
        setPrefs(data.prefs as Prefs);
        if (data.migration_pending) setUnavailable(true);
      })
      .catch(() => {
        if (alive) setError('Could not load notification settings.');
      });
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(key: PrefKey) {
    if (!prefs || savingKey || unavailable) return;
    const next = !prefs[key];
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next }); // optimistic
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch('/api/montree/parent/account/notification-prefs', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrefs(previous); // revert
        if (data?.migration_pending) setUnavailable(true);
        else setError(data?.error || 'Could not save. Please try again.');
      }
    } catch {
      setPrefs(previous);
      setError('Network error. Please try again.');
    } finally {
      setSavingKey(null);
    }
  }

  if (hidden) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-gray-800 font-semibold mb-1">Push notifications</h3>
      <p className="text-gray-600 text-sm mb-4">
        Choose which notifications you receive on your phone.
      </p>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {unavailable && (
        <p className="text-amber-700 text-sm mb-3">
          Notification settings aren&apos;t available yet — please check back soon.
        </p>
      )}

      {!prefs && !error ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : prefs ? (
        <div className="divide-y divide-slate-100">
          {ROWS.map((row) => {
            const on = prefs[row.key];
            return (
              <div key={row.key} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-gray-800 text-sm font-medium">{row.label}</p>
                  <p className="text-gray-500 text-xs">{row.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${row.label} notifications`}
                  onClick={() => toggle(row.key)}
                  disabled={savingKey === row.key || unavailable}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    on ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      on ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
