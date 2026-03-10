'use client';

// components/montree/guru/TeachGuruWorkModal.tsx
// 2-step modal: teacher names work + area → AI generates content → teacher reviews & saves
// Triggered from PhotoInsightButton Scenario A (unknown work)

import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface TeachGuruWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkName: string;
  initialArea: string | null;
  mediaId: string;
  classroomId: string;
  onWorkSaved?: (work: { id: string; name: string; area: string }) => void;
}

const AREAS = [
  { key: 'practical_life', label: 'Practical Life', labelZh: '日常生活', color: '#10B981' },
  { key: 'sensorial', label: 'Sensorial', labelZh: '感官', color: '#F59E0B' },
  { key: 'mathematics', label: 'Mathematics', labelZh: '数学', color: '#3B82F6' },
  { key: 'language', label: 'Language', labelZh: '语言', color: '#EC4899' },
  { key: 'cultural', label: 'Cultural', labelZh: '文化', color: '#8B5CF6' },
];

interface GeneratedContent {
  description: string;
  parent_description: string;
  why_it_matters: string;
  quick_guide: string;
  materials: string[];
  direct_aims: string[];
  presentation_steps: string[];
}

export default function TeachGuruWorkModal({
  isOpen, onClose, initialWorkName, initialArea, mediaId, classroomId, onWorkSaved,
}: TeachGuruWorkModalProps) {
  const { locale, t } = useI18n();
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [workName, setWorkName] = useState(initialWorkName);
  const [selectedArea, setSelectedArea] = useState(initialArea || 'practical_life');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // Step 2 state
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState(false);

  useEffect(() => {
    setWorkName(initialWorkName);
    setSelectedArea(initialArea || 'practical_life');
    setStep(1);
    setContent(null);
    setDupWarning(null);
    setTeacherPrompt('');
    setGenerateError(false);
  }, [initialWorkName, initialArea, isOpen]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Step 1 → Generate content
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
        setStep(2);
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

  // Step 2 → Save to classroom curriculum
  const handleSave = useCallback(async () => {
    if (!content || saving || !workName.trim()) return;
    setSaving(true);

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
        if (onWorkSaved && data.work?.id && typeof data.work.id === 'string') {
          onWorkSaved({ id: data.work.id, name: workName.trim(), area: selectedArea });
        }
        onClose();
      }
    } catch (err) {
      console.error('[TeachGuruWorkModal] Save error:', err);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [content, saving, workName, selectedArea, classroomId, teacherPrompt, onWorkSaved, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold text-gray-900">
            📚 {t('photoInsight.teachGuruTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 && (
            <>
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

              {/* Area selection — 5 buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('photoInsight.areaLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => setSelectedArea(a.key)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selectedArea === a.key
                          ? 'border-2 font-semibold text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      style={selectedArea === a.key ? { backgroundColor: a.color, borderColor: a.color } : {}}
                    >
                      {locale === 'zh' ? a.labelZh : a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher prompt (optional) */}
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

              {/* Error message */}
              {generateError && (
                <p className="text-xs text-red-600 text-center">
                  {t('common.networkError')}
                </p>
              )}

              {/* Generate button */}
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
            </>
          )}

          {step === 2 && content && (
            <>
              {/* Duplicate warning */}
              {dupWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  ⚠️ {dupWarning}
                </div>
              )}

              {/* Editable content fields */}
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

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Small editable textarea for step 2
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
