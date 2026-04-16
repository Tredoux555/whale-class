// @ts-nocheck — audit page, will type-check incrementally
// NOTE (Sprint 3): PhotoInsightPopup NOT wired here — audit page already has its own
// per-photo correction UI (confirm/fix/teach/delete). The popup is per-child and this
// page is classroom-wide. If needed later, could render one popup per visible child.
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import PendingReviewPanel from '@/components/montree/photo-audit/PendingReviewPanel';
import { useFeaturesContext } from '@/lib/montree/features';
import type { Resolution as ThisIsResolution, ThisIsSheetPhoto } from '@/components/montree/photo-audit/ThisIsSheet';
import { getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';
import { drainStuckQueue } from '@/lib/montree/offline';

// Tier 3 perf: code-split heavy modals/tabs (~4k lines) — only downloaded when actually rendered.
const WorkWheelPicker = dynamic(() => import('@/components/montree/WorkWheelPicker'), { ssr: false });
const PhotoCropModal = dynamic(() => import('@/components/montree/media/PhotoCropModal'), { ssr: false });
const WeeklyWrapTab = dynamic(() => import('@/components/montree/reports/WeeklyWrapTab'), { ssr: false });
const WeeklyAdminTab = dynamic(() => import('@/components/montree/reports/WeeklyAdminTab'), { ssr: false });
const ThisIsSheet = dynamic(() => import('@/components/montree/photo-audit/ThisIsSheet'), { ssr: false });
const TellAiSheet = dynamic(() => import('@/components/montree/photo-audit/TellAiSheet'), { ssr: false });
const VoiceDictate = dynamic(() => import('@/components/montree/voice/VoiceDictate'), { ssr: false });

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
  thumbnail_path?: string | null;
  auto_crop: { x: number; y: number; width: number; height: number } | null;
  captured_at: string;
  caption: string | null;
  status: string | null;
  identification_status?: string | null;
  identification_confidence?: number | null;
  teacher_confirmed?: boolean;
  sonnet_draft?: {
    visual_description?: string;
    proposed_name?: string;
    suggested_area?: string;
    parent_description?: string;
    why_it_matters?: string;
    key_materials?: string[];
    closest_existing_match?: { work_name?: string; similarity?: number } | null;
    confidence?: number;
    work_key?: string;
    drafted_at?: string;
  } | null;
}

type Zone = 'all' | 'green' | 'amber' | 'red' | 'untagged' | 'weekly_admin' | 'works_review' | 'parent_reports' | 'today_all' | 'pending_review';
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
              <label className="text-xs font-medium text-[#A1887F] mb-1 block">{t('audit.workName') || 'Work Name'}</label>
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
              <label className="text-xs font-medium text-[#A1887F] mb-1 block">{t('audit.area') || 'Area'}</label>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#A1887F]">{t('audit.briefDescription') || 'Brief description (optional)'}</label>
                <VoiceDictate
                  size="sm"
                  onAppend={(text) => setAddWorkDesc((prev) => (prev ? prev + ' ' + text : text).slice(0, 500))}
                  onError={(msg) => toast.error(msg)}
                />
              </div>
              <textarea
                value={addWorkDesc}
                onChange={e => setAddWorkDesc(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t('audit.descriptionPlaceholder') || "e.g., 'Children learn to blend st sound using objects'"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="text-xs text-[#A1887F] text-right mt-0.5">{addWorkDesc.length}/500</div>
            </div>

            {/* Preview results (editable) */}
            {showPreview && (
              <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/50">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <span className="animate-spin text-lg">⏳</span>
                    <span className="text-sm text-[#A1887F]">{t('audit.generatingPreview') || 'Generating AI descriptions...'}</span>
                  </div>
                ) : previewData ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewDescription') || 'Description:'}</span>
                      <p className="text-gray-800 mt-0.5">{previewData.description}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewParent') || 'For parents:'}</span>
                      <p className="text-gray-800 mt-0.5">{previewData.parent_description}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">{t('audit.previewWhyMatters') || 'Why it matters:'}</span>
                      <p className="text-gray-800 mt-0.5">{previewData.why_it_matters}</p>
                    </div>
                    {previewData.materials?.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">{t('audit.previewMaterials') || 'Materials:'}</span>
                        <p className="text-gray-800 mt-0.5">{previewData.materials.join(', ')}</p>
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
                className="w-full py-2 text-sm text-[#A1887F]"
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1887F] text-sm">🔍</span>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1887F] hover:text-gray-600 text-sm">
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
                    <div className="text-xs text-[#A1887F]">{r.areaLabel}</div>
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
              <p className="text-sm text-[#A1887F] mb-3">{t('common.noResults') || 'No works found'}</p>
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
          className="mt-3 w-full py-2 text-sm text-[#A1887F]"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function PhotoAuditPage() {
  const { t, locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  // Track photos confirmed in this session — prevents server refetch from overwriting optimistic green status
  const confirmedIdsRef = useRef<Set<string>>(new Set());

  // Classroom (for WeeklyWrapTab)
  const [classroomIdState, setClassroomIdState] = useState<string>('');
  const classroomIdInitRef = useRef(false);

  // Core state
  const [photos, setPhotos] = useState<AuditPhoto[]>([]);
  const [counts, setCounts] = useState({ green: 0, amber: 0, red: 0, untagged: 0 });
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<Zone>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const { isEnabled } = useFeaturesContext();
  const reviewBeforeProcess = isEnabled('review_before_process');

  // When review-before-process is on, default to the Photo Bucket tab.
  // Only flips on initial load (when still at the hardcoded 'all' default).
  const didInitZoneRef = useRef(false);
  useEffect(() => {
    if (didInitZoneRef.current) return;
    if (reviewBeforeProcess && zone === 'all') {
      setZone('pending_review');
      didInitZoneRef.current = true;
    } else if (reviewBeforeProcess !== undefined) {
      didInitZoneRef.current = true;
    }
  }, [reviewBeforeProcess, zone]);
  const [page, setPage] = useState(0);
  const [curriculum, setCurriculum] = useState<Record<string, any[]>>({});

  // Correction state
  const [correctingPhoto, setCorrectingPhoto] = useState<AuditPhoto | null>(null);
  const [thisIsPhoto, setThisIsPhoto] = useState<AuditPhoto | null>(null);
  const [tellAiPhoto, setTellAiPhoto] = useState<AuditPhoto | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pickerArea, setPickerArea] = useState('');

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Work status tracking for P/P/M buttons (keyed by `${childId}:${workName}`)
  const [workStatuses, setWorkStatuses] = useState<Record<string, string>>({});
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
  const [rerunResults, setRerunResults] = useState<Record<string, { work_name: string | null; work_id: string | null; area: string | null; confidence: number | null; scenario: string | null; visual_description: string | null; model_used: string | null; loading: boolean; error: string | null }>>({});
  // Haiku batch run state
  const [haikusRunning, setHaikusRunning] = useState(false);
  const [haikuProgress, setHaikuProgress] = useState({ current: 0, total: 0 });
  const haikuCancelledRef = useRef(false);

  // Manual queue sync state — drains photos stuck in IndexedDB (e.g. Apr 15-16
  // Photo Bucket window where every upload 500'd on pending_review CHECK
  // constraint and rolled into permanent_failure after 5 retries).
  const [syncingQueue, setSyncingQueue] = useState(false);

  async function handleSyncQueue() {
    if (syncingQueue) return;
    setSyncingQueue(true);
    try {
      const result = await drainStuckQueue();
      if (result.needs_auth) {
        toast.error(locale === 'zh' ? '请重新登录' : 'Please log in again');
        return;
      }
      if (result.skipped && result.reason === 'offline') {
        toast.error(locale === 'zh' ? '离线 — 请检查网络' : 'Offline — check your connection');
        return;
      }
      if (result.reset === 0 && result.uploaded === 0) {
        toast.success(locale === 'zh' ? '队列为空 — 没有要同步的照片' : 'Queue empty — no photos to sync');
        return;
      }
      if (result.uploaded > 0) {
        toast.success(
          locale === 'zh'
            ? `已上传 ${result.uploaded} 张照片` + (result.failed > 0 ? ` (${result.failed} 失败)` : '')
            : `Uploaded ${result.uploaded} photo${result.uploaded === 1 ? '' : 's'}` + (result.failed > 0 ? ` (${result.failed} failed)` : '')
        );
        // Refresh the audit grid so the freshly-synced photos appear
        setTimeout(() => fetchPhotos(), 800);
      } else if (result.failed > 0) {
        toast.error(
          locale === 'zh'
            ? `同步失败 — ${result.failed} 张照片无法上传`
            : `Sync failed — ${result.failed} photo${result.failed === 1 ? '' : 's'} could not upload`
        );
      } else if (result.reset > 0) {
        toast.success(
          locale === 'zh'
            ? `已重置 ${result.reset} 张照片,正在同步...`
            : `Reset ${result.reset} photo${result.reset === 1 ? '' : 's'}, syncing...`
        );
      }
    } catch (err) {
      console.error('[PhotoAudit] Sync queue error:', err);
      toast.error(locale === 'zh' ? '同步错误' : 'Sync error');
    } finally {
      setSyncingQueue(false);
    }
  }

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
    // Store classroomId for WeeklyWrapTab (use ref to avoid stale closure)
    if (classroomId && !classroomIdInitRef.current) {
      classroomIdInitRef.current = true;
      setClassroomIdState(classroomId);
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
    // Pending Review tab manages its own fetching via PendingReviewPanel.
    if (zone === 'pending_review') {
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    // "Today (All)" overrides the zone + date filter to show every photo from
    // the last 24h regardless of teacher_confirmed status — the end-of-day
    // sanity-check view for catching wrong auto-confirms.
    const isTodayAll = zone === 'today_all';
    const dateFrom = isTodayAll
      ? new Date(Date.now() - 86400000).toISOString()
      : dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString()
      : dateRange === '7d' ? new Date(Date.now() - 7 * 86400000).toISOString()
      : dateRange === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
      : '2020-01-01T00:00:00Z';
    const effectiveZone = isTodayAll ? 'all' : zone;
    const includeConfirmedParam = isTodayAll ? '&include_confirmed=1' : '';
    const limitParam = isTodayAll ? 500 : 200;

    try {
      const res = await fetch(
        `/api/montree/audit/photos?zone=${effectiveZone}&date_from=${dateFrom}&limit=${limitParam}&offset=0${includeConfirmedParam}`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // Filter out photos confirmed in this session — they're "done" and should
      // not reappear even if the server returns stale confidence data (race condition)
      const mergedPhotos = (data.photos || []).filter((p: AuditPhoto) =>
        !confirmedIdsRef.current.has(p.id)
      );
      setPhotos(mergedPhotos);
      // Seed work statuses from DB, defaulting to 'practicing' for any identified photo
      // (if a teacher photographed a child doing a work, they're at minimum practicing it)
      const initialStatuses: Record<string, string> = {};
      const needsDefault: Array<{ child_id: string; work_name: string; area: string | null }> = [];
      mergedPhotos.forEach((p: AuditPhoto) => {
        if (p.child_id && p.work_name) {
          const key = `${p.child_id}:${p.work_name}`;
          if (p.status) {
            initialStatuses[key] = p.status;
          } else if (!initialStatuses[key]) {
            initialStatuses[key] = 'practicing';
            needsDefault.push({ child_id: p.child_id, work_name: p.work_name, area: p.area });
          }
        }
      });
      // Persist defaults to DB (fire-and-forget, no_downgrade so we don't overwrite higher statuses)
      for (const d of needsDefault) {
        montreeApi('/api/montree/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: d.child_id,
            work_name: d.work_name,
            area: d.area || undefined,
            status: 'practicing',
            no_downgrade: true,
          }),
        }).catch(err => console.error('[P/P/M Default] Failed:', err));
      }
      setWorkStatuses(prev => {
        // Merge: DB seeds first, then session overrides win (teacher edits this session
        // should not be reverted by a refetch returning stale DB values)
        return { ...initialStatuses, ...prev };
      });
      // Recalculate counts excluding confirmed photos
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

  // One-shot recovery sweep on mount: ask the server for a list of stuck
  // photo-identification jobs (status null/pending/failed + stale attempted_at),
  // then fire /process for each one in our own background loop. Each /process
  // call lives in its own request lifecycle, so Sonnet's 45s timeout can't
  // stall this page. Refetch once at the end to surface any new drafts/matches.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/photo-identification/sweep', { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const ids: string[] = Array.isArray(json?.media_ids) ? json.media_ids : [];
        if (ids.length === 0 || cancelled) return;
        // Fire /process calls sequentially but in the background — DO NOT block the UI.
        let completed = 0;
        for (const id of ids) {
          if (cancelled) return;
          try {
            await montreeApi('/api/montree/photo-identification/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ media_id: id, locale: 'en' }),
            });
            completed++;
          } catch (err) {
            console.error('[PhotoIdSweep] /process failed for', id, err);
          }
        }
        if (!cancelled && completed > 0) {
          fetchPhotos();
        }
      } catch (err) {
        console.error('[PhotoIdSweep] client sweep failed (non-fatal):', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // "Correct" = done signal. Remove photo from list entirely.
      confirmedIdsRef.current.add(photo.id);
      const oldZone = photo.zone || 'amber';
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setCounts(prev => ({
        ...prev,
        ...(oldZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(oldZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(oldZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      toast.success(t('audit.confirmed'));
      // Photo is removed from view. On next refresh, server has confidence=1.0
      // so it won't appear in non-green zones.
    } catch (err: any) {
      toast.error(err?.message || t('audit.confirmFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  // Set work status (Presented/Practicing/Mastered) from photo audit
  const handleSetStatus = async (photo: AuditPhoto, status: 'presented' | 'practicing' | 'mastered') => {
    if (!photo.work_name || !photo.child_id) return;
    const key = `${photo.child_id}:${photo.work_name}`;
    const prevStatus = workStatuses[key];
    // Optimistic update
    setWorkStatuses(prev => ({ ...prev, [key]: status }));
    try {
      const res = await montreeApi('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: photo.child_id,
          work_name: photo.work_name,
          work_id: photo.work_id || undefined,
          area: photo.area || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to update status');
      }
      toast.success(`${photo.child_name || 'Child'}: ${photo.work_name} → ${status}`);
    } catch (err: any) {
      // Revert optimistic update
      setWorkStatuses(prev => {
        const next = { ...prev };
        if (prevStatus) next[key] = prevStatus; else delete next[key];
        return next;
      });
      toast.error(err?.message || 'Failed to update status');
    }
  };

  // Delete photo from audit — optimistic: remove immediately, revert on error
  const handleDeletePhoto = async (photo: AuditPhoto) => {
    if (!confirm(t('audit.deleteConfirm'))) return;
    const deletedZone = photo.zone || 'amber';
    // Snapshot for revert
    const prevPhotos = photos;
    const prevCounts = counts;
    const prevSelected = selectedIds;
    // Optimistic update
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setCounts(prev => ({
      ...prev,
      ...(deletedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
      ...(deletedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
      ...(deletedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
      ...(deletedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
    }));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
    try {
      const res = await montreeApi(`/api/montree/media?id=${photo.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      toast.success(t('audit.photoDeleted'));
    } catch {
      // Revert
      setPhotos(prevPhotos);
      setCounts(prevCounts);
      setSelectedIds(prevSelected);
      toast.error(t('audit.deleteFailed'));
    }
  };

  // Mark a photo as a paperwork page. Fires Haiku vision to read the week
  // number in the top-left corner and bumps tagged children's
  // paperwork_current_week (no-downgrade, confidence >= 0.7). Fire-and-forget
  // style UX — the card goes green and the user moves on.
  const handleMarkAsPaperwork = async (photo: AuditPhoto) => {
    setProcessingId(photo.id);
    toast.loading('📋 Reading week number...', { id: `paperwork-${photo.id}` });
    try {
      const res = await montreeApi('/api/montree/paperwork/read-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: photo.id }),
      });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(`paperwork-${photo.id}`);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Failed to mark as paperwork');
        return;
      }
      if (data.found && data.week && data.applied) {
        toast.success(`📋 Week ${data.week} detected — updated ${data.children_updated} ${data.children_updated === 1 ? 'child' : 'children'}`);
      } else if (data.found && data.week && !data.applied) {
        const reasonText = data.reason === 'same_week' ? 'already on this week'
          : data.reason === 'no_downgrade' ? 'children are ahead of this week'
          : data.reason === 'low_confidence' ? 'confidence too low'
          : 'no update needed';
        toast.success(`📋 Week ${data.week} detected — ${reasonText}`);
      } else if (data.already_processed) {
        toast.success(`📋 Already processed — week ${data.week}`);
      } else {
        toast.success('📋 Marked as paperwork — week number not found on page');
      }
    } catch (err: any) {
      toast.dismiss(`paperwork-${photo.id}`);
      toast.error(err?.message || 'Failed to mark as paperwork');
    } finally {
      setProcessingId(null);
    }
  };

  // Find a work by name across the loaded curriculum (case-insensitive, prefers
  // exact match then substring match within the suggested area).
  const findWorkByName = useCallback((rawName: string, preferredArea?: string): { work: any; areaKey: string } | null => {
    if (!rawName) return null;
    const needle = rawName.trim().toLowerCase();
    const tryAreas = preferredArea
      ? [preferredArea, ...Object.keys(curriculum).filter(k => k !== preferredArea)]
      : Object.keys(curriculum);
    // Pass 1: exact name match
    for (const areaKey of tryAreas) {
      const works = curriculum[areaKey] || [];
      const exact = works.find((w: any) => (w.name || '').trim().toLowerCase() === needle);
      if (exact) return { work: exact, areaKey };
    }
    // Pass 2: substring match (work name contains needle or vice versa)
    for (const areaKey of tryAreas) {
      const works = curriculum[areaKey] || [];
      const sub = works.find((w: any) => {
        const n = (w.name || '').trim().toLowerCase();
        return n && (n.includes(needle) || needle.includes(n));
      });
      if (sub) return { work: sub, areaKey };
    }
    return null;
  }, [curriculum]);

  // Silently attach a photo to an existing curriculum work via the corrections endpoint.
  // Used by both the Tier 1 (>=90% match) auto-attach path and the Tier 2 modal "Use existing" button.
  const attachToExistingWork = async (photo: AuditPhoto, work: { id: string; name: string }, areaKey: string) => {
    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: photo.id,
          child_id: photo.child_id,
          original_work_name: photo.work_name || photo.sonnet_draft?.proposed_name || 'Unknown',
          original_work_id: photo.work_id || '',
          original_area: photo.area || '',
          original_confidence: photo.confidence || 0,
          corrected_work_name: work.name,
          corrected_work_id: work.id,
          corrected_area: areaKey,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'attach failed');
      }
      // Remove photo from grid — it's now confirmed
      const removedZone = photo.zone || 'untagged';
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setCounts(prev => ({
        ...prev,
        ...(removedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
        ...(removedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(removedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(removedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
      toast.success(`🔗 Matched to "${work.name}"`);
      setAcceptingPhoto(null);
      return true;
    } catch (err) {
      console.error('[AttachExisting] Failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to attach');
      return false;
    } finally {
      setProcessingId(null);
    }
  };

  // "This is..." — one button, one sheet, three resolution paths (existing / new_custom / confirm_ai).
  // Replaces the old Fix + Accept + AcceptDraftModal tangle.
  //
  // Tier 1 shortcut (Session 9 fix): when the Sonnet draft has a very
  // high-confidence closest_existing_match AND that match resolves to a
  // real classroom work, silently attach the photo right here instead
  // of opening the sheet. This restores the single-tap Accept behavior
  // that got lost when Session 8 collapsed everything into the sheet.
  // No sheet, no extra click, photo is out of the queue.
  const openThisIsSheet = (photo: AuditPhoto) => {
    if (!photo.child_id) {
      toast.error('Photo has no child tagged — tag a child first');
      return;
    }
    const draft = photo.sonnet_draft;
    // Tier 1a — closest_existing_match similarity ≥ 0.8
    const match = draft?.closest_existing_match;
    const sim = typeof match?.similarity === 'number' ? match.similarity : 0;
    if (match?.work_name && sim >= 0.8) {
      const resolved = findWorkByName(match.work_name, draft?.suggested_area);
      if (resolved) {
        console.log(`[ThisIsSheet] Tier 1a auto-attach: "${match.work_name}" ${Math.round(sim * 100)}% — skipping sheet`);
        attachToExistingWork(photo, resolved.work, resolved.areaKey);
        return;
      }
    }
    // Tier 1b — Sonnet's proposed_name already IS an existing curriculum work
    // (confidence ≥ 0.8). This catches the case where closest_existing_match
    // points at a stale Haiku guess but Sonnet renamed the photo to a real work.
    const proposed = draft?.proposed_name?.trim();
    const draftConf = typeof draft?.confidence === 'number' ? draft.confidence : 0;
    if (proposed && draftConf >= 0.8) {
      const resolvedProposed = findWorkByName(proposed, draft?.suggested_area);
      if (resolvedProposed) {
        console.log(`[ThisIsSheet] Tier 1b auto-attach via proposed_name: "${proposed}" ${Math.round(draftConf * 100)}% — skipping sheet`);
        attachToExistingWork(photo, resolvedProposed.work, resolvedProposed.areaKey);
        return;
      }
    }
    setThisIsPhoto(photo);
  };

  // Unified resolver — called by ThisIsSheet with a {type, ...} resolution.
  // Posts to /api/montree/photo-audit/resolve and removes the photo from the grid on success.
  const handleResolvePhoto = async (photo: AuditPhoto, resolution: ThisIsResolution) => {
    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/photo-audit/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: photo.id, resolution }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json?.error || 'resolve failed');
      }
      // Remove from grid
      const removedZone = photo.zone || 'untagged';
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setCounts(prev => ({
        ...prev,
        ...(removedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
        ...(removedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(removedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(removedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
      const label =
        resolution.type === 'new_custom'
          ? `✨ Added "${resolution.name}" to curriculum`
          : resolution.type === 'confirm_ai'
            ? `✅ Confirmed "${resolution.work_name}"`
            : `🔗 Matched to "${resolution.work_name}"`;
      toast.success(label);
      setThisIsPhoto(null);
      // Refresh curriculum cache so new custom works appear in the Fix picker immediately
      if (resolution.type === 'new_custom') {
        fetchCurriculum();
      }
      // Auto-set "practicing" — teacher photographed the child doing this work
      const workName = resolution.type === 'new_custom' ? resolution.name : resolution.work_name;
      if (photo.child_id && workName) {
        montreeApi('/api/montree/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: photo.child_id,
            work_name: workName,
            status: 'practicing',
            no_downgrade: true,
          }),
        }).catch(err => console.error('[ResolvePhoto] Auto-practicing failed (non-fatal):', err));
      }
    } catch (err) {
      console.error('[ResolvePhoto] Failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to resolve');
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
      // Fix = teacher told us the correct answer. Photo is done — remove from queue.
      // (Previously kept photo in place for Teach/Correct, but that was a confusing extra step.)
      const removedZone = correctingPhoto.zone || 'untagged';
      setPhotos(prev => prev.filter(p => p.id !== correctingPhoto.id));
      setCounts(prev => ({
        ...prev,
        ...(removedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
        ...(removedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
        ...(removedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
        ...(removedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
      }));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(correctingPhoto.id); return next; });
      toast.success(`🔧 Fixed → "${work.name}"`);
      // Auto-set "practicing" — teacher photographed the child doing this work
      if (correctingPhoto.child_id && work.name) {
        montreeApi('/api/montree/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: correctingPhoto.child_id,
            work_name: work.name,
            work_id: work.id,
            area: effectiveArea,
            status: 'practicing',
            no_downgrade: true,
          }),
        }).catch(err => console.error('[Fix] Auto-practicing failed (non-fatal):', err));
      }
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
        // Remove confirmed photo from list
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        const oldZone = photo.zone || 'amber';
        setCounts(prev => ({
          ...prev,
          ...(oldZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
          ...(oldZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
          ...(oldZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
        }));
      } catch {
        failed.push(ids[i]);
      }
      setBatchProgress({ current: i + 1, total: ids.length });
      // Rate limit: 2500ms delay = 24/min (under corrections 30/min limit)
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 2500));
    }
    setBatchProcessing(false);
    setSelectedIds(new Set(failed));
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

  // ================================================================
  // RUN HAIKU — Batch classify selected photos via Haiku two-pass pipeline
  // ================================================================
  const handleRunHaiku = async () => {
    const ids = Array.from(selectedIds);
    const photosToProcess = ids
      .map(id => photos.find(p => p.id === id))
      .filter((p): p is AuditPhoto => !!p && !!p.child_id);

    if (photosToProcess.length === 0) {
      toast.error('Select photos with a child assigned');
      return;
    }

    setHaikusRunning(true);
    setHaikuProgress({ current: 0, total: photosToProcess.length });
    haikuCancelledRef.current = false;

    // Mark all selected as loading
    const loadingResults: Record<string, any> = {};
    photosToProcess.forEach(p => {
      loadingResults[p.id] = { work_name: null, work_id: null, area: null, confidence: null, scenario: null, visual_description: null, model_used: null, loading: true, error: null };
    });
    setRerunResults(prev => ({ ...prev, ...loadingResults }));

    let classified = 0;
    let failed = 0;
    let completed = 0;

    // Process a single photo — returns true if classified, false if failed/unmatched
    const processOnePhoto = async (photo: AuditPhoto): Promise<boolean> => {
      try {
        const res = await fetch('/api/montree/guru/photo-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            media_id: photo.id,
            child_id: photo.child_id,
            force_reanalyze: true,
          }),
        });

        if (res.status === 429) {
          // Rate limited — wait 5s and retry once
          await new Promise(r => setTimeout(r, 5000));
          const retry = await fetch('/api/montree/guru/photo-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ media_id: photo.id, child_id: photo.child_id, force_reanalyze: true }),
          });
          if (!retry.ok) {
            setRerunResults(prev => ({ ...prev, [photo.id]: { ...prev[photo.id], loading: false, error: 'Rate limited' } }));
            return false;
          }
          const retryData = await retry.json();
          setRerunResults(prev => ({
            ...prev,
            [photo.id]: {
              work_name: retryData.work_name || null,
              work_id: retryData.classroom_work_id || null,
              area: retryData.area || null,
              confidence: retryData.confidence ?? null,
              scenario: retryData.scenario || null,
              visual_description: retryData.visual_description || null,
              model_used: retryData.model_used || null,
              loading: false,
              error: null,
            },
          }));
          return !!retryData.work_name;
        } else if (!res.ok) {
          let errVisualDesc = null;
          let errMsg = `Error ${res.status}`;
          try {
            const errData = await res.json();
            errVisualDesc = errData.visual_description || null;
            if (errData.error) errMsg = errData.error;
          } catch { /* non-JSON response */ }
          setRerunResults(prev => ({
            ...prev,
            [photo.id]: { ...prev[photo.id], loading: false, error: errMsg, visual_description: errVisualDesc },
          }));
          return false;
        } else {
          const data = await res.json();
          setRerunResults(prev => ({
            ...prev,
            [photo.id]: {
              work_name: data.work_name || null,
              work_id: data.classroom_work_id || null,
              area: data.area || null,
              confidence: data.confidence ?? null,
              scenario: data.scenario || null,
              visual_description: data.visual_description || null,
              model_used: data.model_used || null,
              loading: false,
              error: null,
            },
          }));
          return !!data.work_name;
        }
      } catch (err: any) {
        console.error(`[Haiku] Error for ${photo.id}:`, err);
        setRerunResults(prev => ({ ...prev, [photo.id]: { ...prev[photo.id], loading: false, error: 'Network error' } }));
        if (err instanceof TypeError && err.message.includes('fetch')) {
          throw err; // Re-throw connection errors to stop the batch
        }
        return false;
      }
    };

    // Process in parallel batches of 3 with 500ms delay between batches
    const BATCH_SIZE = 3;
    const BATCH_DELAY_MS = 500;
    let connectionLost = false;

    for (let i = 0; i < photosToProcess.length; i += BATCH_SIZE) {
      if (haikuCancelledRef.current || connectionLost) {
        // Mark remaining as cancelled
        for (let j = i; j < photosToProcess.length; j++) {
          setRerunResults(prev => ({
            ...prev,
            [photosToProcess[j].id]: { ...prev[photosToProcess[j].id], loading: false, error: connectionLost ? 'Connection lost' : 'Cancelled' },
          }));
        }
        if (!connectionLost) toast.info(`Haiku cancelled after ${completed} of ${photosToProcess.length}`);
        break;
      }

      const batch = photosToProcess.slice(i, i + BATCH_SIZE);
      setHaikuProgress({ current: Math.min(i + BATCH_SIZE, photosToProcess.length), total: photosToProcess.length });

      try {
        const results = await Promise.allSettled(batch.map(p => processOnePhoto(p)));
        for (const r of results) {
          completed++;
          if (r.status === 'fulfilled') {
            if (r.value) classified++; else failed++;
          } else {
            failed++;
            // Check if it was a connection error
            if (r.reason instanceof TypeError && r.reason.message.includes('fetch')) {
              connectionLost = true;
              toast.error('Connection lost');
            }
          }
        }
      } catch (err) {
        // Shouldn't reach here due to allSettled, but safety net
        connectionLost = true;
        toast.error('Connection lost');
      }

      // Short delay between batches (500ms instead of 3s)
      if (i + BATCH_SIZE < photosToProcess.length && !haikuCancelledRef.current && !connectionLost) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    setHaikusRunning(false);
    setSelectedIds(new Set());
    toast.success(`Haiku done: ${classified} classified, ${failed} unmatched`);
  };

  // Accept a Haiku rerun result — apply the match as a correction
  const handleAcceptResult = async (photo: AuditPhoto) => {
    const result = rerunResults[photo.id];
    if (!result || !result.work_name || !result.work_id) return;

    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: photo.id,
          child_id: photo.child_id,
          original_work_name: photo.work_name || 'Unknown',
          original_work_id: photo.work_id || '',
          original_area: photo.area || '',
          original_confidence: photo.confidence || 0,
          corrected_work_name: result.work_name,
          corrected_work_id: result.work_id,
          corrected_area: result.area || 'practical_life',
        }),
      });
      if (!res.ok) throw new Error('correction failed');

      // Update photo locally with the new work info (keep in place for Teach/Correct)
      setPhotos(prev => prev.map(p =>
        p.id === photo.id
          ? { ...p, work_id: result.work_id!, work_name: result.work_name!, area: result.area }
          : p
      ));
      // Clear the rerun result for this photo
      setRerunResults(prev => {
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });
      toast.success(`Applied: ${result.work_name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply');
    } finally {
      setProcessingId(null);
    }
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

  // Filter photos by zone — 'all' shows everything needing review (non-green)
  const filteredPhotos = useMemo(() => {
    if (zone === 'works_review' || zone === 'parent_reports' || zone === 'weekly_admin' || zone === 'pending_review') return []; // Non-photo tabs handled separately
    if (zone === 'today_all') return photos; // Show every photo in last 24h incl. confirmed
    if (zone === 'green') return photos.filter(p => p.zone === 'green');
    const nonGreen = photos.filter(p => p.zone !== 'green');
    if (zone === 'all') return nonGreen;
    return nonGreen.filter(p => p.zone === zone);
  }, [photos, zone]);

  // Paginate
  const PAGE_SIZE = 24;
  const pagedPhotos = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPhotos.slice(start, start + PAGE_SIZE);
  }, [filteredPhotos, page]);
  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);

  // Reset page on zone change
  useEffect(() => {
    setPage(0);
  }, [zone]);

  const isPhotoZone = zone === 'all' || zone === 'green' || zone === 'today_all';

  // 6-tab layout: Photo Bucket (pre-AI triage, feature-gated) + Confirm (needs review)
  // + Today (All) + Works Review + Parent Reports + Weekly Admin.
  // Everything lives in one Photo Audit surface — teachers flow from photo
  // triage → confirmation → weekly review → parent reports → admin docs.
  const ZONE_TABS: { key: Zone; label: string; color: string; count: number | null }[] = [
    ...(reviewBeforeProcess ? [{ key: 'pending_review' as Zone, label: locale === 'zh' ? '照片桶' : 'Photo Bucket', color: 'bg-amber-100 text-amber-800', count: null }] : []),
    { key: 'all', label: locale === 'zh' ? '确认' : 'Confirm', color: 'bg-amber-100 text-amber-700', count: nonGreenCount > 0 ? nonGreenCount : null },
    { key: 'today_all', label: locale === 'zh' ? '今日全部' : 'Today (All)', color: 'bg-emerald-100 text-emerald-800', count: null },
    { key: 'works_review', label: locale === 'zh' ? '教学回顾' : 'Works Review', color: 'bg-blue-100 text-blue-800', count: null },
    { key: 'parent_reports', label: locale === 'zh' ? '家长报告' : 'Parent Reports', color: 'bg-violet-100 text-violet-800', count: null },
    { key: 'weekly_admin', label: locale === 'zh' ? '周报文档' : 'Weekly Admin', color: 'bg-indigo-100 text-indigo-800', count: null },
  ];

  // ─── JSX ───
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{locale === 'zh' ? '照片审核' : 'Photo Audit'}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncQueue}
              disabled={syncingQueue}
              title={locale === 'zh'
                ? '同步今天的照片(如果本地队列中有未上传的照片,点击此处推送到服务器)'
                : "Sync today's photos (push any photos stuck in the local queue up to the server)"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium border transition-all ${
                syncingQueue
                  ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-wait'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              <svg
                className={`w-4 h-4 ${syncingQueue ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.65-3.65L20 7M20 15a9 9 0 01-14.65 3.65L4 17"
                />
              </svg>
              <span>{syncingQueue ? (locale === 'zh' ? '同步中...' : 'Syncing...') : (locale === 'zh' ? '同步' : 'Sync')}</span>
            </button>
            {isPhotoZone && (
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as DateRange)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="7d">{t('audit.last7d')}</option>
                <option value="30d">{t('audit.last30d')}</option>
                <option value="all">{t('audit.allTime')}</option>
              </select>
            )}
          </div>
        </div>

        {/* Smart Learning progress bar — only on photo review */}
        {isPhotoZone && smartLearningStats && smartLearningStats.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-[#A1887F] mb-0.5">
              <span>🧠 {t('audit.smartLearning')}</span>
              <span>{smartLearningStats.described}/{smartLearningStats.total} ({Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-amber-500 rounded-full h-1.5 transition-all duration-500"
                style={{ width: `${Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 4 tabs — same line, same style */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {ZONE_TABS.map((tab) => {
            const isActive = zone === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setZone(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? tab.color + ' ring-2 ring-offset-1 ring-current' : 'bg-[#F5E6D3]/40 text-[#A1887F] hover:text-gray-600'
                }`}
              >
                {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Reclassify progress bar (shown during batch processing) */}
        {reclassifying && (
          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span className="font-medium">
                {t('audit.reclassifyProgress') || 'Reclassifying'} {reclassifyProgress.current}/{reclassifyProgress.total}...
              </span>
              <button
                onClick={() => { reclassifyCancelledRef.current = true; }}
                className="px-2 py-0.5 rounded text-xs bg-white text-gray-600 border hover:bg-[#F5E6D3]"
              >
                {t('audit.reclassifyCancel') || 'Cancel'}
              </button>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2">
              <div
                className="bg-amber-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${reclassifyProgress.total > 0 ? Math.round((reclassifyProgress.current / reclassifyProgress.total) * 100) : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mt-1 text-[10px] text-[#A1887F]">
              <span className="text-emerald-600">{reclassifyProgress.green} identified</span>
              <span className="text-amber-600">{reclassifyProgress.amber} review</span>
              <span className="text-red-600">{reclassifyProgress.red} unknown</span>
              {reclassifyProgress.custom > 0 && <span className="text-blue-600">{reclassifyProgress.custom} custom</span>}
              {reclassifyProgress.errors > 0 && <span className="text-[#A1887F]">{reclassifyProgress.errors} errors</span>}
            </div>
          </div>
        )}
      </div>

      {/* ─── Photo Bucket (review-before-process workflow) ─── */}
      {zone === 'pending_review' && (
        <div className="p-3 sm:p-4">
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h2 className="text-sm font-semibold text-amber-900 mb-1">
              {locale === 'zh' ? '选择要保留的照片' : 'Select the photos you want to keep'}
            </h2>
            <p className="text-xs text-amber-700 leading-relaxed">
              {locale === 'zh'
                ? '照片按拍摄顺序排列,尚未经过 AI 分析。选择您想保留的照片,然后点击"分析并分类"让 AI 为您识别。不需要的照片可以选中后删除。'
                : 'Photos are listed in the order they were taken — no AI has run on them yet. Select the ones you want to keep, then tap "Process selected" to run the AI. Delete the rest.'}
            </p>
          </div>
          <PendingReviewPanel />
        </div>
      )}

      {/* ─── Works Review (Teacher Review from WeeklyWrapTab) ─── */}
      {zone === 'works_review' && classroomIdState && (
        <WeeklyWrapTab
          classroomId={classroomIdState}
          view="teacher"
        />
      )}

      {/* ─── Parent Reports (from WeeklyWrapTab) ─── */}
      {zone === 'parent_reports' && classroomIdState && (
        <WeeklyWrapTab
          classroomId={classroomIdState}
          view="parents"
        />
      )}

      {/* ─── Weekly Admin Docs (Summary + Plan DOCX generation) ─── */}
      {zone === 'weekly_admin' && classroomIdState && (
        <WeeklyAdminTab
          classroomId={classroomIdState}
        />
      )}

      {/* Loading state */}
      {isPhotoZone && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {isPhotoZone && !loading && filteredPhotos.length === 0 && (
        <div className="text-center py-20 text-[#A1887F]">
          <p className="text-4xl mb-2">📷</p>
          <p>{t('audit.noPhotos')}</p>
        </div>
      )}

      {/* Photo grid */}
      {isPhotoZone && !loading && filteredPhotos.length > 0 && (
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
              onMarkAsPaperwork={() => handleMarkAsPaperwork(photo)}
              rerunResult={rerunResults[photo.id] || null}
              onAcceptResult={() => handleAcceptResult(photo)}
              onAcceptDraft={() => openThisIsSheet(photo)}
              onTellAI={() => setTellAiPhoto(photo)}
              onPhotoTap={() => photo.url && setLightboxUrl(photo.url)}
              onSaveNote={(caption) => handleSaveNote(photo.id, caption)}
              processing={processingId === photo.id}
              workStatus={workStatuses[`${photo.child_id}:${photo.work_name}`] || null}
              onSetStatus={(status) => handleSetStatus(photo, status)}
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
          <span className="text-sm text-[#A1887F]">
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

      {/* Floating action bar (photo audit only) */}
      {isPhotoZone && filteredPhotos.length > 0 && !loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
          {selectedIds.size === 0 ? (
            /* No selection — just Select All */
            <div className="flex items-center justify-center">
              <button
                onClick={selectAllVisible}
                className="px-4 py-1.5 text-sm rounded border text-gray-600"
              >
                {t('audit.selectAll')} ({filteredPhotos.length})
              </button>
            </div>
          ) : (
            /* Photos selected — show action buttons */
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-[#A1887F] mr-1">{selectedIds.size} selected</span>
              <button
                onClick={handleRunHaiku}
                disabled={haikusRunning || batchProcessing}
                className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50"
              >
                {haikusRunning ? (
                  <span className="flex items-center gap-1.5">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Haiku {haikuProgress.current}/{haikuProgress.total}
                  </span>
                ) : '🤖 Run Haiku'}
              </button>
              <button
                onClick={handleBatchConfirm}
                disabled={haikusRunning || batchProcessing}
                className="px-4 py-1.5 text-sm rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
              >
                {batchProcessing ? `Confirming...` : `✓ Batch Confirm`}
              </button>
              {haikusRunning && (
                <button
                  onClick={() => { haikuCancelledRef.current = true; }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[#D4C5B0] text-gray-600"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm rounded-lg border border-[#D4C5B0] text-[#A1887F]"
              >
                Deselect
              </button>
            </div>
          )}
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-200 transition-colors border border-gray-200"
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

      {/* "This is..." sheet — one button, three resolution paths */}
      {thisIsPhoto && (
        <ThisIsSheet
          isOpen={true}
          onClose={() => setThisIsPhoto(null)}
          photo={{
            id: thisIsPhoto.id,
            url: thisIsPhoto.url,
            current_work_id: thisIsPhoto.work_id || null,
            current_work_name: thisIsPhoto.work_name || null,
            current_area: thisIsPhoto.area || null,
            sonnet_draft: thisIsPhoto.sonnet_draft || null,
          } as ThisIsSheetPhoto}
          classroomId={classroomIdState || null}
          submitting={processingId === thisIsPhoto.id}
          onResolve={(resolution) => handleResolvePhoto(thisIsPhoto, resolution)}
        />
      )}

      {/* Photo lightbox — tap any photo to see it full-size */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light z-10"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            decoding="async"
          />
        </div>
      )}

      {/* "Tell the AI what it is" sheet — teacher freeform context → Sonnet proposal → save as new custom work */}
      {tellAiPhoto && (
        <TellAiSheet
          photo={{
            id: tellAiPhoto.id,
            url: tellAiPhoto.url,
            child_name: tellAiPhoto.child_name,
          }}
          onClose={() => setTellAiPhoto(null)}
          onSaved={(photoId) => {
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            setTellAiPhoto(null);
          }}
        />
      )}

      {/* Crop choice modal — "Use Full Photo" vs "Crop to Work" */}
      {cropChoicePhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCropChoicePhoto(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">🧠 {t('audit.teachAI')}</h3>
            <p className="text-sm text-[#A1887F] mb-4">{cropChoicePhoto.work_name}</p>

            {cropChoicePhoto.url && (
              <img src={cropChoicePhoto.url} alt={cropChoicePhoto.work_name || ''}
                loading="lazy" decoding="async"
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
                className="w-full py-3 rounded-lg border border-[#D4C5B0] text-gray-800 font-medium text-sm"
              >
                🖼️ {t('audit.useFullPhoto')}
              </button>
              <button
                onClick={() => setCropChoicePhoto(null)}
                className="w-full py-2 text-sm text-[#A1887F]"
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
            <p className="text-xs text-[#A1887F] mb-3 truncate">{taggingPhoto.work_name || t('audit.untaggedWork')}</p>

            {/* Thumbnail */}
            {taggingPhoto.url && (
              <img src={taggingPhoto.url} alt="" loading="lazy" decoding="async" className="w-full h-28 object-cover rounded-lg mb-3" />
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
                      checked ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#D4C5B0]'
                    }`}>
                      {checked && '✓'}
                    </span>
                    <span className="text-sm font-medium">{child.name}</span>
                  </button>
                );
              })}
              {classroomChildren.length === 0 && (
                <p className="text-sm text-[#A1887F] text-center py-4">{t('common.loading')}</p>
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
            <p className="text-sm text-[#A1887F] mb-2">{describingPhoto.work_name}</p>

            {/* Photo preview — show crop if available, else original */}
            {(croppedReferenceUrl || describingPhoto.url) && (
              <img src={croppedReferenceUrl || describingPhoto.url || ''} alt={describingPhoto.work_name || ''}
                loading="lazy" decoding="async"
                className="w-full h-40 object-cover rounded-lg mb-3" />
            )}

            {describeLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="ml-3 text-sm text-[#A1887F]">{t('audit.describing')}</span>
              </div>
            )}

            {describeResult && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#A1887F] uppercase">{t('audit.visualDescription')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.visual_description}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#A1887F] uppercase">{t('audit.parentDescription')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.parent_description}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#A1887F] uppercase">{t('audit.whyItMatters')}</label>
                  <p className="text-sm mt-0.5 bg-gray-50 rounded p-2">{describeResult.why_it_matters}</p>
                </div>
                {describeResult.key_materials.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-[#A1887F] uppercase">{t('audit.keyMaterials')}</label>
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
                className="w-full py-2 text-sm text-[#A1887F] mt-4">
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
function AuditPhotoCard({ photo, selected, onToggle, onConfirm, onCorrect, onUseAsReference, onTagChildren, onDelete, onMarkAsPaperwork, rerunResult, onAcceptResult, onAcceptDraft, onTellAI, onPhotoTap, onSaveNote, processing, workStatus, onSetStatus, t }: {
  photo: AuditPhoto;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
  onUseAsReference: () => void;
  onTagChildren: () => void;
  onDelete: () => void;
  onMarkAsPaperwork: () => void;
  rerunResult: { work_name: string | null; work_id: string | null; area: string | null; confidence: number | null; scenario: string | null; visual_description: string | null; model_used: string | null; loading: boolean; error: string | null } | null;
  onAcceptResult: () => void;
  onAcceptDraft: () => void;
  onTellAI: () => void;
  onPhotoTap: () => void;
  onSaveNote: (caption: string) => void;
  processing: boolean;
  workStatus: string | null;
  onSetStatus: (status: 'presented' | 'practicing' | 'mastered') => void;
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
    untagged: 'border-[#D4C5B0]',
  };

  const zoneBadge: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    untagged: 'bg-gray-400',
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 ${
        selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      } ${zoneColors[photo.zone] || 'border-gray-200'}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 320px' }}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded border-2 bg-white/80 flex items-center justify-center"
      >
        {selected && <span className="text-blue-600 text-sm font-bold">✓</span>}
      </button>

      {/* Zone badge */}
      <div className={`absolute top-1.5 right-1.5 z-10 w-3 h-3 rounded-full ${zoneBadge[photo.zone]}`} />

      {/* Confirmed overlay — shown in "Today (All)" view so teachers can spot
          already-resolved photos at a glance while scanning the day's captures. */}
      {photo.teacher_confirmed === true && (
        <div className="absolute top-1.5 left-9 z-10 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold shadow">
          ✓ CONFIRMED
        </div>
      )}

      {/* Photo — tap to view full size */}
      <div className="aspect-square bg-gray-200 cursor-pointer" onClick={onPhotoTap}>
        {photo.url ? (
          <img
            src={photo.thumbnail_path ? getThumbnailUrl(photo.thumbnail_path, 240) : photo.url}
            srcSet={photo.thumbnail_path ? getThumbnailSrcSet(photo.thumbnail_path, 240) : undefined}
            sizes="(max-width: 640px) 33vw, 240px"
            alt={photo.work_name || 'Photo'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
        )}
      </div>

      {/* Sonnet draft — rich AI proposal for unidentified photos */}
      {photo.sonnet_draft && photo.identification_status === 'sonnet_drafted' && (
        <div className="p-2 bg-violet-50 border-t-2 border-violet-300">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wide">✨ AI Draft</span>
            {typeof photo.sonnet_draft.confidence === 'number' && (
              <span className="text-[9px] text-violet-500">· {Math.round(photo.sonnet_draft.confidence * 100)}%</span>
            )}
          </div>
          {photo.sonnet_draft.proposed_name && (
            <p className="text-[11px] font-bold text-violet-900 leading-tight">{photo.sonnet_draft.proposed_name}</p>
          )}
          {photo.sonnet_draft.suggested_area && (
            <p className="text-[9px] text-violet-600 capitalize">{photo.sonnet_draft.suggested_area.replace(/_/g, ' ')}</p>
          )}
          {photo.sonnet_draft.visual_description && (
            <p className="text-[9px] text-violet-700 leading-snug mt-1 line-clamp-3">{photo.sonnet_draft.visual_description}</p>
          )}
          {photo.sonnet_draft.key_materials && photo.sonnet_draft.key_materials.length > 0 && (
            <p className="text-[9px] text-violet-600 mt-1"><span className="font-semibold">Materials:</span> {photo.sonnet_draft.key_materials.slice(0, 4).join(', ')}</p>
          )}
          {photo.sonnet_draft.parent_description && (
            <p className="text-[9px] text-violet-700 leading-snug mt-1 line-clamp-3 italic">"{photo.sonnet_draft.parent_description}"</p>
          )}
          {photo.sonnet_draft.why_it_matters && (
            <p className="text-[9px] text-violet-600 leading-snug mt-1 line-clamp-2"><span className="font-semibold">Why:</span> {photo.sonnet_draft.why_it_matters}</p>
          )}
          {photo.sonnet_draft.closest_existing_match?.work_name && (
            <p className="text-[9px] text-amber-700 mt-1">
              ≈ Similar to <span className="font-semibold">{photo.sonnet_draft.closest_existing_match.work_name}</span>
              {typeof photo.sonnet_draft.closest_existing_match.similarity === 'number' && (
                <span className="text-amber-500"> ({Math.round(photo.sonnet_draft.closest_existing_match.similarity * 100)}%)</span>
              )}
            </p>
          )}
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={onAcceptDraft}
              disabled={processing}
              className="flex-1 text-[11px] py-1.5 rounded bg-violet-600 text-white font-bold disabled:opacity-50"
              title="Review, edit, and add this draft to your curriculum"
            >
              {processing ? '...' : '✅ Accept'}
            </button>
            <button
              onClick={onCorrect}
              disabled={processing}
              className="flex-1 text-[11px] py-1.5 rounded bg-white border border-violet-400 text-violet-700 font-bold disabled:opacity-50"
              title="Pick a different work from your curriculum"
            >
              ✏️ Fix
            </button>
          </div>
          <button
            onClick={onTellAI}
            disabled={processing}
            className="w-full text-[10px] py-1.5 mt-1 rounded bg-white border border-violet-200 text-violet-600 font-medium disabled:opacity-50 hover:bg-violet-50 transition-colors"
            title="Describe this work in your own words"
          >
            🗣️ Tell AI what it is
          </button>
        </div>
      )}

      {/* Haiku auto-match banner — Gate A silently tagged this photo without
          Sonnet review. Rendered as a distinct amber card so teachers can
          spot + verify auto-tags instead of eye-passing them as confirmed. */}
      {photo.identification_status === 'haiku_matched' && photo.work_name && (
        <div className="p-2 bg-amber-50 border-t-2 border-amber-300">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">🤖 Haiku Auto-Match</span>
            {typeof photo.identification_confidence === 'number' && (
              <span className="text-[9px] text-amber-600">· {Math.round(photo.identification_confidence * 100)}%</span>
            )}
          </div>
          <p className="text-[11px] font-bold text-amber-900 leading-tight">{photo.work_name}</p>
          <p className="text-[9px] text-amber-700 mt-0.5 italic">Auto-tagged by AI — please verify before confirming.</p>
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 text-[11px] py-1.5 rounded bg-amber-600 text-white font-bold disabled:opacity-50"
              title="Confirm this auto-match is correct"
            >
              {processing ? '...' : '✅ Confirm'}
            </button>
            <button
              onClick={onCorrect}
              disabled={processing}
              className="flex-1 text-[11px] py-1.5 rounded bg-white border border-amber-400 text-amber-700 font-bold disabled:opacity-50"
              title="Pick the correct work"
            >
              ✏️ Fix
            </button>
          </div>
          <button
            onClick={onTellAI}
            disabled={processing}
            className="w-full text-[10px] py-1.5 mt-1 rounded bg-white border border-amber-200 text-amber-600 font-medium disabled:opacity-50 hover:bg-amber-50 transition-colors"
            title="Describe this work in your own words"
          >
            🗣️ Tell AI what it is
          </button>
        </div>
      )}

      {/* Info + actions */}
      <div className="p-2 bg-white">
        <p className="text-xs font-medium truncate">{photo.work_name || t('audit.untaggedWork')}</p>
        {/* Multi-child display with tag button */}
        <button
          onClick={onTagChildren}
          className="flex items-center gap-1 mt-0.5 text-[10px] text-[#A1887F] hover:text-blue-600 transition-colors group w-full text-left"
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
          <p className="text-[10px] text-[#A1887F]">
            {Math.round(photo.confidence * 100)}%
          </p>
        )}
        {/* Re-run classification result display */}
        {rerunResult && !rerunResult.loading && !rerunResult.error && (
          <div className="mt-1 p-1.5 rounded bg-indigo-50 border border-indigo-200">
            <p className="text-[9px] font-semibold text-indigo-600 mb-0.5">
              Haiku Result
              {rerunResult.model_used && <span className="font-normal text-indigo-400 ml-1">({rerunResult.model_used.includes('haiku') ? 'Haiku' : 'Sonnet'})</span>}
            </p>
            {/* Pass 1: What Haiku "sees" — visual description */}
            {rerunResult.visual_description && (
              <div className="mb-1.5 p-1 rounded bg-violet-50 border border-violet-200/50">
                <p className="text-[8px] font-semibold text-violet-500 mb-0.5">👁 Pass 1 — What AI Sees:</p>
                <p className="text-[9px] text-violet-700 leading-snug">{rerunResult.visual_description}</p>
              </div>
            )}
            {/* Pass 2: Match result */}
            {rerunResult.work_name ? (
              <>
                <p className="text-[10px] font-medium text-indigo-800 truncate">{rerunResult.work_name}</p>
                <p className="text-[9px] text-indigo-500">
                  {rerunResult.area && <span className="capitalize">{rerunResult.area.replace(/_/g, ' ')}</span>}
                  {rerunResult.confidence !== null && <span> · {Math.round(rerunResult.confidence * 100)}%</span>}
                </p>
                {rerunResult.work_id && (
                  <button
                    onClick={onAcceptResult}
                    disabled={processing}
                    className="mt-1 w-full text-[10px] py-1 rounded bg-indigo-600 text-white font-medium disabled:opacity-50"
                  >
                    {processing ? '...' : '✓ Accept this match'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-[10px] text-indigo-500 italic">
                No match found
                {rerunResult.confidence !== null && ` (${Math.round(rerunResult.confidence * 100)}%)`}
                {rerunResult.scenario && <span className="block text-[8px] text-indigo-400 mt-0.5">scenario: {rerunResult.scenario}</span>}
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
            {/* In test mode, show Pass 1 description even when matching failed */}
            {rerunResult.visual_description && (
              <div className="mt-1 p-1 rounded bg-violet-50 border border-violet-200/50">
                <p className="text-[8px] font-semibold text-violet-500 mb-0.5">👁 Pass 1 — What AI Sees:</p>
                <p className="text-[9px] text-violet-700 leading-snug">{rerunResult.visual_description}</p>
              </div>
            )}
          </div>
        )}
        {/* Work status: P/Pr/M buttons hidden — status auto-set to "practicing" on confirm.
            Kept in code for reinstatement if needed. See handleSetStatus + progressMap. */}
        {/* For plain cards (no AI section): show Fix + Tell AI as full-width row */}
        {!photo.sonnet_draft && photo.identification_status !== 'haiku_matched' && (
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={onCorrect}
              disabled={processing}
              className="flex-1 text-[10px] py-1.5 rounded bg-gray-200 text-gray-600 font-medium disabled:opacity-50"
            >
              ✏️ {t('audit.fix')}
            </button>
            <button
              onClick={onTellAI}
              disabled={processing}
              className="flex-1 text-[10px] py-1.5 rounded bg-violet-50 text-violet-600 font-medium disabled:opacity-50"
            >
              🗣️ Tell AI what it is
            </button>
          </div>
        )}
        {/* Utility actions — Confirm and Teach hidden (auto-handled on resolve/fix).
            Kept in code for reinstatement. Only delete remains visible. */}
        <div className="flex gap-1 mt-1 justify-end">
          <button
            onClick={onMarkAsPaperwork}
            disabled={processing}
            className="text-[10px] py-1 px-1.5 rounded bg-amber-50 text-amber-600 font-medium disabled:opacity-50"
            title="Mark as paperwork page — AI will read the week number"
          >
            📋
          </button>
          <button
            onClick={onDelete}
            disabled={processing}
            className="text-[10px] py-1 px-1.5 rounded bg-red-50 text-red-500 font-medium disabled:opacity-50"
            title={t('audit.deletePhoto')}
          >
            🗑️
          </button>
        </div>
        {/* Teacher note — always at the very bottom */}
        <div className="mt-1.5 relative">
          <div className="absolute -top-0.5 right-1 z-10">
            <VoiceDictate
              size="sm"
              onAppend={(text) => handleNoteChange(noteText ? noteText + ' ' + text : text)}
              onError={(msg) => toast.error(msg)}
            />
          </div>
          <textarea
            value={noteText}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder={t('audit.addNote')}
            className="w-full text-[10px] p-1.5 rounded border border-gray-200 bg-gray-50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-300"
            rows={2}
          />
          {noteSaving && <span className="absolute top-0.5 right-1 text-[8px] text-[#A1887F]">{t('audit.saving')}</span>}
          {noteSaved && !noteSaving && <span className="absolute top-0.5 right-1 text-[8px] text-emerald-500">✓</span>}
        </div>
      </div>
    </div>
  );
}
