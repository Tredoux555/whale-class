// components/montree/DeleteAccountSection.tsx
//
// Reusable "Delete account" danger-zone card. Drop it into any Montree
// settings surface. Implements the Apple-required (Guideline 5.1.1(v))
// in-app account deletion flow:
//
//   1. On mount, GET the endpoint for a role-aware preview (what will be
//      deleted, whether typed confirmation is required, any block).
//   2. User clicks "Delete my account" -> inline confirmation panel.
//   3. For a destructive purge (principal/homeschool sole owner), the user
//      must type the exact school name before the button enables.
//   4. DELETE the endpoint, clear local session, redirect to login.
//
// Server is the source of truth — this component only renders what the
// preview tells it and never decides deletion semantics itself.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Preview {
  mode?: 'personal' | 'school_purge';
  summary: string;
  requiresConfirmation: boolean;
  confirmationPhrase?: string | null;
  blocked?: boolean;
  blockedReason?: string | null;
}

interface Props {
  /** Preview/delete endpoint. Defaults to the teacher/principal endpoint. */
  endpoint?: string;
  /** Where to send the user after deletion. */
  redirectTo?: string;
  /** Extra cleanup (e.g. clear localStorage) before redirect. */
  onDeleted?: () => void;
  /**
   * Dark-glass register for teacher/principal surfaces (dashboard/settings,
   * admin/settings). Defaults to false so the parent portal — which stays on
   * its own light theme — is untouched.
   */
  dark?: boolean;
}

export default function DeleteAccountSection({
  endpoint = '/api/montree/auth/delete-account',
  redirectTo = '/montree/login',
  onDeleted,
  dark = false,
}: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(endpoint, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (alive) setPreview(d); })
      .catch(() => { if (alive) setError('Could not load account settings.'); });
    return () => { alive = false; };
  }, [endpoint]);

  const phrase = (preview?.confirmationPhrase || '').trim();
  const needsPhrase = !!preview?.requiresConfirmation;
  const phraseOk = !needsPhrase || confirmText.trim() === phrase;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: confirmText.trim(), reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Deletion failed. Please try again.');
        setBusy(false);
        return;
      }
      try { onDeleted?.(); } catch { /* ignore cleanup errors */ }
      try { localStorage.removeItem('montree_session'); } catch { /* ignore */ }
      router.push(redirectTo);
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  if (preview?.blocked) {
    if (dark) {
      return (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.25)' }}
        >
          <h3 className="font-semibold text-sm mb-1" style={{ color: '#E8C96A', fontFamily: '"Inter", sans-serif' }}>Account deletion</h3>
          <p className="text-sm" style={{ color: 'rgba(232,201,106,0.85)', fontFamily: '"Inter", sans-serif' }}>{preview.blockedReason}</p>
        </div>
      );
    }
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-amber-800 font-semibold text-sm mb-1">Account deletion</h3>
        <p className="text-amber-700 text-sm">{preview.blockedReason}</p>
      </div>
    );
  }

  if (dark) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(248,113,113,0.30)' }}
      >
        <h3 className="font-semibold mb-1" style={{ color: '#f87171', fontFamily: 'var(--font-lora), Georgia, serif' }}>Delete account</h3>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: '"Inter", sans-serif' }}>
          {preview?.summary || 'Permanently delete your account and associated data.'}
        </p>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            disabled={!preview}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.30)', color: '#f87171', fontFamily: '"Inter", sans-serif' }}
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            {needsPhrase && (
              <div>
                <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: '"Inter", sans-serif' }}>
                  Type <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>{phrase}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={phrase}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(248,113,113,0.30)', color: 'rgba(255,255,255,0.90)', fontFamily: '"Inter", sans-serif' }}
                  autoComplete="off"
                />
              </div>
            )}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg focus:outline-none text-sm"
              style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(52,211,153,0.20)', color: 'rgba(255,255,255,0.90)', fontFamily: '"Inter", sans-serif' }}
            />
            {error && <p className="text-sm" style={{ color: '#f87171', fontFamily: '"Inter", sans-serif' }}>{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={busy || !phraseOk}
                className="px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', fontFamily: '"Inter", sans-serif' }}
              >
                {busy ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                onClick={() => { setOpen(false); setError(null); setConfirmText(''); }}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', color: 'rgba(255,255,255,0.65)', fontFamily: '"Inter", sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-red-200 rounded-xl p-5">
      <h3 className="text-red-700 font-semibold mb-1">Delete account</h3>
      <p className="text-gray-600 text-sm mb-4">
        {preview?.summary || 'Permanently delete your account and associated data.'}
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          disabled={!preview}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          {needsPhrase && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Type <span className="font-semibold">{phrase}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={phrase}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-red-400 focus:outline-none"
                autoComplete="off"
              />
            </div>
          )}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-red-400 focus:outline-none text-sm"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={busy || !phraseOk}
              className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); setConfirmText(''); }}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
