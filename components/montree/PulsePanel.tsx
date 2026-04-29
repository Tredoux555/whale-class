'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lightbulb, ChevronDown, Star, RotateCw, AlertTriangle, Camera,
  Sparkles,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface PulseStatus {
  status: 'idle' | 'in_progress' | 'completed' | 'stale' | 'failed';
  batch_index: number;
  total_children: number;
  locked_by: string | null;
  completed_at: string | null;
}

interface ChildSummary {
  id: string;
  name: string;
  mastered: number;
  practicing: number;
  presented: number;
  total_works: number;
  total_photos: number;
  stale_works: number;
  recent_work: string | null;
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
  amberBorder: 'rgba(245,158,11,0.35)',
  blue: '#60a5fa',
  blueStrong: 'rgba(96,165,250,0.18)',
  blueBorder: 'rgba(96,165,250,0.30)',
  violet: '#c4b5fd',
  violetStrong: 'rgba(139,92,246,0.18)',
  violetBorder: 'rgba(139,92,246,0.40)',
  violetSoft: 'rgba(139,92,246,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function PulsePanel() {
  const { t } = useI18n();
  const [pulseStatus, setPulseStatus] = useState<PulseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const generatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchStatus = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/pulse');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setPulseStatus(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[PulsePanel] Fetch status error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => { abortRef.current?.abort(); };
  }, [fetchStatus]);

  const handleGenerate = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setChildren([]);

    try {
      const res = await montreeApi('/api/montree/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!mountedRef.current) return;

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(t('pulse.alreadyInProgress'));
        } else if (res.status === 400) {
          toast.error(t('pulse.noChildren'));
        } else {
          toast.error(t('pulse.generateFailed'));
        }
        return;
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      setChildren(data.children || []);
      setExpanded(true);

      const completeRes = await montreeApi('/api/montree/pulse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (!mountedRef.current) return;

      if (completeRes.ok) {
        toast.success(t('pulse.generated'));
        await fetchStatus();
      } else {
        toast.error(t('pulse.completeFailed'));
      }
    } catch (err) {
      console.error('[PulsePanel] Generate error:', err);
      if (mountedRef.current) {
        toast.error(t('pulse.generateFailed'));
        montreeApi('/api/montree/pulse', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fail' }),
        }).catch(() => {});
      }
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setGenerating(false);
    }
  }, [t, fetchStatus]);

  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'pp-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 130, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes pp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  const hasData = children.length > 0;
  const lastCompleted = pulseStatus?.completed_at ? new Date(pulseStatus.completed_at) : null;
  const isStale = pulseStatus?.status === 'stale';
  const isInProgress = pulseStatus?.status === 'in_progress';

  const totalMastered = children.reduce((sum, c) => sum + c.mastered, 0);
  const totalPracticing = children.reduce((sum, c) => sum + c.practicing, 0);
  const totalStaleWorks = children.reduce((sum, c) => sum + c.stale_works, 0);
  const childrenWithStaleWorks = children.filter(c => c.stale_works > 0);

  return (
    <div
      id="panel-pulse"
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
        aria-label={t('pulse.title')}
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
            background: T.violetStrong,
            border: `1px solid ${T.violetBorder}`,
            color: T.violet,
          }}>
            <Lightbulb size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('pulse.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {lastCompleted
                ? t('pulse.lastGenerated').replace('{time}', formatTimeAgo(lastCompleted, t))
                : t('pulse.neverGenerated')
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasData && (
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: T.violetStrong,
              border: `1px solid ${T.violetBorder}`,
              color: T.violet,
              letterSpacing: 0.3,
            }}>
              {children.length} {children.length === 1 ? t('pulse.child') : t('pulse.children')}
            </span>
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

      {expanded && (
        <div style={{
          padding: '12px 16px 14px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Generate CTA */}
          <button
            onClick={handleGenerate}
            disabled={generating || isInProgress}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              background: T.violetStrong,
              border: `1px solid ${T.violetBorder}`,
              color: T.violet,
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 700,
              cursor: (generating || isInProgress) ? 'not-allowed' : 'pointer',
              opacity: (generating || isInProgress) ? 0.55 : 1,
              transition: 'all 120ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <Sparkles size={14} strokeWidth={1.75} />
            {generating
              ? t('pulse.generating')
              : isInProgress
                ? t('pulse.inProgress')
                : isStale
                  ? t('pulse.regenerate')
                  : t('pulse.generate')
            }
          </button>

          {/* Spinner */}
          {generating && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '6px 0',
            }}>
              <div style={{
                width: 16,
                height: 16,
                border: `2px solid ${T.violetSoft}`,
                borderTopColor: T.violet,
                borderRadius: '50%',
                animation: 'pp-spin 0.9s linear infinite',
              }} />
              <span style={{
                fontFamily: T.sans,
                fontSize: 11,
                color: T.textMuted,
              }}>
                {t('pulse.analyzingChildren')}
              </span>
              <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Results */}
          {hasData && !generating && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatTile value={totalMastered} label={t('pulse.mastered')} tint={T.emerald} bg={T.emeraldSoft} border="rgba(52,211,153,0.25)" />
                <StatTile value={totalPracticing} label={t('pulse.practicing')} tint={T.amber} bg="rgba(245,158,11,0.10)" border="rgba(245,158,11,0.25)" />
                {totalStaleWorks > 0 && (
                  <StatTile value={totalStaleWorks} label={t('pulse.stale')} tint={T.violet} bg={T.violetSoft} border="rgba(139,92,246,0.25)" />
                )}
              </div>

              {childrenWithStaleWorks.length > 0 && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: T.violetSoft,
                  border: `1px solid ${T.violetBorder}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                    fontFamily: T.sans,
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.violet,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}>
                    <AlertTriangle size={12} strokeWidth={1.75} />
                    {t('pulse.needsAttention').replace('{count}', String(childrenWithStaleWorks.length))}
                  </div>
                  <div style={{
                    fontFamily: T.sans,
                    fontSize: 12,
                    color: T.violet,
                    opacity: 0.85,
                  }}>
                    {childrenWithStaleWorks.slice(0, 3).map(c => c.name.split(' ')[0]).join(', ')}
                    {childrenWithStaleWorks.length > 3 && ` +${childrenWithStaleWorks.length - 3}`}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {children.map(child => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: T.violetStrong,
                        border: `1px solid ${T.violetBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.violet,
                        fontFamily: T.sans,
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {child.name.split(' ')[0]}
                        </div>
                        {child.recent_work && (
                          <div style={{
                            fontFamily: T.sans,
                            fontSize: 10,
                            color: T.textMuted,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: 1,
                          }}>
                            {child.recent_work}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {child.mastered > 0 && <Mini Icon={Star} count={child.mastered} color={T.emerald} bg={T.emeraldStrong} border="rgba(52,211,153,0.40)" />}
                      {child.practicing > 0 && <Mini Icon={RotateCw} count={child.practicing} color={T.blue} bg={T.blueStrong} border="rgba(96,165,250,0.40)" />}
                      {child.stale_works > 0 && <Mini Icon={AlertTriangle} count={child.stale_works} color={T.violet} bg={T.violetStrong} border={T.violetBorder} />}
                      {child.total_photos > 0 && <Mini Icon={Camera} count={child.total_photos} color={T.textSecondary} bg="rgba(255,255,255,0.06)" border="rgba(255,255,255,0.10)" />}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ value, label, tint, bg, border }: {
  value: number;
  label: string;
  tint: string;
  bg: string;
  border: string;
}) {
  return (
    <div style={{
      flex: 1,
      padding: '8px 6px',
      borderRadius: 10,
      background: bg,
      border: `1px solid ${border}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: T.serif,
        fontSize: 16,
        fontWeight: 500,
        color: tint,
        letterSpacing: -0.3,
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: T.sans,
        fontSize: 10,
        fontWeight: 600,
        color: tint,
        opacity: 0.85,
        marginTop: 2,
        letterSpacing: 0.2,
      }}>
        {label}
      </div>
    </div>
  );
}

function Mini({ Icon, count, color, bg, border }: {
  Icon: typeof Star;
  count: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontFamily: '"Inter", sans-serif',
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 999,
      background: bg,
      border: `1px solid ${border}`,
      color,
    }}>
      <Icon size={9} strokeWidth={1.75} />
      {count}
    </span>
  );
}

function formatTimeAgo(date: Date, t: (key: string) => string): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minutesAgo').replace('{count}', String(mins));
  if (hours < 24) return t('time.hoursAgo').replace('{count}', String(hours));
  return t('time.daysAgo').replace('{count}', String(days));
}
