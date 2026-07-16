'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030b08' }}>
        <div className="text-center">
          <div className="animate-pulse mb-4" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: '1.4rem', letterSpacing: '0.06em', color: 'rgba(232,201,106,0.6)' }}>Montree</div>
          <p style={{ color: 'rgba(255,250,240,0.58)' }}>{t('welcome.settingUp' as TranslationKey)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        color: 'rgba(255,250,240,0.58)',
        background:
          'radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%), linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)',
      }}
    >
      {/* Top bar — home link + language toggle */}
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-6">
        <Link href="/montree" className="flex items-center gap-2.5 no-underline">
          <MontreeLogo size={26} showBackground={false} />
          <span style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.02em', color: 'rgba(232,201,106,0.85)' }}>Montree</span>
        </Link>
        <LanguageToggle />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="text-center mb-8" style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 32 }}>
          <div className="text-5xl mb-4">🎉</div>
          <h1 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 400, fontSize: '1.9rem', color: 'rgba(255,250,240,0.92)', marginBottom: 8 }}>
            {t('welcome.title' as TranslationKey)}
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'rgba(255,250,240,0.58)', marginBottom: 24 }}>
            {isDemo ? (
              <>{t('welcome.demoReady' as TranslationKey)} <strong style={{ color: 'rgba(255,250,240,0.85)' }}>{schoolName}</strong>!</>
            ) : (
              <>{t('welcome.trialStarted' as TranslationKey)}</>
            )}
          </p>

          {isDemo && (
            <div className="mb-6" style={{ background: 'rgba(232,201,106,0.08)', border: '1px solid rgba(232,201,106,0.25)', borderRadius: 12, padding: 16 }}>
              <p className="text-sm" style={{ color: 'rgba(255,250,240,0.72)' }}>
                <strong style={{ color: 'rgba(232,201,106,0.85)' }}>{t('welcome.demoMode' as TranslationKey)}:</strong> {t('welcome.demoModeMessage' as TranslationKey)}
              </p>
            </div>
          )}

          <div className="mb-8" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
            <h2 className="mb-3" style={{ fontWeight: 500, color: 'rgba(232,201,106,0.85)' }}>{t('welcome.schoolDetails' as TranslationKey)}</h2>
            <div className="text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,250,240,0.5)' }}>{t('welcome.schoolLabel' as TranslationKey)}:</span>
                <span className="font-medium" style={{ color: 'rgba(255,250,240,0.85)' }}>{schoolName}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,250,240,0.5)' }}>{t('welcome.planLabel' as TranslationKey)}:</span>
                <span className="font-medium" style={{ color: 'rgba(255,250,240,0.85)' }}>{t('welcome.planValue' as TranslationKey)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,250,240,0.5)' }}>{t('welcome.trialEndsLabel' as TranslationKey)}:</span>
                <span className="font-medium" style={{ color: 'rgba(255,250,240,0.85)' }}>
                  {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 400, color: 'rgba(255,250,240,0.92)' }}>{t('welcome.getStarted' as TranslationKey)}</h2>

          <div className="space-y-4 text-left">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="flex items-start gap-4 p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(232,201,106,0.35)', color: 'rgba(232,201,106,0.9)', fontWeight: 500 }}>
                  {n}
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: 'rgba(255,250,240,0.9)' }}>{t(`welcome.step${n}Title` as TranslationKey)}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,250,240,0.5)' }}>
                    {t(`welcome.step${n}Desc` as TranslationKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/teacher"
            className="text-center"
            style={{ padding: '14px 24px', borderRadius: 10, background: '#1D5C41', color: '#fff', fontWeight: 500, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
          >
            👩‍🏫 {t('welcome.openTeacherPortal' as TranslationKey)}
          </Link>
          <Link
            href="/admin/teacher-students"
            className="text-center"
            style={{ padding: '14px 24px', borderRadius: 10, background: 'transparent', color: 'rgba(232,201,106,0.9)', fontWeight: 500, border: '1px solid rgba(232,201,106,0.35)', textDecoration: 'none' }}
          >
            ⚙️ {t('welcome.adminSetup' as TranslationKey)}
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-sm" style={{ color: 'rgba(255,250,240,0.5)' }}>
          <p>{t('welcome.needHelp' as TranslationKey)} <a href="mailto:support@montree.xyz" style={{ color: 'rgba(232,201,106,0.8)' }}>support@montree.xyz</a></p>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030b08' }}>
        <div className="text-center">
          <div className="animate-pulse mb-4" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: '1.4rem', letterSpacing: '0.06em', color: 'rgba(232,201,106,0.6)' }}>Montree</div>
          <p style={{ color: 'rgba(255,250,240,0.58)' }}>Loading...</p>
        </div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
