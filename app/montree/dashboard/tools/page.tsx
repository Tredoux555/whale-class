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
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
    },
    {
      href: '/montree/dashboard/videos/preview',
      icon: '🎬',
      titleKey: 'teacherTools.weeklyVideos' as TranslationKey,
      descKey: 'teacherTools.weeklyVideosDesc' as TranslationKey,
      gradient: 'from-purple-500 to-violet-600',
      hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
    },
    {
      href: '/montree/dashboard/reports',
      icon: '📊',
      titleKey: 'teacherTools.weeklyReports' as TranslationKey,
      descKey: 'teacherTools.weeklyReportsDesc' as TranslationKey,
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
    },
    {
      href: '/montree/dashboard/games',
      icon: '🎮',
      titleKey: 'teacherTools.englishGames' as TranslationKey,
      descKey: 'teacherTools.englishGamesDesc' as TranslationKey,
      gradient: 'from-cyan-500 to-blue-600',
      hoverGradient: 'hover:from-cyan-600 hover:to-blue-700',
    },
    {
      href: '/admin/curriculum-editor',
      icon: '📚',
      titleKey: 'teacherTools.curriculumEditor' as TranslationKey,
      descKey: 'teacherTools.curriculumEditorDesc' as TranslationKey,
      gradient: 'from-amber-500 to-orange-600',
      hoverGradient: 'hover:from-amber-600 hover:to-orange-700',
    },
    {
      href: '/admin/weekly-planning',
      icon: '📅',
      titleKey: 'teacherTools.weeklyPlanning' as TranslationKey,
      descKey: 'teacherTools.weeklyPlanningDesc' as TranslationKey,
      gradient: 'from-pink-500 to-rose-600',
      hoverGradient: 'hover:from-pink-600 hover:to-rose-700',
    },
    {
      href: '/montree/admin',
      icon: '⚙️',
      titleKey: 'teacherTools.schoolAdmin' as TranslationKey,
      descKey: 'teacherTools.schoolAdminDesc' as TranslationKey,
      gradient: 'from-gray-500 to-slate-600',
      hoverGradient: 'hover:from-gray-600 hover:to-slate-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">🔧</span>
        <h1 className="font-bold text-gray-800">{t('teacherTools.title' as TranslationKey)}</h1>
      </div>

      {/* Tools Grid */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex items-center gap-4 p-5 bg-gradient-to-br ${tool.gradient} ${tool.hoverGradient} rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-lg">{t(tool.titleKey)}</div>
                <div className="text-white/80 text-sm">{t(tool.descKey)}</div>
              </div>
              <span className="text-white/60 text-xl">→</span>
            </Link>
          ))}
        </div>

        {/* Quick tip */}
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-emerald-100 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-emerald-800">
              <strong>{t('teacherTools.tipLabel' as TranslationKey)}</strong> {t('teacherTools.tipText' as TranslationKey)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
