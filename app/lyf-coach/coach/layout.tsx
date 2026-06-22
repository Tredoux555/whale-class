'use client';

// PUBLIC Lyf Coach app shell — the isolated coach surface a word-of-mouth
// stranger lands in after signup/login. Deliberately NOT the Sanctuary
// (personal) shell: there is NO Planner / Projects / Family nav and NO covert
// messages door here. Public accounts are role='adult' + space-scoped, so the
// owner's family world is already sealed off server-side; this front door keeps
// it out of sight too. Provides the shared CoachChatProvider so the coach hooks
// work, guards the session, and bounces to /lyf-coach/login (never /story/admin).

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { CoachChatProvider } from '@/lib/story/coach/coach-chat-context';
import { LyfCoachMark } from '@/components/story/lyf-coach/PublicShell';
import { T } from '@/lib/story/personal-theme';

const SESSION_KEY = 'story_admin_session';

export default function LyfCoachAppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  // Verify the session once on mount; bounce to the Lyf Coach login on failure.
  useEffect(() => {
    let cancelled = false;
    const token = getStoryAdminToken();
    if (!token) {
      router.replace('/lyf-coach/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/story/admin/auth', { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        if (!res.ok) {
          try { sessionStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
          router.replace('/lyf-coach/login');
          return;
        }
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

  const navBtn = (label: string, onClick: () => void, active = false): ReactNode => (
    <button
      onClick={onClick}
      style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: active ? T.text : T.textDim, fontFamily: T.sans, fontSize: 14,
        fontWeight: active ? 600 : 500, padding: '8px 4px 12px', cursor: 'pointer',
        borderBottom: active ? `2px solid ${T.emerald}` : '2px solid transparent', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, position: 'relative', fontFamily: T.sans, color: T.text }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: T.glow, zIndex: 0 }} />

      <header
        style={{
          position: 'sticky', top: 0, zIndex: 5, background: 'rgba(8,18,11,0.78)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${T.borderSoft}`,
        }}
      >
        <div style={{ maxWidth: T.column, margin: '0 auto', padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <LyfCoachMark size={28} />
          <button
            onClick={signOut}
            style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
        <nav style={{ maxWidth: T.column, margin: '0 auto', padding: '10px 18px 0', display: 'flex', gap: 14 }}>
          {navBtn('Coach', () => router.push('/lyf-coach/coach'), pathname === '/lyf-coach/coach')}
          {navBtn('Upgrade', () => router.push('/lyf-coach/upgrade'), pathname === '/lyf-coach/upgrade')}
        </nav>
      </header>

      <CoachChatProvider>
        <main
          style={{
            position: 'relative', zIndex: 1, maxWidth: T.column, margin: '0 auto',
            padding: '24px 18px 120px', opacity: ready ? 1 : 0, transition: 'opacity 0.25s ease',
          }}
        >
          {ready ? children : null}
        </main>
      </CoachChatProvider>
    </div>
  );
}
