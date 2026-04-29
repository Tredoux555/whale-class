'use client';

// components/montree/child/ChildWeeklyAdmin.tsx
// Per-child weekly admin with per-area breakdowns for government docs
// Replaces GuruWeeklySummary — always renders (shows generate button even with no data)
// Sections: Plan Row, Per-Area Details, Full Summary, This/Next/OneLiner, Advice
// Dark forest visual treatment — all wiring intact

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Loader2, Copy, Check, NotebookPen, ChevronDown, ChevronRight,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface AreaDetail {
  work: string;
  this_week: string;
  next_week: string;
}

interface Props {
  childId: string;
  childName: string;
  planRow: Record<string, string> | null;
  areaDetails: Record<string, AreaDetail> | null;
  fullSummary: string | null;
  thisWeek: string | null;
  nextWeek: string | null;
  oneLiner: string | null;
  advice: string | null;
  updatedAt: string | null;
  onGenerated?: () => void;
}

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',
  sensorial: '20, 184, 166',
  mathematics: '168, 85, 247',
  language: '74, 222, 128',
  cultural: '249, 115, 22',
};

const T = {
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  cardRadius: 12,
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  violet: '#c4b5fd',
  violetStrong: 'rgba(139,92,246,0.18)',
  violetBorder: 'rgba(139,92,246,0.30)',
  violetSoft: 'rgba(139,92,246,0.10)',
  indigo: '#a5b4fc',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 6,
        background: copied ? T.emeraldStrong : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
        color: copied ? T.emerald : T.violet,
        fontFamily: T.sans,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      {copied ? <Check size={10} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={1.75} />}
    </button>
  );
}

export default function ChildWeeklyAdmin({
  childId,
  childName,
  planRow: initialPlanRow,
  areaDetails: initialAreaDetails,
  fullSummary: initialFullSummary,
  thisWeek: initialThisWeek,
  nextWeek: initialNextWeek,
  oneLiner: initialOneLiner,
  advice: initialAdvice,
  updatedAt: initialUpdatedAt,
  onGenerated,
}: Props) {
  const { t, locale } = useI18n();
  const L = (en: string, zh: string) => {
    const map: Record<string, string> = { en, zh };
    return map[locale || 'en'] || en;
  };

  const [planRow, setPlanRow] = useState(initialPlanRow);
  const [areaDetails, setAreaDetails] = useState(initialAreaDetails);
  const [fullSummary, setFullSummary] = useState(initialFullSummary);
  const [thisWeek, setThisWeek] = useState(initialThisWeek);
  const [nextWeek, setNextWeek] = useState(initialNextWeek);
  const [oneLiner, setOneLiner] = useState(initialOneLiner);
  const [advice, setAdvice] = useState(initialAdvice);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  useEffect(() => {
    setPlanRow(initialPlanRow);
    setAreaDetails(initialAreaDetails);
    setFullSummary(initialFullSummary);
    setThisWeek(initialThisWeek);
    setNextWeek(initialNextWeek);
    setOneLiner(initialOneLiner);
    setAdvice(initialAdvice);
    setUpdatedAt(initialUpdatedAt);
  }, [initialPlanRow, initialAreaDetails, initialFullSummary, initialThisWeek, initialNextWeek, initialOneLiner, initialAdvice, initialUpdatedAt]);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasData = planRow || areaDetails || fullSummary || thisWeek;

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setGenerating(true);
    setError('');
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/weekly-admin`, {
        method: 'POST',
        body: JSON.stringify({ locale }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('childAdmin.generateError'));
        return;
      }
      if (data.success) {
        setPlanRow(data.plan_row);
        setAreaDetails(data.area_details);
        setFullSummary(data.full_summary);
        setThisWeek(data.this_week);
        setNextWeek(data.next_week);
        setOneLiner(data.one_liner);
        setAdvice(data.advice);
        setUpdatedAt(new Date().toISOString());
        onGenerated?.();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('childAdmin.generateError'));
    } finally {
      setGenerating(false);
    }
  }, [childId, locale, t, onGenerated]);

  const copyPlanRow = useCallback(() => {
    if (!planRow) return '';
    const cols = AREAS.map(a => planRow[a] || '-');
    return `${childName} | ${cols.join(' | ')} | ${planRow.notes || ''}`;
  }, [planRow, childName]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return L('Just now', '刚刚');
      if (diffMins < 60) return L(`${diffMins}m ago`, `${diffMins}分钟前`);
      if (diffHours < 24) return L(`${diffHours}h ago`, `${diffHours}小时前`);
      if (diffDays < 7) return L(`${diffDays}d ago`, `${diffDays}天前`);
      return date.toLocaleDateString(getIntlLocale(locale));
    } catch { return ''; }
  };

  return (
    <div style={{ padding: 16, fontFamily: T.sans, color: T.textPrimary }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updatedAt && (
            <span style={{ fontFamily: T.sans, fontSize: 11, color: T.violet, opacity: 0.7 }}>
              {formatDate(updatedAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 9,
            background: generating
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(180deg, #34d399, #10b981)',
            border: `1px solid ${generating ? 'rgba(255,255,255,0.10)' : 'rgba(52,211,153,0.55)'}`,
            color: generating ? T.textMuted : '#06281a',
            fontFamily: T.sans,
            fontSize: 12,
            fontWeight: 700,
            cursor: generating ? 'wait' : 'pointer',
            boxShadow: generating ? 'none' : '0 4px 14px rgba(16,185,129,0.25)',
          }}
        >
          {generating ? (
            <>
              <Loader2 size={12} strokeWidth={2} style={{ animation: 'cwa-spin 0.9s linear infinite' }} />
              {t('childAdmin.generating')}
              <style>{`@keyframes cwa-spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>{hasData ? t('childAdmin.regenerate') : t('childAdmin.generate')}</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 12,
          borderRadius: 10,
          background: T.redSoft,
          border: `1px solid ${T.redBorder}`,
          color: T.red,
          fontFamily: T.sans,
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* No data */}
      {!hasData && !generating && (
        <p style={{
          fontFamily: T.sans,
          fontSize: 13,
          color: T.violet,
          opacity: 0.75,
          fontStyle: 'italic',
          margin: 0,
        }}>
          {t('childAdmin.noData')}
        </p>
      )}

      {/* Plan Row */}
      {planRow && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.violet,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
              {t('childAdmin.planRow')}
            </span>
            <CopyBtn text={copyPlanRow()} label="Plan Row" />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 4,
          }}>
            {AREAS.map(area => {
              const work = planRow[area] || '-';
              const rgb = AREA_DOT_RGB[area];
              return (
                <div
                  key={area}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid rgba(${rgb}, 0.30)`,
                    borderRadius: 8,
                    padding: 8,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontFamily: T.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    color: `rgb(${rgb})`,
                    letterSpacing: 0.3,
                  }}>
                    {getAreaLabel(area, locale)}
                  </div>
                  <div style={{
                    marginTop: 3,
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: T.textSecondary,
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {work}
                  </div>
                </div>
              );
            })}
          </div>
          {planRow.notes && (
            <div style={{
              marginTop: 6,
              padding: '5px 10px',
              fontFamily: T.sans,
              fontSize: 11,
              fontStyle: 'italic',
              color: T.textSecondary,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8,
            }}>
              {planRow.notes}
            </div>
          )}
        </div>
      )}

      {/* Full Summary */}
      {fullSummary && (
        <div style={{
          marginBottom: 12,
          border: `1px solid ${T.violetBorder}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setShowFullSummary(!showFullSummary)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: T.violetSoft,
              border: 'none',
              cursor: 'pointer',
              color: T.violet,
              fontFamily: T.sans,
              transition: 'background 140ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = T.violetSoft)}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}>
              <NotebookPen size={13} strokeWidth={1.75} />
              {t('childAdmin.fullSummary')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CopyBtn text={fullSummary} label="Full Summary" />
              <ChevronDown
                size={12}
                strokeWidth={1.75}
                color={T.textMuted}
                style={{
                  transition: 'transform 200ms ease',
                  transform: showFullSummary ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </span>
          </button>
          {showFullSummary && (
            <div style={{
              padding: 12,
              background: 'rgba(0,0,0,0.20)',
              fontFamily: T.sans,
              fontSize: 13,
              lineHeight: 1.6,
              color: T.textSecondary,
              whiteSpace: 'pre-wrap',
            }}>
              {fullSummary}
            </div>
          )}
        </div>
      )}

      {/* This Week / Next Week / One-Liner */}
      {(thisWeek || nextWeek || oneLiner) && (
        <div style={{
          marginBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {thisWeek && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.violet,
                  letterSpacing: 0.4,
                  marginBottom: 2,
                  textTransform: 'uppercase',
                }}>
                  {t('childAdmin.thisWeek')}
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: T.sans,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: T.textSecondary,
                }}>
                  {thisWeek}
                </p>
              </div>
              <CopyBtn text={thisWeek} label="This Week" />
            </div>
          )}
          {nextWeek && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.indigo,
                  letterSpacing: 0.4,
                  marginBottom: 2,
                  textTransform: 'uppercase',
                }}>
                  {t('childAdmin.nextWeek')}
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: T.sans,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: T.textSecondary,
                }}>
                  {nextWeek}
                </p>
              </div>
              <CopyBtn text={nextWeek} label="Next Week" />
            </div>
          )}
          {oneLiner && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: T.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.violet,
                  letterSpacing: 0.4,
                  marginBottom: 2,
                  textTransform: 'uppercase',
                }}>
                  {t('childAdmin.oneLiner')}
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.textPrimary,
                }}>
                  {oneLiner}
                </p>
              </div>
              <CopyBtn text={oneLiner} label="One-Liner" />
            </div>
          )}
        </div>
      )}

      {/* Advice */}
      {advice && (
        <div style={{
          paddingTop: 12,
          borderTop: `1px solid ${T.violetBorder}`,
        }}>
          <button
            onClick={() => setShowAdvice(!showAdvice)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.violet,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            <ChevronRight
              size={11}
              strokeWidth={2}
              style={{
                transition: 'transform 200ms ease',
                transform: showAdvice ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
            <span>{t('childAdmin.advice')}</span>
            {!showAdvice && (
              <span style={{
                color: T.textMuted,
                fontWeight: 400,
                marginLeft: 4,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textTransform: 'none',
                letterSpacing: 0,
              }}>
                — {advice.slice(0, 60)}...
              </span>
            )}
          </button>
          {showAdvice && (
            <div style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.violetBorder}`,
            }}>
              <div style={{
                fontFamily: T.sans,
                fontSize: 13,
                lineHeight: 1.6,
                color: T.textSecondary,
                whiteSpace: 'pre-line',
              }}>
                {advice}
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <CopyBtn text={advice} label="Advice" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
