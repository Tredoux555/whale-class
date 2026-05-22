// /montree/admin/layout.tsx
// Principal Cockpit shell — dark forest sidebar layout, 6 destinations.
// Replaces the old 3-tab teacher-style layout.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LanguageToggle from '@/components/montree/LanguageToggle';
import {
  Home,
  GraduationCap,
  MessageSquare,
  Settings,
  Menu,
  X,
  Lock,
  Mic,
  Calendar,
  CalendarDays,
} from 'lucide-react';
// 🚨 Perf Tier 2.4 (PERF_HEALTH_CHECK.md) — Tracy panel is 1,200 lines and
// mounted on every /montree/admin/* page. Loading it eagerly added ~30-50 KB
// of JS to the cockpit's initial bundle even for principals who never open
// Tracy. Dynamic-import with ssr:false defers the load until first client
// paint. Tracy's static greeting (Tier 2.3) means there's no AI call on mount
// either way, so a 100-300ms delayed render is invisible to the user.
const TracyFloat = dynamic(() => import('@/components/montree/admin/TracyFloat'), {
  ssr: false,
  loading: () => null,
});
// "Sparkles" (Ask Guru) was previously in the sidebar but Tracy IS the
// principal's chief-of-staff AI surface — Guru is the per-child Maria
// Montessori in your pocket for teachers, and Tracy can call it as a
// sub-tool when child-pedagogical depth is needed. The principal doesn't
// need a separate Guru chat. Removed from the principal sidebar; the
// teacher-side /montree/dashboard/guru entry is unaffected.

// 🚨 Session 114 — Principal Vault is now available to every principal.
// The previous VAULT_ENABLED_PRINCIPAL_IDS allow-list (Tredoux-only prototype
// from Session 87) has been dropped. Each principal sets their own vault
// password on first use — per-record salt + PBKDF2 means each principal's
// encryption key is independent. No cross-principal access.

// Canonical dark-forest tokens (mirror the teacher-side voice-onboarding / curriculum pages)
const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  sidebar: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.92))',
  sidebarBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match?: (pathname: string) => boolean;
}

// Session 97 — sidebar reorganized for principal-as-overseer mental model.
// People → Communication (the new comms hub: by-classroom, all-teachers,
// all-parents, custom-groups, inbox).
// Pulse hidden from nav (route still exists; principal doesn't need extra
// data nagging them). Activity / Reports / Billing all surface under Settings
// (via dedicated links from the Settings page) so the principal can dig in
// when she wants but isn't presented with them by default.
const NAV: NavItem[] = [
  { href: '/montree/admin', label: 'Today', icon: Home, match: (p) => p === '/montree/admin' },
  {
    href: '/montree/admin/classrooms',
    label: 'Classrooms',
    icon: GraduationCap,
    match: (p) => p.startsWith('/montree/admin/classrooms'),
  },
  {
    href: '/montree/admin/communication',
    label: 'Communication',
    icon: MessageSquare,
    match: (p) =>
      p.startsWith('/montree/admin/communication') ||
      // Old surfaces still match here so the user lands cleanly when they
      // navigate via a stale link / bookmark.
      p.startsWith('/montree/admin/people') ||
      p.startsWith('/montree/admin/teachers') ||
      p.startsWith('/montree/admin/students') ||
      p.startsWith('/montree/admin/parent-codes') ||
      p.startsWith('/montree/admin/import'),
  },
  {
    href: '/montree/admin/settings',
    label: 'Settings',
    icon: Settings,
    match: (p) =>
      p.startsWith('/montree/admin/settings') ||
      p.startsWith('/montree/admin/billing') ||
      p.startsWith('/montree/admin/features') ||
      p.startsWith('/montree/admin/pulse') ||
      p.startsWith('/montree/admin/activity') ||
      p.startsWith('/montree/admin/reports'),
  },
];

interface SidebarContentProps {
  schoolName: string;
  pathname: string;
  isActive: (item: NavItem) => boolean;
  onLogout: () => void;
  nav: NavItem[];
}

function SidebarContent({ schoolName, isActive, onLogout, nav }: SidebarContentProps) {
  return (
    <>
      {/* School identity (Lora serif) — tap to return to the cockpit home. */}
      <Link
        href="/montree/admin"
        style={{ display: 'block', padding: '28px 22px 14px 22px', textDecoration: 'none' }}
      >
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 22,
            fontWeight: 500,
            color: T.textPrimary,
            lineHeight: 1.2,
            letterSpacing: -0.3,
          }}
        >
          {schoolName || 'School'}
        </div>
        <div
          style={{
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 500,
            color: T.emeraldDim,
            marginTop: 6,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          Principal
        </div>
      </Link>

      {/* Language toggle — on every cockpit page via the shared sidebar. */}
      <div style={{ padding: '0 22px 16px 22px' }}>
        <LanguageToggle />
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 12,
                color: active ? T.emerald : T.textSecondary,
                background: active ? 'rgba(52,211,153,0.10)' : 'transparent',
                border: active
                  ? '1px solid rgba(52,211,153,0.25)'
                  : '1px solid transparent',
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                marginBottom: 4,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: logout */}
      <div style={{ padding: '12px 14px 20px 14px', borderTop: T.sidebarBorder }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: T.textMuted,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [principalId, setPrincipalId] = useState<string | null>(null);

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    if (schoolData) {
      try {
        const s = JSON.parse(schoolData);
        setSchoolName(s.name || '');
      } catch { /* ignore */ }
    }
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }
    try {
      const p = JSON.parse(principalData);
      if (p && typeof p.id === 'string') setPrincipalId(p.id);
    } catch { /* ignore */ }
  }, [router]);

  // Two distinct meeting-notes surfaces for the principal:
  //   - "Parent Meetings" (/montree/admin/meeting-notes) — plaintext meeting
  //     notes mirroring the teacher's, optionally shareable into the parent
  //     thread system. The everyday surface.
  //   - "Conversations" (/montree/admin/conversations) — the encrypted vault
  //     (Session 87 + migration 185). Per-principal vault password, E2E
  //     encrypted, NOT shareable. For private notes the principal wants to
  //     keep locked.
  // Both visible to every principal — they pick the surface based on intent.
  const activeNav: NavItem[] = principalId
    ? [
        ...NAV,
        // Session 117 redesign — Calendar. Calendar-first posture replaces
        // the database-list view per architectural rule #176. The page
        // itself shows a "feature disabled" hint when the school doesn't
        // have the appointments flag on, so it's safe to surface universally.
        {
          href: '/montree/admin/appointments',
          label: 'Calendar',
          icon: Calendar,
          match: (p) => p.startsWith('/montree/admin/appointments'),
        },
        // Phase 4 — Events. Same posture as Appointments — the page
        // itself surfaces a "feature disabled" hint when the flag is off.
        // Uses CalendarDays icon to differentiate from Appointments above
        // (avoids identical Calendar icon on two adjacent sidebar rows).
        {
          href: '/montree/admin/events',
          label: 'Events',
          icon: CalendarDays,
          match: (p) => p.startsWith('/montree/admin/events'),
        },
        {
          href: '/montree/admin/meeting-notes',
          label: 'Parent Meetings',
          icon: Mic,
          match: (p) => p.startsWith('/montree/admin/meeting-notes'),
        },
        {
          href: '/montree/admin/conversations',
          label: 'Conversations',
          icon: Lock,
          match: (p) => p.startsWith('/montree/admin/conversations'),
        },
      ]
    : NAV;

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('montree_school');
    localStorage.removeItem('montree_principal');
    fetch('/api/montree/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/montree');
  };

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname === item.href;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.textPrimary,
        fontFamily: T.sans,
        position: 'relative',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: T.glow,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Mobile top bar (visible <960px) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          // Pad below the iPhone status bar / notch / Dynamic Island so the
          // hamburger + school name aren't hidden under the phone's native UI.
          paddingTop: 'calc(14px + env(safe-area-inset-top))',
          background: 'rgba(7,18,12,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: T.sidebarBorder,
        }}
        className="admin-mobile-bar"
      >
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: T.textPrimary,
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <Link
          href="/montree/admin"
          style={{
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
            textDecoration: 'none',
          }}
        >
          {schoolName || 'School'}
        </Link>
        <LanguageToggle />
      </div>

      {/* Desktop sidebar (visible >=960px) */}
      <aside
        className="admin-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          width: 240,
          background: T.sidebar,
          borderRight: T.sidebarBorder,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
        }}
      >
        <SidebarContent
          schoolName={schoolName}
          pathname={pathname}
          isActive={isActive}
          onLogout={handleLogout}
          nav={activeNav}
        />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 40,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100dvh',
              width: 280,
              background: T.sidebar,
              borderRight: T.sidebarBorder,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
              // Clear the notch so the drawer's nav + close button aren't
              // hidden under the iPhone status bar.
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              style={{
                position: 'absolute',
                top: 'calc(14px + env(safe-area-inset-top))',
                right: 14,
                background: 'transparent',
                border: 'none',
                color: T.textSecondary,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} strokeWidth={1.75} />
            </button>
            <SidebarContent
              schoolName={schoolName}
              pathname={pathname}
              isActive={isActive}
              onLogout={handleLogout}
              nav={activeNav}
            />
          </aside>
        </>
      )}

      {/* Content area */}
      <main
        className="admin-main"
        style={{
          marginLeft: 0,
          padding: '20px 18px 60px 18px',
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
        }}
      >
        {children}
      </main>

      {/* Tracy — chief-of-staff float, visible on every cockpit page except
          /montree/admin (which IS Tracy in full-page form). The component
          renders null on that route internally, so nothing to gate here. */}
      <TracyFloat />

      <style jsx global>{`
@media (min-width: 960px) {
          .admin-mobile-bar {
            display: none !important;
          }
          .admin-main {
            margin-left: 240px !important;
            padding: 36px 40px 80px 40px !important;
          }
        }
        @media (max-width: 959px) {
          .admin-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
