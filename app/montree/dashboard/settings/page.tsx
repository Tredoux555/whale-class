// /montree/dashboard/settings/page.tsx
// Settings - Teacher profile, preferences
// Fixed: Removed admin features - teacher settings only
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import DeleteAccountSection from '@/components/montree/DeleteAccountSection';

const SETTINGS_ITEMS = [
  { emoji: '🖼️', key: 'settings.mediaGallery', descKey: 'settings.mediaGalleryDesc', href: '/montree/dashboard/media' },
  { emoji: '📊', key: 'settings.reports', descKey: 'settings.reportsDesc', href: '/montree/dashboard/weekly-wrap' },
  // Games tile REMOVED Jul 3 2026 — feature retired from teacher-facing nav.
];

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [teacherName, setTeacherName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [classroomIcon, setClassroomIcon] = useState('🌳');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/montree/login');
      return;
    }
    setTeacherName(session.teacher?.name || 'Teacher');
    setClassroomName(session.classroom?.name || 'My Classroom');
  }, [router]);

  const handleSignOut = () => {
    clearSession();
    router.push('/montree/login');
  };

  return (
    <div className="min-h-screen relative" style={{ background: '#0a1a0f', color: '#fff' }}>
      {/* Fixed off-centre emerald glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
      }} />
      <div className="relative" style={{ zIndex: 1 }}>
      {/* Sub-header */}
      <div className="border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(8,20,12,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <span className="text-xl">⚙️</span>
        <h1 className="font-bold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('settings.title')}</h1>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Section */}
        <div className="bg-white/[0.06] rounded-2xl p-5 border border-[rgba(52,211,153,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(16,185,129,0.15)' }}>
              {classroomIcon}
            </div>
            <div className="flex-1">
              <div className="text-white/95 font-bold text-lg">{teacherName || 'Teacher'}</div>
              <div className="text-white/50 text-sm">{classroomName}</div>
              <div className="text-[#34d399] text-xs mt-1">✓ {t('settings.active')}</div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide px-1">{t('settings.quickAccess')}</h3>
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white/[0.06] hover:bg-white/[0.10] border border-[rgba(52,211,153,0.15)] hover:border-[rgba(52,211,153,0.35)] rounded-xl p-4 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="text-white/90 font-medium">{t(item.key)}</div>
                <div className="text-white/50 text-sm">{t(item.descKey)}</div>
              </div>
              <span className="text-white/30 group-hover:text-[#34d399] transition-colors">→</span>
            </Link>
          ))}
        </div>

        {/* Delete Account (Apple App Store Guideline 5.1.1(v)) */}
        <DeleteAccountSection redirectTo="/montree/login" onDeleted={clearSession} dark />

        {/* Sign Out */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 font-medium hover:bg-red-500/20 transition-all"
          >
            🚪 {t('settings.signOut')}
          </button>
        </div>

        {/* Version */}
        <div className="text-center text-white/40 text-xs pt-4">
          {t('settings.version')} 🌳
        </div>
      </main>
      </div>
    </div>
  );
}
