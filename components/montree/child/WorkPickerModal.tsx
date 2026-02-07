'use client';

import { AREA_CONFIG } from '@/lib/montree/types';

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
  getAreaConfig: (area: string) => any;
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
}: WorkPickerModalProps) {
  if (!isOpen) return null;

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
              {selectedArea ? getAreaConfig(selectedArea).name : 'Add Extra Work'}
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
              <p className="text-gray-500">Loading curriculum...</p>
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
                    {curriculum[key]?.length || curriculum[key === 'mathematics' ? 'math' : key]?.length || 0} works
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setSelectedArea(null)} className="text-emerald-600 text-sm mb-2">
                ← Back to areas
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
                      <p className="font-medium text-gray-800">{work.name}</p>
                    </div>
                    {isAdded ? (
                      <span className="text-xs text-gray-400">Added ✓</span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
