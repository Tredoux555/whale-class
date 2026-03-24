// Classroom Setup — "Teach the AI"
// Teachers photograph each work once → Sonnet describes it → saved to visual_memory
// Sprint 2 of Smart Learning System
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface SetupWork {
  id: string;
  name: string;
  work_key: string;
  area_key: string;
  description: string | null;
  is_custom: boolean;
  sequence: number;
  has_reference_photo: boolean;
  has_description: boolean;
  reference_photo_url: string | null;
  visual_description: string | null;
  description_confidence: number | null;
  source: string | null;
  last_updated: string | null;
}

interface SetupStats {
  total: number;
  described: number;
  with_photo: number;
}

interface SonnetDescription {
  visual_description: string;
  parent_description: string;
  why_it_matters: string;
  key_materials: string[];
  negative_descriptions: string[];
}

const AREA_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  practical_life: { label: 'Practical Life', color: '#10b981', emoji: '🧹' },
  sensorial: { label: 'Sensorial', color: '#f59e0b', emoji: '👁️' },
  mathematics: { label: 'Mathematics', color: '#6366f1', emoji: '🔢' },
  language: { label: 'Language', color: '#ec4899', emoji: '📚' },
  cultural: { label: 'Cultural', color: '#8b5cf6', emoji: '🌍' },
  special_events: { label: 'Special Events', color: '#f43f5e', emoji: '🎉' },
};

type FilterMode = 'all' | 'needs_photo' | 'done';

export default function ClassroomSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [works, setWorks] = useState<SetupWork[]>([]);
  const [stats, setStats] = useState<SetupStats>({ total: 0, described: 0, with_photo: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active work state (photographing + describing)
  const [activeWork, setActiveWork] = useState<SetupWork | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'describing' | 'reviewing' | 'saving' | 'error'>('idle');
  const [pendingDescription, setPendingDescription] = useState<SonnetDescription | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load session
  useEffect(() => {
    const sess = getSession();
    if (!sess?.teacher?.id) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);
  }, [router]);

  // Fetch works
  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await montreeApi('/api/montree/classroom-setup');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setWorks(data.works || []);
      setStats(data.stats || { total: 0, described: 0, with_photo: 0 });
    } catch (err) {
      console.error('[ClassroomSetup] Fetch error:', err);
      setError(t('setup.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (session) fetchWorks();
  }, [session, fetchWorks]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Filtered + searched works
  const filteredWorks = useMemo(() => {
    let list = works;
    if (selectedArea) {
      list = list.filter((w) => w.area_key === selectedArea);
    }
    if (filterMode === 'needs_photo') {
      list = list.filter((w) => !w.has_description);
    } else if (filterMode === 'done') {
      list = list.filter((w) => w.has_description);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(q));
    }
    return list;
  }, [works, selectedArea, filterMode, searchQuery]);

  // Area counts (for tabs)
  const areaCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    for (const w of works) {
      if (!counts[w.area_key]) counts[w.area_key] = { total: 0, done: 0 };
      counts[w.area_key].total++;
      if (w.has_description) counts[w.area_key].done++;
    }
    return counts;
  }, [works]);

  // --- Photo capture flow ---
  const handleStartCapture = useCallback((work: SetupWork) => {
    setActiveWork(work);
    setStep('idle');
    setPendingDescription(null);
    setPendingPhotoUrl(null);
    setStepError(null);
    // Trigger file input
    setTimeout(() => fileInputRef.current?.click(), 100);
  }, []);

  const handlePhotoSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWork || !session) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    setStep('uploading');
    setStepError(null);

    try {
      // Upload photo via existing media upload route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        school_id: session.school?.id,
        classroom_id: session.classroom?.id,
        media_type: 'photo',
        tags: ['reference_photo', activeWork.work_key],
        caption: `Reference: ${activeWork.name}`,
      }));

      const uploadRes = await montreeApi('/api/montree/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadRes.json();
      const storagePath = uploadData.media?.storage_path;

      if (!storagePath) {
        throw new Error('No storage path returned');
      }

      // Step 2: Call Sonnet describe endpoint
      setStep('describing');

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const describeRes = await montreeApi('/api/montree/classroom-setup/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath,
          work_name: activeWork.name,
          work_key: activeWork.work_key,
          area: activeWork.area_key,
        }),
        signal: abortRef.current.signal,
      });

      if (!describeRes.ok) {
        const errData = await describeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Description failed');
      }

      const describeData = await describeRes.json();

      abortRef.current = null;
      setPendingDescription(describeData.description);
      setPendingPhotoUrl(describeData.reference_photo_url);
      setStep('reviewing');

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[ClassroomSetup] Capture flow error:', err);
      setStepError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('error');
      abortRef.current = null;
    }
  }, [activeWork, session]);

  const handleConfirmSave = useCallback(async () => {
    if (!pendingDescription || !activeWork || !pendingPhotoUrl) return;
    if (step === 'saving') return; // Guard: prevent double-click race

    setStep('saving');
    setStepError(null);

    try {
      const res = await montreeApi('/api/montree/classroom-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_key: activeWork.work_key,
          work_name: activeWork.name,
          area: activeWork.area_key,
          is_custom: activeWork.is_custom,
          visual_description: pendingDescription.visual_description,
          reference_photo_url: pendingPhotoUrl,
          parent_description: pendingDescription.parent_description,
          why_it_matters: pendingDescription.why_it_matters,
          key_materials: pendingDescription.key_materials,
          negative_descriptions: pendingDescription.negative_descriptions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }

      // Success — update local state
      setWorks((prev) =>
        prev.map((w) =>
          w.work_key === activeWork.work_key
            ? {
                ...w,
                has_description: true,
                has_reference_photo: true,
                visual_description: pendingDescription.visual_description,
                reference_photo_url: pendingPhotoUrl,
                description_confidence: 1.0,
                source: 'teacher_setup',
                last_updated: new Date().toISOString(),
              }
            : w
        )
      );
      setStats((prev) => ({
        ...prev,
        described: prev.described + (activeWork.has_description ? 0 : 1),
        with_photo: prev.with_photo + (activeWork.has_reference_photo ? 0 : 1),
      }));

      // Close modal
      setActiveWork(null);
      setStep('idle');
      setPendingDescription(null);
      setPendingPhotoUrl(null);

    } catch (err) {
      console.error('[ClassroomSetup] Save error:', err);
      setStepError(err instanceof Error ? err.message : 'Save failed');
      setStep('error');
    }
  }, [pendingDescription, activeWork, pendingPhotoUrl, step]);

  const handleRetry = useCallback(() => {
    if (activeWork) {
      setStep('idle');
      setStepError(null);
      setPendingDescription(null);
      setPendingPhotoUrl(null);
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [activeWork]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setActiveWork(null);
    setStep('idle');
    setPendingDescription(null);
    setPendingPhotoUrl(null);
    setStepError(null);
  }, []);

  if (!session) return null;

  const progressPercent = stats.total > 0 ? Math.round((stats.described / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-6">
        <button onClick={() => router.push('/montree/dashboard')} className="text-white/70 text-sm mb-2">
          ← {t('common.back')}
        </button>
        <h1 className="text-xl font-bold">{t('setup.title')}</h1>
        <p className="text-sm text-white/80 mt-1">{t('setup.subtitle')}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{t('setup.progress')}</span>
            <span>{stats.described}/{stats.total} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 bg-white border-b sticky top-0 z-40">
        {/* Area tabs — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              !selectedArea ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('setup.allAreas')} ({stats.total})
          </button>
          {Object.entries(AREA_CONFIG).map(([key, config]) => {
            const counts = areaCounts[key];
            if (!counts) return null;
            return (
              <button
                key={key}
                onClick={() => setSelectedArea(selectedArea === key ? null : key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedArea === key ? 'text-white' : 'bg-gray-100 text-gray-600'
                }`}
                style={selectedArea === key ? { backgroundColor: config.color } : undefined}
              >
                {config.emoji} {config.label} ({counts.done}/{counts.total})
              </button>
            );
          })}
        </div>

        {/* Filter + search row */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex gap-1">
            {(['all', 'needs_photo', 'done'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterMode === mode ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {mode === 'all' ? t('setup.filterAll') : mode === 'needs_photo' ? t('setup.filterNeeds') : t('setup.filterDone')}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('setup.searchWorks')}
            className="flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>

      {/* Work list */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-2">{error}</p>
            <button onClick={fetchWorks} className="text-emerald-600 text-sm font-medium">{t('setup.retry')}</button>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {filterMode === 'needs_photo' ? t('setup.allDone') : t('common.noResults')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorks.map((work) => {
              const areaConfig = AREA_CONFIG[work.area_key] || AREA_CONFIG.practical_life;
              return (
                <div
                  key={work.work_key}
                  className="bg-white rounded-xl p-3 shadow-sm border flex items-center gap-3"
                >
                  {/* Status indicator */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    work.has_description ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {work.has_description ? (
                      <span className="text-emerald-600 text-lg">✓</span>
                    ) : (
                      <span className="text-gray-400 text-lg">📷</span>
                    )}
                  </div>

                  {/* Work info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{work.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: areaConfig.color }}
                      />
                      <span className="text-xs text-gray-500">{areaConfig.label}</span>
                      {work.has_description && work.source === 'teacher_setup' && (
                        <span className="text-xs text-emerald-600">{t('setup.teacherVerified')}</span>
                      )}
                      {work.has_description && work.source !== 'teacher_setup' && (
                        <span className="text-xs text-amber-600">{t('setup.autoGenerated')}</span>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => handleStartCapture(work)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                      work.has_description
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {work.has_description ? t('setup.retake') : t('setup.photograph')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      {/* Active work modal overlay */}
      {activeWork && step !== 'idle' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleCancel}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">{activeWork.name}</h2>
                <p className="text-xs text-gray-500">{AREA_CONFIG[activeWork.area_key]?.label}</p>
              </div>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-4">
              {/* Uploading */}
              {step === 'uploading' && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-gray-600">{t('setup.uploading')}</p>
                </div>
              )}

              {/* Describing (Sonnet working) */}
              {step === 'describing' && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-gray-600">{t('setup.analyzing')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('setup.analyzingSubtitle')}</p>
                </div>
              )}

              {/* Reviewing */}
              {step === 'reviewing' && pendingDescription && (
                <div className="space-y-4">
                  {/* Reference photo */}
                  {pendingPhotoUrl && (
                    <img
                      src={pendingPhotoUrl}
                      alt={activeWork.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  {/* Visual description */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('setup.visualDescription')}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{pendingDescription.visual_description}</p>
                  </div>

                  {/* Parent description */}
                  {pendingDescription.parent_description && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('setup.parentDescription')}</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{pendingDescription.parent_description}</p>
                    </div>
                  )}

                  {/* Why it matters */}
                  {pendingDescription.why_it_matters && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('setup.whyItMatters')}</h3>
                      <p className="text-sm text-gray-700">{pendingDescription.why_it_matters}</p>
                    </div>
                  )}

                  {/* Key materials */}
                  {pendingDescription.key_materials.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('setup.keyMaterials')}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {pendingDescription.key_materials.map((m, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleRetry}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('setup.retakePhoto')}
                    </button>
                    <button
                      onClick={handleConfirmSave}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                    >
                      {t('setup.confirmSave')}
                    </button>
                  </div>
                </div>
              )}

              {/* Saving */}
              {step === 'saving' && (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-gray-600">{t('setup.saving')}</p>
                </div>
              )}

              {/* Error */}
              {step === 'error' && (
                <div className="text-center py-8">
                  <p className="text-red-500 text-sm mb-3">{stepError || t('setup.genericError')}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
                    >
                      {t('setup.retry')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
