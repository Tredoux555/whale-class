'use client';

import { CSSProperties } from 'react';
import { BookOpen, X, Zap, Wrench, Youtube, BookMarked } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { QuickGuideData } from '@/components/montree/curriculum/types';

export interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: QuickGuideData | null;
  loading: boolean;
  onOpenFullDetails?: () => void;
}

// Dark forest tokens
const T = {
  scrim: 'rgba(2,8,5,0.72)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  card: 'rgba(255,255,255,0.06)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.28)',
  emerald: '#34d399',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const ctaPrimary: CSSProperties = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
};

const ctaRed: CSSProperties = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 14px',
  borderRadius: 12,
  background: T.redSoft,
  border: `1px solid ${T.redBorder}`,
  color: T.red,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function QuickGuideModal({
  isOpen,
  onClose,
  workName,
  guideData,
  loading,
  onOpenFullDetails,
}: QuickGuideModalProps) {
  const { t, locale } = useI18n();

  if (!isOpen) return null;

  const guideText = locale === 'zh' ? guideData?.quick_guide_zh : guideData?.quick_guide;
  const materials = locale === 'zh' ? guideData?.materials_zh : guideData?.materials;
  const hasGuide = !!guideText;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: T.scrim,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: T.sans,
      }}
    >
      <style>{`
        @media (min-width: 640px) { .qg-sheet { align-self: center !important; border-radius: 22px !important; } }
        .qg-scroll::-webkit-scrollbar { width: 8px; }
        .qg-scroll::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.22); border-radius: 4px; }
      `}</style>

      <div
        className="qg-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.sheet,
          border: `1px solid ${T.sheetBorder}`,
          borderRadius: '22px 22px 0 0',
          width: '100%',
          maxWidth: 540,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.55)',
          color: T.textPrimary,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${T.sheetBorder}`,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <BookOpen size={17} strokeWidth={1.75} color={T.amber} />
              <h3 style={{
                margin: 0,
                fontFamily: T.serif,
                fontSize: 17,
                fontWeight: 500,
                color: T.textPrimary,
                letterSpacing: -0.2,
              }}>
                {t('modal.quickGuide')}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
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
          </div>
          <p style={{
            margin: '6px 0 0',
            fontFamily: T.sans,
            fontSize: 13,
            color: T.amber,
            opacity: 0.85,
          }}>
            {workName}
          </p>
        </div>

        {/* Body */}
        <div
          data-guide="quick-guide-content"
          className="qg-scroll"
          style={{
            flex: 1,
            padding: 18,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: T.amberSoft,
                border: `1px solid ${T.amberBorder}`,
                marginBottom: 10,
                animation: 'qg-bounce 1.4s ease-in-out infinite',
              }}>
                <BookOpen size={20} strokeWidth={1.75} color={T.amber} />
              </div>
              <p style={{
                margin: 0,
                fontFamily: T.sans,
                fontSize: 13,
                color: T.textSecondary,
              }}>
                {t('common.loadingGuide')}
              </p>
              <style>{`
                @keyframes qg-bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
              `}</style>
            </div>
          ) : hasGuide ? (
            <>
              {/* Quick Guide */}
              <div style={{
                padding: 16,
                borderRadius: 16,
                background: T.amberSoft,
                border: `1px solid ${T.amberBorder}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 8,
                }}>
                  <Zap size={14} strokeWidth={1.75} color={T.amber} />
                  <p style={{
                    margin: 0,
                    fontFamily: T.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.amber,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}>
                    {t('modal.tenSecondGuide')}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontFamily: T.sans,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: T.textPrimary,
                }}>
                  {guideText.split('\n').map((line: string, i: number) => (
                    <p key={i} style={{ margin: 0 }}>{line}</p>
                  ))}
                </div>
              </div>

              {/* Materials */}
              {Array.isArray(materials) && materials.length > 0 && (
                <div style={{
                  padding: 14,
                  borderRadius: 14,
                  background: T.card,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginBottom: 6,
                  }}>
                    <Wrench size={13} strokeWidth={1.75} color={T.textSecondary} />
                    <p style={{
                      margin: 0,
                      fontFamily: T.sans,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.textSecondary,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                    }}>
                      {t('common.materials')}
                    </p>
                  </div>
                  <ul style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    fontFamily: T.sans,
                    fontSize: 13,
                    color: T.textSecondary,
                    lineHeight: 1.7,
                  }}>
                    {materials.map((m: string, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ color: T.amber, opacity: 0.7 }}>•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
            }}>
              <p style={{
                margin: '0 0 8px',
                fontFamily: T.sans,
                fontSize: 14,
                color: T.textSecondary,
              }}>
                {t('modal.noGuideAvailable')}
              </p>
              <p style={{
                margin: 0,
                fontFamily: T.sans,
                fontSize: 12,
                color: T.textMuted,
              }}>
                {t('modal.checkCurriculumPage')}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: 14,
          borderTop: `1px solid ${T.sheetBorder}`,
          display: 'flex',
          gap: 8,
        }}>
          <button
            data-guide="watch-video-btn"
            onClick={() => window.open(`https://youtube.com/results?search_query=${encodeURIComponent(guideData?.video_search_term || workName + ' Montessori presentation')}`, '_blank')}
            style={ctaRed}
          >
            <Youtube size={14} strokeWidth={1.75} />
            {t('modal.watchVideo')}
          </button>
          <button
            data-guide="full-details-btn"
            onClick={() => onOpenFullDetails?.()}
            style={ctaPrimary}
          >
            <BookMarked size={14} strokeWidth={1.75} />
            {t('modal.fullDetails')}
          </button>
        </div>
      </div>
    </div>
  );
}
