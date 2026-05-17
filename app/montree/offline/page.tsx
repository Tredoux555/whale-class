'use client';

// app/montree/offline/page.tsx
// Offline fallback page for PWA.
//
// This page is precached by the service worker (montree-sw.js
// PRECACHE_ASSETS) and served as the navigation fallback when the network
// is unavailable. The page itself must be visually self-contained — by
// definition the user is offline when they see it, so any external
// resource (font, image, API) won't load. We rely on (a) the font system
// stack defaulting to Lora-then-Georgia via the font-lora CSS variable
// which is set in the cached HTML head, and (b) inline SVG for the icon.
//
// Theme: dark forest (matches the rest of the app). Previously a
// light-emerald card on white — visually inconsistent with the PWA.

import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, rgba(52,211,153,0.15), transparent 50%), linear-gradient(180deg, #0a1a0f 0%, #0f1f15 100%)',
        color: 'rgba(255,255,255,0.92)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '32px 28px',
          borderRadius: 16,
          background: 'rgba(8,20,12,0.65)',
          border: '1px solid rgba(52,211,153,0.18)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        {/* Cloud-off icon — inline SVG so no network fetch needed */}
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
          <svg
            width={56}
            height={56}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(232,201,106,0.85)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m2 2 20 20" />
            <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
            <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 9.768 6.07" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: -0.3,
            margin: '0 0 8px',
            color: 'rgba(255,255,255,0.95)',
          }}
        >
          {t('offline.title' as TranslationKey)}
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(234,241,230,0.65)',
            margin: '0 0 22px',
          }}
        >
          {t('offline.message' as TranslationKey)}
        </p>

        <div
          style={{
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.22)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: '#E8C96A',
              marginBottom: 8,
            }}
          >
            {t('offline.tipsTitle' as TranslationKey)}
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'rgba(234,241,230,0.78)',
            }}
          >
            <li>• {t('offline.tip1' as TranslationKey)}</li>
            <li>• {t('offline.tip2' as TranslationKey)}</li>
            <li>• {t('offline.tip3' as TranslationKey)}</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 12,
            background: '#34d399',
            border: 'none',
            color: '#0a1a0f',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {t('offline.tryAgain' as TranslationKey)}
        </button>
      </div>
    </div>
  );
}
