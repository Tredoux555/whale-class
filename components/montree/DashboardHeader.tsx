// components/montree/DashboardHeader.tsx
// Persistent top header shown on ALL dashboard screens
// Contains: Montree logo, Language toggle, Inbox, Curriculum, Guru, Logout
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import InboxButton from './InboxButton';
import LanguageToggle from './LanguageToggle';

export default function DashboardHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [voiceObsEnabled, setVoiceObsEnabled] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) return;
    setSession(sess);

    // Check if voice observations feature is enabled for this school
    if (sess.school?.id) {
      montreeApi(`/api/montree/features?school_id=${sess.school.id}`)
        .then((data: { features?: { feature_key: string; enabled: boolean }[] }) => {
          const voiceFeature = data.features?.find((f) => f.feature_key === 'voice_observations');
          setVoiceObsEnabled(voiceFeature?.enabled || false);
        })
        .catch(() => {});
    }
  }, []);

  // Don't render until we have a session (avoid flash)
  if (!session?.teacher?.id) return null;

  return (
    <header className={`${isHomeschoolParent(session) ? HOME_THEME.headerBg : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white shadow-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)] print:hidden`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + classroom */}
        <Link href="/montree/dashboard" data-guide="nav-home" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <span className="text-2xl">🌳</span>
          <span className="font-bold text-lg">{session.classroom?.name || t('app.name')}</span>
        </Link>

        {/* Right: Action icons */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <InboxButton
            conversationId={session.teacher.id}
            userName={session.teacher.name || 'Teacher'}
            data-tutorial="inbox-button"
          />
          <Link
            href="/montree/dashboard/curriculum"
            data-tutorial="curriculum-link"
            data-guide="nav-curriculum"
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
            title={t('nav.curriculum')}
          >
            📚
          </Link>
          <Link
            href="/montree/dashboard/guru"
            data-tutorial="guru-link"
            data-guide="nav-guru"
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
            title={t('nav.guru')}
          >
            🧠
          </Link>
          {voiceObsEnabled && (
            <Link
              href="/montree/dashboard/voice-observation"
              data-guide="nav-voice-obs"
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
              title={t('voiceObs.title')}
            >
              🎙️
            </Link>
          )}
          <button
            onClick={() => { clearSession(); router.push('/montree/login'); }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
