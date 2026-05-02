'use client';

import { useState } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';
import { AreaConfig } from '@/components/montree/curriculum/types';
import { useI18n } from '@/lib/montree/i18n';

export interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

export interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
}

export interface WorkPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculum: Record<string, CurriculumWork[]>;
  selectedArea: string | null;
  setSelectedArea: (area: string | null) => void;
  loadingCurriculum: boolean;
  allWorks: Assignment[];
  onAddWork: (work: CurriculumWork) => void;
  getAreaConfig: (area: string) => AreaConfig;
  /** Classroom id — required for adding custom works via the onboarding/voice route */
  classroomId?: string;
}

export default function WorkPickerModal({
  isOpen,
  onClose,
  curriculum,
  selectedArea,
  setSelectedArea,
  loadingCurriculum,
  allWorks,
  onAddWork,
  getAreaConfig,
  classroomId,
}: WorkPickerModalProps) {
  const { t, locale } = useI18n();
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  if (!isOpen) return null;

  const onSaveCustomWork = async () => {
    const name = customName.trim();
    if (!selectedArea || !classroomId || name.length < 3) return;
    setSavingCustom(true);
    try {
      const res = await fetch('/api/montree/onboarding/voice/custom-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, area: selectedArea, classroom_id: classroomId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Construct a CurriculumWork shape and add to the shelf using the same path
        // as picking a standard curriculum work
        onAddWork({ id: data.work_id, name, area_id: undefined });
        setCustomMode(false);
        setCustomName('');
      }
    } catch (err) {
      console.error('[WorkPicker] Custom work add failed:', err);
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={() => { onClose(); setSelectedArea(null); }}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">
              {selectedArea ? getAreaConfig(selectedArea).name : t('workPicker.addExtraWork')}
            </h3>
            <button
              onClick={() => { onClose(); setSelectedArea(null); }}
              className="text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loadingCurriculum ? (
            <div className="text-center py-8">
              <div className="animate-bounce text-3xl mb-2">📚</div>
              <p className="text-gray-500">{t('workPicker.loading')}</p>
            </div>
          ) : !selectedArea ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(AREA_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedArea(key)}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-all text-left"
                >
                  <span className="text-3xl block mb-2">{config.icon}</span>
                  <span className="font-medium text-gray-800">{config.name}</span>
                  <span className="text-xs text-gray-500 block">
                    {(curriculum[key]?.length || curriculum[key === 'mathematics' ? 'math' : key]?.length || 0)} {t('workPicker.works')}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setSelectedArea(null)} className="text-emerald-600 text-sm mb-2">
                ← {t('workPicker.backToAreas')}
              </button>
              {(curriculum[selectedArea] || curriculum[selectedArea === 'mathematics' ? 'math' : selectedArea] || []).map((work, i) => {
                const isAdded = allWorks.some(a => a.work_name?.toLowerCase() === work.name?.toLowerCase());
                return (
                  <button
                    key={`curriculum-${selectedArea}-${work.name || work.id || i}`}
                    onClick={() => !isAdded && onAddWork(work)}
                    disabled={isAdded}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3
                      ${isAdded ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-emerald-50 active:scale-98'}`}
                  >
                    <span className="text-xl">{getAreaConfig(selectedArea).icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{locale === 'zh' && work.name_chinese ? work.name_chinese : work.name}</p>
                    </div>
                    {isAdded ? (
                      <span className="text-xs text-gray-400">{t('workPicker.added')} ✓</span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">+</span>
                    )}
                  </button>
                );
              })}

              {/* Add custom work — agent-style affordance for works not in the
                  standard curriculum. Same flow as the voice onboarding catch. */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                {!customMode ? (
                  <button
                    onClick={() => setCustomMode(true)}
                    className="w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 bg-amber-50 hover:bg-amber-100 active:scale-98 border border-amber-200"
                  >
                    <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg flex-shrink-0">+</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{t('workPicker.addCustomWork')}</p>
                      <p className="text-xs text-gray-500">{t('workPicker.addCustomWorkSubtitle')}</p>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('workPicker.customWorkPrompt', { area: getAreaConfig(selectedArea).name })}
                    </p>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t('workPicker.customWorkPlaceholder')}
                      maxLength={60}
                      autoFocus
                      className="w-full p-2.5 rounded-lg border border-amber-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={onSaveCustomWork}
                        disabled={savingCustom || customName.trim().length < 3}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-medium text-sm disabled:opacity-40"
                      >
                        {savingCustom ? t('workPicker.adding') : t('workPicker.saveCustomWork')}
                      </button>
                      <button
                        onClick={() => { setCustomMode(false); setCustomName(''); }}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
