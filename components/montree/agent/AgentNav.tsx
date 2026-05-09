'use client';

// components/montree/agent/AgentNav.tsx
//
// Phase 7c — Top navigation for the agent dashboard. Mobile-first: collapses
// to a slim bar with a hamburger sheet on narrow viewports.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MeResponse {
  agent: { id: string; name: string | null; email: string | null };
}

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/montree/agent/dashboard', label: 'Dashboard' },
  { href: '/montree/agent/mira', label: 'Mira' },
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/agent/me')
      .then(r => (r.ok ? r.json() : null))
      .then((data: MeResponse | null) => {
        if (cancelled || !data) return;
        setAgentName(data.agent?.name || data.agent?.email || null);
      })
      .catch(() => { /* nav can render without name */ });
    return () => { cancelled = true; };
  }, []);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/montree/agent/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg shadow-md shadow-emerald-500/20">
            <span className="text-sm">🌳</span>
          </span>
          <span className="text-white font-light tracking-wide hidden sm:inline">
            Agent
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={linkClasses(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {agentName && (
            <span className="hidden sm:inline text-emerald-200/80 text-sm">
              {agentName}
            </span>
          )}
          <button
            onClick={signOut}
            disabled={signOutLoading}
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-colors disabled:opacity-50"
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
