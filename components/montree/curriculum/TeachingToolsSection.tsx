'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';

export default function TeachingToolsSection() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('curriculum.teachingTools')}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Language Guide hidden — temporarily disabled */}
        <button onClick={() => router.push('/montree/dashboard/card-generator')}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-lg flex-shrink-0">
            🃏
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm">{t('curriculum.threePartCards')}</p>
            <p className="text-xs text-gray-400">{t('curriculum.nomenclatureCards')}</p>
          </div>
        </button>
        {/* Vocab Flashcards hidden — temporarily disabled */}
      </div>
    </div>
  );
}
