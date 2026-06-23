'use client';

// PUBLIC Lyf Coach app shell — a carbon copy of the Sanctuary (personal) tabbed
// shell, hosted under /lyf-coach for word-of-mouth subscribers.
//
// Deliberately stripped of every owner-only surface:
//   • Header reads "Sanctuary" with the emerald mark (no covert Diary door on it).
//   • Nav is Planner · Coach · Projects ONLY — NO Family tab, NO Board/People,
//     NO covert Messages door (that lives behind the Planner month-title in the
//     owner build and is intentionally absent here).
//   • Session guard bounces to /lyf-coach/login (NEVER /story/admin).
//
// Public accounts are space-scoped (role='adult') so the owner's family world is
// already sealed off server-side; this front door keeps it out of sight too.
// Wraps children in CoachChatProvider so the coach hooks work (mirrors the
// existing public coach layout this replaces).

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';
import { CoachChatProvider } from '@/lib/story/coach/coach-chat-context';
import VerifyEmailBanner from '@/components/story/lyf-coach/VerifyEmailBanner';

const SESSION_KEY = 'story_admin_session';

// Planner · Coach · Projects. NO Family. NO owner doors.
const NAV: { href: string; label: string }[] = [
  { href: '/lyf-coach/planner', label: 'Planner' },
  { href: '/lyf-coach/coach', label: 'Coach' },
  { href: '/lyf-coach/projects', label: 'Projects' },
];

export default function LyfCoachAppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  // Auth guard — verify the session once on mount; bounce to the Lyf Coach
  // login (never /story/admin) on any failure.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve the session token. Logged-in users have it in sessionStorage
      // (AuthForm stashes it on signup/login). A user who JUST clicked the
      // email-verification link arrives holding ONLY the httpOnly cookie the
      // verify redirect set — recover it via the /session bridge and mirror it
      // into sessionStorage so they land straight in the app, never bounced to
      // a login or confirmation page.
      let token = getStoryAdminToken();
      if (!token) {
        try {
          const sres = await fetch('/api/lyf-coach/session');
          if (cancelled) return;
          if (sres.ok) {
            const sdata = (await sres.json().catch(() => null)) as { session?: string } | null;
            if (sdata?.session) {
              try { sessionStorage.setItem(SESSION_KEY, sdata.session); } catch { /* private mode */ }
              token = sdata.session;
            }
          }
        } catch { /* fall through to the login bounce */ }
      }
      if (!token) {
        if (!cancelled) router.replace('/lyf-coach/login');
        return;
      }
      try {
        const res = await fetch('/api/story/admin/auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          try { sessionStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
          router.replace('/lyf-coach/login');
          return;
        }
        // Hard email-verification gate (bot protection): an unverified account gets
        // NO access to the coach/prompts — bounce to the holding screen until they
        // confirm. verify-status is fail-open (verified=true on any read error) so a
        // transient blip never locks anyone out; the coach API enforces the same
        // gate server-side as the real backstop.
        try {
          const vs = await fetch('/api/lyf-coach/verify-status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          if (vs.ok) {
            const vd = await vs.json().catch(() => null);
            if (vd && vd.email_verified === false) {
              router.replace('/lyf-coach/verify-pending');
              return;
            }
          }
        } catch { /* fail-open — the coach API backstops the gate server-side */ }
        if (cancelled) return;
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/lyf-coach/login');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function signOut() {
    const token = getStoryAdminToken();
    try {
      await fetch('/api/story/admin/auth', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch { /* clear locally regardless */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
    window.location.href = '/lyf-coach';
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.bg,
        position: 'relative',
        fontFamily: T.sans,
        color: T.text,
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: T.glow, zIndex: 0 }} />

      {/* Header + nav — matches the Sanctuary shell. */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'rgba(8,18,11,0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${T.borderSoft}`,
        }}
      >
        <div
          style={{
            maxWidth: T.column,
            margin: '0 auto',
            padding: '14px 18px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Mark + "Sanctuary" wordmark. Plain home mark — no secret door. */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
            <span
              style={{
                width: 30, height: 30, borderRadius: 9,
                background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: '0 0 18px rgba(52,211,153,0.3)',
              }}
            >
              🌳
            </span>
            <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', color: T.text }}>
              Sanctuary
            </span>
          </span>
          <button
            onClick={signOut}
            style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
        <nav
          style={{
            maxWidth: T.column,
            margin: '0 auto',
            padding: '10px 18px 0',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
          }}
        >
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <button
                key={n.href}
                onClick={() => router.push(n.href)}
                style={{
                  appearance: 'none',
                  border: 'none',
                  background: 'transparent',
                  color: active ? T.text : T.textDim,
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  padding: '8px 4px 12px',
                  cursor: 'pointer',
                  borderBottom: active ? `2px solid ${T.emerald}` : '2px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>
      </header>

      <CoachChatProvider>
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: T.column,
            margin: '0 auto',
            padding: '24px 18px 120px',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        >
          {ready ? <VerifyEmailBanner /> : null}
          {ready ? children : null}
        </main>
      </CoachChatProvider>
    </div>
  );
}
