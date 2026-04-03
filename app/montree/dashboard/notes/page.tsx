// /montree/dashboard/notes/page.tsx
// Dedicated page for classroom teacher notes + voice recording
// Teachers can write class-wide notes or tag a specific child
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import TeacherNotes from '@/components/montree/TeacherNotes';

interface Child {
  id: string;
  name: string;
}

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
        // Sort alphabetically
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

      // Fetch children for the child tag selector
      const classId = s.classroom?.id;
      if (classId) {
        fetchChildren(classId);
      }
    }
    init();
  }, [router, fetchChildren]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-emerald-600 text-lg">{t('common.loading')}</div>
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors text-gray-600"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            📝 {t('nav.notes')}
          </h1>
        </div>

        {/* Notes component — full width, no max-height constraint */}
        <TeacherNotes
          classroomId={classroomId}
          teacherId={teacherId}
          teacherName={teacherName}
          children={children}
        />
      </div>
    </div>
  );
}
