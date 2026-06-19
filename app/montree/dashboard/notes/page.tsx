// /montree/dashboard/notes/page.tsx
// Dedicated page for classroom teacher notes + voice recording
// Teachers can write class-wide notes or tag a specific child
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import TeacherNotes from '@/components/montree/TeacherNotes';

interface Child {
  id: string;
  name: string;
}

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function NotesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  const fetchChildren = useCallback(async (classId: string) => {
    try {
      const res = await montreeApi(`/api/montree/children?classroom_id=${classId}`);
      if (res.ok) {
        const data = await res.json();
        const kids: Child[] = (data.children || []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
        }));
        kids.sort((a, b) => a.name.localeCompare(b.name));
        setChildren(kids);
      }
    } catch {
      // Silent fail — notes still work without children list
    }
  }, []);

  useEffect(() => {
    async function init() {
      let s = getSession();
      if (!s) s = await recoverSession();
      if (!s) {
        router.replace('/montree/login');
        return;
      }
      setSession(s);
      setLoading(false);

      const classId = s.classroom?.id;
      if (classId) {
        fetchChildren(classId);
      }
    }
    init();
  }, [router, fetchChildren]);

  if (loading || !session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
        color: T.emeraldDim,
        fontSize: 16,
      }}>
        <div style={{ animation: 'cg-pulse 1.6s ease-in-out infinite' }}>
          {t('common.loading')}
        </div>
        <style>{`
          @keyframes cg-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  const classroomId = session.classroom?.id;
  const teacherId = session.teacher?.id || '';
  const teacherName = session.teacher?.name || '';

  if (!classroomId) {
    router.replace('/montree/dashboard');
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <main style={{
        maxWidth: 760,
        width: '100%',
        margin: '0 auto',
        padding: '36px 24px 60px',
      }}>
        {/* heading row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 22,
        }}>
          <button
            onClick={() => router.back()}
            aria-label={t('common.back')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 140ms ease',
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
          }}>
            <NotebookPen size={22} strokeWidth={1.75} color={T.emerald} />
            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 26,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.3,
              lineHeight: 1.1,
            }}>
              {t('nav.notes')}
            </h1>
          </div>
        </div>

        {/* notes component */}
        <TeacherNotes
          classroomId={classroomId}
          teacherId={teacherId}
          teacherName={teacherName}
          children={children}
        />
      </main>
    </div>
  );
}
