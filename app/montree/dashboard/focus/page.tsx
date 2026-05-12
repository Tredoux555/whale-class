// app/montree/dashboard/focus/page.tsx
// "Focus List" — one page to answer "who needs my attention today?"
//
// Three tabs:
//   Master   → every child ranked by neglect score (days without photo, stale
//              progress, paperwork behind, zero Language this week)
//   Paperwork → embedded PaperworkPanel
//   Bingo    → "not yet" English Corner (Language) children this week
//
// On Master tab, tapping a child adds them to today's focus list. When a photo
// is later captured tagged with that child, the media-upload route auto-confirms
// the row (confirmed_via='photo' | 'group_photo'). Manual confirm is a PATCH.
// Dark forest visual treatment — all wiring intact

'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import Link from 'next/link';
import {
  Camera, BarChart3, Files, Languages, Check,
  Target, ClipboardCheck, ListChecks, ArrowRight, Sparkles,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import PaperworkPanel from '@/components/montree/PaperworkPanel';

type Tab = 'master' | 'paperwork' | 'bingo';

interface MasterChild {
  id: string;
  name: string;
  photo_url: string | null;
  days_since_photo: number;
  days_since_progress: number;
  paperwork_weeks_behind: number;
  language_photos_this_week: number;
  no_language_this_week: boolean;
  stale_work: boolean;
  score: number;
}

interface MasterData {
  children: MasterChild[];
  targetWeek: number;
  weekStart: string;
  weekEnd: string;
  total: number;
}

interface FocusChild {
  id: string;
  child_id: string;
  name: string;
  photo_url: string | null;
  selected_at: string;
  confirmed_at: string | null;
  confirmed_via: string | null;
  confirmed: boolean;
}

interface FocusData {
  focus_date: string;
  children: FocusChild[];
  total: number;
  confirmed_count: number;
}

interface NotYetChild {
  id: string;
  name: string;
  photo_url: string | null;
}

interface TrackerData {
  notYet: NotYetChild[];
  totalChildren: number;
  visitedCount: number;
}

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.09)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function ChildAvatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const [fallback, setFallback] = useState(!photoUrl);
  const initial = name.charAt(0).toUpperCase();
  if (!fallback && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFallback(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #34d399, #059669)',
        color: '#06281a',
        fontFamily: T.sans,
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '11px 16px',
  borderRadius: 12,
  background: T.emeraldStrong,
  border: '1px solid rgba(52,211,153,0.45)',
  color: T.emerald,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 120ms ease',
  width: '100%',
};

export default function FocusPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('master');

  const [master, setMaster] = useState<MasterData | null>(null);
  const [focus, setFocus] = useState<FocusData | null>(null);
  const [bingo, setBingo] = useState<TrackerData | null>(null);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingBingo, setLoadingBingo] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadMaster = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const [listRes, focusRes] = await Promise.all([
        montreeApi('/api/montree/dashboard/focus-list'),
        montreeApi('/api/montree/dashboard/daily-focus'),
      ]);
      if (!mountedRef.current) return;
      if (listRes.ok) setMaster(await listRes.json());
      if (focusRes.ok) setFocus(await focusRes.json());
    } catch (e) {
      console.error('[Focus] loadMaster:', e);
    } finally {
      if (mountedRef.current) setLoadingMaster(false);
    }
  }, []);

  const loadBingo = useCallback(async () => {
    setLoadingBingo(true);
    try {
      const res = await montreeApi('/api/montree/dashboard/language-tracker');
      if (!mountedRef.current) return;
      if (res.ok) setBingo(await res.json());
    } catch (e) {
      console.error('[Focus] loadBingo:', e);
    } finally {
      if (mountedRef.current) setLoadingBingo(false);
    }
  }, []);

  useEffect(() => { loadMaster(); }, [loadMaster]);
  useEffect(() => {
    if (tab === 'bingo' && !bingo) loadBingo();
  }, [tab, bingo, loadBingo]);

  const focusedIds = new Set((focus?.children || []).map(c => c.child_id));
  const confirmedIds = new Set((focus?.children || []).filter(c => c.confirmed).map(c => c.child_id));

  const toggleFocus = async (childId: string) => {
    if (mutating) return;
    setMutating(childId);
    try {
      const method = focusedIds.has(childId) ? 'DELETE' : 'POST';
      const res = await montreeApi('/api/montree/dashboard/daily-focus', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFocus(data);
      }
    } catch (e) {
      console.error('[Focus] toggle:', e);
    } finally {
      if (mountedRef.current) setMutating(null);
    }
  };

  const addAll = async () => {
    if (!master || mutating) return;
    const top = master.children
      .filter(c => !focusedIds.has(c.id))
      .slice(0, 10)
      .map(c => c.id);
    if (top.length === 0) return;
    setMutating('bulk');
    try {
      const res = await montreeApi('/api/montree/dashboard/daily-focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_ids: top }),
      });
      if (res.ok) setFocus(await res.json());
    } finally {
      if (mountedRef.current) setMutating(null);
    }
  };

  const LABELS = {
    title: t('focus.title'),
    subtitle: t('focus.subtitle'),
    tabMaster: t('focus.tabMaster'),
    tabPaperwork: t('focus.tabPaperwork'),
    tabBingo: t('focus.tabBingo'),
    daysSincePhoto: t('focus.daysSincePhoto'),
    daysSinceProgress: t('focus.daysSinceProgress'),
    paperworkBehind: t('focus.paperworkBehind'),
    noLanguage: t('focus.noLanguage'),
    addToFocus: t('focus.addToFocus'),
    onFocus: t('focus.onFocus'),
    confirmed: t('focus.confirmed'),
    todaysFocus: t('focus.todaysFocus'),
    noFocus: t('focus.noFocus'),
    pickTop10: t('focus.pickTop10'),
    loading: t('common.loading'),
    bingoTitle: t('focus.bingoTitle'),
    allDone: t('focus.allDone'),
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <div style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '36px 16px 96px',
      }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.4,
            lineHeight: 1.15,
          }}>
            {LABELS.title}
          </h1>
          <p style={{
            margin: '6px 0 0',
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textMuted,
            lineHeight: 1.5,
          }}>
            {LABELS.subtitle}
          </p>
        </div>

        {/* Today's focus strip */}
        {focus && focus.children.length > 0 && (
          <div style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: T.cardRadius,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            padding: '12px 14px',
            marginBottom: 16,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                color: T.textSecondary,
              }}>
                <Target size={14} strokeWidth={1.75} color={T.emerald} />
                <span>
                  {LABELS.todaysFocus}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: T.emeraldStrong,
                  border: '1px solid rgba(52,211,153,0.30)',
                  color: T.emerald,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {focus.confirmed_count}/{focus.total}
                </span>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 4,
            }}>
              {focus.children.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    width: 60,
                  }}
                >
                  <div style={{
                    position: 'relative',
                    borderRadius: '50%',
                    padding: 2,
                    background: c.confirmed ? T.emerald : 'rgba(255,255,255,0.18)',
                  }}>
                    <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />
                    {c.confirmed && (
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: T.emerald,
                        color: '#06281a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #0a1a0f',
                      }}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{
                    marginTop: 6,
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: T.textSecondary,
                    width: '100%',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          padding: 4,
          borderRadius: 14,
          background: T.card,
          border: T.cardBorder,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
        }}>
          {([
            { k: 'master' as Tab, label: LABELS.tabMaster, icon: ListChecks },
            { k: 'paperwork' as Tab, label: LABELS.tabPaperwork, icon: ClipboardCheck },
            { k: 'bingo' as Tab, label: LABELS.tabBingo, icon: Languages },
          ]).map(opt => {
            const Icon = opt.icon;
            const active = tab === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => setTab(opt.k)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: active ? T.emeraldStrong : 'transparent',
                  border: `1px solid ${active ? 'rgba(52,211,153,0.45)' : 'transparent'}`,
                  color: active ? T.emerald : T.textSecondary,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* ── Master tab ── */}
        {tab === 'master' && (
          <div>
            {loadingMaster && (
              <div style={{
                textAlign: 'center',
                padding: '60px 0',
                color: T.textMuted,
                fontFamily: T.sans,
                fontSize: 13,
              }}>
                {LABELS.loading}
              </div>
            )}

            {!loadingMaster && master && (
              <>
                {focus && focus.total < 10 && master.children.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <button
                      onClick={addAll}
                      disabled={mutating === 'bulk'}
                      style={{
                        ...ctaPrimary,
                        opacity: mutating === 'bulk' ? 0.5 : 1,
                        cursor: mutating === 'bulk' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Sparkles size={14} strokeWidth={1.75} />
                      {LABELS.pickTop10}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {master.children.map((c, idx) => {
                    const isOnFocus = focusedIds.has(c.id);
                    const isConfirmed = confirmedIds.has(c.id);
                    const topThree = idx < 3;

                    let cardBg = T.card;
                    let cardBorder = T.cardBorder;
                    if (isConfirmed) {
                      cardBg = T.emeraldSoft;
                      cardBorder = '1px solid rgba(52,211,153,0.45)';
                    } else if (isOnFocus) {
                      cardBg = T.emeraldStrong;
                      cardBorder = '1px solid rgba(52,211,153,0.55)';
                    } else if (topThree) {
                      cardBg = 'rgba(245,158,11,0.07)';
                      cardBorder = `1px solid ${T.amberBorder}`;
                    }

                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleFocus(c.id)}
                        disabled={mutating === c.id}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: 0,
                          background: cardBg,
                          border: cardBorder,
                          borderRadius: 14,
                          backdropFilter: T.blur,
                          WebkitBackdropFilter: T.blur,
                          cursor: mutating === c.id ? 'wait' : 'pointer',
                          transition: 'all 120ms ease',
                          opacity: mutating === c.id ? 0.7 : 1,
                          color: T.textPrimary,
                          fontFamily: T.sans,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                        }}>
                          {/* Rank */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: topThree ? T.amber : 'rgba(255,255,255,0.08)',
                            border: topThree ? '1px solid rgba(245,158,11,0.55)' : '1px solid rgba(255,255,255,0.10)',
                            color: topThree ? '#1a1206' : T.textMuted,
                            fontFamily: T.sans,
                            fontSize: 12,
                            fontWeight: 700,
                          }}>
                            {idx + 1}
                          </div>

                          <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{
                                fontFamily: T.sans,
                                fontSize: 14,
                                fontWeight: 600,
                                color: T.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {c.name}
                              </div>
                              {isConfirmed && (
                                <span style={{
                                  fontFamily: T.sans,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: 0.3,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: T.emerald,
                                  color: '#06281a',
                                }}>
                                  {LABELS.confirmed}
                                </span>
                              )}
                              {isOnFocus && !isConfirmed && (
                                <span style={{
                                  fontFamily: T.sans,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: 0.3,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: T.emeraldStrong,
                                  border: '1px solid rgba(52,211,153,0.45)',
                                  color: T.emerald,
                                }}>
                                  {LABELS.onFocus}
                                </span>
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px 12px',
                              marginTop: 4,
                              fontFamily: T.sans,
                              fontSize: 11,
                              color: T.textMuted,
                            }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="days since photo">
                                <Camera size={11} strokeWidth={1.75} />
                                {c.days_since_photo >= 365 ? '∞' : c.days_since_photo}{LABELS.daysSincePhoto}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="days since progress update">
                                <BarChart3 size={11} strokeWidth={1.75} />
                                {c.days_since_progress >= 365 ? '∞' : c.days_since_progress}{LABELS.daysSinceProgress}
                              </span>
                              {c.paperwork_weeks_behind > 0 && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: T.red,
                                  fontWeight: 600,
                                }}>
                                  <Files size={11} strokeWidth={1.75} />
                                  {c.paperwork_weeks_behind} {LABELS.paperworkBehind}
                                </span>
                              )}
                              {c.no_language_this_week && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: T.amber,
                                  fontWeight: 600,
                                }}>
                                  <Languages size={11} strokeWidth={1.75} />
                                  {LABELS.noLanguage}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score */}
                          <div style={{
                            flexShrink: 0,
                            textAlign: 'right',
                            fontFamily: T.serif,
                            fontSize: 22,
                            fontWeight: 500,
                            color: topThree ? T.amber : T.textMuted,
                            letterSpacing: -0.5,
                          }}>
                            {c.score}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Paperwork tab ── */}
        {tab === 'paperwork' && (
          <PaperworkPanel />
        )}

        {/* ── Bingo tab ── */}
        {tab === 'bingo' && (
          <div>
            {loadingBingo && (
              <div style={{
                textAlign: 'center',
                padding: '60px 0',
                color: T.textMuted,
                fontFamily: T.sans,
                fontSize: 13,
              }}>
                {LABELS.loading}
              </div>
            )}
            {!loadingBingo && bingo && (
              <div style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: T.cardRadius,
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                padding: 16,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.textSecondary,
                }}>
                  <Languages size={14} strokeWidth={1.75} color={T.emerald} />
                  <span>{LABELS.bingoTitle}</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: T.emeraldStrong,
                    border: '1px solid rgba(52,211,153,0.30)',
                    color: T.emerald,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {bingo.notYet.length}/{bingo.totalChildren}
                  </span>
                </div>

                {bingo.notYet.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    color: T.emerald,
                    fontFamily: T.serif,
                    fontSize: 17,
                    fontWeight: 500,
                  }}>
                    {LABELS.allDone}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: 8,
                  }}>
                    {bingo.notYet.map(c => {
                      const isOnFocus = focusedIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleFocus(c.id)}
                          disabled={mutating === c.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '12px 8px',
                            borderRadius: 12,
                            background: isOnFocus ? T.emeraldStrong : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isOnFocus ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.08)'}`,
                            color: T.textPrimary,
                            fontFamily: T.sans,
                            cursor: mutating === c.id ? 'wait' : 'pointer',
                            transition: 'all 120ms ease',
                            opacity: mutating === c.id ? 0.7 : 1,
                          }}
                        >
                          <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />
                          <div style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: T.textPrimary,
                            width: '100%',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {c.name}
                          </div>
                          {isOnFocus && (
                            <div style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.emerald,
                              letterSpacing: 0.3,
                            }}>
                              {LABELS.onFocus}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Link
                  href="/montree/dashboard/language-tracker"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 16,
                    padding: '10px',
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.emerald,
                    textDecoration: 'none',
                    transition: 'opacity 120ms ease',
                  }}
                >
                  {t('focus.openEnglishCorner')}
                  <ArrowRight size={13} strokeWidth={1.75} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
