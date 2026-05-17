'use client';

// components/montree/agent/AgentNav.tsx
//
// Phase 7c — Top navigation for the agent dashboard. Mobile-first: collapses
// to a slim bar with a hamburger sheet on narrow viewports.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MontreeLogo from '@/components/montree/MonteeLogo';

interface MeResponse {
  agent: { id: string; name: string | null; email: string | null };
}

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/montree/agent/dashboard', label: 'Dashboard' },
  { href: '/montree/agent/mira', label: 'Mira' },
  { href: '/montree/agent/messages', label: 'Messages' },
  { href: '/montree/agent/messages-tredoux', label: 'Tredoux' },
  { href: '/montree/agent/schools', label: 'Schools' },
  { href: '/montree/agent/codes', label: 'Codes' },
  { href: '/montree/agent/earnings', label: 'Earnings' },
  { href: '/montree/agent/payouts', label: 'Payouts' },
  { href: '/montree/agent/settings', label: 'Settings' },
];

export default function AgentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [agentName, setAgentName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Session 110: auth probe runs in AgentNav (which mounts on every
  // /montree/agent/* page via the layout). On 401/403 we redirect away
  // from the entire agent tree — no individual page needs to handle the
  // raw "Forbidden — agent role required" JSON blob anymore.
  //
  // Excluded: /montree/agent/onboarding (Stripe return URL — agent may
  // not be logged in there yet, redirecting would create a loop).
  useEffect(() => {
    if (pathname === '/montree/agent/onboarding') return;
    let cancelled = false;
    fetch('/api/montree/agent/me')
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401 || r.status === 403) {
          // Not signed in as an agent. Could be: (a) signed out, (b) signed
          // in as principal/super-admin, (c) impersonation cookie expired.
          // Send back to login-select with a hint so login-select can
          // show a friendly "agent login required" message (if it wants).
          router.replace('/montree/login-select?reason=agent_required');
          return null;
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: MeResponse | null) => {
        if (cancelled || !data) return;
        setAgentName(data.agent?.name || data.agent?.email || null);
      })
      .catch(() => { /* network error — nav can render without name */ });
    return () => { cancelled = true; };
  }, [pathname, router]);

  // Close mobile menu on route change. The setState-in-effect is intentional
  // — the menu state lives in the nav, but the trigger is route change which
  // we observe via the pathname dependency. Same pattern as
  // /montree/agent/onboarding/page.tsx.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const signOut = async () => {
    setSignOutLoading(true);
    try {
      await fetch('/api/montree/agent/logout', { method: 'POST' });
    } catch { /* still proceed to login screen */ }
    router.push('/montree/login-select');
  };

  const linkClasses = (href: string) => {
    const active = pathname === href || (href !== '/montree/agent/dashboard' && pathname?.startsWith(href));
    return [
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      active
        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent',
    ].join(' ');
  };

  return (
    <nav
      className="sticky top-0 z-30 backdrop-blur-md border-b border-white/5"
      style={{ background: 'rgba(8,20,12,0.65)' }}
    >
      {/*
       * 🚨 Right-side padding on md+ reserves space for MiraFloat's trigger
       * (top-right, ~56px square). Without it, Sign out collides with Mira's
       * avatar on narrow desktop viewports.
       */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:pr-20 py-3 flex items-center gap-3">
        <Link href="/montree/agent/dashboard" className="flex items-center gap-2 shrink-0">
          <MontreeLogo size={32} />
          <span className="text-white font-light tracking-wide hidden sm:inline">
            Ambassador
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 ml-2 flex-wrap">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={linkClasses(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Agent name dropped from inline nav — it's already shown on the
              dashboard hero ("Good afternoon, Tredoux."), and including it
              here was causing "Tredoux Agent" to wrap into two lines on
              narrow desktop because of the 9-item nav + MiraFloat collision.
              Still shown in the mobile hamburger sheet below. */}
          <button
            onClick={signOut}
            disabled={signOutLoading}
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {signOutLoading ? 'Signing out…' : 'Sign out'}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white border border-white/10"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span className="text-lg leading-none">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/5"
          style={{ background: 'rgba(8,20,12,0.95)' }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {agentName && (
              <div className="text-emerald-200/80 text-xs uppercase tracking-wider px-3 pb-2 pt-1">
                {agentName}
              </div>
            )}
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className={linkClasses(l.href)}>
                {l.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              disabled={signOutLoading}
              className="mt-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-colors text-left disabled:opacity-50"
            >
              {signOutLoading ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
