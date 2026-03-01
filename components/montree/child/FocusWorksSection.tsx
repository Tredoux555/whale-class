'use client';

import { AreaConfig } from '@/components/montree/curriculum/types';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import GuruWorkGuide from '@/components/montree/guru/GuruWorkGuide';
import { useI18n } from '@/lib/montree/i18n';

export interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
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
  onOpenQuickGuide: (workName: string) => void;
  childId: string;
  getAreaConfig: (area: string) => AreaConfig;
  isHomeschoolParent?: boolean;
}

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
  presented: { label: 'P', bg: 'bg-amber-300', text: 'text-amber-800' },
  practicing: { label: 'Pr', bg: 'bg-blue-400', text: 'text-blue-800' },
  mastered: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' },
  completed: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' }, // Legacy alias
};

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
}: FocusWorksSectionProps) {
  const { t, locale } = useI18n();
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="font-bold text-gray-800 mb-3">{t('focusWorks.title')}</h2>
      {focusWorks.length > 0 ? (
        <div className="space-y-3">
          {focusWorks.map((work, i) => {
            const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.not_started;
            const areaConfig = getAreaConfig(work.area);
            const isExpanded = expandedIndex === work.work_name;
            // Get extras for this area
            const areaExtras = extraWorks.filter(e => {
              const eArea = e.area === 'math' ? 'mathematics' : e.area;
              const wArea = work.area === 'math' ? 'mathematics' : work.area;
              return eArea === wArea;
            });

            return (
              <div key={`focus-${work.area}-${work.work_name}`} className="space-y-1">
                {/* Focus work row */}
                <div
                  {...(i === 0 ? { 'data-guide': 'first-work-row' } : {})}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  {/* Area icon - tap or long-press to swap focus work */}
                  <button
                    {...(i === 0 ? { 'data-guide': 'area-badge-first' } : {})}
                    className="active:scale-90 transition-transform"
                    onClick={() => onOpenWheelPicker(work.area, work.work_name)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onOpenWheelPicker(work.area, work.work_name);
                    }}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        onOpenWheelPicker(work.area, work.work_name);
                      }, 500);
                      const clear = () => clearTimeout(timer);
                      e.currentTarget.addEventListener('touchend', clear, { once: true });
                      e.currentTarget.addEventListener('touchmove', clear, { once: true });
                    }}
                    title={t('focusWorks.tapToChange')}
                  >
                    <AreaBadge area={work.area} size="lg" />
                  </button>

                  {/* Work name - tap to expand */}
                  <button
                    {...(i === 0 ? { 'data-guide': 'first-work-name' } : {})}
                    onClick={() => setExpandedIndex(isExpanded ? null : work.work_name)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-gray-800 text-sm">{locale === 'zh' && (work as any).chineseName ? (work as any).chineseName : work.work_name}</p>
                  </button>

                  {/* Status badge - tap to cycle */}
                  <button
                    {...(i === 0 ? { 'data-tutorial': 'status-badge-first' } : {})}
                    onClick={() => onCycleStatus(work, true)}
                    className={`w-9 h-9 rounded-full ${status.bg} ${status.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90 transition-transform`}
                  >
                    {status.label}
                  </button>

                  {/* Expand arrow */}
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : work.work_name)}
                    className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-1 ml-7 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex gap-2">
                      <button
                        {...(i === 0 ? { 'data-guide': 'quick-guide-btn' } : {})}
                        onClick={() => onOpenQuickGuide(work.work_name)}
                        className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-amber-600 active:scale-95"
                      >
                        📖 Quick Guide
                      </button>
                      <button
                        {...(i === 0 ? { 'data-guide': 'capture-btn' } : {})}
                        onClick={() => window.location.href = `/montree/dashboard/capture?child=${childId}&workName=${encodeURIComponent(work.work_name)}&area=${encodeURIComponent(work.area)}`}
                        className="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95"
                      >
                        📸 Capture
                      </button>
                    </div>

                    {/* Guru Work Guide — homeschool parents only */}
                    {isParent && (
                      <GuruWorkGuide workName={work.work_name} childId={childId} />
                    )}

                    {/* Notes */}
                    <div {...(i === 0 ? { 'data-guide': 'notes-area' } : {})} className="relative">
                      <textarea
                        value={notes[work.work_name] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [work.work_name]: e.target.value }))}
                        placeholder={t('focusWorks.addObservation')}
                        className="w-full p-3 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none
                          bg-gradient-to-b from-amber-100 to-amber-50 border-0 shadow-md
                          text-amber-900 placeholder-amber-400"
                        rows={2}
                      />
                      <button
                        onClick={() => onSaveNote(work)}
                        disabled={!notes[work.work_name]?.trim() || savingNote === work.work_name}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg
                          disabled:opacity-50 hover:bg-amber-600 active:scale-95 shadow-sm"
                      >
                        {savingNote === work.work_name ? '...' : '📌 ' + t('focusWorks.save')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Extra works for this area - grouped under the focus work */}
                {areaExtras.length > 0 && (
                  <div className="ml-8 space-y-1">
                    {areaExtras.map((extra, idx) => {
                      const extraStatus = STATUS_CONFIG[extra.status] || STATUS_CONFIG.not_started;
                      return (
                        <div key={`extra-${extra.area}-${extra.work_name}`} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/60">
                          <span className="text-xs text-gray-400">└</span>
                          <span className="flex-1 text-sm text-gray-600">{locale === 'zh' && (extra as any).chineseName ? (extra as any).chineseName : extra.work_name}</span>
                          <button
                            onClick={() => onCycleStatus(extra, false)}
                            className={`w-7 h-7 rounded-full ${extraStatus.bg} ${extraStatus.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90`}
                          >
                            {extraStatus.label}
                          </button>
                          <button
                            onClick={() => onRemoveExtra(extra)}
                            className="text-gray-400 hover:text-red-500 text-xs p-1"
                            title="Remove"
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
      ) : (
        <p className="text-sm text-gray-500">{t('focusWorks.empty')}</p>
      )}
    </div>
  );
}
