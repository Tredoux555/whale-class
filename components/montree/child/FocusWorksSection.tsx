'use client';

import { useState } from 'react';
import { AreaConfig } from '@/components/montree/curriculum/types';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import GuruWorkGuide from '@/components/montree/guru/GuruWorkGuide';
import TeachingInstructions from '@/components/montree/guru/TeachingInstructions';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';
import { useI18n } from '@/lib/montree/i18n';

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
  getAreaConfig: (area: string) => AreaConfig;
  isHomeschoolParent?: boolean;
  guruAreaDetails?: Record<string, AreaDetail> | null;
  smartNoteProcessing?: string | null;
}

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
  presented: { label: 'P', bg: 'bg-amber-300', text: 'text-amber-800' },
  practicing: { label: 'Pr', bg: 'bg-blue-400', text: 'text-blue-800' },
  mastered: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' },
  completed: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' }, // Legacy alias
};

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Normalize area keys (API sometimes uses 'math' instead of 'mathematics')
function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
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
  getAreaConfig,
  isHomeschoolParent: isParent = false,
  guruAreaDetails,
  smartNoteProcessing,
}: FocusWorksSectionProps) {
  const { t, locale } = useI18n();
  const [expandedAdvice, setExpandedAdvice] = useState<string | null>(null);

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
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="font-bold text-gray-800 mb-3">{t('focusWorks.title')}</h2>
      <div className="space-y-2">
        {AREAS.map((area, areaIdx) => {
          // Find the focus work for this area
          const focusWork = focusWorks.find(w => normalizeArea(w.area) === area);
          // Find extras for this area
          const areaExtras = extraWorks.filter(e => normalizeArea(e.area) === area);

          const status = focusWork
            ? (STATUS_CONFIG[focusWork.status] || STATUS_CONFIG.not_started)
            : STATUS_CONFIG.not_started;
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
                      {locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : focusWork.work_name}
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
                    className={`w-9 h-9 rounded-full ${status.bg} ${status.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90 transition-transform`}
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

                  {/* Guru Advice for this area */}
                  {guruDetail && (
                    <div className="p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                          🧠 {t('focusWorks.guruAdvice')}
                        </span>
                        <CopyButton
                          text={`${t('focusWorks.thisWeek')}: ${guruDetail.this_week}\n${t('focusWorks.nextWeek')}: ${guruDetail.next_week}`}
                          onCopy={copyText}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-violet-600 mb-0.5">
                          {t('focusWorks.thisWeek').toUpperCase()}
                        </div>
                        <p className={`text-sm text-gray-700 leading-relaxed ${expandedAdvice !== area ? 'line-clamp-2' : ''}`}>
                          {guruDetail.this_week}
                        </p>
                      </div>
                      {expandedAdvice === area ? (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-indigo-600 mb-0.5">
                            {t('focusWorks.nextWeek').toUpperCase()}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{guruDetail.next_week}</p>
                          <button
                            onClick={() => setExpandedAdvice(null)}
                            className="text-xs text-violet-500 hover:text-violet-700 mt-1"
                          >
                            {t('common.close')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedAdvice(area)}
                          className="text-xs text-violet-500 hover:text-violet-700 mt-1"
                        >
                          {t('focusWorks.showMore')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Work controls — only if focus work exists */}
                  {focusWork ? (
                    <>
                      {/* Quick Guide + Capture buttons */}
                      <div className="flex gap-2">
                        <button
                          {...(areaIdx === 0 ? { 'data-guide': 'quick-guide-btn' } : {})}
                          onClick={() => onOpenQuickGuide(focusWork.work_name, focusWork.chineseName)}
                          className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-amber-600 active:scale-95"
                        >
                          📖 {t('focusWorks.quickGuide')}
                        </button>
                        <button
                          {...(areaIdx === 0 ? { 'data-guide': 'capture-btn' } : {})}
                          onClick={() => window.location.href = `/montree/dashboard/capture?child=${childId}&workName=${encodeURIComponent(focusWork.work_name)}&area=${encodeURIComponent(focusWork.area)}`}
                          className="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95"
                        >
                          📸 {t('focusWorks.capture')}
                        </button>
                      </div>

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

                      {/* Personalized Teaching Instructions */}
                      <TeachingInstructions
                        childId={childId}
                        workName={focusWork.work_name}
                        area={focusWork.area}
                      />
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
                    const extraStatus = STATUS_CONFIG[extra.status] || STATUS_CONFIG.not_started;
                    return (
                      <div key={`extra-${extra.area}-${extra.work_name}`} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/60">
                        <span className="text-xs text-gray-400">└</span>
                        <span className="flex-1 text-sm text-gray-600">
                          {locale === 'zh' && extra.chineseName ? extra.chineseName : extra.work_name}
                        </span>
                        <button
                          onClick={() => onCycleStatus(extra, false)}
                          className={`w-7 h-7 rounded-full ${extraStatus.bg} ${extraStatus.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90`}
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
