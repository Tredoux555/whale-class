// /montree/admin/layout.tsx
// Principal Cockpit shell — dark forest sidebar layout, 6 destinations.
// Replaces the old 3-tab teacher-style layout.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  GraduationCap,
  Users,
  Activity,
  Settings,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import TracyFloat from '@/components/montree/admin/TracyFloat';
// "Sparkles" (Ask Guru) was previously in the sidebar but Tracy IS the
// principal's chief-of-staff AI surface — Guru is the per-child Maria
// Montessori in your pocket for teachers, and Tracy can call it as a
// sub-tool when child-pedagogical depth is needed. The principal doesn't
// need a separate Guru chat. Removed from the principal sidebar; the
// teacher-side /montree/dashboard/guru entry is unaffected.

// Principal Vault prototype gate — until the feature is broadened, only
// surface the sidebar entry for these principal IDs. The server enforces the
// same allow-list (see /api/montree/admin/conversations/* routes).
const VAULT_ENABLED_PRINCIPAL_IDS = new Set<string>([
  '16eec1c0-bfb5-4edf-a160-059bb41803fb', // Tredoux on Whale Class
]);

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
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match?: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/montree/admin', label: 'Today', icon: Home, match: (p) => p === '/montree/admin' },
  {
    href: '/montree/admin/classrooms',
    label: 'Classrooms',
    icon: GraduationCap,
    match: (p) => p.startsWith('/montree/admin/classrooms'),
  },
  {
    href: '/montree/admin/people',
    label: 'People',
    icon: Users,
    match: (p) =>
      p.startsWith('/montree/admin/people') ||
      p.startsWith('/montree/admin/teachers') ||
      p.startsWith('/montree/admin/students') ||
      p.startsWith('/montree/admin/parent-codes') ||
      p.startsWith('/montree/admin/import'),
  },
  {
    href: '/montree/admin/pulse',
    label: 'Pulse',
    icon: Activity,
    match: (p) =>
      p.startsWith('/montree/admin/pulse') ||
      p.startsWith('/montree/admin/activity') ||
      p.startsWith('/montree/admin/reports') ||
      p.startsWith('/montree/admin/billing'),
  },
  {
    href: '/montree/admin/settings',
    label: 'Settings',
    icon: Settings,
    match: (p) =>
      p.startsWith('/montree/admin/settings') ||
      p.startsWith('/montree/admin/billing') ||
      p.startsWith('/montree/admin/features') ||
      p.startsWith('/montree/admin/import'),
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
      {/* School identity (Lora serif) */}
      <div style={{ padding: '28px 22px 22px 22px' }}>
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

  // Build the active nav list — append the Conversations vault item if this
  // principal is on the prototype allow-list. Server enforces the same gate
  // independently; this just keeps the sidebar from showing a dead link.
  const activeNav: NavItem[] = principalId && VAULT_ENABLED_PRINCIPAL_IDS.has(principalId)
    ? [
        ...NAV,
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
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}
        >
          {schoolName || 'School'}
        </div>
        <div style={{ width: 22 }} />
      </div>

      {/* Desktop sidebar (visible >=960px) */}
      <aside
        className="admin-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
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
              height: '100vh',
              width: 280,
              background: T.sidebar,
              borderRight: T.sidebarBorder,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              style={{
                position: 'absolute',
                top: 14,
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap');

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
