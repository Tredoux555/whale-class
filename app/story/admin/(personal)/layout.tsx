'use client';

// Personal-platform shell (route group — does NOT alter the URL).
// Wraps /story/admin/planner, /projects, /coach (+ the secret /diary subtree)
// with:
//   • Story-admin auth guard (sessionStorage 'story_admin_session')
//   • 15-minute idle auto-logout (spec §3)
//   • dark-forest sanctuary theme + the Planner/Projects/Coach nav
//   • the header LOGO is the secret door to the Diary (long-press + phrase A)
// The Planner is the innocuous front. Diary + Messages are BOTH hidden behind
// separate phrases. Login (/story/admin) is the ONE layer — Tredoux's call:
// "Coach is my diary, I have a right to keep it private; one layer, not two."
// So Planner, Coach, Diary, Projects are all open behind the login. The only
// thing still hidden is Messages (the covert comms — the Planner month-title
// long-press door), which lives OUTSIDE this group.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';
import CoachFloat from '@/components/story/personal/CoachFloat';

const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_KEY = 'story_admin_session';

const NAV: { href: string; label: string }[] = [
  { href: '/story/admin/planner', label: 'Planner' },
  { href: '/story/admin/coach', label: 'Coach' },
  { href: '/story/admin/diary', label: 'Diary' },
  { href: '/story/admin/projects', label: 'Projects' },
];

export default function PersonalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastActivity = useRef(0); // set on first idle-effect run (never call Date.now() during render)

  // Auth guard — verify the admin session once on mount.
  useEffect(() => {
    let cancelled = false;
    const token = getStoryAdminToken();
    if (!token) {
      router.replace('/story/admin');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/story/admin/auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          sessionStorage.removeItem(SESSION_KEY);
          router.replace('/story/admin');
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/story/admin');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // 15-minute idle auto-logout.
  useEffect(() => {
    lastActivity.current = Date.now();
    const bump = () => { lastActivity.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const iv = setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_LIMIT_MS) {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = '/story/admin';
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(iv);
    };
  }, []);

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

      {/* Header + nav */}
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
          {/* Logo — just the home mark now (no secret door; everything's behind login). */}
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
        {ready ? children : null}
      </main>

      {ready && <CoachFloat />}
    </div>
  );
}
