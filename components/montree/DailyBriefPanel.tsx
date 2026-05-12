'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sun, ChevronDown, Check, ArrowDown, Sparkles, Brain,
  ClipboardList, Clock, NotebookPen, Camera, HeartPulse,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface ActionItem {
  type: 'attendance' | 'stale_works' | 'conference_notes' | 'evidence' | 'pulse' | 'skill_intelligence';
  priority: 'high' | 'medium' | 'low';
  message: string;
  count: number;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  needs_override: number;
}

interface StaleWorksSummary {
  total: number;
  attention: number;
  stale: number;
  cooling: number;
}

interface ConferenceNotesSummary {
  drafts: number;
  shared: number;
  old_drafts: number;
}

interface EvidenceSummary {
  ready_for_mastery: number;
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
}

interface PulseSummary {
  last_generated_at: string | null;
  hours_since_last: number | null;
}

interface SkillIntelligenceFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  childName?: string;
  childId?: string;
}

interface SkillIntelligenceSummary {
  total_flags: number;
  high_flags: number;
  flags: SkillIntelligenceFlag[];
}

interface DailyBrief {
  date: string;
  attendance: AttendanceSummary;
  stale_works: StaleWorksSummary;
  conference_notes: ConferenceNotesSummary;
  evidence: EvidenceSummary;
  pulse: PulseSummary;
  skill_intelligence: SkillIntelligenceSummary;
  action_items: ActionItem[];
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
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.30)',
  blue: '#60a5fa',
  blueSoft: 'rgba(96,165,250,0.10)',
  blueBorder: 'rgba(96,165,250,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const PRIORITY_CONFIG: Record<'high' | 'medium' | 'low', { dot: string; bg: string; border: string; text: string }> = {
  high:   { dot: T.amber, bg: T.amberSoft, border: T.amberBorder, text: T.amber },
  medium: { dot: T.blue, bg: T.blueSoft, border: T.blueBorder, text: T.blue },
  low:    { dot: 'rgba(255,255,255,0.30)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: T.textSecondary },
};

const TYPE_ICONS: Record<ActionItem['type'], typeof ClipboardList> = {
  attendance: ClipboardList,
  stale_works: Clock,
  conference_notes: NotebookPen,
  evidence: Camera,
  pulse: HeartPulse,
  skill_intelligence: Brain,
};

export default function DailyBriefPanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchBrief = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/daily-brief');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setBrief(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[DailyBrief] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchBrief();
    return () => { abortRef.current?.abort(); };
  }, [fetchBrief]);

  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'db-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 140, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes db-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  if (!brief) return null;

  const totalActions = brief.action_items.length;
  const allGood = totalActions === 0;

  return (
    <div style={{
      background: T.card,
      border: T.cardBorder,
      borderRadius: T.cardRadius,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      overflow: 'hidden',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('brief.title')}
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
            background: 'rgba(245,158,11,0.18)',
            border: '1px solid rgba(245,158,11,0.30)',
            color: T.amber,
          }}>
            <Sun size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('brief.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {allGood
                ? t('brief.allGood')
                : t('brief.actionCount').replace('{count}', String(totalActions))
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalActions > 0 && (
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.30)',
              color: T.emerald,
              letterSpacing: 0.3,
            }}>
              {totalActions} {t('brief.toDo')}
            </span>
          )}
          {allGood && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              color: T.emerald,
            }}>
              <Check size={11} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={1.75}
            color={T.textMuted}
            style={{
              transition: 'transform 200ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 16px 16px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <StatTile
              value={`${brief.attendance.present}/${brief.attendance.total}`}
              label={t('brief.present')}
              tint={T.emerald}
              tintBg={T.emeraldSoft}
              tintBorder="rgba(52,211,153,0.25)"
            />
            <StatTile
              value={brief.stale_works.total}
              label={t('brief.toRevisit')}
              tint={T.amber}
              tintBg={T.amberSoft}
              tintBorder={T.amberBorder}
            />
            <StatTile
              value={brief.conference_notes.drafts}
              label={t('brief.drafts')}
              tint={T.blue}
              tintBg={T.blueSoft}
              tintBorder={T.blueBorder}
            />
            <StatTile
              value={brief.evidence.ready_for_mastery}
              label={t('brief.ready')}
              tint="#c4b5fd"
              tintBg="rgba(139,92,246,0.10)"
              tintBorder="rgba(139,92,246,0.28)"
            />
            {brief.skill_intelligence && brief.skill_intelligence.total_flags > 0 && (
              <StatTile
                value={brief.skill_intelligence.total_flags}
                label={t('brief.skillInsights')}
                tint={T.textSecondary}
                tintBg="rgba(255,255,255,0.04)"
                tintBorder="rgba(255,255,255,0.10)"
              />
            )}
          </div>

          {/* Skill Intelligence flags */}
          {brief.skill_intelligence && brief.skill_intelligence.flags.length > 0 && (
            <div id="panel-skill_intelligence" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                <Brain size={12} strokeWidth={1.75} />
                {t('brief.skillIntelTitle')}
              </div>
              {brief.skill_intelligence.flags.map((flag, idx) => {
                const cfg = PRIORITY_CONFIG[flag.severity];
                return (
                  <div
                    key={`skill-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      marginTop: 5,
                      background: cfg.dot,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: T.sans,
                        fontSize: 12,
                        color: cfg.text,
                        lineHeight: 1.5,
                      }}>
                        {flag.message}
                      </div>
                      {flag.childName && (
                        <div style={{
                          fontFamily: T.sans,
                          fontSize: 10,
                          color: T.textMuted,
                          marginTop: 2,
                        }}>
                          {flag.childName}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action items */}
          {totalActions > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                {t('brief.actions')}
              </div>
              {brief.action_items.map((item, idx) => {
                const cfg = PRIORITY_CONFIG[item.priority];
                const Icon = TYPE_ICONS[item.type];
                return (
                  <button
                    key={`${item.type}-${idx}`}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('montree:expand-section', { detail: 'intelligence' }));
                      requestAnimationFrame(() => {
                        const el = document.getElementById(`panel-${item.type}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      });
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      color: T.textPrimary,
                      fontFamily: T.sans,
                      cursor: 'pointer',
                      transition: 'opacity 120ms ease',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: cfg.dot,
                    }} />
                    <Icon size={14} strokeWidth={1.75} color={cfg.text} style={{ flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      fontSize: 12,
                      color: cfg.text,
                      lineHeight: 1.4,
                    }}>
                      {t(`brief.action.${item.type}`).replace('{count}', String(item.count))}
                    </span>
                    <ArrowDown size={12} strokeWidth={1.75} color={T.textMuted} />
                  </button>
                );
              })}
            </div>
          )}

          {/* All good state */}
          {allGood && (
            <div style={{
              textAlign: 'center',
              padding: '14px 0 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.40)',
                color: T.emerald,
              }}>
                <Sparkles size={16} strokeWidth={1.75} />
              </div>
              <div style={{
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                color: T.emerald,
              }}>
                {t('brief.allGoodDetail')}
              </div>
            </div>
          )}

          {/* Pulse footer */}
          <div style={{
            fontFamily: T.sans,
            fontSize: 10,
            color: T.textMuted,
            textAlign: 'center',
            paddingTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            {brief.pulse.last_generated_at
              ? t('brief.pulseAgo').replace('{hours}', String(brief.pulse.hours_since_last || 0))
              : t('brief.noPulse')
            }
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ value, label, tint, tintBg, tintBorder }: {
  value: string | number;
  label: string;
  tint: string;
  tintBg: string;
  tintBorder: string;
}) {
  return (
    <div style={{
      flex: 1,
      padding: '8px 6px',
      borderRadius: 10,
      background: tintBg,
      border: `1px solid ${tintBorder}`,
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
