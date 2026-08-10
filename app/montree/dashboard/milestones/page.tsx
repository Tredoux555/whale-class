// /montree/dashboard/milestones/page.tsx
// Montree Milestones — the CLASS-LEVEL index. Every child in the classroom,
// each one a door into their own Milestones tab
// (/montree/dashboard/[childId]/milestones), which is where the actual
// check-in lives. This page holds no evaluation logic of its own; it exists so
// the "More" menu has somewhere to point that isn't a single child.
//
// TEACHER-FACING. The parent-facing artefact is the Growth Story, written
// elsewhere — nothing here is ever shown to a parent.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Sprout } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { useMontreeData } from '@/lib/montree/cache';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "var(--font-lora), Georgia, serif";

interface ChildRow {
  id: string;
  name: string;
  photo_url?: string;
}

export default function ClassMilestonesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setClassroomId(sess.classroom?.id ?? null);
    setReady(true);
  }, [router]);

  // Shared SWR cache — the same GET the dashboard + header already make, so a
  // teacher arriving here from either usually pays nothing for the list.
  const childrenUrl = classroomId ? `/api/montree/children?classroom_id=${classroomId}` : null;
  const { data, loading } = useMontreeData<{ children?: ChildRow[] }>(childrenUrl);

  const children = useMemo(
    () => [...(data?.children || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  if (!ready) return null;

  const milestonesOn = isEnabled('child_evaluation');

  return (
    <div className="min-h-screen bg-[#0a1a0f]" style={{ fontFamily: SANS }}>
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 60px' }}>
      <button
        onClick={() => router.back()}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 8 }}
      >
        <ChevronLeft size={16} strokeWidth={1.75} /> {t('common.back')}
      </button>

      <h1 style={{
        fontFamily: SERIF, fontSize: 28, fontWeight: 500,
        color: 'rgba(255,255,255,0.95)', margin: '0 0 6px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Sprout size={22} strokeWidth={1.75} color="#34d399" />
        {t('milestones.title')}
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.55 }}>
        {t('milestones.intro')}
      </p>

      {featuresLoading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {t('milestones.loading')}
        </div>
      ) : !milestonesOn ? (
        <div style={{
          padding: '40px 24px', borderRadius: 14, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
            {t('milestones.featureOffTitle')}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            {t('milestones.featureOffBody')}
          </div>
        </div>
      ) : loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {t('milestones.loading')}
        </div>
      ) : children.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          {t('students.noStudents')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/montree/dashboard/${child.id}/milestones`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 12, textDecoration: 'none',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {child.photo_url ? (
                // Supabase signed URL — native <img> is right for a 36px avatar.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={child.photo_url}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                  decoding="async"
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <span style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)',
                  color: '#34d399', fontSize: 14, fontWeight: 600,
                }}>
                  {child.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                {child.name}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(52,211,153,0.75)', flexShrink: 0 }}>
                {t('milestones.tab')} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
