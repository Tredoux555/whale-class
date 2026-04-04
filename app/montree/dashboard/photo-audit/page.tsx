// @ts-nocheck — audit page, will type-check incrementally
// NOTE (Sprint 3): PhotoInsightPopup NOT wired here — audit page already has its own
// per-photo correction UI (confirm/fix/teach/delete). The popup is per-child and this
// page is classroom-wide. If needed later, could render one popup per visible child.
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import PhotoCropModal from '@/components/montree/media/PhotoCropModal';

const AREAS = [
  { key: 'practical_life', label: 'Practical Life', color: '#10b981' },
  { key: 'sensorial', label: 'Sensorial', color: '#f59e0b' },
  { key: 'mathematics', label: 'Mathematics', color: '#6366f1' },
  { key: 'language', label: 'Language', color: '#ec4899' },
  { key: 'cultural', label: 'Cultural', color: '#8b5cf6' },
  { key: 'special_events', label: 'Special Events', color: '#f43f5e' },
];

interface AuditPhoto {
  id: string;
  child_id: string;
  child_name: string;
  child_ids: string[];
  child_names: string[];
  classroom_id: string;
  work_id: string | null;
  work_name: string | null;
  area: string | null;
  confidence: number | null;
  scenario: string | null;
  zone: 'green' | 'amber' | 'red' | 'untagged';
  url: string | null;
  auto_crop: { x: number; y: number; width: number; height: number } | null;
  captured_at: string;
  caption: string | null;
}

type Zone = 'all' | 'green' | 'amber' | 'red' | 'untagged';
type DateRange = '24h' | '7d' | '30d' | 'all';

// Area picker with cross-area work search + inline add custom work form
function AreaPickerWithSearch({
  areas, curriculum, onSelectArea, onSelectWork, onClose, onWorkAdded, classroomId, t
}: {
  areas: typeof AREAS;
  curriculum: Record<string, any[]>;
  onSelectArea: (areaKey: string) => void;
  onSelectWork: (work: any, areaKey: string) => void;
  onClose: () => void;
  onWorkAdded?: () => void;
  classroomId?: string;
  t: (key: string) => string;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Inline add-work form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addWorkName, setAddWorkName] = useState('');
  const [addWorkArea, setAddWorkArea] = useState('practical_life');
  const [addWorkDesc, setAddWorkDesc] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);

  // Auto-focus search on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Search across all areas
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const results: { work: any; areaKey: string; areaLabel: string; areaColor: string }[] = [];
    for (const area of areas) {
      const works = curriculum[area.key] || [];
      for (const w of works) {
        if (w.name?.toLowerCase().includes(q)) {
          results.push({ work: { ...w, id: w.id || w.work_key || w.name }, areaKey: area.key, areaLabel: area.label, areaColor: area.color });
        }
      }
    }
    return results.slice(0, 15);
  }, [query, curriculum, areas]);

  const showSearch = query.trim().length >= 2;

  // Open inline add form with query pre-filled
  const openAddForm = (prefill?: string) => {
    setShowAddForm(true);
    setAddWorkName(prefill || query.trim());
    setShowPreview(false);
    setPreviewData(null);
  };

  // Fast path — save immediately, fire-and-forget enrichment in background
  const handleSaveWork = async () => {
    if (!addWorkName.trim() || !classroomId) return;
    setAddSaving(true);
    try {
      const body: Record<string, any> = {
        classroom_id: classroomId,
        name: addWorkName.trim(),
        area_key: addWorkArea,
        is_custom: true,
      };
      if (addWorkDesc.trim()) body.description = addWorkDesc.trim();
      if (addWorkDesc.trim()) body.teacher_description = addWorkDesc.trim();
      // If preview was used, include all enriched fields
      if (previewData) {
        body.description = previewData.description || body.description;
        body.parent_description = previewData.parent_description;
        body.why_it_matters = previewData.why_it_matters;
        body.quick_guide = previewData.quick_guide;
        body.direct_aims = previewData.direct_aims;
        body.indirect_aims = previewData.indirect_aims;
        body.materials = previewData.materials;
        body.visual_description = previewData.visual_description;
      }

      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.info(t('audit.addWorkDuplicate') || 'This work already exists in your classroom');
        onWorkAdded?.();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add work');
      const newWork = data.work;
      toast.success(`${addWorkName.trim()} ${t('audit.addWorkSuccess') || 'added and tagged!'}`);
      onWorkAdded?.();
      // Auto-select the new work for the correction
      if (newWork) {
        onSelectWork({ ...newWork, id: newWork.id, name: newWork.name }, addWorkArea);
      }
    } catch (err) {
      console.error('[AddWork] Save failed:', err);
      toast.error(t('audit.addWorkFailed') || 'Failed to add work');
    } finally {
      setAddSaving(false);
    }
  };

  // Preview path — generate AI descriptions before saving
  const handlePreview = async () => {
    if (!addWorkName.trim()) return;
    previewAbortRef.current?.abort();
    previewAbortRef.current = new AbortController();
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await fetch('/api/montree/curriculum/enrich-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: previewAbortRef.current.signal,
        body: JSON.stringify({
          work_name: addWorkName.trim(),
          area_key: addWorkArea,
          teacher_description: addWorkDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[AddWork] Preview failed:', err);
      toast.error(t('audit.previewFailed') || 'AI preview failed — you can still save without it');
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl p-5 w-full max-w-sm max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3">
          {showAddForm ? (t('audit.addCustomWork') || 'Add Custom Work') : t('audit.pickArea')}
        </h3>

        {/* === INLINE ADD FORM === */}
        {showAddForm ? (
          <div className="overflow-y-auto flex-1 min-h-0 space-y-3">
            {/* Work name */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('audit.workName') || 'Work Name'}</label>
              <input
                type="text"
                value={addWorkName}
                onChange={e => setAddWorkName(e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>

            {/* Area selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('audit.area') || 'Area'}</label>
              <select
                value={addWorkArea}
                onChange={e => setAddWorkArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {areas.map(a => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Brief description */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('audit.briefDescription') || 'Brief description (optional)'}</label>
              <textarea
                value={addWorkDesc}
                onChange={e => setAddWorkDesc(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t('audit.descriptionPlaceholder') || "e.g., 'Children learn to blend st sound using objects'"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="text-xs text-gray-400 text-right mt-0.5">{addWorkDesc.length}/500</div>
            </div>

            {/* Preview results (editable) */}
            {showPreview && (
              <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/50">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <span className="animate-spin text-lg">⏳</span>
                    <span className="text-sm text-gray-500">{t('audit.generatingPreview') || 'Generating AI descriptions...'}</span>
                  </div>
                ) : previewData ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewDescription') || 'Description:'}</span>
                      <p className="text-gray-700 mt-0.5">{previewData.description}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewParent') || 'For parents:'}</span>
                      <p className="text-gray-700 mt-0.5">{previewData.parent_description}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewWhyMatters') || 'Why it matters:'}</span>
                      <p className="text-gray-700 mt-0.5">{previewData.why_it_matters}</p>
                    </div>
                    {previewData.materials?.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">{t('audit.previewMaterials') || 'Materials:'}</span>
                        <p className="text-gray-700 mt-0.5">{previewData.materials.join(', ')}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSaveWork}
                disabled={!addWorkName.trim() || addSaving}
                className="w-full py-2.5 rounded-lg font-medium text-white text-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addSaving ? (t('common.saving') || 'Saving...') : (previewData ? (t('audit.saveWithDescriptions') || 'Save with these descriptions') : (t('common.save') || 'Save'))}
              </button>
              {!showPreview && (
                <button
                  onClick={handlePreview}
                  disabled={!addWorkName.trim() || previewLoading || addSaving}
                  className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {t('audit.previewAI') || 'Preview AI Descriptions'}
                </button>
              )}
              <button
                onClick={() => { previewAbortRef.current?.abort(); setShowAddForm(false); setShowPreview(false); setPreviewData(null); }}
                className="w-full py-2 text-sm text-gray-500"
              >
                {t('common.back') || 'Back'}
              </button>
            </div>
          </div>
        ) : (
        /* === SEARCH + AREA PICKER === */
        <>
        {/* Search input */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('audit.searchWorks') || 'Search works across all areas...'}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              ✕
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {/* Search results */}
          {showSearch && searchResults.length > 0 && (
            <div className="space-y-1 mb-2">
              {searchResults.map((r, i) => (
                <button
                  key={`${r.areaKey}-${r.work.name}-${i}`}
                  onClick={() => onSelectWork(r.work, r.areaKey)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: r.areaColor }}>
                    {r.areaKey[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{r.work.name}</div>
                    <div className="text-xs text-gray-400">{r.areaLabel}</div>
                  </div>
                </button>
              ))}
              {/* "Add custom work" link below search results */}
              <button
                onClick={() => openAddForm()}
                className="w-full text-center py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + {t('audit.addCustomWorkLink') || 'Add a custom work'}
              </button>
            </div>
          )}

          {/* Zero results — prominent add button */}
          {showSearch && searchResults.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">{t('common.noResults') || 'No works found'}</p>
              <button
                onClick={() => openAddForm(query.trim())}
                className="w-full py-3 rounded-lg font-medium text-white text-sm bg-emerald-500 hover:bg-emerald-600 transition-colors"
              >
                ➕ {t('audit.addQueryAsWork') || `Add '${query.trim()}' as a custom work`}
              </button>
            </div>
          )}

          {/* Area buttons (always visible below search results) */}
          {!showSearch && (
            <div className="grid grid-cols-1 gap-2">
              {areas.map(a => (
                <button
                  key={a.key}
                  onClick={() => onSelectArea(a.key)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-gray-50 text-left"
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: a.color }}>
                    {a.key[0].toUpperCase()}
                  </span>
                  <span className="font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        <button
          onClick={() => { previewAbortRef.current?.abort(); onClose(); }}
          className="mt-3 w-full py-2 text-sm text-gray-500"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function PhotoAuditPage() {
  const { t } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  // Track photos confirmed in this session — prevents server refetch from overwriting optimistic green status
  const confirmedIdsRef = useRef<Set<string>>(new Set());

  // Core state
  const [photos, setPhotos] = useState<AuditPhoto[]>([]);
  const [counts, setCounts] = useState({ green: 0, amber: 0, red: 0, untagged: 0 });
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<Zone>('amber');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [page, setPage] = useState(0);
  const [curriculum, setCurriculum] = useState<Record<string, any[]>>({});

  // Correction state
  const [correctingPhoto, setCorrectingPhoto] = useState<AuditPhoto | null>(null);
  const [pickerArea, setPickerArea] = useState('');

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // "Teach AI" / "Use as Reference" state
  const [describingPhoto, setDescribingPhoto] = useState<AuditPhoto | null>(null);
  const [describeResult, setDescribeResult] = useState<{
    visual_description: string;
    parent_description: string;
    why_it_matters: string;
    key_materials: string[];
    negative_descriptions: string[];
  } | null>(null);
  const [describeLoading, setDescribeLoading] = useState(false);
  const [describeSaving, setDescribeSaving] = useState(false);
  const describeAbortRef = useRef<AbortController | null>(null);

  // Crop choice + crop modal state
  const [cropChoicePhoto, setCropChoicePhoto] = useState<AuditPhoto | null>(null);
  const [cropPhoto, setCropPhoto] = useState<AuditPhoto | null>(null);
  const [croppedReferenceUrl, setCroppedReferenceUrl] = useState<string | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  // Smart Learning progress
  const [smartLearningStats, setSmartLearningStats] = useState<{ total: number; described: number } | null>(null);

  // Child tagging state
  const [classroomChildren, setClassroomChildren] = useState<{ id: string; name: string }[]>([]);
  const [taggingPhoto, setTaggingPhoto] = useState<AuditPhoto | null>(null);
  const [taggingSelection, setTaggingSelection] = useState<Set<string>>(new Set());
  const [taggingSaving, setTaggingSaving] = useState(false);

  // Reclassify (batch reprocess via Sonnet onboarding engine) state
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyProgress, setReclassifyProgress] = useState({ current: 0, total: 0, green: 0, amber: 0, red: 0, custom: 0, errors: 0 });
  const [showReclassifyConfirm, setShowReclassifyConfirm] = useState(false);
  const reclassifyCancelledRef = useRef(false);

  // Rerun results for batch reclassify
  const [rerunResults, setRerunResults] = useState<Record<string, { work_name: string | null; area: string | null; confidence: number | null; scenario: string | null; loading: boolean; error: string | null }>>({});

  // Load curriculum for WorkWheelPicker — extracted as callback so onWorkAdded can refresh
  // Cache-bust with timestamp to avoid stale browser cache (works/search has 5min Cache-Control)
  const curriculumAbortRef = useRef<AbortController | null>(null);
  const fetchCurriculum = useCallback(() => {
    const session = getSession();
    const classroomId = session?.classroom?.id;
    if (!classroomId) {
      console.warn('[Photo Audit] No classroomId — cannot load curriculum');
      return;
    }
    // Abort previous curriculum fetch if still in-flight (prevents race on rapid area changes)
    curriculumAbortRef.current?.abort();
    const controller = new AbortController();
    curriculumAbortRef.current = controller;
    fetch(`/api/montree/works/search?classroom_id=${classroomId}&_t=${Date.now()}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Curriculum fetch failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (controller.signal.aborted) return;
        const byArea: Record<string, any[]> = {};
        for (const w of data.works || []) {
          const areaKey = w.area?.area_key || w.area_key || 'unknown';
          if (!byArea[areaKey]) byArea[areaKey] = [];
          byArea[areaKey].push(w);
        }
        console.log('[Photo Audit] Curriculum loaded:', Object.keys(byArea).join(', '), '| special_events:', byArea['special_events']?.length || 0, 'works');
        setCurriculum(byArea);
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        console.error('[Photo Audit] Curriculum load failed:', err);
      });
  }, []);

  // Load curriculum on mount
  useEffect(() => { fetchCurriculum(); }, [fetchCurriculum]);

  // Fetch Smart Learning stats (how many works have AI descriptions)
  const fetchSmartLearningStats = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/classroom-setup');
      if (!res.ok) return;
      const data = await res.json();
      setSmartLearningStats(data.stats ? { total: data.stats.total, described: data.stats.described } : null);
    } catch {
      // Silently fail — progress bar is a nice-to-have
    }
  }, []);

  useEffect(() => { fetchSmartLearningStats(); }, [fetchSmartLearningStats]);

  // Fetch classroom children for child tagging
  useEffect(() => {
    const session = getSession();
    const classroomId = session?.classroom?.id;
    if (!classroomId) return;
    // HIGH FIX: Add AbortController to prevent hanging fetch on unmount
    const controller = new AbortController();
    montreeApi(`/api/montree/children?classroom_id=${classroomId}`, { signal: controller.signal })
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(data => {
        if (controller.signal.aborted) return;
        const kids = (data.children || data || []).map((c: any) => ({ id: c.id, name: c.name }));
        kids.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setClassroomChildren(kids);
      })
      .catch(() => { /* silent — child tagging just won't show names */ });
    return () => controller.abort();
  }, []);

  // Child tagging handlers
  const handleOpenChildTagger = (photo: AuditPhoto) => {
    setTaggingPhoto(photo);
    setTaggingSelection(new Set(photo.child_ids?.length ? photo.child_ids : (photo.child_id ? [photo.child_id] : [])));
  };

  const handleToggleChild = (childId: string) => {
    setTaggingSelection(prev => {
      const next = new Set(prev);
      next.has(childId) ? next.delete(childId) : next.add(childId);
      return next;
    });
  };

  const handleSaveChildTags = async () => {
    if (!taggingPhoto) return;
    setTaggingSaving(true);
    try {
      const res = await montreeApi('/api/montree/media/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: taggingPhoto.id,
          action: 'set',
          child_ids: Array.from(taggingSelection),
        }),
      });
      if (!res.ok) throw new Error();
      // Update local state
      const newChildIds = Array.from(taggingSelection);
      const newChildNames = newChildIds.map(id => classroomChildren.find(c => c.id === id)?.name || 'Unknown');
      setPhotos(prev => prev.map(p =>
        p.id === taggingPhoto.id
          ? { ...p, child_ids: newChildIds, child_names: newChildNames, child_id: newChildIds[0] || p.child_id, child_name: newChildNames[0] || p.child_name }
          : p
      ));
      toast.success(t('audit.childTagUpdated'));
      setTaggingPhoto(null);
    } catch {
      toast.error(t('audit.childTagFailed'));
      // HIGH FIX: Close modal on error so UI doesn't appear frozen
      setTaggingPhoto(null);
    } finally {
      setTaggingSaving(false);
    }
  };

  // Fetch photos when zone/date/page changes
  const fetchPhotos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const dateFrom = dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString()
      : dateRange === '7d' ? new Date(Date.now() - 7 * 86400000).toISOString()
      : dateRange === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
      : '2020-01-01T00:00:00Z';

    try {
      const res = await fetch(
        `/api/montree/audit/photos?zone=${zone}&date_from=${dateFrom}&limit=200&offset=0`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // Merge confirmed status: photos confirmed in this session stay green
      // even if server returns stale confidence data (race condition protection)
      const mergedPhotos = (data.photos || []).map((p: AuditPhoto) =>
        confirmedIdsRef.current.has(p.id)
          ? { ...p, zone: 'green' as const, confidence: 1.0 }
          : p
      );
      setPhotos(mergedPhotos);
      // Recalculate counts to reflect merged confirmed statuses
      if (confirmedIdsRef.current.size > 0) {
        const recounted = { green: 0, amber: 0, red: 0, untagged: 0 };
        mergedPhotos.forEach((p: AuditPhoto) => {
          const z = p.zone as keyof typeof recounted;
          if (recounted[z] !== undefined) recounted[z]++;
        });
        setCounts(recounted);
      } else {
        setCounts(data.counts);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setPhotos([]);
      setCounts({ green: 0, amber: 0, red: 0, untagged: 0 });
      toast.error(t('audit.fetchError'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, dateRange]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);
  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  const handleZoneChange = (z: Zone) => { setZone(z); setPage(0); setSelectedIds(new Set()); };
  const handleDateChange = (d: DateRange) => { setDateRange(d); setPage(0); setSelectedIds(new Set()); };

  // Single confirm
  const handleConfirm = async (photo: AuditPhoto) => {
    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: photo.id,
          child_id: photo.child_id,
          original_work_name: photo.work_name || '',
          original_work_id: photo.work_id || '',
          original_area: photo.area || '',
          original_confidence: photo.confidence || 0,
          action: 'confirm',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[Photo Audit] Confirm failed:', res.status, errData);
        throw new Error(errData?.error || 'confirm failed');
      }
      // Track confirmed ID so future refetches preserve green status
      confirmedIdsRef.current.add(photo.id);
      const oldZone = photo.zone || 'amber';
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
      ));
      setCounts(prev => ({
        ...prev,
        green: prev.green + 1,
        ...(oldZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(oldZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(oldZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      toast.success(t('audit.confirmed'));
      // DO NOT call setZone('green') here — it triggers a refetch that can overwrite
      // the optimistic update with stale server data (race condition). The photo already
      // shows as green in local state. Teacher stays on current tab to keep confirming.
    } catch (err: any) {
      toast.error(err?.message || t('audit.confirmFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  // Delete photo from audit
  const handleDeletePhoto = async (photo: AuditPhoto) => {
    if (!confirm(t('audit.deleteConfirm'))) return;
    setProcessingId(photo.id);
    try {
      const res = await montreeApi(`/api/montree/media?id=${photo.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      const deletedZone = photo.zone || 'amber';
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setCounts(prev => ({
        ...prev,
        ...(deletedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
        ...(deletedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(deletedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(deletedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
      toast.success(t('audit.photoDeleted'));
    } catch {
      toast.error(t('audit.deleteFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  // Save photo note (caption) via PATCH
  const handleSaveNote = useCallback(async (photoId: string, caption: string) => {
    try {
      const res = await montreeApi('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, caption: caption || null }),
      });
      if (!res.ok) {
        console.error('[Photo Audit] Note save failed:', res.status);
        toast.error(t('audit.noteSaveFailed'));
      } else {
        // Update local state
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: caption || null } : p));
      }
    } catch (err) {
      console.error('[Photo Audit] Note save error:', err);
      toast.error(t('audit.noteSaveFailed'));
    }
  }, [t]);

  // Single correction — opens area picker (if no area) or work picker directly
  const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'special_events'];

  const handleCorrect = (photo: AuditPhoto) => {
    setCorrectingPhoto(photo);
    if (photo.area && VALID_AREAS.includes(photo.area)) {
      setPickerArea(photo.area);
    }
    // If no area or invalid area, area picker modal shows automatically (correctingPhoto && !pickerArea)
  };

  // Work selected from WorkWheelPicker or cross-area search — submit correction
  // areaOverride is used when selecting directly from search (pickerArea not yet set in state)
  const handleWorkSelected = async (work: any, _status?: string, areaOverride?: string) => {
    if (!correctingPhoto) return;
    const effectiveArea = areaOverride || pickerArea;
    if (!effectiveArea) {
      toast.error('Please select an area first');
      return;
    }
    setProcessingId(correctingPhoto.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: correctingPhoto.id,
          child_id: correctingPhoto.child_id,
          original_work_name: correctingPhoto.work_name || 'Unknown',
          original_work_id: correctingPhoto.work_id || '',
          original_area: correctingPhoto.area || '',
          original_confidence: correctingPhoto.confidence || 0,
          corrected_work_name: work.name,
          corrected_work_id: work.id,
          corrected_area: effectiveArea,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[Photo Audit] Correction failed:', res.status, errData);
        throw new Error(errData?.error || 'correction failed');
      }
      const oldZone = correctingPhoto.zone || 'amber';
      confirmedIdsRef.current.add(correctingPhoto.id);
      setPhotos(prev => prev.map(p =>
        p.id === correctingPhoto.id
          ? { ...p, work_id: work.id, work_name: work.name, area: effectiveArea, zone: 'green' as const, confidence: 1.0 }
          : p
      ));
      setCounts(prev => ({
        ...prev,
        green: prev.green + 1,
        ...(oldZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(oldZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(oldZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      toast.success(t('audit.corrected'));
      // DO NOT call setZone('green') here — it triggers a refetch that overwrites
      // optimistic updates with stale server data (race condition).
    } catch (err: any) {
      toast.error(err?.message || t('audit.correctionFailed'));
    } finally {
      setProcessingId(null);
      setPickerArea('');
    }
    setCorrectingPhoto(null);
  };

  // Batch confirm with rate limit protection
  const handleBatchConfirm = async () => {
    const ids = Array.from(selectedIds);
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: ids.length });
    let succeeded = 0;
    const failed: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      const photo = photos.find(p => p.id === ids[i]);
      if (!photo || !photo.work_id) { failed.push(ids[i]); continue; }
      try {
        const res = await fetch('/api/montree/guru/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_id: photo.id,
            child_id: photo.child_id,
            original_work_name: photo.work_name || '',
            original_work_id: photo.work_id || '',
            original_area: photo.area || '',
            original_confidence: photo.confidence || 0,
            action: 'confirm',
          }),
        });
        if (!res.ok) throw new Error();
        succeeded++;
        confirmedIdsRef.current.add(photo.id);
        setPhotos(prev => prev.map(p =>
          p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
        ));
      } catch {
        failed.push(ids[i]);
      }
      setBatchProgress({ current: i + 1, total: ids.length });
      // Rate limit: 2500ms delay = 24/min (under corrections 30/min limit)
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setBatchProcessing(false);
    setSelectedIds(new Set(failed));
    // Recalculate counts from current photos state after batch updates
    if (succeeded > 0) {
      setPhotos(prev => {
        const newCounts = { green: 0, amber: 0, red: 0, untagged: 0 };
        prev.forEach(p => { if (p.zone && newCounts[p.zone as keyof typeof newCounts] !== undefined) newCounts[p.zone as keyof typeof newCounts]++; });
        setCounts(newCounts);
        return prev; // no mutation, just recalc counts
      });
      // DO NOT call setZone('green') — same race condition as single confirm
    }
    if (failed.length === 0) {
      toast.success(t('audit.batchComplete'));
    } else {
      toast.error(t('audit.batchPartial', { succeeded, total: ids.length }));
    }
  };

  // ================================================================
  // RECLASSIFY ALL — Batch reprocess non-green photos via Sonnet onboarding engine
  // ================================================================
  const nonGreenCount = (counts.amber || 0) + (counts.red || 0) + (counts.untagged || 0);
  const estimatedCost = (nonGreenCount * 0.04).toFixed(2);
  const estimatedMinutes = Math.ceil(nonGreenCount * 10 / 60);

  const handleReclassifyAll = async () => {
    setShowReclassifyConfirm(false);
    reclassifyCancelledRef.current = false;

    // Collect non-green photos that have a child_id (required for photo-insight)
    const photosToProcess = photos.filter(p =>
      (p.zone === 'amber' || p.zone === 'red' || p.zone === 'untagged') && p.child_id
    );

    if (photosToProcess.length === 0) {
      toast.info(t('audit.reclassifyNone') || 'No photos to reclassify');
      return;
    }

    setReclassifying(true);
    setReclassifyProgress({ current: 0, total: photosToProcess.length, green: 0, amber: 0, red: 0, custom: 0, errors: 0 });

    const results = { green: 0, amber: 0, red: 0, custom: 0, errors: 0 };

    for (let i = 0; i < photosToProcess.length; i++) {
      if (reclassifyCancelledRef.current) {
        toast.info(t('audit.reclassifyCancelled') || `Reclassification cancelled. ${i} of ${photosToProcess.length} processed.`);
        break;
      }

      const photo = photosToProcess[i];
      setReclassifyProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const res = await fetch('/api/montree/guru/photo-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            media_id: photo.id,
            child_id: photo.child_id,
            force_onboarding: true,
          }),
        });

        if (res.status === 429) {
          // Rate limited — wait 5s and retry once
          await new Promise(resolve => setTimeout(resolve, 5000));
          const retryRes = await fetch('/api/montree/guru/photo-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              media_id: photo.id,
              child_id: photo.child_id,
              force_onboarding: true,
            }),
          });
          if (retryRes.status === 429) {
            toast.error(t('audit.reclassifyRateLimited') || 'Rate limited — try again in a few minutes');
            break;
          }
          if (!retryRes.ok) {
            results.errors++;
            continue;
          }
          const retryData = await retryRes.json();
          // Sprint 1: auto_updated always false, needs_confirmation always true
          // Zone logic: if work_name identified, it's AMBER (teacher confirms)
          // If no work_name, it's RED (teacher picks manually)
          if (retryData.work_name && !retryData.error) {
            results.amber++;  // Identified — teacher must explicitly confirm
          } else if (!retryData.work_name && !retryData.error) {
            results.red++;    // No match — teacher must pick work manually
          } else {
            results.red++;    // Error — network/timeout/server error
          }
          if (retryData.custom_work_proposal) results.custom++;
        } else if (!res.ok) {
          results.errors++;
          continue;
        } else {
          const data = await res.json();
          // Sprint 1: auto_updated always false, needs_confirmation always true
          // Zone logic: if work_name identified, it's AMBER (teacher confirms)
          // If no work_name, it's RED (teacher picks manually)
          if (data.work_name && !data.error) {
            results.amber++;  // Identified — teacher must explicitly confirm
          } else if (!data.work_name && !data.error) {
            results.red++;    // No match — teacher must pick work manually
          } else {
            results.red++;    // Error — network/timeout/server error
          }
          if (data.custom_work_proposal) results.custom++;
        }

        // Refetch this photo's data to update in list
        setReclassifyProgress(prev => ({
          ...prev,
          green: results.green,
          amber: results.amber,
          red: results.red,
          custom: results.custom,
          errors: results.errors,
        }));
      } catch (err) {
        console.error(`[Reclassify] Error processing photo ${photo.id}:`, err);
        results.errors++;
        // Network error — stop batch
        if (err instanceof TypeError && err.message.includes('fetch')) {
          toast.error(t('audit.reclassifyNetworkError') || 'Connection lost');
          break;
        }
      }
    }

    setReclassifying(false);
    // Refresh all photos to show new zones
    fetchPhotos();
    toast.success(
      t('audit.reclassifyComplete') ||
      `Reclassification complete: ${results.green} identified, ${results.amber} needs review, ${results.errors} errors`
    );
  };

  // "Teach AI" — shows choice: Use Full Photo or Crop to Work
  const handleTeachAI = (photo: AuditPhoto) => {
    if (!photo.url || !photo.work_name || !photo.work_id) return;
    if (describeLoading || describeSaving || cropUploading) return;
    setCropChoicePhoto(photo);
  };

  // Option 1: Use the full photo as-is (original flow)
  const handleUseFullPhoto = async () => {
    const photo = cropChoicePhoto;
    if (!photo) return;
    setCropChoicePhoto(null);
    setCroppedReferenceUrl(null);
    try {
      await describePhotoForReference(photo, { photo_url: photo.url });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast.error(err?.message || t('audit.describeFailed'));
    }
  };

  // Option 2: Open crop modal first
  const handleCropAndTeach = () => {
    if (!cropChoicePhoto) return;
    setCropPhoto(cropChoicePhoto);
    setCropChoicePhoto(null);
  };

  // Crop completed → upload cropped blob to Supabase → then describe
  const handleCropSave = async (croppedBlob: Blob, _width: number, _height: number) => {
    const photo = cropPhoto;
    if (!photo) return;
    setCropPhoto(null);
    setCropUploading(true);
    setCroppedReferenceUrl(null);

    try {
      const session = getSession();
      if (!session?.school?.id || !session?.classroom?.id) {
        throw new Error('No session');
      }

      // Upload cropped blob as a NEW file (not overwriting original)
      const formData = new FormData();
      formData.append('file', new File([croppedBlob], `reference_${photo.work_id}_${Date.now()}.jpg`, { type: 'image/jpeg' }));
      formData.append('metadata', JSON.stringify({
        school_id: session.school.id,
        classroom_id: session.classroom.id,
        child_id: photo.child_id || undefined,
        work_id: photo.work_id || undefined,
        media_type: 'photo',
        tags: ['reference_photo', photo.work_id],
        caption: `Reference: ${photo.work_name}`,
      }));

      const uploadRes = await montreeApi('/api/montree/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const storagePath = uploadData.media?.storage_path;
      if (!storagePath) throw new Error('No storage path returned');

      // Store the cropped reference URL for later save
      const croppedUrl = uploadData.media?.url || null;
      setCroppedReferenceUrl(croppedUrl);

      // Now describe using storage_path (server-to-server, no body size limit)
      await describePhotoForReference(photo, { storage_path: storagePath });
    } catch (err: any) {
      toast.error(err?.message || t('audit.describeFailed'));
    } finally {
      setCropUploading(false);
    }
  };

  // Shared describe logic used by both full-photo and crop flows
  const describePhotoForReference = async (
    photo: AuditPhoto,
    describeParams: { photo_url?: string; storage_path?: string }
  ) => {
    describeAbortRef.current?.abort();
    const controller = new AbortController();
    describeAbortRef.current = controller;
    setDescribingPhoto(photo);
    setDescribeResult(null);
    setDescribeLoading(true);
    try {
      const res = await fetch('/api/montree/classroom-setup/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...describeParams,
          work_name: photo.work_name,
          area: photo.area || 'practical_life',
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Describe failed');
      }
      const data = await res.json();
      if (controller.signal.aborted) return;
      setDescribeResult(data.description);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Clean up all state on error — callers show the toast
      setDescribingPhoto(null);
      setCroppedReferenceUrl(null);
      throw err; // Re-throw so callers can show appropriate toast
    } finally {
      if (!controller.signal.aborted) setDescribeLoading(false);
    }
  };

  const handleConfirmReference = async () => {
    if (!describingPhoto || !describeResult) return;
    if (describeSaving) return; // Prevent double-click
    setDescribeSaving(true);
    try {
      // Use cropped URL if available, otherwise fall back to original photo URL
      const referenceUrl = croppedReferenceUrl || describingPhoto.url;
      const res = await fetch('/api/montree/classroom-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_key: describingPhoto.work_id,
          work_name: describingPhoto.work_name,
          area: describingPhoto.area || 'practical_life',
          visual_description: describeResult.visual_description,
          reference_photo_url: referenceUrl,
          parent_description: describeResult.parent_description,
          why_it_matters: describeResult.why_it_matters,
          key_materials: describeResult.key_materials,
          negative_descriptions: describeResult.negative_descriptions,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }
      toast.success(t('audit.referenceSaved'));
      // Refresh stats after saving a new reference
      fetchSmartLearningStats();
    } catch (err: any) {
      toast.error(err?.message || t('audit.referenceSaveFailed'));
    } finally {
      setDescribeSaving(false);
      setDescribingPhoto(null);
      setDescribeResult(null);
      setCroppedReferenceUrl(null);
    }
  };

  const handleCancelReference = () => {
    describeAbortRef.current?.abort();
    setDescribingPhoto(null);
    setDescribeResult(null);
    setDescribeLoading(false);
    setDescribeSaving(false);
    setCroppedReferenceUrl(null);
    setCropChoicePhoto(null);
    setCropPhoto(null);
    setCropUploading(false);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visible = filteredPhotos.map(p => p.id);
    // Toggle: if all are selected, deselect; otherwise select all
    const allSelected = visible.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visible));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Works for selected area (feeds WorkWheelPicker)
  const areaWorks = useMemo(() => {
    if (!pickerArea) return [];
    return (curriculum[pickerArea] || []).map((w: any) => ({
      ...w,
      id: w.id || w.work_key || w.name,
    }));
  }, [pickerArea, curriculum]);

  // Filter photos by zone
  const filteredPhotos = useMemo(() => {
    if (zone === 'all') return photos;
    return photos.filter(p => p.zone === zone);
  }, [photos, zone]);

  // Paginate
  const PAGE_SIZE = 24;
  const pagedPhotos = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPhotos.slice(start, start + PAGE_SIZE);
  }, [filteredPhotos, page]);
  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);

  // Reset page on zone change
  useEffect(() => { setPage(0); }, [zone]);

  // Zone tab config
  const ZONE_TABS: { key: Zone; label: string; color: string; count: number }[] = [
    { key: 'all', label: t('audit.all'), color: 'bg-gray-100 text-gray-700', count: counts.green + counts.amber + counts.red + counts.untagged },
    { key: 'red', label: t('audit.red'), color: 'bg-red-100 text-red-700', count: counts.red },
    { key: 'amber', label: t('audit.amber'), color: 'bg-amber-100 text-amber-700', count: counts.amber },
    { key: 'untagged', label: t('audit.untagged'), color: 'bg-gray-200 text-gray-600', count: counts.untagged },
    { key: 'green', label: t('audit.green'), color: 'bg-emerald-100 text-emerald-700', count: counts.green },
  ];

  // ─── JSX ───
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t('audit.title')}</h1>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="7d">{t('audit.last7d')}</option>
            <option value="30d">{t('audit.last30d')}</option>
            <option value="all">{t('audit.allTime')}</option>
          </select>
        </div>

        {/* Smart Learning progress bar */}
        {smartLearningStats && smartLearningStats.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
              <span>🧠 {t('audit.smartLearning')}</span>
              <span>{smartLearningStats.described}/{smartLearningStats.total} ({Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 rounded-full h-1.5 transition-all duration-500"
                style={{ width: `${Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Zone tabs + Reclassify button */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          <div className="flex gap-2 flex-1 overflow-x-auto">
            {ZONE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setZone(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  zone === tab.key ? tab.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-400'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Reclassify progress bar (shown during batch processing) */}
        {reclassifying && (
          <div className="mt-2 p-2 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-center justify-between text-xs text-violet-700 mb-1">
              <span className="font-medium">
                {t('audit.reclassifyProgress') || 'Reclassifying'} {reclassifyProgress.current}/{reclassifyProgress.total}...
              </span>
              <button
                onClick={() => { reclassifyCancelledRef.current = true; }}
                className="px-2 py-0.5 rounded text-xs bg-white text-gray-600 border hover:bg-gray-50"
              >
                {t('audit.reclassifyCancel') || 'Cancel'}
              </button>
            </div>
            <div className="w-full bg-violet-100 rounded-full h-2">
              <div
                className="bg-violet-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${reclassifyProgress.total > 0 ? Math.round((reclassifyProgress.current / reclassifyProgress.total) * 100) : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
              <span className="text-emerald-600">{reclassifyProgress.green} identified</span>
              <span className="text-amber-600">{reclassifyProgress.amber} review</span>
              <span className="text-red-600">{reclassifyProgress.red} unknown</span>
              {reclassifyProgress.custom > 0 && <span className="text-blue-600">{reclassifyProgress.custom} custom</span>}
              {reclassifyProgress.errors > 0 && <span className="text-gray-400">{reclassifyProgress.errors} errors</span>}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredPhotos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">📷</p>
          <p>{t('audit.noPhotos')}</p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && filteredPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
          {pagedPhotos.map(photo => (
            <AuditPhotoCard
              key={photo.id}
              photo={photo}
              selected={selectedIds.has(photo.id)}
              onToggle={() => toggleSelect(photo.id)}
              onConfirm={() => handleConfirm(photo)}
              onCorrect={() => handleCorrect(photo)}
              onUseAsReference={() => handleTeachAI(photo)}
              onTagChildren={() => handleOpenChildTagger(photo)}
              onDelete={() => handleDeletePhoto(photo)}
              rerunResult={rerunResults[photo.id] || null}
              onSaveNote={(caption) => handleSaveNote(photo.id, caption)}
              processing={processingId === photo.id}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Batch action bar */}
      {/* Select All bar (when no selection) */}
      {selectedIds.size === 0 && filteredPhotos.length > 0 && !loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-20">
          <div className="flex items-center justify-center">
            <button
              onClick={selectAllVisible}
              className="px-4 py-1.5 text-sm rounded border text-gray-600"
            >
              {t('audit.selectAll')} ({filteredPhotos.length})
            </button>
          </div>
        </div>
      )}

      {/* Area picker modal with cross-area search (shown when correcting) */}
      {correctingPhoto && !pickerArea && (
        <AreaPickerWithSearch
          areas={AREAS}
          curriculum={curriculum}
          onSelectArea={(areaKey: string) => setPickerArea(areaKey)}
          onSelectWork={(work: any, areaKey: string) => {
            handleWorkSelected(work, undefined, areaKey);
          }}
          onClose={() => setCorrectingPhoto(null)}
          onWorkAdded={fetchCurriculum}
          classroomId={getSession()?.classroom?.id || ''}
          t={t}
        />
      )}

      {/* WorkWheelPicker (shown after area selected) — with "Change Area" back button */}
      {correctingPhoto && pickerArea && (
        <>
          {/* "Change Area" floating button — lets teacher go back to area picker if AI classified into wrong area */}
          <div className="fixed top-3 left-3 z-[60]">
            <button
              onClick={() => setPickerArea('')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-200"
            >
              <span>←</span>
              <span>{t('audit.changeArea')}</span>
            </button>
          </div>
          <WorkWheelPicker
            isOpen={true}
            onClose={() => { setCorrectingPhoto(null); setPickerArea(''); }}
            area={pickerArea}
            works={areaWorks}
            currentWorkName={correctingPhoto.work_name || undefined}
            onSelectWork={handleWorkSelected}
            onWorkAdded={fetchCurriculum}
          />
        </>
      )}

      {/* Crop choice modal — "Use Full Photo" vs "Crop to Work" */}
      {cropChoicePhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCropChoicePhoto(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">🧠 {t('audit.teachAI')}</h3>
            <p className="text-sm text-gray-500 mb-4">{cropChoicePhoto.work_name}</p>

            {cropChoicePhoto.url && (
              <img src={cropChoicePhoto.url} alt={cropChoicePhoto.work_name || ''}
                className="w-full h-36 object-cover rounded-lg mb-4" />
            )}

            <div className="space-y-2">
              <button
                onClick={handleCropAndTeach}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium text-sm"
              >
                ✂️ {t('audit.cropAndTeach')}
              </button>
              <button
                onClick={handleUseFullPhoto}
                className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm"
              >
                🖼️ {t('audit.useFullPhoto')}
              </button>
              <button
                onClick={() => setCropChoicePhoto(null)}
                className="w-full py-2 text-sm text-gray-400"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reclassify Confirmation Dialog */}
      {/* Reclassify All modal removed — use CLIP with photo selection instead */}

      {/* PhotoCropModal */}
      {cropPhoto && cropPhoto.url && (
        <PhotoCropModal
          imageUrl={cropPhoto.url}
          isOpen={true}
          onClose={() => setCropPhoto(null)}
          onSave={handleCropSave}
        />
      )}

      {/* Crop uploading overlay */}
      {cropUploading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-600">{t('audit.uploadingCrop')}</p>
          </div>
        </div>
      )}

      {/* Child Tagger Modal */}
      {taggingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setTaggingPhoto(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[85vh] flex flex-col p-5"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">👶 {t('audit.tagChildren')}</h3>
            <p className="text-xs text-gray-400 mb-3 truncate">{taggingPhoto.work_name || t('audit.untaggedWork')}</p>

            {/* Thumbnail */}
            {taggingPhoto.url && (
              <img src={taggingPhoto.url} alt="" className="w-full h-28 object-cover rounded-lg mb-3" />
            )}

            {/* Children list */}
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1 min-h-0 max-h-[40vh]">
              {classroomChildren.map(child => {
                const checked = taggingSelection.has(child.id);
                return (
                  <button
                    key={child.id}
                    onClick={() => handleToggleChild(child.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      checked ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                    }`}>
                      {checked && '✓'}
                    </span>
                    <span className="text-sm font-medium">{child.name}</span>
                  </button>
                );
              })}
              {classroomChildren.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">{t('common.loading')}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <button
                onClick={handleSaveChildTags}
                disabled={taggingSaving}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm disabled:opacity-50"
              >
                {taggingSaving ? '...' : t('common.save')}
              </button>
              <button
                onClick={() => setTaggingPhoto(null)}
                className="flex-1 py-2.5 rounded-lg border text-gray-600 font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Teach AI" description preview modal */}
      {describingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleCancelReference}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">
              🧠 {t('audit.teachAI')}
            </h3>
            <p className="text-sm text-gray-500 mb-2">{describingPhoto.work_name}</p>

            {/* Photo preview — show crop if available, else original */}
            {(croppedReferenceUrl || describingPhoto.url) && (
              <img src={croppedReferenceUrl || describingPhoto.url || ''} alt={describingPhoto.work_name || ''}
                className="w-full h-40 object-cover rounded-lg mb-3" />
            )}

            {describeLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-sm text-gray-500">{t('audit.describing')}</span>
              </div>
            )}

            {describeResult && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">{t('audit.visualDescription')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.visual_description}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">{t('audit.parentDescription')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.parent_description}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">{t('audit.whyItMatters')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.why_it_matters}</p>
                </div>
                {describeResult.key_materials.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('audit.keyMaterials')}</label>
                    <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.key_materials.join(', ')}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleConfirmReference}
                    disabled={describeSaving}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm disabled:opacity-50"
                  >
                    {describeSaving ? '...' : t('audit.saveReference')}
                  </button>
                  <button
                    onClick={handleCancelReference}
                    className="flex-1 py-2 rounded-lg border text-gray-600 font-medium text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {!describeLoading && !describeResult && (
              <button onClick={handleCancelReference}
                className="w-full py-2 text-sm text-gray-500 mt-4">
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AuditPhotoCard ───
function AuditPhotoCard({ photo, selected, onToggle, onConfirm, onCorrect, onUseAsReference, onTagChildren, onDelete, rerunResult, onSaveNote, processing, t }: {
  photo: AuditPhoto;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
  onUseAsReference: () => void;
  onTagChildren: () => void;
  onDelete: () => void;
  rerunResult: { work_name: string | null; area: string | null; confidence: number | null; scenario: string | null; loading: boolean; error: string | null } | null;
  onSaveNote: (caption: string) => void;
  processing: boolean;
  t: (key: string) => string;
}) {
  const [noteText, setNoteText] = useState(photo.caption || '');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: 1.2s after last keystroke
  const handleNoteChange = useCallback((value: string) => {
    setNoteText(value);
    setNoteSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setNoteSaving(true);
      onSaveNote(value);
      // Optimistic: show saved after short delay
      setTimeout(() => { setNoteSaving(false); setNoteSaved(true); }, 400);
    }, 1200);
  }, [onSaveNote]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);
  const zoneColors: Record<string, string> = {
    green: 'border-emerald-400',
    amber: 'border-amber-400',
    red: 'border-red-400',
    untagged: 'border-gray-300',
  };

  const zoneBadge: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    untagged: 'bg-gray-400',
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 ${
      selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
    } ${zoneColors[photo.zone] || 'border-gray-200'}`}>
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded border-2 bg-white/80 flex items-center justify-center"
      >
        {selected && <span className="text-blue-600 text-sm font-bold">✓</span>}
      </button>

      {/* Zone badge */}
      <div className={`absolute top-1.5 right-1.5 z-10 w-3 h-3 rounded-full ${zoneBadge[photo.zone]}`} />

      {/* Photo */}
      <div className="aspect-square bg-gray-100">
        {photo.url ? (
          <img
            src={photo.url}
            alt={photo.work_name || 'Photo'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium truncate">{photo.work_name || t('audit.untaggedWork')}</p>
        {/* Multi-child display with tag button */}
        <button
          onClick={onTagChildren}
          className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400 hover:text-blue-600 transition-colors group w-full text-left"
          title={t('audit.tagChildren')}
        >
          <span className="truncate flex-1">
            {photo.child_names && photo.child_names.length > 0
              ? photo.child_names.join(', ')
              : photo.child_name || t('audit.noChildrenTagged')}
          </span>
          <span className="opacity-0 group-hover:opacity-100 text-blue-500 flex-shrink-0">👶+</span>
        </button>
        {photo.confidence !== null && (
          <p className="text-[10px] text-gray-400">
            {Math.round(photo.confidence * 100)}%
          </p>
        )}
        {/* Teacher note input */}
        <div className="mt-1 relative">
          <textarea
            value={noteText}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder={t('audit.addNote')}
            className="w-full text-[10px] p-1.5 rounded border border-gray-200 bg-gray-50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-300"
            rows={2}
          />
          {noteSaving && <span className="absolute top-0.5 right-1 text-[8px] text-gray-400">{t('audit.saving')}</span>}
          {noteSaved && !noteSaving && <span className="absolute top-0.5 right-1 text-[8px] text-emerald-500">✓</span>}
        </div>
        {/* CLIP result display */}
        {rerunResult && !rerunResult.loading && !rerunResult.error && (
          <div className="mt-1 p-1.5 rounded bg-indigo-50 border border-indigo-200">
            <p className="text-[9px] font-semibold text-indigo-600 mb-0.5">{t('audit.clipResult')}</p>
            {rerunResult.work_name ? (
              <>
                <p className="text-[10px] font-medium text-indigo-800 truncate">{rerunResult.work_name}</p>
                <p className="text-[9px] text-indigo-500">
                  {rerunResult.area && <span className="capitalize">{rerunResult.area.replace(/_/g, ' ')}</span>}
                  {rerunResult.confidence !== null && <span> · {Math.round(rerunResult.confidence * 100)}%</span>}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-indigo-500 italic">
                {t('audit.clipNoMatch')}
                {rerunResult.confidence !== null && ` (${Math.round(rerunResult.confidence * 100)}%)`}
                {rerunResult.scenario && <span className="block text-[8px] text-indigo-400 mt-0.5">reason: {rerunResult.scenario}</span>}
              </p>
            )}
          </div>
        )}
        {rerunResult?.loading && (
          <div className="mt-1 p-1.5 rounded bg-indigo-50 border border-indigo-200">
            <p className="text-[10px] text-indigo-600 animate-pulse">{t('audit.rerunRunning')}</p>
          </div>
        )}
        {rerunResult?.error && (
          <div className="mt-1 p-1.5 rounded bg-red-50 border border-red-200">
            <p className="text-[10px] text-red-500">{rerunResult.error}</p>
          </div>
        )}
        <div className="flex gap-1 mt-1.5">
          {photo.zone !== 'green' && photo.work_id && (
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 text-[10px] py-1 rounded bg-emerald-50 text-emerald-700 font-medium disabled:opacity-50"
            >
              {processing ? '...' : `✓ ${t('audit.confirm')}`}
            </button>
          )}
          <button
            onClick={onCorrect}
            disabled={processing}
            className="flex-1 text-[10px] py-1 rounded bg-gray-100 text-gray-600 font-medium disabled:opacity-50"
          >
            ✏️ {t('audit.fix')}
          </button>
          {photo.work_name && photo.work_id && photo.url && (
            <button
              onClick={onUseAsReference}
              disabled={processing}
              className="flex-1 text-[10px] py-1 rounded bg-blue-50 text-blue-700 font-medium disabled:opacity-50"
              title={t('audit.teachAI')}
            >
              🧠 {t('audit.teach')}
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={processing}
            className="text-[10px] py-1 px-1.5 rounded bg-red-50 text-red-500 font-medium disabled:opacity-50"
            title={t('audit.deletePhoto')}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
