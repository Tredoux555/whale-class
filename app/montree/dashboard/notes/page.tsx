// /montree/dashboard/notes/page.tsx
// Dedicated page for classroom teacher notes + voice recording
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import TeacherNotes from '@/components/montree/TeacherNotes';

export default function NotesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
    init();
  }, [router]);

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
        />
      </div>
    </div>
  );
}
