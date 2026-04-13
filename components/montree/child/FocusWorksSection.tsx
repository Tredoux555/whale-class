'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AreaConfig } from '@/components/montree/curriculum/types';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import GuruWorkGuide from '@/components/montree/guru/GuruWorkGuide';
import TeachingInstructions from '@/components/montree/guru/TeachingInstructions';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';
import EvidenceStrengthBadge from '@/components/montree/EvidenceStrengthBadge';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { GamePlan } from '@/components/montree/child/GamePlanCard';

export interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
  chineseName?: string;
}

interface AreaDetail {
  work: string;
  this_week: string;
  next_week: string;
}

export interface FocusWorksSectionProps {
  focusWorks: Assignment[];
  extraWorks: Assignment[];
  expandedIndex: string | null;
  setExpandedIndex: (key: string | null) => void;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savingNote: string | null;
  onSaveNote: (work: Assignment) => void;
  onCycleStatus: (work: Assignment, isFocus: boolean) => void;
  onRemoveExtra: (work: Assignment) => void;
  onOpenWheelPicker: (area: string, workName?: string) => void;
  onOpenQuickGuide: (workName: string, chineseName?: string) => void;
  childId: string;
  childName?: string;
  getAreaConfig: (area: string) => AreaConfig;
  isHomeschoolParent?: boolean;
  guruAreaDetails?: Record<string, AreaDetail> | null;
  smartNoteProcessing?: string | null;
  gamePlan?: GamePlan | null;
  onRefreshGamePlan?: (newPlan: GamePlan) => void;
}

// Status config with translated labels
function getStatusConfig(t: (key: string) => string): Record<string, { label: string; bg: string; text: string }> {
  return {
    not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
    presented: { label: t('status.presented'), bg: 'bg-amber-300', text: 'text-amber-800' },
    practicing: { label: t('status.practicing'), bg: 'bg-blue-400', text: 'text-blue-800' },
    mastered: { label: t('status.mastered'), bg: 'bg-emerald-400', text: 'text-emerald-800' },
    completed: { label: t('status.mastered'), bg: 'bg-emerald-400', text: 'text-emerald-800' }, // Legacy alias
  };
}

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Normalize area keys (API sometimes uses 'math' instead of 'mathematics')
function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

// Clean AI recommendation sentences from work names
// e.g. "Present Carrying a Mat as the foundational Practical Life work" → "Carrying a Mat"
function cleanWorkName(raw: string): string {
  if (!raw) return raw;
  let name = raw.trim();
  // Strip leading action verbs
  name = name.replace(/^(Present|Continue|Introduce|Begin|Start|Explore|Practice|Review|Offer|Revisit|Try|Focus on|Work on|Encourage)\s+/i, '');
  // Strip trailing clauses
  name = name.replace(/\s+(as the|as a|as an|with increased|with more|with special|because|for the|for a|to build|to develop|to strengthen|to support|to encourage|to practice|which will|that will|in order|progressively|sequentially)\b.*/i, '');
  name = name.replace(/\s+[—–-]\s+.*$/, '');
  return name.trim();
}

export default function FocusWorksSection({
  focusWorks,
  extraWorks,
  expandedIndex,
  setExpandedIndex,
  notes,
  setNotes,
  savingNote,
  onSaveNote,
  onCycleStatus,
  onRemoveExtra,
  onOpenWheelPicker,
  onOpenQuickGuide,
  childId,
  childName,
  getAreaConfig,
  isHomeschoolParent: isParent = false,
  guruAreaDetails,
  smartNoteProcessing,
  gamePlan,
  onRefreshGamePlan,
}: FocusWorksSectionProps) {
  const { t, locale } = useI18n();
  const [expandedAdvice, setExpandedAdvice] = useState<string | null>(null);
  const statusConfig = getStatusConfig(t);
  const [activePhase, setActivePhase] = useState(0);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [showCheckQuestions, setShowCheckQuestions] = useState(false);

  const handleRefreshPlan = useCallback(async () => {
    if (!onRefreshGamePlan) return;
    setRefreshingPlan(true);
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/game-plan/refresh`, {
        method: 'POST',
        timeout: 120000,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.game_plan) onRefreshGamePlan(data.game_plan as GamePlan);
      }
    } catch (err) {
      console.error('[GamePlan] Refresh error:', err);
    } finally {
      setRefreshingPlan(false);
    }
  }, [childId, onRefreshGamePlan]);

  // Compute days since game plan update
  const planDaysSinceUpdate = gamePlan ? Math.floor(
    (Date.now() - new Date(gamePlan.updated_at || gamePlan.generated_at).getTime()) / 86400000
  ) : 0;

  // Get active phase works for display
  const activePhaseData = gamePlan?.phases?.[activePhase] || null;

  // Evidence tracking — loaded once per child, cached in state
  const [evidenceMap, setEvidenceMap] = useState<Record<string, {
    evidence_photo_count: number;
    evidence_photo_days: number;
    evidence_strength: string;
    mastery_confirmed_at: string | null;
    mastery_confirmed_by: string | null;
  }>>({});
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);
  const evidenceAbortRef = useRef<AbortController | null>(null);
  const childIdRef = useRef(childId);

  const fetchEvidence = useCallback(async () => {
    if (evidenceLoaded || !childId) return;
    // Abort any in-flight fetch
    evidenceAbortRef.current?.abort();
    const controller = new AbortController();
    evidenceAbortRef.current = controller;
    const fetchChildId = childId; // capture for stale check
    try {
      const res = await montreeApi(`/api/montree/intelligence/evidence?child_id=${childId}`);
      if (controller.signal.aborted || childIdRef.current !== fetchChildId) return; // stale
      if (!res.ok) return;
      const json = await res.json();
      if (controller.signal.aborted || childIdRef.current !== fetchChildId) return; // stale
      const map: typeof evidenceMap = {};
      for (const w of json.works || []) {
        map[w.work_name] = {
          evidence_photo_count: w.evidence_photo_count || 0,
          evidence_photo_days: w.evidence_photo_days || 0,
          evidence_strength: w.evidence_strength || 'none',
          mastery_confirmed_at: w.mastery_confirmed_at,
          mastery_confirmed_by: w.mastery_confirmed_by,
        };
      }
      setEvidenceMap(map);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[Evidence] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && childIdRef.current === fetchChildId) {
        setEvidenceLoaded(true);
      }
    }
  }, [childId, evidenceLoaded]);

  // Reset evidence cache when child changes + abort in-flight fetch
  useEffect(() => {
    childIdRef.current = childId;
    evidenceAbortRef.current?.abort();
    setEvidenceLoaded(false);
    setEvidenceMap({});
    setExpandedAdvice(null);
  }, [childId]);

  // Fetch evidence when any work card is expanded
  useEffect(() => {
    if (expandedIndex && !evidenceLoaded) {
      fetchEvidence();
    }
  }, [expandedIndex, evidenceLoaded, fetchEvidence]);

  // Copy text to clipboard
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${gamePlan ? 'bg-gradient-to-b from-amber-50 to-white border border-amber-200/60' : 'bg-white'}`}>
      {/* Game Plan integrated header — or plain title */}
      {gamePlan ? (
        <div className="mb-4 space-y-3">
          {/* Game plan title + priority areas */}
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🗺️</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-gray-800">
                  {locale === 'zh' ? '学习计划' : 'Game Plan'}
                </h2>
                <div className="flex gap-1 flex-wrap">
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
              <p className="text-xs text-gray-600 mt-1">{gamePlan.headline}</p>
            </div>
          </div>

          {/* Language strategy note */}
          {gamePlan.language_note && (
            <div className="bg-blue-50/70 rounded-xl px-3 py-2 border border-blue-100">
              <p className="text-xs text-gray-600">
                <span className="text-blue-600 font-medium">🌍 </span>
                {gamePlan.language_note}
              </p>
            </div>
          )}

          {/* Phase tabs */}
          {gamePlan.phases?.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {gamePlan.phases.map((phase, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhase(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    activePhase === i
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/80 text-gray-500 hover:bg-amber-100 border border-amber-200/50'
                  }`}
                >
                  {phase.title.split(':')[0] || `Phase ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Active phase summary — works + strategies in compact view */}
          {activePhaseData && (
            <div className="bg-white/70 rounded-xl p-3 border border-amber-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-gray-700">{activePhaseData.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{activePhaseData.goal}</p>
                </div>
              </div>
              {/* Phase works as chips */}
              <div className="flex flex-wrap gap-1.5">
                {activePhaseData.works.map((work, wi) => (
                  <span
                    key={wi}
                    className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
                  >
                    {work}
                  </span>
                ))}
              </div>
              {/* Strategies collapsed */}
              {activePhaseData.strategies?.length > 0 && (
                <div className="space-y-1">
                  {activePhaseData.strategies.map((strategy, si) => (
                    <div key={si} className="flex items-start gap-1.5">
                      <span className="text-amber-400 text-[10px] mt-0.5">→</span>
                      <p className="text-[11px] text-gray-500">{strategy}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-amber-200/40" />
        </div>
      ) : (
        <h2 className="font-bold text-gray-800 mb-3">{t('focusWorks.title')}</h2>
      )}

      <div className="space-y-2">
        {AREAS.map((area, areaIdx) => {
          // Find the focus work for this area
          const focusWork = focusWorks.find(w => normalizeArea(w.area) === area);
          // Find extras for this area
          const areaExtras = extraWorks.filter(e => normalizeArea(e.area) === area);

          const status = focusWork
            ? (statusConfig[focusWork.status] || statusConfig.not_started)
            : statusConfig.not_started;
          const isExpanded = expandedIndex === area;
          const guruDetail = guruAreaDetails?.[area] || null;

          return (
            <div key={`area-${area}`} className="space-y-1">
              {/* Area row — always visible */}
              <div
                {...(areaIdx === 0 ? { 'data-guide': 'first-work-row' } : {})}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50' : 'bg-gray-50'}`}
              >
                {/* Area badge — tap to swap focus work */}
                <button
                  {...(areaIdx === 0 ? { 'data-guide': 'area-badge-first' } : {})}
                  className="active:scale-90 transition-transform"
                  onClick={() => onOpenWheelPicker(area, focusWork?.work_name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onOpenWheelPicker(area, focusWork?.work_name);
                  }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => {
                      onOpenWheelPicker(area, focusWork?.work_name);
                    }, 500);
                    const clear = () => clearTimeout(timer);
                    e.currentTarget.addEventListener('touchend', clear, { once: true });
                    e.currentTarget.addEventListener('touchmove', clear, { once: true });
                  }}
                  title={t('focusWorks.tapToChange')}
                >
                  <AreaBadge area={area} size="lg" />
                </button>

                {/* Work name or empty state — tap to expand */}
                <button
                  {...(areaIdx === 0 ? { 'data-guide': 'first-work-name' } : {})}
                  onClick={() => setExpandedIndex(isExpanded ? null : area)}
                  className="flex-1 text-left"
                >
                  {focusWork ? (
                    <p className="font-medium text-gray-800 text-sm">
                      {locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : cleanWorkName(focusWork.work_name)}
                    </p>
                  ) : (
                    <p className="font-medium text-gray-400 text-sm italic">
                      {t('focusWorks.noWorkInArea')}
                    </p>
                  )}
                </button>

                {/* Status badge — only if focus work exists */}
                {focusWork && (
                  <button
                    {...(areaIdx === 0 ? { 'data-tutorial': 'status-badge-first' } : {})}
                    onClick={() => onCycleStatus(focusWork, true)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-90 ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </button>
                )}

                {/* Expand arrow */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : area)}
                  className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  ▼
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-1 ml-7 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-3">

                  {/* Guru Advice — hidden to reduce clutter, code preserved */}

                  {/* Work controls — only if focus work exists */}
                  {focusWork ? (
                    <>
                      {/* Quick Guide button — Capture removed, main nav capture is sufficient */}
                      <div className="flex gap-2">
                        <button
                          {...(areaIdx === 0 ? { 'data-guide': 'quick-guide-btn' } : {})}
                          onClick={() => onOpenQuickGuide(focusWork.work_name, focusWork.chineseName)}
                          className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-amber-600 active:scale-95"
                        >
                          📖 {t('focusWorks.quickGuide')}
                        </button>
                      </div>

                      {/* Evidence strength indicator */}
                      {evidenceMap[focusWork.work_name] && (
                        <EvidenceStrengthBadge
                          photoCount={evidenceMap[focusWork.work_name].evidence_photo_count}
                          photoDays={evidenceMap[focusWork.work_name].evidence_photo_days}
                          masteryConfirmedAt={evidenceMap[focusWork.work_name].mastery_confirmed_at}
                        />
                      )}

                      {/* Guru Work Guide — homeschool parents only */}
                      {isParent && (
                        <GuruWorkGuide workName={focusWork.work_name} childId={childId} />
                      )}

                      {/* Notes */}
                      <div {...(areaIdx === 0 ? { 'data-guide': 'notes-area' } : {})} className="relative">
                        <textarea
                          value={notes[focusWork.work_name] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [focusWork.work_name]: e.target.value }))}
                          placeholder={t('focusWorks.addObservation')}
                          className="w-full p-3 pb-10 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none
                            bg-gradient-to-b from-amber-100 to-amber-50 border-0 shadow-md
                            text-amber-900 placeholder-amber-400"
                          rows={2}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                          {!isParent && (
                            <ChildVoiceNote
                              childId={childId}
                              childName={childName}
                              onTranscript={(text) => setNotes(prev => ({
                                ...prev,
                                [focusWork.work_name]: prev[focusWork.work_name] ? prev[focusWork.work_name] + ' ' + text : text,
                              }))}
                            />
                          )}
                          <button
                            onClick={() => onSaveNote(focusWork)}
                            disabled={!notes[focusWork.work_name]?.trim() || savingNote === focusWork.work_name}
                            className="px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg
                              disabled:opacity-50 hover:bg-amber-600 active:scale-95 shadow-sm"
                          >
                            {savingNote === focusWork.work_name ? '...' : smartNoteProcessing === focusWork.work_name ? '🧠' : '📌 ' + t('focusWorks.save')}
                          </button>
                        </div>
                      </div>

                      {/* Teaching Instructions — hidden to reduce clutter, code preserved */}
                    </>
                  ) : (
                    /* No focus work — show add button */
                    <button
                      onClick={() => onOpenWheelPicker(area)}
                      className="w-full py-3 bg-emerald-100 text-emerald-700 font-medium rounded-xl text-sm hover:bg-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">+</span>
                      {t('focusWorks.addOne')}
                    </button>
                  )}
                </div>
              )}

              {/* Extra works for this area — shown when expanded */}
              {isExpanded && areaExtras.length > 0 && (
                <div className="ml-8 space-y-1">
                  {areaExtras.map((extra) => {
                    const extraStatus = statusConfig[extra.status] || statusConfig.not_started;
                    return (
                      <div key={`extra-${extra.area}-${extra.work_name}`} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/60">
                        <span className="text-xs text-gray-400">└</span>
                        <span className="flex-1 text-sm text-gray-600">
                          {locale === 'zh' && extra.chineseName ? extra.chineseName : cleanWorkName(extra.work_name)}
                        </span>
                        <button
                          onClick={() => onCycleStatus(extra, false)}
                          className={`px-2 py-0.5 rounded-full ${extraStatus.bg} ${extraStatus.text} font-semibold text-xs active:scale-90`}
                        >
                          {extraStatus.label}
                        </button>
                        <button
                          onClick={() => onRemoveExtra(extra)}
                          className="text-gray-400 hover:text-red-500 text-xs p-1"
                          title={t('common.remove')}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Plan footer — weekly check questions + refresh */}
      {gamePlan && (
        <div className="mt-4 space-y-3">
          {/* Weekly check questions — collapsible */}
          {gamePlan.weekly_check_questions?.length > 0 && (
            <div>
              <button
                onClick={() => setShowCheckQuestions(!showCheckQuestions)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className={`transition-transform ${showCheckQuestions ? 'rotate-90' : ''}`}>▸</span>
                <span className="font-medium">{locale === 'zh' ? '每周检查' : 'Weekly Pulse Check'}</span>
                <span className="text-gray-300">({gamePlan.weekly_check_questions.length})</span>
              </button>
              {showCheckQuestions && (
                <div className="mt-2 space-y-1.5 ml-4">
                  {gamePlan.weekly_check_questions.map((q, qi) => (
                    <div key={qi} className="flex items-start gap-2 px-3 py-2 bg-amber-50/50 rounded-lg">
                      <span className="text-gray-300 text-xs">○</span>
                      <p className="text-xs text-gray-600">{q}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer — last updated + refresh */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-100">
            <p className="text-[10px] text-gray-400">
              {locale === 'zh' ? '计划更新于' : 'Plan updated'}{' '}
              {planDaysSinceUpdate === 0
                ? (locale === 'zh' ? '今天' : 'today')
                : `${planDaysSinceUpdate}${locale === 'zh' ? '天前' : 'd ago'}`
              }
            </p>
            <button
              onClick={handleRefreshPlan}
              disabled={refreshingPlan}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {refreshingPlan ? (
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

// Inline copy button component
function CopyButton({ text, onCopy }: { text: string; onCopy: (text: string) => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
        copied
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-white/80 text-violet-600 hover:bg-violet-50 border border-violet-200'
      }`}
      title="Copy"
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}
