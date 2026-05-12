'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, ChevronDown, X } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface StaleWork {
  child_id: string;
  child_name: string;
  work_name: string;
  area: string;
  status: string;
  days_stale: number;
  updated_at: string;
}

function getStalenessLevel(days: number): 'cooling' | 'stale' | 'attention' {
  if (days >= 21) return 'attention';
  if (days >= 14) return 'stale';
  return 'cooling';
}

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 16,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberSoft: 'rgba(245,158,11,0.08)',
  amberBorder: 'rgba(245,158,11,0.30)',
  blue: '#60a5fa',
  blueStrong: 'rgba(96,165,250,0.18)',
  blueSoft: 'rgba(96,165,250,0.08)',
  blueBorder: 'rgba(96,165,250,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const LEVEL_CONFIG: Record<'attention' | 'stale' | 'cooling', {
  bg: string; border: string; dot: string; text: string;
  badgeBg: string; badgeBorder: string;
}> = {
  attention: {
    bg: T.amberSoft, border: T.amberBorder, dot: T.amber, text: T.amber,
    badgeBg: T.amberStrong, badgeBorder: 'rgba(245,158,11,0.40)',
  },
  stale: {
    bg: T.blueSoft, border: T.blueBorder, dot: T.blue, text: T.blue,
    badgeBg: T.blueStrong, badgeBorder: 'rgba(96,165,250,0.40)',
  },
  cooling: {
    bg: T.emeraldSoft, border: 'rgba(52,211,153,0.25)', dot: T.emerald, text: T.emerald,
    badgeBg: T.emeraldStrong, badgeBorder: 'rgba(52,211,153,0.40)',
  },
};

export default function StaleWorksPanel() {
  const { t } = useI18n();
  const [works, setWorks] = useState<StaleWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const dismissingRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchStaleWorks = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/stale-works');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setWorks(json.works || []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[StaleWorksPanel] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStaleWorks();
    return () => { abortRef.current?.abort(); };
  }, [fetchStaleWorks]);

  const handleDismiss = useCallback(async (childId: string, workName: string) => {
    const key = `${childId}:${workName}`;
    if (dismissingRef.current) return;
    dismissingRef.current = key;
    setDismissing(key);
    try {
      const res = await montreeApi('/api/montree/intelligence/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: workName }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setWorks(prev => prev.filter(w => !(w.child_id === childId && w.work_name === workName)));
        toast.success(t('staleWorks.dismissed'));
      } else {
        toast.error(t('staleWorks.dismissFailed'));
      }
    } catch (err) {
      console.error('[StaleWorksPanel] Dismiss error:', err);
      if (mountedRef.current) toast.error(t('staleWorks.dismissFailed'));
    } finally {
      dismissingRef.current = null;
      if (mountedRef.current) setDismissing(null);
    }
  }, [t]);

  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'sw-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 140, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes sw-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  if (works.length === 0) return null;

  const attentionCount = works.filter(w => getStalenessLevel(w.days_stale) === 'attention').length;
  const staleCount = works.filter(w => getStalenessLevel(w.days_stale) === 'stale').length;
  const coolingCount = works.filter(w => getStalenessLevel(w.days_stale) === 'cooling').length;

  const alertCount = attentionCount + staleCount;

  return (
    <div
      id="panel-stale_works"
      style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        overflow: 'hidden',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('staleWorks.title')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: T.textPrimary,
          transition: 'background 140ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: T.amberStrong,
            border: '1px solid rgba(245,158,11,0.35)',
            color: T.amber,
          }}>
            <Clock size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('staleWorks.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {alertCount > 0
                ? t('staleWorks.alertSummary').replace('{count}', String(alertCount))
                : t('staleWorks.allFresh')
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {attentionCount > 0 && (
            <CountPill count={attentionCount} dot={T.amber} bg={T.amberStrong} border="rgba(245,158,11,0.40)" color={T.amber} />
          )}
          {staleCount > 0 && (
            <CountPill count={staleCount} dot={T.blue} bg={T.blueStrong} border="rgba(96,165,250,0.40)" color={T.blue} />
          )}
          {coolingCount > 0 && (
            <CountPill count={coolingCount} dot={T.emerald} bg={T.emeraldStrong} border="rgba(52,211,153,0.40)" color={T.emerald} />
          )}
          <ChevronDown
            size={13}
            strokeWidth={1.75}
            color={T.textMuted}
            style={{
              marginLeft: 2,
              transition: 'transform 200ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 16px 14px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {(['attention', 'stale', 'cooling'] as const).map(level => {
            const levelWorks = works.filter(w => getStalenessLevel(w.days_stale) === level);
            if (levelWorks.length === 0) return null;
            const cfg = LEVEL_CONFIG[level];

            return (
              <div key={level}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 700,
                  color: cfg.text,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: cfg.dot,
                    boxShadow: `0 0 0 2px ${cfg.bg}`,
                  }} />
                  {t(`staleWorks.level.${level}`)} ({levelWorks.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {levelWorks.map(work => {
                    const key = `${work.child_id}:${work.work_name}`;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: T.sans,
                            fontSize: 13,
                            color: T.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontWeight: 600 }}>{work.child_name}</span>
                            <span style={{ color: T.textMuted, margin: '0 6px' }}>·</span>
                            <span>{work.work_name}</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                            fontFamily: T.sans,
                            fontSize: 11,
                            color: T.textMuted,
                          }}>
                            <span>
                              {t('staleWorks.daysAgo').replace('{days}', String(work.days_stale))}
                            </span>
                            <span style={{
                              padding: '1px 7px',
                              borderRadius: 999,
                              background: cfg.badgeBg,
                              border: `1px solid ${cfg.badgeBorder}`,
                              color: cfg.text,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.3,
                            }}>
                              {work.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(work.child_id, work.work_name); }}
                          disabled={dismissing === key}
                          aria-label={t('staleWorks.dismiss')}
                          title={t('staleWorks.dismiss')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: T.textMuted,
                            cursor: dismissing === key ? 'wait' : 'pointer',
                            opacity: dismissing === key ? 0.4 : 1,
                            transition: 'all 120ms ease',
                            flexShrink: 0,
                          }}
                        >
                          {dismissing === key ? '...' : <X size={12} strokeWidth={1.75} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CountPill({ count, dot, bg, border, color }: {
  count: number;
  dot: string;
  bg: string;
  border: string;
  color: string;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 999,
      background: bg,
      border: `1px solid ${border}`,
      color,
      fontFamily: '"Inter", sans-serif',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.3,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: dot,
      }} />
      {count}
    </span>
  );
}
