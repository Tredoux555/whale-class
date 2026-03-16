'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const isDemo = searchParams.get('demo') === 'true';
  const schoolName = searchParams.get('school') || 'Your School';
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    // If we have a session_id, verify the payment was successful
    const sessionId = searchParams.get('session_id');
    if (sessionId && !isDemo) {
      // In production, verify the session with Stripe
      // For now, just show success
      setLoading(false);
    }
  }, [searchParams, isDemo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('welcome.settingUp' as TranslationKey)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('welcome.title' as TranslationKey)}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {isDemo ? (
              <>{t('welcome.demoReady' as TranslationKey)} <strong>{schoolName}</strong>!</>
            ) : (
              <>{t('welcome.trialStarted' as TranslationKey)}</>
            )}
          </p>

          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>{t('welcome.demoMode' as TranslationKey)}:</strong> {t('welcome.demoModeMessage' as TranslationKey)}
              </p>
            </div>
          )}

          <div className="bg-emerald-50 rounded-xl p-6 mb-8">
            <h2 className="font-bold text-emerald-800 mb-3">{t('welcome.schoolDetails' as TranslationKey)}</h2>
            <div className="text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('welcome.schoolLabel' as TranslationKey)}:</span>
                <span className="font-medium">{schoolName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('welcome.planLabel' as TranslationKey)}:</span>
                <span className="font-medium">{t('welcome.planValue' as TranslationKey)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('welcome.trialEndsLabel' as TranslationKey)}:</span>
                <span className="font-medium">
                  {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('welcome.getStarted' as TranslationKey)}</h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('welcome.step1Title' as TranslationKey)}</h3>
                <p className="text-gray-600 text-sm">
                  {t('welcome.step1Desc' as TranslationKey)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('welcome.step2Title' as TranslationKey)}</h3>
                <p className="text-gray-600 text-sm">
                  {t('welcome.step2Desc' as TranslationKey)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('welcome.step3Title' as TranslationKey)}</h3>
                <p className="text-gray-600 text-sm">
                  {t('welcome.step3Desc' as TranslationKey)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/teacher"
            className="bg-emerald-600 text-white text-center py-4 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            👩‍🏫 {t('welcome.openTeacherPortal' as TranslationKey)}
          </Link>
          <Link
            href="/admin/teacher-students"
            className="bg-white text-gray-700 text-center py-4 px-6 rounded-xl font-semibold hover:bg-gray-50 transition border-2 border-gray-200"
          >
            ⚙️ {t('welcome.adminSetup' as TranslationKey)}
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>{t('welcome.needHelp' as TranslationKey)} <a href="mailto:support@montree.xyz" className="text-emerald-600 hover:underline">support@montree.xyz</a></p>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
