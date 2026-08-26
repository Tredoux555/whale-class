// app/lens/page.tsx — the door.
//
// One field, one button. She types the 8-character code she was given, the
// server sets the lens_observer cookie, and she lands on /lens/home. There is
// no signup, no password reset and no "remember me": the cookie lasts ten years
// (lib/lens/auth.ts) because she is one person on her own phone and a silent
// logout in the middle of a school visit is the worst thing this app could do.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { LENS_OPEN_BETA } from '@/lib/lens/flags';
import { BTN_PRIMARY, CARD, RULE } from '@/lib/lens/ui';

export default function LensDoorPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Open beta: one observer, no door. Mint her a session and go straight to
  // /lens/home — the invite-code form below never renders while this is on.
  // Flip LENS_OPEN_BETA in lib/lens/flags.ts to false to bring the door back.
  useEffect(() => {
    if (!LENS_OPEN_BETA) return;
    let cancelled = false;
    lensApi('/api/lens/auth/auto', { method: 'POST' })
      .then(() => {
        if (!cancelled) router.replace('/lens/home');
      })
      .catch(() => {
        if (!cancelled) setError('Could not open Montree Lens.');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Already signed in? Go straight through. A ten-year cookie means this is the
  // normal case, and making her look at a login form she does not need is the
  // small daily friction that makes an app feel like work.
  //
  // Only runs when the door is actually in play — open beta short-circuits
  // above and never needs this check.
  useEffect(() => {
    if (LENS_OPEN_BETA) return;
    let cancelled = false;
    lensApi('/api/lens/auth/me')
      .then(() => {
        if (!cancelled) router.replace('/lens/home');
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await lensApi('/api/lens/auth/observer', { method: 'POST', json: { code } });
      router.replace('/lens/home');
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not sign you in.');
      setBusy(false);
    }
  }

  // Open beta: no form, no invite code — just the brand mark while the auto
  // sign-in effect above runs, then straight through to /lens/home.
  if (LENS_OPEN_BETA) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-forest-gold">Montree</p>
        <h1 className="font-serif text-4xl text-forest-text">Lens</h1>
        <div className={`${RULE} mt-3 w-16`} />
        <p className="mt-4 text-sm text-forest-muted">{error ?? 'Opening Montree Lens…'}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-forest-gold">Montree</p>
        <h1 className="font-serif text-4xl text-forest-text">Lens</h1>
        <div className={`${RULE} mt-3`} />
        <p className="mt-4 text-[15px] leading-relaxed text-forest-muted">
          Observe a classroom. Walk out with the report.
        </p>
      </div>

      {checking ? (
        <p className="text-sm text-forest-muted">One moment…</p>
      ) : (
        <form onSubmit={submit} className={CARD}>
          <label htmlFor="lens-code" className="mb-2 block text-[13px] text-forest-muted">
            Your invite code
          </label>
          <input
            id="lens-code"
            className="ln-field text-center font-mono text-2xl tracking-[0.35em]"
            value={code}
            // Uppercased and filtered as she types, so the code she reads off a
            // card matches what the field shows even if she types it lowercase.
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
            placeholder="········"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={8}
          />
          {error && <p className="mt-3 text-sm text-forest-danger">{error}</p>}
          <button type="submit" className={`${BTN_PRIMARY} mt-4 w-full`} disabled={busy || code.length !== 8}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-4 text-[12px] leading-relaxed text-forest-muted">
            Eight characters, letters and digits. No 0 and no 1 — those are the two
            that get misread for O and I.
          </p>
        </form>
      )}
    </main>
  );
}
