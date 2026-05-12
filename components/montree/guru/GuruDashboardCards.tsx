// components/montree/guru/GuruDashboardCards.tsx
// Consolidated dashboard guru cards
// Single API call to /api/montree/guru/dashboard-summary
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, ReactNode } from 'react';
import {
  Sprout, Sunrise, Moon, X, ChevronDown, BarChart3, Sparkles,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface GuruDashboardCardsProps {
  childId: string;
  childName: string;
}

interface DashboardData {
  endOfDay: { nudge: string | null };
  suggestion: { text: string | null; type: string };
  weeklyReview: { available: boolean; review: string | null };
}

const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.30)',
  red: '#f87171',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function GuruDashboardCards({ childId, childName }: GuruDashboardCardsProps) {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedNudge, setDismissedNudge] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);

  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    const dismissKey = `guru_suggestion_dismissed_${childId}`;
    const dismissedWeek = localStorage.getItem(dismissKey);
    const currentWeek = getISOWeek();
    if (dismissedWeek === currentWeek) {
      setDismissedSuggestion(true);
    }

    const abortController = new AbortController();

    fetch(`/api/montree/guru/dashboard-summary?child_id=${childId}`, { signal: abortController.signal })
      .then(r => { if (!r.ok) throw new Error(`Dashboard summary failed: ${r.status}`); return r.json(); })
      .then(result => {
        if (result.success) {
          setData(result);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoading(false);
      });

    return () => abortController.abort();
  }, [childId]);

  const fetchDailyPlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/montree/guru/daily-plan?child_id=${childId}`);
      if (!res.ok) throw new Error(`Daily plan fetch failed: ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setPlan(result.plan);
        setPlanExpanded(true);
      } else {
        setPlanError(result.error || t('guru.couldNotGeneratePlan'));
      }
    } catch {
      setPlanError(t('guru.failedConnect'));
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDismissSuggestion = () => {
    setDismissedSuggestion(true);
    localStorage.setItem(`guru_suggestion_dismissed_${childId}`, getISOWeek());
  };

  // Markdown helpers
  const renderInlineBold = (text: string): ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: T.textPrimary, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderPlan = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return (
        <h2 key={i} style={{ margin: '16px 0 8px', fontFamily: T.serif, fontSize: 19, fontWeight: 500, color: T.textPrimary, letterSpacing: -0.2 }}>
          {line.replace('## ', '')}
        </h2>
      );
      if (line.startsWith('### ')) return (
        <h3 key={i} style={{ margin: '12px 0 4px', fontFamily: T.serif, fontSize: 16, fontWeight: 500, color: T.textPrimary, letterSpacing: -0.2 }}>
          {line.replace('### ', '')}
        </h3>
      );
      if (line.startsWith('#### ')) return (
        <h4 key={i} style={{ margin: '8px 0 4px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.textSecondary }}>
          {line.replace('#### ', '')}
        </h4>
      );
      if (line.startsWith('**') && line.endsWith('**')) return (
        <p key={i} style={{ margin: '4px 0', fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
          {line.replace(/\*\*/g, '')}
        </p>
      );
      if (line.startsWith('- ') || line.startsWith('* ')) return (
        <li key={i} style={{ marginLeft: 16, fontFamily: T.sans, fontSize: 13, color: T.textSecondary, lineHeight: 1.55 }}>
          {renderInlineBold(line.slice(2))}
        </li>
      );
      if (/^\d+\.\s/.test(line)) return (
        <li key={i} style={{ marginLeft: 16, fontFamily: T.sans, fontSize: 13, color: T.textSecondary, listStyle: 'decimal', lineHeight: 1.55 }}>
          {renderInlineBold(line.replace(/^\d+\.\s/, ''))}
        </li>
      );
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
      return (
        <p key={i} style={{ margin: '2px 0', fontFamily: T.sans, fontSize: 13, color: T.textSecondary, lineHeight: 1.55 }}>
          {renderInlineBold(line)}
        </p>
      );
    });
  };

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: T.sans, color: T.textPrimary }}>
      {/* TODAY'S PLAN */}
      <div style={{
        background: T.card,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(52,211,153,0.08))',
          borderBottom: `1px solid ${T.cardBorder}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.40)',
                color: T.emerald,
                flexShrink: 0,
              }}>
                <Sprout size={17} strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{
                  margin: 0,
                  fontFamily: T.serif,
                  fontSize: 17,
                  fontWeight: 500,
                  color: T.textPrimary,
                  letterSpacing: -0.2,
                }}>
                  {t('guru.todayPlan')}
                </h3>
                <p style={{
                  margin: '2px 0 0',
                  fontSize: 11,
                  color: T.textMuted,
                }}>
                  {t('guru.montessoriGuideFor').replace('{name}', childName)}
                </p>
              </div>
            </div>
            {!plan && !planLoading && (
              <button
                onClick={fetchDailyPlan}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: T.emeraldStrong,
                  border: '1px solid rgba(52,211,153,0.45)',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {t('guru.generatePlan')}
              </button>
            )}
            {plan && (
              <button
                onClick={() => setPlanExpanded(!planExpanded)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 9,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {planExpanded ? t('guru.collapse') : t('guru.expand')}
              </button>
            )}
          </div>
        </div>
        {planLoading && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              marginBottom: 10,
              animation: 'gd-bounce 1.4s ease-in-out infinite',
              color: T.emerald,
            }}>
              <Sprout size={18} strokeWidth={1.75} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
              {t('guru.preparingPlan').replace('{name}', childName)}
            </p>
            <style>{`@keyframes gd-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
          </div>
        )}
        {planError && (
          <div style={{ padding: '16px 18px' }}>
            <p style={{ margin: 0, color: T.red, fontSize: 13 }}>{planError}</p>
            <button
              onClick={fetchDailyPlan}
              style={{
                marginTop: 4,
                background: 'transparent',
                border: 'none',
                color: T.emerald,
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {t('common.tryAgain')}
            </button>
          </div>
        )}
        {plan && planExpanded && (
          <div style={{
            padding: '14px 18px',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}>
            {renderPlan(plan)}
          </div>
        )}
        {plan && !planExpanded && (
          <div style={{ padding: '12px 18px' }}>
            <p style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: T.emerald,
            }}>
              <Sparkles size={12} strokeWidth={1.75} />
              {t('guru.planReadyExpand')}
            </p>
          </div>
        )}
      </div>

      {/* END-OF-DAY NUDGE */}
      {data?.endOfDay.nudge && !dismissedNudge && (
        <div style={{
          position: 'relative',
          background: T.card,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: T.cardRadius,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          padding: 16,
        }}>
          <button
            onClick={() => setDismissedNudge(true)}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={11} strokeWidth={1.75} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingRight: 26 }}>
            <Sunrise size={20} strokeWidth={1.75} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{
                margin: '0 0 4px',
                fontFamily: T.serif,
                fontSize: 14,
                fontWeight: 500,
                color: T.textPrimary,
              }}>
                {childName} {t('guru.day')}
              </h4>
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: T.textSecondary,
              }}>
                {data.endOfDay.nudge}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTION */}
      {data?.suggestion.text && !dismissedSuggestion && (
        <div style={{
          position: 'relative',
          background: T.amberSoft,
          border: `1px solid ${T.amberBorder}`,
          borderRadius: T.cardRadius,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          padding: 16,
        }}>
          <button
            onClick={handleDismissSuggestion}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={11} strokeWidth={1.75} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingRight: 26 }}>
            {data.suggestion.type === 'inactive'
              ? <Moon size={20} strokeWidth={1.75} color={T.amber} style={{ flexShrink: 0, marginTop: 2 }} />
              : <Sprout size={20} strokeWidth={1.75} color={T.amber} style={{ flexShrink: 0, marginTop: 2 }} />}
            <div>
              <h4 style={{
                margin: '0 0 4px',
                fontFamily: T.serif,
                fontSize: 14,
                fontWeight: 500,
                color: T.textPrimary,
              }}>
                {data.suggestion.type === 'inactive'
                  ? t('guru.missing').replace('{name}', childName)
                  : t('guru.gentleNudgeAbout').replace('{name}', childName)}
              </h4>
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: T.textPrimary,
              }}>
                {data.suggestion.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REVIEW */}
      {data?.weeklyReview.available && data.weeklyReview.review && (
        <div style={{
          background: T.card,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: T.cardRadius,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setWeeklyExpanded(!weeklyExpanded)}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: T.textPrimary,
              fontFamily: T.sans,
              transition: 'background 140ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={15} strokeWidth={1.75} color={T.emerald} />
              <span style={{
                fontFamily: T.serif,
                fontSize: 14,
                fontWeight: 500,
                color: T.textPrimary,
              }}>
                {childName} {t('guru.weekInReview')}
              </span>
            </div>
            <ChevronDown
              size={13}
              strokeWidth={1.75}
              color={T.textMuted}
              style={{
                transition: 'transform 200ms ease',
                transform: weeklyExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
          {weeklyExpanded && (
            <div style={{
              padding: '0 16px 16px',
              borderTop: `1px solid ${T.cardBorder}`,
              paddingTop: 12,
            }}>
              {data.weeklyReview.review.split('\n\n').map((p, i) => (
                <p
                  key={i}
                  style={{
                    margin: i === 0 ? 0 : '12px 0 0',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: T.textSecondary,
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getISOWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
