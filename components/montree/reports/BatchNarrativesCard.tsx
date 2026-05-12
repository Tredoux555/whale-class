'use client';

// components/montree/reports/BatchNarrativesCard.tsx
// Dashboard card for batch-generating Sonnet-written parent narratives
// "Generate Weekly Updates" calls /api/montree/reports/batch-narratives for the whole classroom
// Shows progress, cost, and per-child results
// Dark forest visual treatment — all wiring intact

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles, Check, Camera, ChevronDown, ChevronUp, AlertCircle, Loader2,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

interface NarrativeResult {
  child_id: string;
  child_name: string;
  success: boolean;
  skipped?: boolean;
  photo_count: number;
  narrative?: string;
  error?: string;
}

const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.20)',
  cardRadius: 14,
  blur: 'blur(16px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function BatchNarrativesCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<NarrativeResult[]>([]);
  const [stats, setStats] = useState<{ generated: number; skipped: number; failed: number; cost_usd: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [previewChild, setPreviewChild] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      week_start: monday.toISOString().split('T')[0],
      week_end: sunday.toISOString().split('T')[0],
    };
  };

  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (children.length === 0) return;
    setGenerating(true);
    setResults([]);
    setStats(null);
    setExpanded(true);

    abortRef.current = new AbortController();
    const { week_start, week_end } = getWeekDates();

    try {
      const res = await montreeApi('/api/montree/reports/batch-narratives', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start,
          week_end,
          locale,
          force_regenerate: forceRegenerate,
        }),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (mountedRef.current) {
        setResults(data.results || []);
        setStats({
          generated: data.generated || 0,
          skipped: data.skipped || 0,
          failed: data.failed || 0,
          cost_usd: data.cost_usd || 0,
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Batch narratives error:', err);
      if (mountedRef.current) {
        setResults([{
          child_id: 'error',
          child_name: 'Error',
          success: false,
          photo_count: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        }]);
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
      abortRef.current = null;
    }
  }, [children, classroomId, locale]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const successResults = results.filter(r => r.success && !r.skipped);
  const skippedResults = results.filter(r => r.skipped);
  const failedResults = results.filter(r => !r.success);
  const totalPhotos = results.filter(r => r.success).reduce((sum, r) => sum + r.photo_count, 0);

  if (children.length === 0) return null;

  const { week_start, week_end } = getWeekDates();
  const weekLabel = (() => {
    const start = new Date(week_start);
    const end = new Date(week_end);
    const dateLocale = getIntlLocale(locale);
    const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: T.cardRadius,
      padding: 16,
      marginBottom: 16,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.40)',
            color: T.emerald,
            flexShrink: 0,
          }}>
            <Sparkles size={16} strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 14,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.1,
            }}>
              {t('batchNarratives.title')}
            </h3>
            <p style={{
              margin: '2px 0 0',
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
            }}>
              {weekLabel} · {children.length} {t('batchNarratives.childrenLabel')}
            </p>
          </div>
        </div>

        {!generating ? (
          <button
            onClick={() => handleGenerate(false)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              background: 'linear-gradient(180deg, #34d399, #10b981)',
              border: '1px solid rgba(52,211,153,0.55)',
              color: '#06281a',
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
              flexShrink: 0,
            }}
          >
            {t('batchNarratives.generateButton')}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              background: T.redSoft,
              border: `1px solid ${T.redBorder}`,
              color: T.red,
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('batchNarratives.cancelButton')}
          </button>
        )}
      </div>

      {/* Generating */}
      {generating && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            color: T.emerald,
          }}>
            <Loader2 size={14} strokeWidth={2} style={{ animation: 'bnc-spin 0.9s linear infinite' }} />
            <span style={{ fontFamily: T.sans, fontSize: 11 }}>
              {t('batchNarratives.generatingMessage')}
            </span>
            <style>{`@keyframes bnc-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <div style={{
            height: 6,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '66%',
              background: 'linear-gradient(90deg, #34d399, #10b981)',
              borderRadius: 999,
              animation: 'bnc-pulse 1.4s ease-in-out infinite',
            }} />
            <style>{`@keyframes bnc-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
          </div>
        </div>
      )}

      {/* Results */}
      {stats && !generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Summary */}
          <div style={{
            padding: 12,
            borderRadius: 12,
            background: T.emeraldSoft,
            border: '1px solid rgba(52,211,153,0.25)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                color: T.emerald,
              }}>
                <Check size={13} strokeWidth={2.5} />
                {t('batchNarratives.generatedCount', { count: stats.generated })}
                {stats.skipped > 0 && (
                  <span style={{
                    color: T.textMuted,
                    fontWeight: 400,
                    marginLeft: 6,
                  }}>
                    · {stats.skipped} {t('batchNarratives.skippedLabel')}
                  </span>
                )}
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {expanded ? t('batchNarratives.hideButton') : t('batchNarratives.detailsButton')}
              </button>
            </div>
            <div style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: T.sans,
              fontSize: 11,
              color: T.emerald,
              opacity: 0.85,
            }}>
              <Camera size={11} strokeWidth={1.75} />
              {t('batchNarratives.photoCount', { count: totalPhotos })}
              {stats.cost_usd > 0 && (
                <span style={{ color: T.textMuted, marginLeft: 6 }}>
                  · ${stats.cost_usd.toFixed(3)} AI cost
                </span>
              )}
            </div>
          </div>

          {/* Per-child preview */}
          {expanded && successResults.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 320,
              overflowY: 'auto',
              paddingRight: 4,
            }}>
              {successResults.map(r => {
                const isOpen = previewChild === r.child_id;
                return (
                  <div key={r.child_id}>
                    <button
                      onClick={() => setPreviewChild(isOpen ? null : r.child_id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: T.textPrimary,
                        cursor: 'pointer',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                      <span style={{
                        fontFamily: T.sans,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {r.child_name}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: T.sans,
                        fontSize: 11,
                        color: T.textMuted,
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Camera size={10} strokeWidth={1.75} />
                          {r.photo_count}
                        </span>
                        {isOpen
                          ? <ChevronUp size={12} strokeWidth={1.75} color={T.emerald} />
                          : <ChevronDown size={12} strokeWidth={1.75} color={T.emerald} />}
                      </span>
                    </button>
                    {isOpen && r.narrative && (
                      <div style={{
                        margin: '6px 6px 4px',
                        padding: 12,
                        borderRadius: 10,
                        background: T.emeraldSoft,
                        borderLeft: `3px solid ${T.emerald}`,
                      }}>
                        <p style={{
                          margin: 0,
                          fontFamily: T.sans,
                          fontSize: 12,
                          lineHeight: 1.55,
                          color: T.textSecondary,
                          fontStyle: 'italic',
                        }}>
                          &ldquo;{r.narrative}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {skippedResults.length > 0 && (
                <div style={{
                  padding: '4px 12px',
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.textMuted,
                }}>
                  {t('batchNarratives.skippedSection')}: {skippedResults.map(r => r.child_name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Failed */}
          {failedResults.length > 0 && (
            <div style={{
              padding: 10,
              borderRadius: 10,
              background: T.redSoft,
              border: `1px solid ${T.redBorder}`,
              color: T.red,
              fontFamily: T.sans,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={13} strokeWidth={1.75} />
              {t('batchNarratives.failedLabel')}: {failedResults.map(r => r.child_name).join(', ')}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 4,
          }}>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 10,
              color: T.textMuted,
            }}>
              {t('batchNarratives.helpText')}
            </p>
            {stats.generated > 0 && (
              <button
                onClick={() => handleGenerate(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('batchNarratives.regenerateButton')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
