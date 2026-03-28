'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface ActionItem {
  type: 'attendance' | 'stale_works' | 'conference_notes' | 'evidence' | 'pulse';
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

interface DailyBrief {
  date: string;
  attendance: AttendanceSummary;
  stale_works: StaleWorksSummary;
  conference_notes: ConferenceNotesSummary;
  evidence: EvidenceSummary;
  pulse: PulseSummary;
  action_items: ActionItem[];
}

const PRIORITY_CONFIG = {
  high: { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  medium: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
} as const;

const TYPE_ICONS: Record<ActionItem['type'], string> = {
  attendance: '📋',
  stale_works: '⏰',
  conference_notes: '📝',
  evidence: '📷',
  pulse: '💓',
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-40 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  if (!brief) return null;

  const highCount = brief.action_items.filter(a => a.priority === 'high').length;
  const totalActions = brief.action_items.length;
  const allGood = totalActions === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('brief.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">☀️</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('brief.title')}
            </div>
            <div className="text-xs text-gray-500">
              {allGood
                ? t('brief.allGood')
                : t('brief.actionCount').replace('{count}', String(totalActions))
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
              {highCount} {t('brief.urgent')}
            </span>
          )}
          {allGood && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </span>
          )}
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Quick stats row */}
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-base font-bold text-emerald-700">
                {brief.attendance.present}/{brief.attendance.total}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">{t('brief.present')}</div>
            </div>
            <div className="flex-1 bg-amber-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-base font-bold text-amber-700">{brief.stale_works.total}</div>
              <div className="text-[10px] text-amber-600 font-medium">{t('brief.stale')}</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-base font-bold text-blue-700">{brief.conference_notes.drafts}</div>
              <div className="text-[10px] text-blue-600 font-medium">{t('brief.drafts')}</div>
            </div>
            <div className="flex-1 bg-violet-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-base font-bold text-violet-700">{brief.evidence.ready_for_mastery}</div>
              <div className="text-[10px] text-violet-600 font-medium">{t('brief.ready')}</div>
            </div>
          </div>

          {/* Action items */}
          {totalActions > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('brief.actions')}
              </div>
              {brief.action_items.map((item, idx) => {
                const cfg = PRIORITY_CONFIG[item.priority];
                return (
                  <button
                    key={`${item.type}-${idx}`}
                    onClick={() => {
                      const el = document.getElementById(`panel-${item.type}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 ${cfg.bg} border ${cfg.border} hover:opacity-80 transition-opacity text-left`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-sm flex-shrink-0">{TYPE_ICONS[item.type]}</span>
                    <span className={`text-xs ${cfg.text} flex-1`}>
                      {t(`brief.action.${item.type}`)
                        .replace('{count}', String(item.count))
                      }
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.text} bg-white/50`}>
                      {t(`brief.priority.${item.priority}`)}
                    </span>
                    <span className="text-xs text-gray-400">↓</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* All good state */}
          {allGood && (
            <div className="text-center py-3">
              <div className="text-2xl mb-1">🌟</div>
              <div className="text-sm text-emerald-600 font-medium">{t('brief.allGoodDetail')}</div>
            </div>
          )}

          {/* Pulse status footer */}
          <div className="text-[10px] text-gray-400 text-center pt-1 border-t border-gray-50">
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
