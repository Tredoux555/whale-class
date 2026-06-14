'use client';

// A reusable hidden door. Wrap any element; a 2-second long-press on it opens a
// quiet phrase prompt. The correct phrase mints a token (stored under tokenKey)
// and navigates to `destination`. Two instances power the personal platform:
//   • the header logo  → Diary   (phrase A, /api/story/diary/unlock)
//   • the month title  → Messages (phrase B, /api/story/messages/unlock)
// Nothing about the trigger hints it's a door — obscurity is the shield.

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

const HOLD_MS = 2000;

export default function SecretGate({
  children,
  unlockUrl,
  tokenKey,
  destination,
}: {
  children: ReactNode;
  unlockUrl: string;
  tokenKey: string;
  destination: string;
}) {
  const router = useRouter();
  const [prompting, setPrompting] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => { setError(null); setPhrase(''); setPrompting(true); }, HOLD_MS);
  }, []);
  const cancelHold = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }, []);

  const submit = async () => {
    const p = phrase.trim();
    if (!p || busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = getStoryAdminToken();
      if (!token) { window.location.href = '/story/admin'; return; }
      const res = await fetch(unlockUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: p }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(res.status === 503 ? 'Not set up yet.' : 'Incorrect.'); return; }
      sessionStorage.setItem(tokenKey, (data as { token?: string }).token || '1');
      setPrompting(false);
      router.push(destination);
    } catch {
      setError('Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: 'none', touchAction: 'manipulation', display: 'inline-flex' }}
      >
        {children}
      </div>

      {prompting && (
        <div
          onClick={() => !busy && setPrompting(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(2,8,4,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
            <input
              type="password"
              autoFocus
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.borderSoft}`, borderRadius: 11, outline: 'none', color: T.text, fontFamily: T.sans, fontSize: 16, padding: '11px 13px', textAlign: 'center', letterSpacing: 2 }}
            />
            {error && <div style={{ color: '#f87171', fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>{error}</div>}
            <button
              onClick={submit}
              disabled={busy || !phrase.trim()}
              style={{ width: '100%', marginTop: 14, appearance: 'none', border: 'none', background: busy || !phrase.trim() ? 'rgba(52,211,153,0.25)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`, color: '#06140c', fontWeight: 700, fontSize: 14, padding: '10px', borderRadius: 11, cursor: busy || !phrase.trim() ? 'default' : 'pointer' }}
            >
              {busy ? '…' : 'Enter'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
