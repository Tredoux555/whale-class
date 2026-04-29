'use client';

// components/montree/ShelfAutopilotCard.tsx
// Dashboard card for Shelf Autopilot — AI-powered shelf management
// Generates next-work proposals per child using pure sequencer engine (zero AI cost)
// Teacher reviews per-child proposals and applies selectively
// Dark forest visual treatment — all wiring intact

import { useState, useCallback, useRef, useEffect, CSSProperties } from 'react';
import {
  Rocket, ChevronRight, Check, AlertTriangle, ListChecks, ArrowRight, RotateCcw,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

interface ShelfProposal {
  area: string;
  current_work: string | null;
  current_work_status: string | null;
  proposed_work: string;
  proposed_work_key: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  prerequisites_met: string[];
  category: string;
}

interface ChildResult {
  child_id: string;
  child_name: string;
  proposals: ShelfProposal[];
  areas_stable: string[];
  summary: string;
  error?: string;
}

type CardState = 'idle' | 'generating' | 'results' | 'applying';

// Dark forest tokens
const T = {
  cardBg: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(52,211,153,0.06))',
  cardBorder: '1px solid rgba(139,92,246,0.30)',
  cardRadius: 14,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.08)',
  violet: '#c4b5fd',
  violetStrong: 'rgba(139,92,246,0.22)',
  violetSoft: 'rgba(139,92,246,0.10)',
  violetBorder: 'rgba(139,92,246,0.40)',
  amber: '#f59e0b',
  red: '#f87171',
  redStrong: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.40)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Area dot palette — locked tokens
const AREA_COLORS: Record<string, string> = {
  practical_life: 'rgb(236, 72, 153)',  // pink
  sensorial: 'rgb(20, 184, 166)',       // teal
  mathematics: 'rgb(168, 85, 247)',     // purple
  language: 'rgb(74, 222, 128)',        // green
  cultural: 'rgb(249, 115, 22)',        // orange
};

const CONFIDENCE_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high:   { bg: T.emeraldStrong, border: 'rgba(52,211,153,0.40)', color: T.emerald, label: 'High' },
  medium: { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.40)', color: T.amber, label: 'Medium' },
  low:    { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', color: T.textSecondary, label: 'Low' },
};

const cardWrapStyle: CSSProperties = {
  background: T.cardBg,
  border: T.cardBorder,
  borderRadius: T.cardRadius,
  backdropFilter: T.blur,
  WebkitBackdropFilter: T.blur,
  overflow: 'hidden',
  fontFamily: T.sans,
  color: T.textPrimary,
};

const violetCta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 9,
  background: T.violetStrong,
  border: `1px solid ${T.violetBorder}`,
  color: T.violet,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 120ms ease',
};

export default function ShelfAutopilotCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  const [state, setState] = useState<CardState>('idle');
  const [results, setResults] = useState<ChildResult[]>([]);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [appliedProposals, setAppliedProposals] = useState<Set<string>>(new Set());
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [stats, setStats] = useState({ withProposals: 0, stable: 0, errored: 0, totalProposals: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (children.length === 0) return;

    setState('generating');
    setResults([]);
    setAppliedProposals(new Set());
    setExpandedChild(null);

    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({ classroom_id: classroomId }),
        signal: abortRef.current?.signal,
        timeout: 60000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.generateError'));
        setState('idle');
        return;
      }

      const childResults: ChildResult[] = data.results || [];
      setResults(childResults);
      setStats({
        withProposals: data.children_with_proposals || 0,
        stable: data.children_stable || 0,
        errored: data.children_errored || 0,
        totalProposals: data.total_proposals || 0,
      });

      const firstWithProposals = childResults.find(r => r.proposals.length > 0 && !r.error);
      if (firstWithProposals) {
        setExpandedChild(firstWithProposals.child_id);
      }

      setState('results');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Generate error:', err);
      toast.error(t('shelfAutopilot.generateError'));
      setState('idle');
    }
  }, [children, classroomId, t]);

  const handleApplyProposal = useCallback(async (childId: string, proposal: ShelfProposal) => {
    const key = `${childId}:${proposal.area}`;
    if (appliedProposals.has(key) || applyingKey === key) return;

    setApplyingKey(key);

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'apply',
          applications: [{
            child_id: childId,
            area: proposal.area,
            work_name: proposal.proposed_work,
          }],
        }),
        signal: abortRef.current?.signal,
        timeout: 30000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.applyError'));
        setApplyingKey(null);
        return;
      }

      if (data.applied > 0) {
        setAppliedProposals(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        toast.success(t('shelfAutopilot.applied'));
      } else {
        toast.error(t('shelfAutopilot.applyError'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Apply error:', err);
      toast.error(t('shelfAutopilot.applyError'));
    } finally {
      setApplyingKey(null);
    }
  }, [appliedProposals, applyingKey, t]);

  const handleApplyAllForChild = useCallback(async (childResult: ChildResult) => {
    const unapplied = childResult.proposals.filter(
      p => !appliedProposals.has(`${childResult.child_id}:${p.area}`)
    );
    if (unapplied.length === 0) return;

    const childKey = `applying_all:${childResult.child_id}`;
    if (applyingKey === childKey) return;
    setApplyingKey(childKey);

    try {
      const res = await montreeApi('/api/montree/shelf-autopilot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'apply',
          applications: unapplied.map(p => ({
            child_id: childResult.child_id,
            area: p.area,
            work_name: p.proposed_work,
          })),
        }),
        signal: abortRef.current?.signal,
        timeout: 30000,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('shelfAutopilot.applyError'));
        setApplyingKey(null);
        return;
      }

      if (data.applied > 0) {
        setAppliedProposals(prev => {
          const next = new Set(prev);
          for (const p of unapplied) {
            next.add(`${childResult.child_id}:${p.area}`);
          }
          return next;
        });
        toast.success(`${data.applied} ${t('shelfAutopilot.movesApplied')}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ShelfAutopilot] Apply all error:', err);
      toast.error(t('shelfAutopilot.applyError'));
    } finally {
      setApplyingKey(null);
    }
  }, [appliedProposals, applyingKey, t]);

  // ---- Render: Idle ----
  if (state === 'idle') {
    return (
      <div style={{ ...cardWrapStyle, padding: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginBottom: 8,
        }}>
          <Rocket size={16} strokeWidth={1.75} color={T.violet} />
          <h3 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 15,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}>
            {t('shelfAutopilot.title')}
          </h3>
        </div>
        <p style={{
          margin: '0 0 12px',
          fontFamily: T.sans,
          fontSize: 12,
          color: T.textSecondary,
          lineHeight: 1.55,
        }}>
          {t('shelfAutopilot.description')}
        </p>
        <button
          onClick={handleGenerate}
          disabled={children.length === 0}
          style={{
            ...violetCta,
            width: '100%',
            padding: '10px 16px',
            opacity: children.length === 0 ? 0.45 : 1,
            cursor: children.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Rocket size={13} strokeWidth={1.75} />
          {t('shelfAutopilot.generate')}
        </button>
      </div>
    );
  }

  // ---- Render: Generating ----
  if (state === 'generating') {
    return (
      <div style={{ ...cardWrapStyle, padding: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginBottom: 12,
        }}>
          <Rocket size={16} strokeWidth={1.75} color={T.violet} />
          <h3 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 15,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}>
            {t('shelfAutopilot.title')}
          </h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              width: '100%',
              height: 6,
              borderRadius: 999,
              background: T.violetSoft,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: '60%',
                background: 'linear-gradient(90deg, rgba(139,92,246,0.55), rgba(52,211,153,0.55))',
                borderRadius: 999,
                animation: 'sa-pulse 1.4s ease-in-out infinite',
              }} />
            </div>
            <style>{`@keyframes sa-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }`}</style>
          </div>
          <span style={{
            fontFamily: T.sans,
            fontSize: 11,
            color: T.violet,
            whiteSpace: 'nowrap',
          }}>
            {t('shelfAutopilot.analyzing')}
          </span>
        </div>
      </div>
    );
  }

  // ---- Render: Results ----
  const childrenWithProposals = results.filter(r => r.proposals.length > 0 && !r.error);
  const childrenStable = results.filter(r => r.proposals.length === 0 && !r.error);
  const childrenErrored = results.filter(r => r.error);

  return (
    <div style={cardWrapStyle}>
      {/* Header */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <h3 style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: T.serif,
            fontSize: 15,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}>
            <Rocket size={16} strokeWidth={1.75} color={T.violet} />
            {t('shelfAutopilot.title')}
          </h3>
          <button
            onClick={() => { setState('idle'); setResults([]); setAppliedProposals(new Set()); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 7,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.violet,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} strokeWidth={1.75} />
            {t('shelfAutopilot.redo')}
          </button>
        </div>

        {/* Summary stats */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {stats.withProposals > 0 && (
            <span style={pillStyle(T.violet, T.violetStrong, T.violetBorder)}>
              <ListChecks size={10} strokeWidth={1.75} />
              {stats.withProposals} {t('shelfAutopilot.readyForMoves')}
            </span>
          )}
          {stats.stable > 0 && (
            <span style={pillStyle(T.emerald, T.emeraldStrong, 'rgba(52,211,153,0.40)')}>
              <Check size={10} strokeWidth={2.5} />
              {stats.stable} {t('shelfAutopilot.shelvesGood')}
            </span>
          )}
          {stats.errored > 0 && (
            <span style={pillStyle(T.red, T.redStrong, T.redBorder)}>
              <AlertTriangle size={10} strokeWidth={1.75} />
              {stats.errored} {t('shelfAutopilot.errors')}
            </span>
          )}
        </div>
      </div>

      {/* Children with proposals */}
      {childrenWithProposals.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          {childrenWithProposals.map(child => {
            const isExpanded = expandedChild === child.child_id;
            const allApplied = child.proposals.every(
              p => appliedProposals.has(`${child.child_id}:${p.area}`)
            );
            const unappliedCount = child.proposals.filter(
              p => !appliedProposals.has(`${child.child_id}:${p.area}`)
            ).length;

            return (
              <div
                key={child.child_id}
                style={{
                  borderBottom: '1px solid rgba(139,92,246,0.10)',
                }}
              >
                <button
                  onClick={() => setExpandedChild(isExpanded ? null : child.child_id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: T.textPrimary,
                    textAlign: 'left',
                    transition: 'background 140ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <ChevronRight
                      size={12}
                      strokeWidth={1.75}
                      color={T.textMuted}
                      style={{
                        transition: 'transform 200ms ease',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.textPrimary,
                    }}>
                      {child.child_name}
                    </span>
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 11,
                      color: T.violet,
                    }}>
                      {child.proposals.length} {child.proposals.length === 1 ? t('shelfAutopilot.move') : t('shelfAutopilot.moves')}
                    </span>
                  </div>
                  {allApplied ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: T.sans,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.emerald,
                    }}>
                      <Check size={11} strokeWidth={2.5} />
                      {t('shelfAutopilot.allApplied')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyAllForChild(child);
                      }}
                      disabled={applyingKey === `applying_all:${child.child_id}`}
                      style={{
                        ...violetCta,
                        padding: '5px 10px',
                        fontSize: 11,
                        opacity: applyingKey === `applying_all:${child.child_id}` ? 0.55 : 1,
                        cursor: applyingKey === `applying_all:${child.child_id}` ? 'wait' : 'pointer',
                      }}
                    >
                      {applyingKey === `applying_all:${child.child_id}`
                        ? t('shelfAutopilot.applying')
                        : `${t('shelfAutopilot.applyAll')} (${unappliedCount})`}
                    </button>
                  )}
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '0 16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    {child.proposals.map(proposal => {
                      const key = `${child.child_id}:${proposal.area}`;
                      const isApplied = appliedProposals.has(key);
                      const isApplying = applyingKey === key;
                      const conf = CONFIDENCE_STYLES[proposal.confidence] || CONFIDENCE_STYLES.low;
                      const areaColor = AREA_COLORS[proposal.area] || 'rgba(255,255,255,0.40)';

                      return (
                        <div
                          key={key}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: isApplied ? T.emeraldSoft : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isApplied ? 'rgba(52,211,153,0.30)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: areaColor,
                              }} />
                              <span style={{
                                fontFamily: T.sans,
                                fontSize: 11,
                                fontWeight: 600,
                                color: T.textMuted,
                                letterSpacing: 0.3,
                                textTransform: 'uppercase',
                              }}>
                                {getAreaLabel(proposal.area, locale)}
                              </span>
                            </div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: conf.bg,
                              border: `1px solid ${conf.border}`,
                              color: conf.color,
                              fontFamily: T.sans,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.3,
                            }}>
                              {conf.label}
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 6,
                            flexWrap: 'wrap',
                          }}>
                            {proposal.current_work && (
                              <>
                                <span style={{
                                  fontFamily: T.sans,
                                  fontSize: 12,
                                  color: T.textMuted,
                                  textDecoration: 'line-through',
                                  maxWidth: 140,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {proposal.current_work}
                                </span>
                                <ArrowRight size={11} strokeWidth={1.75} color={T.textMuted} />
                              </>
                            )}
                            <span style={{
                              fontFamily: T.sans,
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {proposal.proposed_work}
                            </span>
                          </div>

                          <p style={{
                            margin: '0 0 10px',
                            fontFamily: T.sans,
                            fontSize: 11,
                            color: T.textSecondary,
                            lineHeight: 1.5,
                          }}>
                            {proposal.reason}
                          </p>

                          {isApplied ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: T.sans,
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.emerald,
                            }}>
                              <Check size={11} strokeWidth={2.5} />
                              {t('shelfAutopilot.applied')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplyProposal(child.child_id, proposal)}
                              disabled={isApplying}
                              style={{
                                ...violetCta,
                                padding: '5px 12px',
                                fontSize: 11,
                                opacity: isApplying ? 0.55 : 1,
                                cursor: isApplying ? 'wait' : 'pointer',
                              }}
                            >
                              {isApplying ? t('shelfAutopilot.applying') : t('shelfAutopilot.applyMove')}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {child.areas_stable.length > 0 && (
                      <p style={{
                        margin: '4px 0 0',
                        fontFamily: T.sans,
                        fontSize: 11,
                        color: T.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <Check size={10} strokeWidth={2} color={T.emerald} />
                        {t('shelfAutopilot.stableAreas')}: {child.areas_stable.map(a => getAreaLabel(a, locale)).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stable summary */}
      {childrenStable.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(139,92,246,0.15)',
        }}>
          <p style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: T.sans,
            fontSize: 11,
            color: T.emerald,
          }}>
            <Check size={11} strokeWidth={2} />
            {childrenStable.map(c => c.child_name).join(', ')} — {t('shelfAutopilot.shelvesLookGood')}
          </p>
        </div>
      )}

      {/* Errors */}
      {childrenErrored.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(139,92,246,0.15)',
        }}>
          {childrenErrored.map(child => (
            <div
              key={child.child_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontFamily: T.sans,
                fontSize: 11,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.red }}>
                <AlertTriangle size={11} strokeWidth={1.75} />
                {child.child_name}: {child.error}
              </span>
              <button
                onClick={() => handleGenerate()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: T.violet,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('shelfAutopilot.retry')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function pillStyle(color: string, bg: string, border: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: '"Inter", sans-serif',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 999,
    background: bg,
    border: `1px solid ${border}`,
    color,
    letterSpacing: 0.3,
  } as const;
}
