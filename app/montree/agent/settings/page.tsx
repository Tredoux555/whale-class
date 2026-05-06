'use client';

// app/montree/agent/settings/page.tsx
//
// Phase 7c — Read-only settings (Q2 decision: profile is read-only for v1).
// Shows what we know about the agent + sign-out button + "ask Tredoux" hint.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MeResponse {
  agent: {
    id: string;
    name: string | null;
    email: string | null;
    agent_default_share_pct: number | null;
    agent_login_set_at: string | null;
    agent_login_last_used_at: string | null;
  };
}

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AgentSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/agent/me')
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            window.location.href = '/montree/login-select';
            return null;
          }
          const t = await r.text();
          throw new Error(t.slice(0, 200));
        }
        return r.json();
      })
      .then((d: MeResponse | null) => {
        if (cancelled || !d) return;
        setMe(d);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/montree/agent/logout', { method: 'POST' });
    } catch { /* still proceed */ }
    router.push('/montree/login-select');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/agent/dashboard" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Settings</h1>

      {error && (
        <div className="mt-6 bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-200 text-sm">
          {error}
        </div>
      )}

      {me && (
        <>
          {/* Profile (read-only) */}
          <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-white text-lg font-light">Profile</h2>
            <p className="mt-1 text-emerald-200/60 text-xs">
              Profile is read-only for now. Reach out to Tredoux if you need anything updated.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Name" value={me.agent.name || '—'} />
              <Row label="Email" value={me.agent.email || '—'} />
              <Row
                label="Default share %"
                value={
                  me.agent.agent_default_share_pct === null
                    ? 'Self-service disabled'
                    : `${me.agent.agent_default_share_pct}%`
                }
              />
              <Row label="Login issued" value={fmtDate(me.agent.agent_login_set_at)} />
              <Row label="Last login" value={fmtDate(me.agent.agent_login_last_used_at)} />
            </dl>
          </section>

          {/* Reset login */}
          <section className="mt-4 bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-white text-lg font-light">Lost your login code?</h2>
            <p className="mt-1 text-emerald-200/60 text-xs leading-relaxed">
              Reach out to Tredoux directly. He&apos;ll generate a fresh code in super admin —
              your old code stops working immediately and the new one shows up in the same place
              you got the original.
            </p>
          </section>

          {/* Sign out */}
          <section className="mt-4 bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-white text-lg font-light">Sign out</h2>
            <p className="mt-1 text-emerald-200/60 text-xs">
              Clears your session on this device. You&apos;ll need your code to sign in again.
            </p>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="mt-4 inline-block px-4 py-2 bg-red-500/20 hover:bg-red-500/35 text-red-200 font-medium rounded-lg text-sm border border-red-500/30 disabled:opacity-50 transition-colors"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/5 last:border-0">
      <dt className="text-white/50 text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-white text-sm tabular-nums">{value}</dd>
    </div>
  );
}
