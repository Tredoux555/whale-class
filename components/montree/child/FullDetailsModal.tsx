'use client';

import React, { CSSProperties } from 'react';
import {
  X, Zap, ListChecks, Target, Wrench, AlertCircle, Sparkles, Lightbulb,
} from 'lucide-react';
import { QuickGuideData } from '@/components/montree/curriculum/types';
import { useI18n } from '@/lib/montree/i18n';

interface FullDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: QuickGuideData | null;
  loading: boolean;
}

// Dark forest tokens
const T = {
  scrim: 'rgba(2,8,5,0.72)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  card: 'rgba(255,255,255,0.06)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.35)',
  amberStrong: 'rgba(245,158,11,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const sectionTitle: CSSProperties = {
  margin: '0 0 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 700,
  color: T.emerald,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
};

const blockCard: CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: T.card,
  border: '1px solid rgba(52,211,153,0.15)',
};

export default function FullDetailsModal({
  isOpen,
  onClose,
  workName,
  guideData,
  loading,
}: FullDetailsModalProps) {
  const { t } = useI18n();
  if (!isOpen) {
    return null;
  }

  // Same fix as QuickGuideModal: the /works/guide API has already merged the
  // matching `guide_content_<locale>` JSONB into these flat fields. The old
  // `_zh`-suffixed reads pointed at phantom fields that no migration created
  // and no API populates, which is why Chinese full-details were blank.
  const quickGuide = guideData?.quick_guide;
  const directAims = guideData?.direct_aims;
  const materials = guideData?.materials;
  const controlOfError = guideData?.control_of_error;
  const whyItMatters = guideData?.why_it_matters;

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.sans,
      }}
    >
      <style>{`
        .fd-scroll::-webkit-scrollbar { width: 8px; }
        .fd-scroll::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.22); border-radius: 4px; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: T.sheet,
          border: `1px solid ${T.sheetBorder}`,
          borderRadius: 22,
          overflow: 'hidden',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          color: T.textPrimary,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t('common.closeModal')}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.32)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: T.textPrimary,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        {/* Scrollable content */}
        <div
          className="fd-scroll"
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px 24px 22px',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(52,211,153,0.10))',
            borderBottom: `1px solid ${T.sheetBorder}`,
          }}>
            <h2 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 24,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.4,
              lineHeight: 1.15,
              paddingRight: 40,
            }}>
              {workName}
            </h2>
          </div>

          {/* Body */}
          <div style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  border: `3px solid ${T.emeraldDim}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'fd-spin 0.9s linear infinite',
                }} />
                <style>{`@keyframes fd-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : guideData ? (
              <>
                {/* Quick Guide */}
                {quickGuide && (
                  <div style={{
                    padding: 16,
                    borderRadius: 14,
                    background: T.amberSoft,
                    border: `1px solid ${T.amberBorder}`,
                  }}>
                    <h3 style={{
                      ...sectionTitle,
                      color: T.amber,
                    }}>
                      <Zap size={13} strokeWidth={1.75} />
                      {t('details.quickGuide')}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontFamily: T.sans,
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: T.textPrimary,
                    }}>
                      {quickGuide}
                    </p>
                  </div>
                )}

                {/* Step-by-Step Presentation */}
                <div>
                  <h3 style={sectionTitle}>
                    <ListChecks size={13} strokeWidth={1.75} />
                    {t('details.stepByStep')}
                  </h3>
                  {guideData.presentation_steps && guideData.presentation_steps.filter(s => s.title || s.description).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {guideData.presentation_steps.filter(s => s.title || s.description).map((step) => (
                        <div
                          key={step.step}
                          style={{
                            ...blockCard,
                            display: 'flex',
                            gap: 14,
                          }}
                        >
                          <div style={{ flexShrink: 0 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: T.emerald,
                              color: '#06281a',
                              fontFamily: T.sans,
                              fontSize: 13,
                              fontWeight: 700,
                            }}>
                              {step.step}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {step.title && (
                              <h4 style={{
                                margin: '0 0 6px',
                                fontFamily: T.sans,
                                fontSize: 14,
                                fontWeight: 600,
                                color: T.textPrimary,
                              }}>
                                {step.title}
                              </h4>
                            )}
                            {step.description && (
                              <p style={{
                                margin: 0,
                                fontFamily: T.sans,
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: T.textSecondary,
                              }}>
                                {step.description}
                              </p>
                            )}
                            {step.tip && (
                              <div style={{
                                marginTop: 10,
                                padding: '10px 12px',
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.25)',
                                borderLeft: `2px solid ${T.amber}`,
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginBottom: 4,
                                }}>
                                  <Lightbulb size={11} strokeWidth={1.75} color={T.amber} />
                                  <span style={{
                                    fontFamily: T.sans,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: T.amber,
                                    letterSpacing: 0.4,
                                    textTransform: 'uppercase',
                                  }}>
                                    {t('details.teacherTip')}
                                  </span>
                                </div>
                                <p style={{
                                  margin: 0,
                                  fontFamily: T.sans,
                                  fontSize: 12.5,
                                  lineHeight: 1.55,
                                  color: T.textPrimary,
                                }}>
                                  {step.tip}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      ...blockCard,
                      textAlign: 'center',
                    }}>
                      <p style={{
                        margin: 0,
                        fontFamily: T.sans,
                        fontSize: 13,
                        color: T.textMuted,
                        fontStyle: 'italic',
                      }}>
                        {t('details.stepsComingSoon')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Direct Aims */}
                {Array.isArray(directAims) && directAims.length > 0 && (
                  <div>
                    <h3 style={sectionTitle}>
                      <Target size={13} strokeWidth={1.75} />
                      {t('details.directAims')}
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {directAims.map((aim, index) => (
                        <li key={index} style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}>
                          <span style={{ color: T.emerald, marginTop: 2 }}>•</span>
                          <span style={{
                            fontFamily: T.sans,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: T.textPrimary,
                          }}>
                            {aim}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Materials */}
                {Array.isArray(materials) && materials.length > 0 && (
                  <div>
                    <h3 style={sectionTitle}>
                      <Wrench size={13} strokeWidth={1.75} />
                      {t('details.materials')}
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {materials.map((material, index) => (
                        <li key={index} style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}>
                          <span style={{ color: T.emerald, marginTop: 2 }}>•</span>
                          <span style={{
                            fontFamily: T.sans,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: T.textPrimary,
                          }}>
                            {material}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Control of Error */}
                {controlOfError && (
                  <div style={blockCard}>
                    <h3 style={sectionTitle}>
                      <AlertCircle size={13} strokeWidth={1.75} />
                      {t('details.controlOfError')}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontFamily: T.sans,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: T.textPrimary,
                    }}>
                      {controlOfError}
                    </p>
                  </div>
                )}

                {/* Why It Matters */}
                {whyItMatters && (
                  <div style={blockCard}>
                    <h3 style={sectionTitle}>
                      <Sparkles size={13} strokeWidth={1.75} />
                      {t('details.whyItMatters')}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontFamily: T.sans,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: T.textPrimary,
                    }}>
                      {whyItMatters}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
              }}>
                <p style={{
                  margin: 0,
                  fontFamily: T.sans,
                  fontSize: 14,
                  color: T.textMuted,
                }}>
                  {t('details.noDetailsAvailable')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
