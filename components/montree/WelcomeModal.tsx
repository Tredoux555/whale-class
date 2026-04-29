'use client';

import { X, ArrowRight, Sprout } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface WelcomeModalProps {
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Dark forest tokens
const T = {
  scrim: 'rgba(2,8,5,0.72)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function WelcomeModal({
  teacherName,
  isOpen,
  onClose,
}: WelcomeModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        @keyframes wm-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes wm-slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes wm-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        .wm-backdrop { animation: wm-fadeIn 280ms ease-out; }
        .wm-card { animation: wm-slideUp 380ms cubic-bezier(0.22, 1, 0.36, 1); }
        .wm-bob { animation: wm-bob 2.4s ease-in-out infinite; }
      `}</style>

      <div
        className="wm-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: T.scrim,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          pointerEvents: 'none',
          fontFamily: T.sans,
        }}
      >
        <div
          className="wm-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 460,
            padding: '36px 32px 28px',
            background: T.sheet,
            border: `1px solid ${T.sheetBorder}`,
            borderRadius: 24,
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            color: T.textPrimary,
            pointerEvents: 'auto',
            backgroundImage: 'radial-gradient(ellipse 480px 320px at 50% -10%, rgba(52,211,153,0.16), transparent 60%)',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textSecondary,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="wm-bob" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 76,
              height: 76,
              borderRadius: 22,
              marginBottom: 18,
              background: 'linear-gradient(135deg, #34d399, #10b981)',
              border: '1px solid rgba(52,211,153,0.55)',
              boxShadow: '0 10px 30px rgba(16,185,129,0.30)',
              color: '#06281a',
            }}>
              <Sprout size={34} strokeWidth={1.75} />
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.4,
              lineHeight: 1.15,
            }}>
              {t('welcome.title').replace('{name}', teacherName)}
            </h2>
          </div>

          {/* Body */}
          <p style={{
            margin: '0 0 26px',
            textAlign: 'center',
            fontFamily: T.sans,
            fontSize: 14,
            lineHeight: 1.65,
            color: T.textSecondary,
          }}>
            {t('welcome.message')}
          </p>

          {/* CTA */}
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 14,
              background: 'linear-gradient(180deg, #34d399, #10b981)',
              border: '1px solid rgba(52,211,153,0.55)',
              color: '#06281a',
              fontFamily: T.sans,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.1,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
              transition: 'transform 120ms ease',
            }}
          >
            {t('welcome.cta')}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}
