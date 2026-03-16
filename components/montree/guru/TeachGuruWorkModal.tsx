'use client';

// components/montree/guru/TeachGuruWorkModal.tsx
// 3-mode modal for correcting Smart Capture misidentifications:
//   Mode 1: Browse curriculum by area — pick the correct work (wheel picker style)
//   Mode 2: Add a custom work — free text + AI content generation
//   Mode 3: Review AI-generated content before saving
// Triggered from PhotoInsightButton Scenario A (unknown) or AMBER reject (wrong match)

import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import { AREA_CONFIG } from '@/lib/montree/types';

interface TeachGuruWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkName: string;
  initialArea: string | null;
  mediaId: string;
  classroomId: string;
  childId?: string;
  onWorkSaved?: (work: { id?: string; name: string; area: string }) => void;
}

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_key?: string;
  area?: { area_key?: string };
  sequence?: number;
}

interface GeneratedContent {
  description: string;
  parent_description: string;
  why_it_matters: string;
  quick_guide: string;
  materials: string[];
  direct_aims: string[];
  presentation_steps: string[];
}

type ModalMode = 'pick' | 'custom' | 'review';

export default function TeachGuruWorkModal({
  isOpen, onClose, initialWorkName, initialArea, mediaId, classroomId, childId, onWorkSaved,
}: TeachGuruWorkModalProps) {
  const { locale, t } = useI18n();
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Modal mode
  const [mode, setMode] = useState<ModalMode>('pick');
  const [browseArea, setBrowseArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Curriculum data
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [curriculumLoaded, setCurriculumLoaded] = useState(false);

  // Custom work state (mode === 'custom')
  const [workName, setWorkName] = useState(initialWorkName);
  const [selectedArea, setSelectedArea] = useState(initialArea || 'practical_life');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);

  // Review state (mode === 'review')
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  // Selecting from picker
  const [selectingWork, setSelectingWork] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('pick');
      setBrowseArea(null);
      setSearchQuery('');
      setWorkName(initialWorkName);
      setSelectedArea(initialArea || 'practical_life');
      setTeacherPrompt('');
      setContent(null);
      setDupWarning(null);
      setGenerateError(false);
      setSaveError(false);
      setSelectingWork(false);
    }
  }, [isOpen, initialWorkName, initialArea]);

  // Fetch curriculum on first open
  useEffect(() => {
    if (isOpen && !curriculumLoaded && classroomId) {
      setLoadingCurriculum(true);
      montreeApi(`/api/montree/curriculum?classroom_id=${classroomId}`)
        .then(async (res) => {
          if (!mountedRef.current) return;
          if (res.ok) {
            const data = await res.json();
            // data.byArea is a Record<string, work[]>
            const byArea: Record<string, CurriculumWork[]> = {};
            if (data.byArea) {
              for (const [areaKey, works] of Object.entries(data.byArea)) {
                byArea[areaKey] = (works as any[]).map(w => ({
                  id: w.id,
                  name: w.name,
                  name_chinese: w.name_chinese,
                  area_key: w.area?.area_key || areaKey,
                  sequence: w.sequence,
                }));
              }
            }
            setCurriculum(byArea);
            setCurriculumLoaded(true);
          }
        })
        .catch((err) => {
          console.error('[TeachGuruWorkModal] Curriculum fetch error:', err);
        })
        .finally(() => {
          if (mountedRef.current) setLoadingCurriculum(false);
        });
    }
  }, [isOpen, curriculumLoaded, classroomId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Handle selecting a work from curriculum picker
  const handlePickWork = useCallback(async (work: CurriculumWork) => {
    const areaKey = work.area_key || browseArea || 'practical_life';
    setSelectingWork(true);

    try {
      // 1. Record correction (original was wrong, this work is right)
      if (childId) {
        try {
          await montreeApi(`/api/montree/guru/corrections`, {
            method: 'POST',
            body: JSON.stringify({
              child_id: childId,
              media_id: mediaId,
              original_work_name: initialWorkName,
              original_area: initialArea,
              corrected_work_name: work.name,
              corrected_area: areaKey,
              correction_type: 'work_mismatch',
            }),
          });
        } catch (err) {
          console.error('[TeachGuruWorkModal] Correction error (non-fatal):', err);
        }
      }

      // 2. Update progress for the correct work
      if (childId) {
        try {
          await montreeApi(`/api/montree/progress/update`, {
            method: 'POST',
            body: JSON.stringify({
              child_id: childId,
              work_name: work.name,
              area: areaKey,
              status: 'practicing',
              notes: `[Smart Capture — Corrected] Photo originally identified as "${initialWorkName}"`,
            }),
          });
        } catch (err) {
          console.error('[TeachGuruWorkModal] Progress update error (non-fatal):', err);
        }
      }

      if (!mountedRef.current) return;

      if (onWorkSaved) {
        onWorkSaved({ id: work.id, name: work.name, area: areaKey });
      }
      onClose();
    } catch (err) {
      console.error('[TeachGuruWorkModal] Pick work error:', err);
    } finally {
      if (mountedRef.current) setSelectingWork(false);
    }
  }, [browseArea, childId, mediaId, initialWorkName, initialArea, onWorkSaved, onClose]);

  // Generate content for custom work
  const handleGenerate = useCallback(async () => {
    if (!workName.trim() || generating) return;
    setGenerating(true);
    setGenerateError(false);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await montreeApi('/api/montree/guru/generate-work-content', {
        method: 'POST',
        body: JSON.stringify({
          work_name: workName.trim(),
          area: selectedArea,
          teacher_prompt: teacherPrompt.trim() || undefined,
          locale,
        }),
        signal: abortController.signal,
      });

      if (!mountedRef.current) return;

      const data = await res.json();
      if (data.success && data.content
        && typeof data.content.description === 'string'
        && typeof data.content.parent_description === 'string'
        && typeof data.content.why_it_matters === 'string'
        && typeof data.content.quick_guide === 'string') {
        setContent(data.content);
        setDupWarning(data.duplicate_warning || null);
        setMode('review');
      } else {
        setGenerateError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[TeachGuruWorkModal] Generate error:', err);
      if (mountedRef.current) setGenerateError(true);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [workName, selectedArea, teacherPrompt, locale, generating]);

  // Save custom work to classroom
  const handleSave = useCallback(async () => {
    if (!content || saving || !workName.trim()) return;
    setSaving(true);
    setSaveError(false);

    try {
      const res = await montreeApi('/api/montree/curriculum', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          name: workName.trim(),
          area_key: selectedArea,
          description: content.description,
          parent_description: content.parent_description,
          why_it_matters: content.why_it_matters,
          quick_guide: content.quick_guide,
          materials: Array.isArray(content.materials) ? content.materials : [],
          direct_aims: Array.isArray(content.direct_aims) ? content.direct_aims : [],
          is_custom: true,
          source: 'smart_capture',
          prompt_used: teacherPrompt.trim() || undefined,
        }),
      });

      if (!mountedRef.current) return;

      if (res.ok) {
        const data = await res.json();

        // Record correction
        if (childId) {
          try {
            await montreeApi(`/api/montree/guru/corrections`, {
              method: 'POST',
              body: JSON.stringify({
                child_id: childId,
                media_id: mediaId,
                original_work_name: initialWorkName,
                original_area: initialArea,
                corrected_work_name: workName.trim(),
                corrected_area: selectedArea,
                correction_type: 'custom_work_added',
              }),
            });
          } catch (err) {
            console.error('[TeachGuruWorkModal] Correction error (non-fatal):', err);
          }
        }

        if (onWorkSaved && data.work?.id && typeof data.work.id === 'string') {
          onWorkSaved({ id: data.work.id, name: workName.trim(), area: selectedArea });
        }
        onClose();
      } else {
        setSaveError(true);
      }
    } catch (err) {
      console.error('[TeachGuruWorkModal] Save error:', err);
      if (mountedRef.current) setSaveError(true);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [content, saving, workName, selectedArea, classroomId, teacherPrompt, childId, mediaId, initialWorkName, initialArea, onWorkSaved, onClose]);

  if (!isOpen) return null;

  // Filter works by search query
  const getFilteredWorks = (areaKey: string) => {
    const works = curriculum[areaKey] || curriculum[areaKey === 'mathematics' ? 'math' : areaKey] || [];
    if (!searchQuery.trim()) return works;
    const q = searchQuery.toLowerCase();
    return works.filter(w =>
      w.name?.toLowerCase().includes(q) ||
      w.name_chinese?.toLowerCase().includes(q)
    );
  };

  // Total works count for search across all areas
  const allFilteredWorks = searchQuery.trim()
    ? AREA_ORDER.flatMap(area => getFilteredWorks(area).map(w => ({ ...w, area_key: w.area_key || area })))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-xl sm:max-w-lg rounded-t-2xl shadow-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'pick' && (
              <>📚 {t('photoInsight.correctWorkTitle' as any) || 'What work is this?'}</>
            )}
            {mode === 'custom' && (
              <>✨ {t('photoInsight.addCustomWork' as any) || 'Add Custom Work'}</>
            )}
            {mode === 'review' && (
              <>📝 {t('photoInsight.reviewContent' as any) || 'Review & Save'}</>
            )}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── MODE: PICK FROM CURRICULUM ── */}
          {mode === 'pick' && (
            <div className="p-4 space-y-3">
              {/* Original misidentification callout */}
              {initialWorkName && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm">🤔</span>
                  <p className="text-xs text-amber-700">
                    {t('photoInsight.guruThought' as any) || 'Smart Capture thought this was'}{' '}
                    <strong>{initialWorkName}</strong>
                  </p>
                </div>
              )}

              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('photoInsight.searchWorks' as any) || 'Search works...'}
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>

              {loadingCurriculum ? (
                <div className="text-center py-8">
                  <div className="animate-bounce text-3xl mb-2">📚</div>
                  <p className="text-gray-500 text-sm">{t('workPicker.loading' as any) || 'Loading...'}</p>
                </div>
              ) : searchQuery.trim() ? (
                /* Search results across all areas */
                <div className="space-y-1.5">
                  {allFilteredWorks.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-400 text-sm">{t('photoInsight.noWorksFound' as any) || 'No works found'}</p>
                    </div>
                  ) : (
                    allFilteredWorks.map((work, i) => (
                      <button
                        key={`search-${work.id || i}`}
                        onClick={() => handlePickWork(work)}
                        disabled={selectingWork}
                        className="w-full p-3 rounded-xl text-left bg-gray-50 hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <AreaBadge area={work.area_key || ''} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {locale === 'zh' && work.name_chinese ? work.name_chinese : work.name}
                          </p>
                          {locale === 'zh' && work.name_chinese && (
                            <p className="text-xs text-gray-400 truncate">{work.name}</p>
                          )}
                        </div>
                        <span className="text-emerald-500 text-lg flex-shrink-0">→</span>
                      </button>
                    ))
                  )}
                </div>
              ) : !browseArea ? (
                /* Area grid */
                <div className="grid grid-cols-2 gap-2.5">
                  {AREA_ORDER.map((key) => {
                    const config = AREA_CONFIG[key];
                    if (!config) return null;
                    const count = (curriculum[key] || curriculum[key === 'mathematics' ? 'math' : key] || []).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setBrowseArea(key)}
                        className="p-3.5 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                      >
                        <AreaBadge area={key} size="md" />
                        <div>
                          <span className="font-medium text-gray-800 text-sm block">
                            {t(`area.${key}` as any) || config.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {count} {t('workPicker.works' as any) || 'works'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Works list for selected area */
                <div className="space-y-1.5">
                  <button
                    onClick={() => setBrowseArea(null)}
                    className="text-emerald-600 text-sm mb-1 inline-flex items-center gap-1"
                  >
                    ← {t('workPicker.backToAreas' as any) || 'Back'}
                  </button>
                  {getFilteredWorks(browseArea).map((work, i) => (
                    <button
                      key={`${browseArea}-${work.id || i}`}
                      onClick={() => handlePickWork(work)}
                      disabled={selectingWork}
                      className="w-full p-3 rounded-xl text-left bg-gray-50 hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <AreaBadge area={browseArea} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {locale === 'zh' && work.name_chinese ? work.name_chinese : work.name}
                        </p>
                        {locale === 'zh' && work.name_chinese && (
                          <p className="text-xs text-gray-400 truncate">{work.name}</p>
                        )}
                      </div>
                      <span className="text-emerald-500 text-lg flex-shrink-0">→</span>
                    </button>
                  ))}
                  {getFilteredWorks(browseArea).length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">
                      {t('photoInsight.noWorksInArea' as any) || 'No works in this area'}
                    </p>
                  )}
                </div>
              )}

              {/* Divider + Custom work option */}
              <div className="pt-2 border-t">
                <button
                  onClick={() => setMode('custom')}
                  className="w-full p-3 rounded-xl text-left bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 transition-all flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">✨</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm">
                      {t('photoInsight.addCustomWork' as any) || 'Add Custom Work'}
                    </p>
                    <p className="text-xs text-amber-600">
                      {t('photoInsight.customWorkHint' as any) || "Work not in your curriculum? Add it here"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── MODE: CUSTOM WORK ── */}
          {mode === 'custom' && (
            <div className="p-4 space-y-4">
              {/* Back to picker */}
              <button
                onClick={() => setMode('pick')}
                className="text-emerald-600 text-sm inline-flex items-center gap-1"
              >
                ← {t('photoInsight.backToPicker' as any) || 'Back to work picker'}
              </button>

              {/* Work name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('photoInsight.workNameLabel')}
                </label>
                <input
                  type="text"
                  value={workName}
                  onChange={(e) => setWorkName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={t('photoInsight.workNamePlaceholder')}
                  maxLength={200}
                />
              </div>

              {/* Area selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('photoInsight.areaLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AREA_ORDER.map((key) => {
                    const config = AREA_CONFIG[key];
                    if (!config) return null;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedArea(key)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selectedArea === key
                            ? 'border-2 font-semibold text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                        style={selectedArea === key ? { backgroundColor: config.color, borderColor: config.color } : {}}
                      >
                        {t(`area.${key}` as any) || config.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Teacher prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('photoInsight.teacherPromptLabel')}
                </label>
                <textarea
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder={t('photoInsight.teacherPromptPlaceholder')}
                  maxLength={500}
                />
              </div>

              {generateError && (
                <p className="text-xs text-red-600 text-center">{t('common.networkError')}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={!workName.trim() || generating}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('photoInsight.generatingContent')}
                  </span>
                ) : (
                  t('photoInsight.generateContent')
                )}
              </button>
            </div>
          )}

          {/* ── MODE: REVIEW AI CONTENT ── */}
          {mode === 'review' && content && (
            <div className="p-4 space-y-4">
              {dupWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  ⚠️ {dupWarning}
                </div>
              )}

              <EditableField
                label={t('photoInsight.fieldDescription')}
                value={content.description}
                onChange={(v) => setContent({ ...content, description: v })}
              />
              <EditableField
                label={t('photoInsight.fieldParentDescription')}
                value={content.parent_description}
                onChange={(v) => setContent({ ...content, parent_description: v })}
              />
              <EditableField
                label={t('photoInsight.fieldWhyItMatters')}
                value={content.why_it_matters}
                onChange={(v) => setContent({ ...content, why_it_matters: v })}
              />
              <EditableField
                label={t('photoInsight.fieldQuickGuide')}
                value={content.quick_guide}
                onChange={(v) => setContent({ ...content, quick_guide: v })}
                rows={4}
              />
              <EditableField
                label={t('photoInsight.fieldMaterials')}
                value={content.materials.join('\n')}
                onChange={(v) => setContent({ ...content, materials: v.split('\n').filter(Boolean) })}
                rows={3}
              />
              <EditableField
                label={t('photoInsight.fieldAims')}
                value={content.direct_aims.join('\n')}
                onChange={(v) => setContent({ ...content, direct_aims: v.split('\n').filter(Boolean) })}
                rows={3}
              />

              {saveError && (
                <p className="text-xs text-red-600 text-center">{t('common.networkError')}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMode('custom')}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  ← {t('common.back')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {t('photoInsight.saving')}
                    </span>
                  ) : (
                    t('photoInsight.saveToClassroom')
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small editable textarea for review step
function EditableField({ label, value, onChange, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-0.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        rows={rows}
      />
    </div>
  );
}
