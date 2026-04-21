'use client';

// components/montree/child/GamePlanCard.tsx
// Displays the AI-generated game plan for a child on their week view page.
// Shows phases with works, strategies, and weekly check questions.
// Collapsible — headline always visible, details expand on tap.

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

// Legacy phase structure (for backward compatibility with existing plans)
interface GamePlanPhase {
  title: string;
  goal: string;
  works: string[];
  strategies: string[];
}

/**
 * Localized string — can be a plain string (legacy) or { en, zh, ... } object.
 * Use resolveLocalized(value, locale) to read.
 */
export type LocalizedString = string | Record<string, string>;
export type LocalizedStringArray = string[] | Record<string, string[]>;

/** Resolve a potentially-localized value to a string for the given locale. */
export function resolveLocalized(val: LocalizedString | undefined, locale: string): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[locale] || val.en || Object.values(val)[0] || '';
}

/** Resolve a potentially-localized array to string[] for the given locale. */
export function resolveLocalizedArray(val: LocalizedStringArray | undefined, locale: string): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val[locale] || val.en || Object.values(val)[0] || [];
}

export interface GamePlan {
  // Bilingual compact format (Haiku) — nudge/works/direction can be
  // { en: "...", zh: "..." } objects or plain strings (legacy compat)
  nudge?: LocalizedString;
  works?: LocalizedStringArray;
  direction?: LocalizedString;
  // Legacy format (Sonnet) — kept for backward compat with existing plans
  headline?: string;
  priority_areas?: string[];
  parent_goals?: string | null;
  phases?: GamePlanPhase[];
  weekly_check_questions?: string[];
  language_note?: string | null;
  // Metadata (both formats)
  generated_at: string;
  updated_at: string;
  child_name: string;
  source: string;
}

interface Props {
  childId: string;
  gamePlan: GamePlan;
  onRefresh?: (newPlan: GamePlan) => void;
}

export default function GamePlanCard({ childId, gamePlan, onRefresh }: Props) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePhase, setActivePhase] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/game-plan/refresh`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.game_plan && onRefresh) {
          onRefresh(data.game_plan as GamePlan);
        }
      }
    } catch (err) {
      console.error('[GamePlan] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [childId, onRefresh]);

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(gamePlan.updated_at || gamePlan.generated_at).getTime()) / 86400000
  );

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start gap-3 text-left active:bg-amber-100/50 transition-colors"
      >
        <span className="text-2xl mt-0.5">🗺️</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-800">
              {locale === 'zh' ? '学习计划' : 'Game Plan'}
            </h3>
            <div className="flex gap-1">
              {gamePlan.priority_areas?.slice(0, 3).map((area) => (
                <span
                  key={area}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-200/60 text-amber-800 rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {gamePlan.headline}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Parent goals callout */}
          {gamePlan.parent_goals && (
            <div className="bg-white/60 rounded-xl px-4 py-3 border border-amber-100">
              <p className="text-xs text-gray-500 font-medium mb-1">
                {locale === 'zh' ? '家长目标' : 'Parent Goals'}
              </p>
              <p className="text-sm text-gray-700">{gamePlan.parent_goals}</p>
            </div>
          )}

          {/* Language note */}
          {gamePlan.language_note && (
            <div className="bg-blue-50/70 rounded-xl px-4 py-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">
                {locale === 'zh' ? '语言策略' : '🌍 Language Strategy'}
              </p>
              <p className="text-sm text-gray-700">{gamePlan.language_note}</p>
            </div>
          )}

          {/* Phase tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {gamePlan.phases.map((phase, i) => (
              <button
                key={i}
                onClick={() => setActivePhase(i)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  activePhase === i
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/80 text-gray-600 hover:bg-amber-100'
                }`}
              >
                {phase.title.split(':')[0] || `Phase ${i + 1}`}
              </button>
            ))}
          </div>

          {/* Active phase detail */}
          {gamePlan.phases[activePhase] && (
            <div className="bg-white rounded-xl p-4 border border-amber-100 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  {gamePlan.phases[activePhase].title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {gamePlan.phases[activePhase].goal}
                </p>
              </div>

              {/* Works */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  {locale === 'zh' ? '课程' : 'Works to Present'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gamePlan.phases[activePhase].works.map((work, wi) => (
                    <span
                      key={wi}
                      className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
                    >
                      {work}
                    </span>
                  ))}
                </div>
              </div>

              {/* Strategies */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  {locale === 'zh' ? '策略' : 'Strategies'}
                </p>
                <div className="space-y-1.5">
                  {gamePlan.phases[activePhase].strategies.map((strategy, si) => (
                    <div key={si} className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs mt-0.5">→</span>
                      <p className="text-xs text-gray-600">{strategy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Weekly check questions */}
          {gamePlan.weekly_check_questions?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                {locale === 'zh' ? '每周检查' : 'Weekly Pulse Check'}
              </p>
              <div className="space-y-1.5">
                {gamePlan.weekly_check_questions.map((q, qi) => (
                  <div key={qi} className="flex items-start gap-2 px-3 py-2 bg-white/60 rounded-lg">
                    <span className="text-gray-300 text-xs">○</span>
                    <p className="text-xs text-gray-600">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer — last updated + refresh */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-100">
            <p className="text-[10px] text-gray-400">
              {locale === 'zh' ? '更新于' : 'Updated'}{' '}
              {daysSinceUpdate === 0
                ? (locale === 'zh' ? '今天' : 'today')
                : `${daysSinceUpdate}${locale === 'zh' ? '天前' : 'd ago'}`
              }
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <div className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {locale === 'zh' ? '刷新计划' : 'Refresh Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
