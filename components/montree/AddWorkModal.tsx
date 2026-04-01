'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';

interface AreaWork {
  id: string;
  name: string;
  sequence?: number;
  dbSequence?: number;
}

interface AddWorkModalProps {
  classroomId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultArea?: string;
  areaWorks?: Record<string, AreaWork[]>;
}

const getAreas = (t: any) => [
  { key: 'practical_life', name: t('area.practicalLife'), icon: 'P', color: 'from-green-400 to-emerald-500', solid: '#10b981' },
  { key: 'sensorial', name: t('area.sensorial'), icon: 'S', color: 'from-orange-400 to-amber-500', solid: '#f59e0b' },
  { key: 'mathematics', name: t('area.mathematics'), icon: 'M', color: 'from-blue-400 to-indigo-500', solid: '#6366f1' },
  { key: 'language', name: t('area.language'), icon: 'L', color: 'from-pink-400 to-rose-500', solid: '#f43f5e' },
  { key: 'cultural', name: t('area.cultural'), icon: 'C', color: 'from-purple-400 to-violet-500', solid: '#8b5cf6' },
];

export default function AddWorkModal({
  classroomId,
  isOpen,
  onClose,
  onSuccess,
  defaultArea,
  areaWorks,
}: AddWorkModalProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null); // null = end of list
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const positionWheelRef = useRef<HTMLDivElement>(null);
  const [positionCenterIdx, setPositionCenterIdx] = useState(0);

  const [form, setForm] = useState({
    name: '',
    area_key: defaultArea || 'practical_life',
    age_range: '3-6',
    description: '',
    why_it_matters: '',
    direct_aims: '',
    indirect_aims: '',
    materials: '',
    teacher_notes: '',
  });

  // Get works for the currently selected area
  const currentAreaWorks = areaWorks?.[form.area_key] || [];

  // Reset insert position when area changes
  useEffect(() => {
    setInsertAfterIndex(null);
  }, [form.area_key]);

  // Build position options array for wheel picker
  const positionOptions = [
    { key: 'beginning', label: t('modal.beginningOfList'), icon: '⬆', value: -1 as number | null },
    ...currentAreaWorks.map((w, idx) => ({
      key: w.id,
      label: w.name,
      icon: `${idx + 1}`,
      value: idx as number | null,
    })),
    { key: 'end', label: t('modal.endOfList'), icon: '⬇', value: null as number | null },
  ];

  // Scroll handler for position wheel — tracks centered item
  const handlePositionScroll = useCallback(() => {
    if (positionWheelRef.current) {
      const itemHeight = 70;
      const scrollTop = positionWheelRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(newIndex, positionOptions.length - 1));
      if (clamped !== positionCenterIdx) {
        setPositionCenterIdx(clamped);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  }, [positionCenterIdx, positionOptions.length]);

  // Scroll position wheel to a specific index
  const scrollPositionTo = useCallback((index: number, smooth = true) => {
    if (positionWheelRef.current) {
      positionWheelRef.current.scrollTo({
        top: index * 70,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Auto-scroll to current selection when position picker opens
  useEffect(() => {
    if (showPositionPicker && positionWheelRef.current) {
      let initialIdx = positionOptions.length - 1; // default: End
      if (insertAfterIndex === -1) initialIdx = 0;
      else if (insertAfterIndex !== null) initialIdx = insertAfterIndex + 1;

      setPositionCenterIdx(initialIdx);
      requestAnimationFrame(() => {
        scrollPositionTo(initialIdx, false);
        setTimeout(() => scrollPositionTo(initialIdx, false), 100);
      });
    }
  }, [showPositionPicker]);

  const resetForm = () => {
    setForm({
      name: '',
      area_key: defaultArea || 'practical_life',
      age_range: '3-6',
      description: '',
      why_it_matters: '',
      direct_aims: '',
      indirect_aims: '',
      materials: '',
      teacher_notes: '',
    });
    setInsertAfterIndex(null);
    setShowPositionPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!form.name.trim()) {
      toast.error(t('error.pleaseEnterWorkNameFirst'));
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/montree/curriculum/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_name: form.name,
          teacher_notes: form.teacher_notes,
          area: form.area_key,
        }),
      });

      if (!res.ok) {
        toast.error(t('error.failedToGenerateDescription'));
        setGenerating(false);
        return;
      }

      const data = await res.json();
      if (data.description || data.why_it_matters) {
        setForm(prev => ({
          ...prev,
          description: data.description || prev.description,
          why_it_matters: data.why_it_matters || prev.why_it_matters,
        }));
        toast.success(t('success.descriptionsGenerated'));
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast.error(t('error.failedToGenerate'));
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error(t('error.failedToGenerateDescription'));
    }
    setGenerating(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error(t('error.pleaseEnterWorkName'));
      return;
    }

    setSaving(true);
    try {
      // Determine after_sequence from selected position
      let afterSequence: number | undefined;
      if (insertAfterIndex !== null && currentAreaWorks[insertAfterIndex]) {
        const afterWork = currentAreaWorks[insertAfterIndex];
        afterSequence = afterWork.dbSequence ?? afterWork.sequence;
      } else if (insertAfterIndex === -1) {
        // Insert at very beginning (before all existing works)
        afterSequence = 0;
      }
      // insertAfterIndex === null means end of list (no after_sequence sent)

      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          name: form.name.trim(),
          area_key: form.area_key,
          age_range: form.age_range,
          description: form.description.trim() || null,
          why_it_matters: form.why_it_matters.trim() || null,
          direct_aims: form.direct_aims.split('\n').filter(s => s.trim()),
          indirect_aims: form.indirect_aims.split('\n').filter(s => s.trim()),
          materials: form.materials.split('\n').filter(s => s.trim()),
          teacher_notes: form.teacher_notes.trim() || null,
          is_custom: true,
          ...(typeof afterSequence === 'number' ? { after_sequence: afterSequence } : {}),
        }),
      });

      if (!res.ok) {
        toast.error(t('error.failedToAddWork'));
        setSaving(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        toast.success(t('success.addedToCurriculum').replace('{name}', form.name));
        handleClose();
        onSuccess();
      } else {
        toast.error(data.error || t('error.failedToAddWork'));
      }
    } catch (err) {
      console.error('Add work error:', err);
      toast.error(t('error.failedToAddWork'));
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const AREAS = getAreas(t);
  const selectedArea = AREAS.find(a => a.key === form.area_key) || AREAS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b bg-gradient-to-r ${selectedArea.color} text-white flex-shrink-0 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
                style={{ backgroundColor: 'white', color: selectedArea.solid }}
              >
                {selectedArea.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('modal.addNewWork')}</h3>
                <p className="text-white/80 text-sm">{t('modal.createCustomCurriculumWork')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.category')} *</label>
            <div className="grid grid-cols-5 gap-2">
              {AREAS.map(area => (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => setForm({ ...form, area_key: area.key })}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    form.area_key === area.key
                      ? `bg-gradient-to-br ${area.color} text-white shadow-lg scale-105`
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm"
                    style={form.area_key === area.key
                      ? { backgroundColor: 'white', color: area.solid }
                      : { backgroundColor: area.solid, color: 'white' }
                    }
                  >
                    {area.icon}
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">{area.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.workName')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t('form.workNameExample')}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Position in Sequence */}
          {currentAreaWorks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal.positionInSequence')}</label>
              <button
                type="button"
                onClick={() => setShowPositionPicker(true)}
                className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  insertAfterIndex !== null
                    ? `bg-gradient-to-r ${selectedArea.color} text-white border-transparent`
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{insertAfterIndex === -1
                    ? `⬆️ ${t('modal.beginningOfList')}`
                    : insertAfterIndex !== null && currentAreaWorks[insertAfterIndex]
                    ? `${t('modal.after')} ${insertAfterIndex + 1}. ${currentAreaWorks[insertAfterIndex].name}`
                    : `⬇️ ${t('modal.endOfListDefault')}`
                  }</span>
                </span>
                <span className={insertAfterIndex !== null ? 'text-white/80' : 'text-gray-400'}>▼</span>
              </button>
            </div>
          )}

          {/* Position Picker — Wheel Style */}
          {showPositionPicker && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col" onClick={() => setShowPositionPicker(false)}>
              {/* Header */}
              <div className="pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between text-white">
                  <button onClick={() => setShowPositionPicker(false)} className="p-2 -ml-2">
                    <span className="text-2xl">✕</span>
                  </button>
                  <div className="text-center">
                    <span className="text-3xl">{selectedArea.icon}</span>
                    <h2 className="font-bold text-lg">{t('modal.insertAfter')}</h2>
                  </div>
                  <div className="w-10" />
                </div>
              </div>

              {/* Wheel Container */}
              <div className="flex-1 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Gradient overlays */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

                {/* Selection highlight */}
                <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[70px] bg-white/15 rounded-2xl border-2 border-white/40 z-5 pointer-events-none" />

                {/* Scrollable wheel */}
                <div
                  ref={positionWheelRef}
                  className="h-full overflow-y-auto scrollbar-hide"
                  onScroll={handlePositionScroll}
                  style={{ scrollSnapType: 'y mandatory' }}
                >
                  {/* Top spacer to center first item */}
                  <div style={{ height: 'calc(50% - 35px)' }} />

                  {positionOptions.map((option, idx) => {
                    const distance = Math.abs(idx - positionCenterIdx);
                    const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8;
                    const isCurrentSelection =
                      (option.value === null && insertAfterIndex === null) ||
                      (option.value === insertAfterIndex);

                    return (
                      <div
                        key={option.key}
                        className="h-[70px] flex items-center justify-center px-6 snap-center cursor-pointer"
                        style={{
                          transform: `scale(${scale})`,
                          transition: 'transform 0.2s',
                        }}
                        onClick={() => {
                          setInsertAfterIndex(option.value as number | null);
                          setShowPositionPicker(false);
                        }}
                      >
                        <div className={`flex items-center gap-3 w-full max-w-md transition-opacity duration-200 ${
                          distance === 0 ? 'opacity-100' : distance === 1 ? 'opacity-70' : 'opacity-40'
                        }`}>
                          <span className="text-white/70 font-bold w-10 text-right">{option.icon}</span>
                          <span className={`flex-1 text-white truncate ${distance === 0 ? 'font-semibold text-lg' : 'font-medium text-base'}`}>
                            {option.label}
                          </span>
                          {isCurrentSelection && <span className="text-emerald-400 text-xl">✓</span>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom spacer to center last item */}
                  <div style={{ height: 'calc(50% - 35px)' }} />
                </div>
              </div>

              {/* Bottom safe area */}
              <div className="pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} />
            </div>
          )}

          {/* AI Generate Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-700">✨ {t('modal.aiDescriptionGenerator')}</p>
              <button
                onClick={handleGenerateAI}
                disabled={generating || !form.name.trim()}
                className="px-4 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {generating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    {t('common.generating')}
                  </>
                ) : (
                  <>🧠 {t('action.generate')}</>
                )}
              </button>
            </div>
            <p className="text-xs text-purple-600">
              {t('modal.aiGeneratorInstructions')}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.description')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder={t('form.descriptionPlaceholder')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Why It Matters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💡 {t('form.whyItMatters')}</label>
            <textarea
              value={form.why_it_matters}
              onChange={e => setForm({ ...form, why_it_matters: e.target.value })}
              rows={2}
              placeholder={t('form.whyItMattersPlaceholder')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Direct Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🎯 {t('form.directAims')}</label>
            <textarea
              value={form.direct_aims}
              onChange={e => setForm({ ...form, direct_aims: e.target.value })}
              rows={3}
              placeholder={t('form.directAimsExample')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Indirect Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🌱 {t('form.indirectAims')}</label>
            <textarea
              value={form.indirect_aims}
              onChange={e => setForm({ ...form, indirect_aims: e.target.value })}
              rows={3}
              placeholder={t('form.indirectAimsExample')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🧰 {t('form.materialsNeeded')}</label>
            <textarea
              value={form.materials}
              onChange={e => setForm({ ...form, materials: e.target.value })}
              rows={3}
              placeholder={t('form.materialsExample')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Teacher Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📝 {t('form.teacherNotes')}</label>
            <textarea
              value={form.teacher_notes}
              onChange={e => setForm({ ...form, teacher_notes: e.target.value })}
              rows={3}
              placeholder={t('form.teacherNotesPlaceholder')}
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
              form.name.trim()
                ? `bg-gradient-to-r ${selectedArea.color} text-white hover:shadow-lg`
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> {t('common.adding')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ➕ {t('action.addWork')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
