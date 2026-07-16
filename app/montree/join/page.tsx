'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const code = searchParams.get('code');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToLogin = () => {
    router.push('/montree/login');
  };

  const primaryBtn: React.CSSProperties = {
    padding: '14px 26px',
    background: '#1D5C41',
    color: '#fff',
    fontWeight: 500,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        color: 'rgba(255,250,240,0.58)',
        background:
          'radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%), linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)',
      }}
    >
      {/* Top bar — home link + language toggle */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5">
        <Link href="/montree" className="flex items-center gap-2.5 no-underline">
          <MontreeLogo size={26} showBackground={false} />
          <span style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.02em', color: 'rgba(232,201,106,0.85)' }}>Montree</span>
        </Link>
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 400, fontSize: '1.7rem', color: 'rgba(255,250,240,0.92)' }}>{t('join.welcome' as TranslationKey)}</h1>
          <p style={{ color: 'rgba(255,250,240,0.58)', marginTop: 6 }}>{t('join.classroomAwaits' as TranslationKey)}</p>
        </div>

        {/* Main Card */}
        <div style={{ background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
          {code ? (
            <>
              <div className="text-center mb-6">
                <p style={{ color: 'rgba(255,250,240,0.58)', marginBottom: 16 }}>{t('join.yourLoginCode' as TranslationKey)}</p>
                <div
                  onClick={handleCopyCode}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(232,201,106,0.25)', borderRadius: 14, padding: 16, cursor: 'pointer' }}
                >
                  <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '2rem', fontWeight: 600, letterSpacing: '0.3em', color: '#E8C96A' }}>
                    {code}
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(232,201,106,0.55)', marginTop: 8 }}>
                    {copied ? `✓ ${t('join.copied' as TranslationKey)}` : t('join.tapToCopy' as TranslationKey)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={handleGoToLogin} className="w-full" style={primaryBtn}>
                  {t('join.loginNow' as TranslationKey)} →
                </button>

                <div className="text-center text-sm" style={{ color: 'rgba(255,250,240,0.34)' }}>
                  {t('join.saveCode' as TranslationKey)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🔗</div>
                <p style={{ color: 'rgba(255,250,240,0.58)' }}>{t('join.noCodeProvided' as TranslationKey)}</p>
                <p className="text-sm mt-2" style={{ color: 'rgba(255,250,240,0.34)' }}>{t('join.askPrincipal' as TranslationKey)}</p>
              </div>
              <button onClick={handleGoToLogin} className="w-full" style={primaryBtn}>
                {t('join.goToLogin' as TranslationKey)} →
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm" style={{ color: 'rgba(255,250,240,0.5)' }}>
          <p className="font-medium mb-2">{t('join.howToLogin' as TranslationKey)}</p>
          <ol className="text-left max-w-xs mx-auto space-y-1">
            <li>1. {t('join.step1' as TranslationKey)}</li>
            <li>2. {t('join.step2' as TranslationKey)}</li>
            <li>3. {t('join.step3' as TranslationKey)}</li>
            <li>4. {t('join.step4' as TranslationKey)} 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030b08' }}>
        <div className="animate-pulse" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: '1.4rem', letterSpacing: '0.06em', color: 'rgba(232,201,106,0.6)' }}>Montree</div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
