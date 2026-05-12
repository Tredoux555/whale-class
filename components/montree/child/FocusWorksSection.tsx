'use client';

import { useState, useEffect, useCallback, useMemo, useRef, CSSProperties } from 'react';
import { ChevronDown, BookOpen, Check, Plus, X, Mic, Square } from 'lucide-react';
import { AreaConfig } from '@/components/montree/curriculum/types';
import GuruWorkGuide from '@/components/montree/guru/GuruWorkGuide';
import TeachingInstructions from '@/components/montree/guru/TeachingInstructions';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';
import EvidenceStrengthBadge from '@/components/montree/EvidenceStrengthBadge';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel, getAreaPrefix } from '@/lib/montree/i18n/area-labels';
import { GamePlan } from '@/components/montree/child/GamePlanCard';
import { resolveLocalized, resolveLocalizedArray } from '@/lib/montree/i18n/localized-types';

export interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
  chineseName?: string;
  spanishName?: string;
  deName?: string;
  frName?: string;
  ptName?: string;
  nlName?: string;
  itName?: string;
  jaName?: string;
  koName?: string;
  ukName?: string;
  ruName?: string;
}

interface AreaDetail {
  work: string;
  this_week: string;
  next_week: string;
}

export interface FocusWorksSectionProps {
  focusWorks: Assignment[];
  extraWorks: Assignment[];
  expandedAreas: Set<string>;
  toggleArea: (area: string) => void;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savingNote: string | null;
  onSaveNote: (work: Assignment) => void;
  onCycleStatus: (work: Assignment, isFocus: boolean) => void;
  onRemoveExtra: (work: Assignment) => void;
  onOpenWheelPicker: (area: string, workName?: string) => void;
  onOpenQuickGuide: (workName: string, localizedNames?: Record<string, string | undefined>) => void;
  childId: string;
  childName?: string;
  getAreaConfig: (area: string) => AreaConfig;
  isHomeschoolParent?: boolean;
  guruAreaDetails?: Record<string, AreaDetail> | null;
  smartNoteProcessing?: string | null;
  gamePlan?: GamePlan | null;
  onRefreshGamePlan?: (newPlan: GamePlan) => void;
  onShelfFilled?: () => void;
}

// Status config with translated labels — dark forest inline styles
function getStatusConfig(t: (key: string) => string): Record<string, { label: string; style: CSSProperties }> {
  return {
    not_started: { label: '○', style: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)' } },
    presented:   { label: t('status.presented'), style: { background: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.28)' } },
    practicing:  { label: t('status.practicing'), style: { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.28)' } },
    mastered:    { label: t('status.mastered'), style: { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.20)' } },
    completed:   { label: t('status.mastered'), style: { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.20)' } },
  };
}

// Dark forest design tokens
const C = {
  border:      'rgba(52,211,153,0.15)',
  emerald:     '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.08)',
  rowNormal:   'rgba(255,255,255,0.04)',
  rowExpanded: 'rgba(52,211,153,0.07)',
  textPrimary: 'rgba(255,255,255,0.85)',
  textMuted:   'rgba(255,255,255,0.45)',
  glass:       'rgba(255,255,255,0.06)',
};
const SANS  = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "var(--font-lora), 'Iowan Old Style', Georgia, serif";

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Area dot colors — dark forest palette (matches Claude Design mockup)
const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',   // pink
  sensorial:      '20, 184, 166',   // teal
  mathematics:    '168, 85, 247',   // purple
  language:       '74, 222, 128',   // green
  cultural:       '249, 115, 22',   // orange
};

// Inline area circle with localized letter prefix — matches the curriculum
// overview cards (P/L/S/M/C in English, localized for other languages).
function AreaDot({ area, size = 36, locale = 'en' }: { area: string; size?: number; locale?: string }) {
  const rgb = AREA_DOT_RGB[area] || '255,255,255';
  const prefix = getAreaPrefix(area, locale);
  // 2-character labels (de, uk) need a smaller font so they fit cleanly.
  const fontSize = prefix.length > 1 ? Math.round(size * 0.36) : Math.round(size * 0.5);
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: '50%',
      background: `rgba(${rgb}, 0.22)`,
      border: `1px solid rgba(${rgb}, 0.40)`,
      boxShadow: `0 0 0 1px rgba(${rgb}, 0.05) inset, 0 4px 12px rgba(${rgb}, 0.10)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: `rgba(${rgb}, 0.95)`,
      fontFamily: SANS,
      fontSize,
      fontWeight: 600,
      letterSpacing: prefix.length > 1 ? '-0.02em' : '0',
      lineHeight: 1,
      userSelect: 'none',
    }}>
      {prefix}
    </div>
  );
}

// ─── GAME PLAN VISIBILITY ───────────────────────────────────────────────────
// Set to true to re-enable the game plan card (nudge, work chips, direction,
// fill-shelf button, and footer) across all locales. Currently hidden because:
//   • Spanish nudge/chips fall back to English (no es key in JSONB yet)
//   • The shelf alone is sufficient for day-to-day teacher use
// To restore: flip this to true and redeploy.
const SHOW_GAME_PLAN = false;

// Normalize area keys (API sometimes uses 'math' instead of 'mathematics')
function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

// Resolve localized work name for any locale
function getWorkDisplayName(work: Assignment, locale: string): string {
  const nameMap: Record<string, string | undefined> = {
    zh: work.chineseName,
    es: work.spanishName,
    de: work.deName,
    fr: work.frName,
    pt: work.ptName,
    nl: work.nlName,
    it: work.itName,
    ja: work.jaName,
    ko: work.koName,
    uk: work.ukName,
    ru: work.ruName,
  };
  return nameMap[locale] || cleanWorkName(work.work_name);
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
  expandedAreas,
  toggleArea,
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
  onShelfFilled,
}: FocusWorksSectionProps) {
  const { t, locale } = useI18n();
  const [expandedAdvice, setExpandedAdvice] = useState<string | null>(null);
  // Session 103 Tier 0.5: memoize the status-config object so this component
  // (and every Assignment row inside it) doesn't get a fresh reference on
  // every keystroke / parent re-render. Cuts cascaded child re-renders.
  const statusConfig = useMemo(() => getStatusConfig(t), [t]);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [fillingShelf, setFillingShelf] = useState(false);
  const [shelfFilled, setShelfFilled] = useState(false);

  // Reset shelf-filled state when switching children or game plan changes
  useEffect(() => {
    setShelfFilled(false);
  }, [childId, gamePlan]);

  // Compute game plan display values first (used by callbacks below)
  const planDaysSinceUpdate = gamePlan ? Math.floor(
    (Date.now() - new Date(gamePlan.updated_at || gamePlan.generated_at).getTime()) / 86400000
  ) : 0;
  // Resolve bilingual fields — resolveLocalized handles both new { en, zh }
  // objects and legacy plain strings seamlessly
  const planNudge = resolveLocalized(gamePlan?.nudge, locale) || gamePlan?.headline || '';
  const planWorks = resolveLocalizedArray(gamePlan?.works, locale) || gamePlan?.phases?.[0]?.works || [];
  // For fill-shelf, always use English works (canonical for DB matching)
  const planWorksEn = resolveLocalizedArray(gamePlan?.works, 'en') || gamePlan?.phases?.[0]?.works || [];
  const planDirection = resolveLocalized(gamePlan?.direction, locale) || gamePlan?.priority_areas?.join(' → ') || '';

  // No longer needed — locale resolution is handled by resolveLocalized/resolveLocalizedArray
  // at the point where planNudge, planWorks, planDirection are computed above.

  // Check if there are empty area slots that plan works could fill
  const hasEmptySlots = gamePlan && planWorks.length > 0 &&
    AREAS.some(area => !focusWorks.find(w => normalizeArea(w.area) === area));

  const handleFillShelf = useCallback(async () => {
    if (!planWorksEn.length) return;
    setFillingShelf(true);
    try {
      // Always send English canonical names for DB matching
      const res = await montreeApi(`/api/montree/children/${childId}/fill-shelf`, {
        method: 'POST',
        body: JSON.stringify({ works: planWorksEn }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.filled?.length > 0) {
          setShelfFilled(true);
          onShelfFilled?.(); // parent refreshes focus works
        }
      }
    } catch (err) {
      console.error('[FillShelf] Error:', err);
    } finally {
      setFillingShelf(false);
    }
  }, [childId, planWorksEn, onShelfFilled]);

  const handleRefreshPlan = useCallback(async () => {
    if (!onRefreshGamePlan) return;
    setRefreshingPlan(true);
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/game-plan/refresh?locale=${locale}`, {
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
    if (expandedAreas.size > 0 && !evidenceLoaded) {
      fetchEvidence();
    }
  }, [expandedAreas, evidenceLoaded, fetchEvidence]);

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: SANS,
    }}>
        {AREAS.map((area, areaIdx) => {
          // Find the focus work for this area
          const focusWork = focusWorks.find(w => normalizeArea(w.area) === area);
          // Find extras for this area
          const areaExtras = extraWorks.filter(e => normalizeArea(e.area) === area);

          const status = focusWork
            ? (statusConfig[focusWork.status] || statusConfig.not_started)
            : statusConfig.not_started;
          const isExpanded = expandedAreas.has(area);
          const guruDetail = guruAreaDetails?.[area] || null;
          const isLast = areaIdx === AREAS.length - 1;

          return (
            <div
              key={`area-${area}`}
              style={{
                background: isExpanded ? 'rgba(255,255,255,0.09)' : C.glass,
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                overflow: 'hidden',
                backdropFilter: 'blur(18px) saturate(140%)',
                WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                transition: 'background 160ms ease',
              }}
            >
              {/* Area row — always visible */}
              <div
                {...(areaIdx === 0 ? { 'data-guide': 'first-work-row' } : {})}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  background: 'transparent',
                  transition: 'background 140ms ease',
                }}
              >
                {/* Area badge — tap to swap focus work */}
                <button
                  {...(areaIdx === 0 ? { 'data-guide': 'area-badge-first' } : {})}
                  style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => onOpenWheelPicker(area, focusWork?.work_name)}
                  onContextMenu={(e) => { e.preventDefault(); onOpenWheelPicker(area, focusWork?.work_name); }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => onOpenWheelPicker(area, focusWork?.work_name), 500);
                    const clear = () => clearTimeout(timer);
                    e.currentTarget.addEventListener('touchend', clear, { once: true });
                    e.currentTarget.addEventListener('touchmove', clear, { once: true });
                  }}
                  title={t('focusWorks.tapToChange')}
                >
                  <AreaDot area={area} locale={locale} />
                </button>

                {/* Work name or empty state — tap to expand */}
                <button
                  {...(areaIdx === 0 ? { 'data-guide': 'first-work-name' } : {})}
                  onClick={() => toggleArea(area)}
                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  {focusWork ? (
                    <span style={{ fontWeight: 500, color: C.textPrimary, fontSize: 14 }}>
                      {getWorkDisplayName(focusWork, locale)}
                    </span>
                  ) : (
                    <span style={{ fontWeight: 500, color: C.textMuted, fontSize: 14, fontStyle: 'italic' }}>
                      {t('focusWorks.noWorkInArea')}
                    </span>
                  )}
                </button>

                {/* Status badge — only if focus work exists */}
                {focusWork && (
                  <button
                    {...(areaIdx === 0 ? { 'data-tutorial': 'status-badge-first' } : {})}
                    onClick={() => onCycleStatus(focusWork, true)}
                    style={{
                      ...status.style,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontFamily: SANS,
                    }}
                  >
                    {status.label}
                  </button>
                )}

                {/* Expand chevron */}
                <button
                  onClick={() => toggleArea(area)}
                  style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: C.textMuted, flexShrink: 0 }}
                >
                  <ChevronDown
                    size={16}
                    strokeWidth={1.75}
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                  />
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  margin: '0 12px 10px',
                  padding: 14,
                  background: 'rgba(8,20,12,0.55)',
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  {/* Guru Advice — hidden to reduce clutter, code preserved */}

                  {/* Work controls — only if focus work exists */}
                  {focusWork ? (
                    <>
                      {/* Quick Guide button */}
                      <button
                        {...(areaIdx === 0 ? { 'data-guide': 'quick-guide-btn' } : {})}
                        onClick={() => onOpenQuickGuide(focusWork.work_name, { zh: focusWork.chineseName, es: focusWork.spanishName, de: focusWork.deName, fr: focusWork.frName, pt: focusWork.ptName, nl: focusWork.nlName, it: focusWork.itName, ja: focusWork.jaName, ko: focusWork.koName, uk: focusWork.ukName, ru: focusWork.ruName })}
                        style={{
                          width: '100%',
                          padding: '9px 16px',
                          background: 'transparent',
                          border: `1px solid ${C.emerald}`,
                          borderRadius: 10,
                          color: C.emerald,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontFamily: SANS,
                        }}
                      >
                        <BookOpen size={15} strokeWidth={1.75} />
                        {t('focusWorks.quickGuide')}
                      </button>

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

                      {/* Observation textarea + mic + save */}
                      <div
                        {...(areaIdx === 0 ? { 'data-guide': 'notes-area' } : {})}
                        style={{ position: 'relative' }}
                      >
                        <textarea
                          value={notes[focusWork.work_name] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [focusWork.work_name]: e.target.value }))}
                          placeholder={t('focusWorks.addObservation')}
                          rows={2}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 12px 40px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(52,211,153,0.18)',
                            color: C.textPrimary,
                            fontSize: 13,
                            lineHeight: 1.5,
                            resize: 'none',
                            outline: 'none',
                            fontFamily: SANS,
                          }}
                        />
                        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            style={{
                              padding: '5px 12px',
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #34d399, #059669)',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              border: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: (!notes[focusWork.work_name]?.trim() || savingNote === focusWork.work_name) ? 0.45 : 1,
                              transition: 'opacity 140ms ease',
                              fontFamily: SANS,
                            }}
                          >
                            <Check size={12} strokeWidth={2.5} />
                            {savingNote === focusWork.work_name ? '...' : smartNoteProcessing === focusWork.work_name ? '…' : t('focusWorks.save')}
                          </button>
                        </div>
                      </div>

                      {/* Teaching Instructions — hidden to reduce clutter, code preserved */}
                    </>
                  ) : (
                    /* No focus work — show add button */
                    <button
                      onClick={() => onOpenWheelPicker(area)}
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        background: C.emeraldSoft,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        color: C.emerald,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontFamily: SANS,
                      }}
                    >
                      <Plus size={15} strokeWidth={2} />
                      {t('focusWorks.addOne')}
                    </button>
                  )}
                </div>
              )}

              {/* Extra works for this area — shown when expanded */}
              {isExpanded && areaExtras.length > 0 && (
                <div style={{ margin: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {areaExtras.map((extra) => {
                    const extraStatus = statusConfig[extra.status] || statusConfig.not_started;
                    return (
                      <div key={`extra-${extra.area}-${extra.work_name}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                        <span style={{ fontSize: 11, color: C.textMuted }}>└</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                          {getWorkDisplayName(extra, locale)}
                        </span>
                        <button
                          onClick={() => onCycleStatus(extra, false)}
                          style={{ ...extraStatus.style, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: SANS }}
                        >
                          {extraStatus.label}
                        </button>
                        <button
                          onClick={() => onRemoveExtra(extra)}
                          style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', color: C.textMuted }}
                          title={t('common.remove')}
                        >
                          <X size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      {/* Game Plan footer — refresh button */}
      {SHOW_GAME_PLAN && gamePlan && (
        <div style={{ margin: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>
            {planDaysSinceUpdate === 0
              ? t('focusWorks.updatedToday')
              : t('focusWorks.daysAgo', { count: planDaysSinceUpdate })
            }
          </p>
          <button
            onClick={handleRefreshPlan}
            disabled={refreshingPlan}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 500, color: '#f59e0b', background: 'none', border: 0, cursor: 'pointer', opacity: refreshingPlan ? 0.5 : 1, fontFamily: SANS }}
          >
            {refreshingPlan ? (
              <div style={{ width: 10, height: 10, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {t('focusWorks.refresh')}
          </button>
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
      style={{
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        border: `1px solid ${copied ? 'rgba(52,211,153,0.30)' : 'rgba(255,255,255,0.15)'}`,
        background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.07)',
        color: copied ? '#34d399' : 'rgba(255,255,255,0.60)',
        transition: 'all 140ms ease',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
      title="Copy"
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}
