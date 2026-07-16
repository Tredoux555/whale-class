// /montree/dashboard/tools/page.tsx
// Tools page - Videos, Reports, Admin
// Polished Session 64 - Consistent with Montree theme
'use client';

import Link from 'next/link';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function ToolsPage() {
  const { t } = useI18n();

  const TOOLS = [
    {
      href: '/montree/admin/parent-codes',
      icon: '👨‍👩‍👧',
      titleKey: 'teacherTools.parentCodes' as TranslationKey,
      descKey: 'teacherTools.parentCodesDesc' as TranslationKey,
    },
    {
      href: '/montree/dashboard/videos/preview',
      icon: '🎬',
      titleKey: 'teacherTools.weeklyVideos' as TranslationKey,
      descKey: 'teacherTools.weeklyVideosDesc' as TranslationKey,
    },
    {
      href: '/montree/dashboard/weekly-wrap',
      icon: '📊',
      titleKey: 'teacherTools.weeklyReports' as TranslationKey,
      descKey: 'teacherTools.weeklyReportsDesc' as TranslationKey,
    },
    // Games card REMOVED Jul 3 2026 — feature retired from teacher-facing nav.
    {
      href: '/admin/curriculum-editor',
      icon: '📚',
      titleKey: 'teacherTools.curriculumEditor' as TranslationKey,
      descKey: 'teacherTools.curriculumEditorDesc' as TranslationKey,
    },
    {
      href: '/admin/weekly-planning',
      icon: '📅',
      titleKey: 'teacherTools.weeklyPlanning' as TranslationKey,
      descKey: 'teacherTools.weeklyPlanningDesc' as TranslationKey,
    },
    {
      href: '/montree/admin',
      icon: '⚙️',
      titleKey: 'teacherTools.schoolAdmin' as TranslationKey,
      descKey: 'teacherTools.schoolAdminDesc' as TranslationKey,
    },
  ];

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: '#0a1a0f', color: '#fff' }}>
      {/* Fixed off-centre emerald glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
      }} />
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
      {/* Sub-header */}
      <div className="border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(8,20,12,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <span className="text-xl">🔧</span>
        <h1 className="font-bold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('teacherTools.title' as TranslationKey)}</h1>
      </div>

      {/* Tools Grid */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-center gap-4 p-5 bg-white/[0.06] hover:bg-white/[0.10] border border-[rgba(52,211,153,0.15)] hover:border-[rgba(52,211,153,0.35)] rounded-2xl transition-all group"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <div className="flex-1">
                <div className="text-white/95 font-bold text-lg">{t(tool.titleKey)}</div>
                <div className="text-white/60 text-sm">{t(tool.descKey)}</div>
              </div>
              <span className="text-white/30 group-hover:text-[#34d399] text-xl transition-colors">→</span>
            </Link>
          ))}
        </div>

        {/* Quick tip */}
        <div className="max-w-2xl mx-auto mt-6 p-4 rounded-xl border border-[rgba(52,211,153,0.15)]" style={{ background: 'rgba(52,211,153,0.06)' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-white/70">
              <strong className="text-white/90">{t('teacherTools.tipLabel' as TranslationKey)}</strong> {t('teacherTools.tipText' as TranslationKey)}
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
