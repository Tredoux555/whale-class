'use client';

// app/montree/offline/page.tsx
// Offline fallback page for PWA

import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        {/* Icon */}
        <div className="text-6xl mb-4">📴</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {t('offline.title' as TranslationKey)}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          {t('offline.message' as TranslationKey)}
        </p>

        {/* Tips */}
        <div className="bg-emerald-50 rounded-xl p-4 text-left mb-6">
          <h2 className="font-semibold text-emerald-800 mb-2">{t('offline.tipsTitle' as TranslationKey)}</h2>
          <ul className="text-sm text-emerald-700 space-y-1">
            <li>• {t('offline.tip1' as TranslationKey)}</li>
            <li>• {t('offline.tip2' as TranslationKey)}</li>
            <li>• {t('offline.tip3' as TranslationKey)}</li>
          </ul>
        </div>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
        >
          {t('offline.tryAgain' as TranslationKey)}
        </button>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          🌳 Montree
        </p>
      </div>
    </div>
  );
}
