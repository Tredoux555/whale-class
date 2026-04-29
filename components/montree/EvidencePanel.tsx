'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera, ChevronDown, Check, AlertTriangle, Star, Sparkles,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface ReadyWork {
  work_name: string;
  area: string;
  evidence_photo_count: number;
  evidence_photo_days: number;
}

interface ChildEvidenceSummary {
  id: string;
  name: string;
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
  total_active: number;
  ready_works: ReadyWork[];
}

interface ClassroomTotals {
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
  ready: number;
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
  violetBorder: 'rgba(139,92,246,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function EvidencePanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ChildEvidenceSummary[]>([]);
  const [totals, setTotals] = useState<ClassroomTotals>({ strong: 0, moderate: 0, weak: 0, confirmed: 0, ready: 0 });
  const [confirming, setConfirming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchOverview = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/evidence-overview');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setChildren(json.children || []);
      setTotals(json.classroom_totals || { strong: 0, moderate: 0, weak: 0, confirmed: 0, ready: 0 });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[EvidencePanel] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    return () => { abortRef.current?.abort(); };
  }, [fetchOverview]);

  const handleConfirmMastery = useCallback(async (childId: string, workName: string) => {
    const key = `${childId}:${workName}`;
    if (confirming === key) return;
    setConfirming(key);

    try {
      const res = await montreeApi('/api/montree/intelligence/evidence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: workName,
          action: 'confirm_mastery',
        }),
      });
      if (!mountedRef.current) return;

      if (res.ok) {
        toast.success(t('evidence.masteryConfirmed'));
        await fetchOverview();
      } else {
        toast.error(t('evidence.confirmFailed'));
      }
    } catch (err) {
      console.error('[EvidencePanel] Confirm error:', err);
      if (mountedRef.current) toast.error(t('evidence.confirmFailed'));
    } finally {
      if (mountedRef.current) setConfirming(null);
    }
  }, [confirming, t, fetchOverview]);

  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'ev-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 130, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes ev-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  const hasData = children.length > 0;
  const childrenWithReady = children.filter(c => c.ready_works.length > 0);

  return (
    <div
      id="panel-evidence"
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
        aria-label={t('evidence.title')}
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
            background: T.blueStrong,
            border: `1px solid ${T.blueBorder}`,
            color: T.blue,
          }}>
            <Camera size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('evidence.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {totals.ready > 0
                ? t('evidence.readySummary').replace('{count}', String(totals.ready))
                : t('evidence.noReady')
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {totals.strong > 0 && (
            <span style={pillStyle(T.emerald, T.emeraldStrong, 'rgba(52,211,153,0.40)')}>
              {totals.strong} {t('evidence.strong')}
            </span>
          )}
          {totals.moderate > 0 && (
            <span style={pillStyle(T.blue, T.blueStrong, 'rgba(96,165,250,0.40)')}>
              {totals.moderate} {t('evidence.moderate')}
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

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 16px 14px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Classroom stats */}
          {hasData && (
            <div style={{ display: 'flex', gap: 8 }}>
              <StatTile value={totals.strong} label={t('evidence.strong')} tint={T.emerald} bg={T.emeraldSoft} border="rgba(52,211,153,0.25)" />
              <StatTile value={totals.moderate} label={t('evidence.moderate')} tint={T.blue} bg="rgba(96,165,250,0.10)" border="rgba(96,165,250,0.25)" />
              <StatTile value={totals.weak} label={t('evidence.weak')} tint={T.amber} bg="rgba(245,158,11,0.10)" border="rgba(245,158,11,0.25)" />
              <StatTile value={totals.confirmed} label={t('evidence.confirmed')} tint={T.violet} bg="rgba(139,92,246,0.10)" border="rgba(139,92,246,0.25)" />
            </div>
          )}

          {/* Ready for mastery alert */}
          {childrenWithReady.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: T.emeraldSoft,
              border: '1px solid rgba(52,211,153,0.30)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.emerald,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
                <Sparkles size={12} strokeWidth={1.75} />
                {t('evidence.readyAlert').replace('{count}', String(childrenWithReady.length))}
              </div>
              <div style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: T.emerald,
                opacity: 0.85,
              }}>
                {childrenWithReady.slice(0, 3).map(c => c.name.split(' ')[0]).join(', ')}
                {childrenWithReady.length > 3 && ` +${childrenWithReady.length - 3}`}
              </div>
            </div>
          )}

          {/* Per-child cards */}
          {hasData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {children.filter(c => c.total_active > 0).map(child => (
                <div
                  key={child.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: T.emeraldStrong,
                        border: '1px solid rgba(52,211,153,0.30)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.emerald,
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
                        <div style={{
                          fontFamily: T.sans,
                          fontSize: 10,
                          color: T.textMuted,
                          marginTop: 1,
                        }}>
                          {child.total_active} {child.total_active === 1 ? t('evidence.work') : t('evidence.works')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {child.strong > 0 && (
                        <span style={mini(T.emerald, T.emeraldStrong, 'rgba(52,211,153,0.40)')}>
                          <Check size={9} strokeWidth={2.5} />
                          {child.strong}
                        </span>
                      )}
                      {child.moderate > 0 && (
                        <span style={mini(T.blue, T.blueStrong, 'rgba(96,165,250,0.40)')}>
                          <Camera size={9} strokeWidth={1.75} />
                          {child.moderate}
                        </span>
                      )}
                      {child.weak > 0 && (
                        <span style={mini(T.amber, T.amberStrong, T.amberBorder)}>
                          <AlertTriangle size={9} strokeWidth={1.75} />
                          {child.weak}
                        </span>
                      )}
                      {child.confirmed > 0 && (
                        <span style={mini(T.violet, T.violetStrong, T.violetBorder)}>
                          <Star size={9} strokeWidth={1.75} />
                          {child.confirmed}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ready works */}
                  {child.ready_works.length > 0 && (
                    <div style={{
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                      {child.ready_works.slice(0, 3).map(w => {
                        const key = `${child.id}:${w.work_name}`;
                        return (
                          <div
                            key={w.work_name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: T.emeraldSoft,
                              border: '1px solid rgba(52,211,153,0.20)',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{
                                fontFamily: T.sans,
                                fontSize: 12,
                                color: T.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {w.work_name}
                              </div>
                              <div style={{
                                fontFamily: T.sans,
                                fontSize: 10,
                                color: T.textMuted,
                                marginTop: 1,
                              }}>
                                {w.evidence_photo_count} {t('evidence.photos')}, {w.evidence_photo_days} {t('evidence.days')}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConfirmMastery(child.id, w.work_name); }}
                              disabled={confirming === key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                borderRadius: 8,
                                background: 'linear-gradient(180deg, #34d399, #10b981)',
                                border: '1px solid rgba(52,211,153,0.55)',
                                color: '#06281a',
                                fontFamily: T.sans,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 0.2,
                                cursor: confirming === key ? 'wait' : 'pointer',
                                opacity: confirming === key ? 0.55 : 1,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              <Star size={10} strokeWidth={1.75} />
                              {confirming === key ? t('evidence.confirming') : t('evidence.confirmMastery')}
                            </button>
                          </div>
                        );
                      })}
                      {child.ready_works.length > 3 && (
                        <div style={{
                          fontFamily: T.sans,
                          fontSize: 10,
                          color: T.textMuted,
                          textAlign: 'center',
                          paddingTop: 2,
                        }}>
                          +{child.ready_works.length - 3} {t('evidence.moreReady')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!hasData && (
            <div style={{
              textAlign: 'center',
              padding: '20px 0',
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
            }}>
              {t('evidence.noData')}
            </div>
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

function pillStyle(color: string, bg: string, border: string) {
  return {
    fontFamily: '"Inter", sans-serif',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 999,
    background: bg,
    border: `1px solid ${border}`,
    color,
    letterSpacing: 0.3,
  } as const;
}

function mini(color: string, bg: string, border: string) {
  return {
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
  } as const;
}
