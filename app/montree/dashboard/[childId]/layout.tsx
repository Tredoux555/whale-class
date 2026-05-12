// /montree/dashboard/[childId]/layout.tsx
// Session 112: Shared layout - FAST loading, parallel fetches
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';

// ── Dark forest tokens ────────────────────────────────────────────────────────
const C = {
  border:      'rgba(52,211,153,0.15)',
  emerald:     '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.08)',
  glassBtn:    'rgba(255,255,255,0.10)',
  glassBtnHvr: 'rgba(255,255,255,0.18)',
  textMd:      'rgba(255,255,255,0.85)',
  textMute:    'rgba(255,255,255,0.50)',
};
const SERIF = "var(--font-lora), 'Iowan Old Style', Georgia, serif";
const SANS  = "'Inter', -apple-system, system-ui, sans-serif";

interface ChildInfo {
  id: string;
  name: string;
  photo_url?: string;
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useParams();
  const childId  = params.childId as string;

  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [child,   setChild]   = useState<ChildInfo | null>(null);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess);

    if (childId && sess.school?.id) {
      fetch(`/api/montree/children/${childId}`, {
        headers: { 'x-school-id': sess.school.id },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.child) setChild(data.child); })
        .catch(() => {});
    }
  }, [childId, router]);

  const getActiveTab = () => {
    if (pathname.endsWith('/gallery'))      return 'gallery';
    if (pathname.endsWith('/reports'))      return 'gallery';
    if (pathname.endsWith('/progress'))     return 'progress';
    if (pathname.endsWith('/profile'))      return 'profile';
    if (pathname.endsWith('/observations')) return 'observations';
    return 'week';
  };
  const activeTab = getActiveTab();

  const tabs: { id: string; label: string; href: string }[] = [
    { id: 'gallery', label: `📸 ${t('nav.gallery' as any) || 'Review'}`, href: `/montree/dashboard/${childId}/gallery` },
  ];

  if (!session) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a1a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="animate-bounce" style={{ fontSize: 40 }}>🌳</div>
      </div>
    );
  }

  const displayName    = child?.name || t('common.student' as any);
  const displayInitial = child?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', color: '#fff', fontFamily: SANS }}>

      {/* Fixed off-centre emerald glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
      }} />

      {/* Child sub-header */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(7,18,12,0.96) 0%, rgba(7,18,12,0.90) 100%)',
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        position: 'sticky', top: 0, zIndex: 40,
        fontFamily: SANS,
      }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Back button */}
            <Link
              href="/montree/dashboard"
              style={{
                width: 36, height: 36,
                background: C.glassBtn,
                borderRadius: 10, border: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', textDecoration: 'none', flexShrink: 0,
                transition: 'background 140ms ease',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = C.glassBtnHvr)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = C.glassBtn)}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </Link>

            {/* Child avatar — bioluminescent */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(16,185,129,0.15)',
              boxShadow: '0 0 16px 4px rgba(52,211,153,0.28)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {child?.photo_url ? (
                <img src={child.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : (
                <span style={{
                  fontFamily: SERIF, fontWeight: 500,
                  fontSize: 15, color: '#fff',
                  textShadow: '0 0 10px rgba(167,243,208,0.35)',
                }}>{displayInitial}</span>
              )}
            </div>

            {/* Name + classroom */}
            <div>
              <h1 style={{
                fontFamily: SERIF, fontWeight: 500,
                fontSize: 16, color: '#fff', margin: 0, lineHeight: 1.2,
              }}>{displayName}</h1>
              <p style={{
                fontSize: 11, color: C.textMute,
                margin: 0, marginTop: 1, fontFamily: SANS,
              }}>{session.classroom?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar — only when multiple tabs */}
      {tabs.length > 1 && (
        <div style={{
          background: 'rgba(8,20,12,0.90)',
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky', top: 57, zIndex: 30,
        }}>
          <div style={{ display: 'flex', width: '100%' }}>
            {tabs.map(tab => (
              <Link
                key={tab.id}
                href={tab.href}
                data-guide={`tab-${tab.id}`}
                style={{
                  flex: 1, padding: '10px 4px', textAlign: 'center',
                  fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  color: activeTab === tab.id ? C.emerald : C.textMute,
                  background: activeTab === tab.id ? C.emeraldSoft : 'transparent',
                  borderBottom: activeTab === tab.id ? `2px solid ${C.emerald}` : '2px solid transparent',
                  transition: 'color 140ms ease, background 140ms ease',
                  fontFamily: SANS,
                }}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: 896, margin: '0 auto', padding: '16px', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
