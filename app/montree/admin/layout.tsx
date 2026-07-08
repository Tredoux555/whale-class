// /montree/admin/layout.tsx
// Principal Cockpit shell — dark forest sidebar layout, 6 destinations.
// Replaces the old 3-tab teacher-style layout.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { rememberLaunchSurface, clearLaunchSurface } from '@/lib/montree/launch-surface';
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
  Users,
  Sparkles,
} from 'lucide-react';
// 🚨 Perf Tier 2.4 (PERF_HEALTH_CHECK.md) — Astra panel is 1,200 lines and
// mounted on every /montree/admin/* page. Loading it eagerly added ~30-50 KB
// of JS to the cockpit's initial bundle even for principals who never open
// Astra. Dynamic-import with ssr:false defers the load until first client
// paint. Astra's static greeting (Tier 2.3) means there's no AI call on mount
// either way, so a 100-300ms delayed render is invisible to the user.
const TracyFloat = dynamic(() => import('@/components/montree/admin/TracyFloat'), {
  ssr: false,
  loading: () => null,
});
// "Sparkles" (Ask Guru) was previously in the sidebar but Astra IS the
// principal's chief-of-staff AI surface — Guru is the per-child Maria
// Montessori in your pocket for teachers, and Astra can call it as a
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
  { href: '/montree/admin', label: 'adminNav.today', icon: Home, match: (p) => p === '/montree/admin' },
  {
    href: '/montree/admin/classrooms',
    label: 'adminNav.classrooms',
    icon: GraduationCap,
    match: (p) => p.startsWith('/montree/admin/classrooms'),
  },
  // Ultimate Astra Phase D — parents are first-class entities. Sits
  // between Classrooms and Communication so the relational entities
  // cluster together.
  {
    href: '/montree/admin/parents',
    label: 'adminNav.parents',
    icon: Users,
    match: (p) => p.startsWith('/montree/admin/parents'),
  },
  {
    href: '/montree/admin/communication',
    label: 'adminNav.communication',
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
    label: 'adminNav.settings',
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
  const { t } = useI18n();
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
          {t('adminNav.principal')}
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
              <span>{t(item.label as TranslationKey)}</span>
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
          {t('adminNav.signOut')}
        </button>
      </div>
    </>
  );
}

// Lightweight skeleton shown in the content area while the cockpit verifies
// the auth cookie. Mirrors app/montree/admin/loading.tsx's shape so the
// transition into the real page body is a fade, not a layout jump. Renders
// nothing once we know the user is unauthed (a redirect is already in flight).
function CockpitGateSkeleton({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ padding: '12px 0 12px', maxWidth: 1100 }} aria-hidden>
      <div
        className="animate-pulse"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(232,201,106,0.12)', flexShrink: 0,
          }}
        />
        <div
          style={{
            height: 22, width: '40%',
            background: 'rgba(232,201,106,0.10)', borderRadius: 8,
          }}
        />
      </div>
      <div
        className="animate-pulse"
        style={{
          height: 14, width: '62%',
          background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          marginLeft: 50,
        }}
      />
    </div>
  );
}

// 🚨 Session 154 — cockpit auth gate. The layout is the SINGLE source of
// truth for whether the principal is authenticated. While 'checking', the
// cockpit chrome renders but the page body (children) does NOT — so the
// per-page data fetches (/today, /snapshot, /billing/status) never fire
// against a dead cookie. This kills two bugs at once:
//   1. The 401 request storm (snapshot + billing 401'ing in a tight pair).
//   2. The redirect ping-pong / "jumping" — the page used to mount in the
//      expired state, 401 on /today, and fire its OWN router.replace to
//      login-select while the layout fired the same redirect, remounting
//      the whole subtree in a loop. With the gate the page never mounts
//      until auth is confirmed, so there is exactly one redirect, from one
//      owner (this layout), exactly once.
type AuthState = 'checking' | 'authed' | 'unauthed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [principalId, setPrincipalId] = useState<string | null>(null);
  // Migration 292 — Founding-member schools get the "Message Tredoux" nav link.
  const [foundingMember, setFoundingMember] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    // Optimistic render of the cockpit CHROME (sidebar school name) from
    // localStorage so the shell appears instantly. The page BODY stays gated
    // on authState until auth/me resolves (see render gate below).
    if (schoolData) {
      try {
        const s = JSON.parse(schoolData);
        setSchoolName(s.name || '');
      } catch { /* ignore */ }
    }
    // 🚨 Session 155 — do NOT bail to login just because montree_principal is
    // missing from localStorage. A valid httpOnly cookie (e.g. recovered by
    // login-select's recoverSession, which writes only montree_session, never
    // montree_principal) is the real authority. Bailing here created an
    // admin → login-select → dashboard → admin redirect LOOP (the "jumping"
    // on Chrome) for a principal with a live cookie but no montree_principal
    // mirror. auth/me below is the single authority and self-heals localStorage.
    const hadLocalPrincipal = !!principalData;
    if (principalData) {
      try {
        const p = JSON.parse(principalData);
        if (p && typeof p.id === 'string') setPrincipalId(p.id);
      } catch { /* ignore */ }
    }

    // 🚨 Session 140 — validate the httpOnly cookie, don't trust localStorage
    // alone. When the auth cookie expires, the cockpit used to render from stale
    // localStorage while every API 401'd, hanging the page on skeletons with a
    // generic "School" sidebar and no way to tell you were logged out. auth/me
    // is the authoritative check.
    let cancelled = false;
    fetch('/api/montree/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        // 200 but not authenticated → genuinely no live session. Go
        // authenticate. Don't strand the body on the skeleton, and don't
        // mount it into a 401 storm.
        if (!data?.authenticated) {
          setAuthState('unauthed');
          router.replace('/montree/login-select');
          return;
        }
        // Abuse lock (migration 286) — a session established before the school
        // was locked keeps working until re-checked here. Bounce to the locked
        // screen where the principal can message Tredoux.
        if (data.locked) {
          setAuthState('unauthed');
          const sid = data.lockedSchoolId || data.school?.id || '';
          window.location.href = `/montree/locked?school=${encodeURIComponent(sid)}`;
          return;
        }
        // Self-heal: repopulate the school name + principal id + localStorage
        // from the live session (fixes a stale or partial local session, e.g.
        // the generic "School" sidebar).
        if (data.school?.name) setSchoolName(data.school.name);
        if (data.teacher?.id) setPrincipalId(data.teacher.id);
        // Migration 292 — surface the "Message Tredoux" nav only for Founding schools.
        setFoundingMember(Boolean(data.school?.founding_member));
        // Remember the cockpit as this principal's launch surface so the next
        // PWA home-screen launch opens straight here (no splash flash).
        if (data.role === 'principal') rememberLaunchSurface('/montree/admin');
        try {
          if (data.school) localStorage.setItem('montree_school', JSON.stringify(data.school));
          if (data.teacher) {
            localStorage.setItem(
              'montree_principal',
              JSON.stringify({
                id: data.teacher.id,
                name: data.teacher.name,
                email: data.teacher.email,
                role: data.teacher.role,
              })
            );
          }
        } catch { /* ignore */ }
        // Auth confirmed — now (and only now) let the page body mount and
        // fire its data fetches.
        setAuthState('authed');
      })
      .catch((status) => {
        if (cancelled) return;
        // Only a real 401 means the cookie is dead — clear the stale local
        // session and bounce to a clean login. A network blip / cold-start 503
        // is transient and must NOT log the principal out: in that case we
        // optimistically trust localStorage and let the body mount (its own
        // fetches will surface a real 401 if the cookie is genuinely gone).
        if (status === 401) {
          try {
            localStorage.removeItem('montree_school');
            localStorage.removeItem('montree_principal');
            localStorage.removeItem('montree_session');
          } catch { /* ignore */ }
          setAuthState('unauthed');
          router.replace('/montree/login-select');
        } else if (hadLocalPrincipal) {
          // Transient (cold start / network blip / the ~20% origin drop) AND
          // we have a local identity to fall back on — trust it and mount; the
          // page's own fetches surface a real 401 if the cookie is truly gone.
          setAuthState('authed');
        } else {
          // Transient AND no local identity to fall back on — can't confirm
          // auth and mounting a blank cockpit would just spin. Send to login.
          setAuthState('unauthed');
          router.replace('/montree/login-select');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Cross-tab sign-out: if the principal signs out in another tab the
  // `montree_principal` key is cleared — this tab must not keep showing a
  // stale cockpit. The `storage` event fires only in OTHER tabs, so this
  // bounces the background tab to login the moment the session ends.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'montree_principal' && !e.newValue) {
        router.replace('/montree/login-select');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
          label: 'adminNav.calendar',
          icon: Calendar,
          match: (p) => p.startsWith('/montree/admin/appointments'),
        },
        // Phase 4 — Events. Same posture as Appointments — the page
        // itself surfaces a "feature disabled" hint when the flag is off.
        // Uses CalendarDays icon to differentiate from Appointments above
        // (avoids identical Calendar icon on two adjacent sidebar rows).
        {
          href: '/montree/admin/events',
          label: 'adminNav.events',
          icon: CalendarDays,
          match: (p) => p.startsWith('/montree/admin/events'),
        },
        {
          href: '/montree/admin/meeting-notes',
          label: 'adminNav.parentMeetings',
          icon: Mic,
          match: (p) => p.startsWith('/montree/admin/meeting-notes'),
        },
        {
          href: '/montree/admin/conversations',
          label: 'adminNav.conversations',
          icon: Lock,
          match: (p) => p.startsWith('/montree/admin/conversations'),
        },
        // Migration 292 — Founding-member perk: a direct line to Tredoux.
        // Hardcoded English label (renders via t()'s key-fallback) so no
        // i18n parity churn. Only present when the school is a Founding member.
        ...(foundingMember
          ? [
              {
                href: '/montree/admin/messages-tredoux',
                label: 'Message Tredoux',
                icon: Sparkles,
                match: (p: string) => p.startsWith('/montree/admin/messages-tredoux'),
              },
            ]
          : []),
      ]
    : NAV;

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const [signingOut, setSigningOut] = useState(false);
  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    // 🚨 Session 140 — AWAIT the logout so the httpOnly cookie is actually
    // cleared before we navigate. The old fire-and-forget raced: the redirect
    // fired before the cookie clear landed, leaving a half-dead session that
    // couldn't cleanly log out. Clear localStorage regardless of API outcome.
    try {
      await fetch('/api/montree/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* even if the call fails, still clear local + leave */ }
    try {
      localStorage.removeItem('montree_school');
      localStorage.removeItem('montree_principal');
      localStorage.removeItem('montree_session');
      clearLaunchSurface();
    } catch { /* ignore */ }
    // Hard navigation guarantees a clean slate — no stale React state, no
    // lingering cookie/localStorage race that a soft router.replace can hit.
    window.location.href = '/montree';
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
            // Session 140 — truncate so a long school name can't overflow the
            // mobile bar and collide with the language toggle on a phone.
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 10px',
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
        {/* 🚨 Session 154 — auth gate. Only mount the page body once auth/me
            has confirmed the cookie is live ('authed'). While 'checking' we
            show a lightweight skeleton (no layout jump, no premature data
            fetches). On 'unauthed' we render nothing and the redirect (fired
            in the effect above) carries the principal to login. This is the
            single mount point that stops the /snapshot + /billing/status 401
            storm and the remount/jumping loop. */}
        {authState === 'authed' ? children : <CockpitGateSkeleton show={authState === 'checking'} />}
      </main>

      {/* Astra — chief-of-staff float, visible on every cockpit page except
          /montree/admin (which IS Astra in full-page form). The component
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
