// @ts-nocheck — audit page, will type-check incrementally
// NOTE (Sprint 3): PhotoInsightPopup NOT wired here — audit page already has its own
// per-photo correction UI (confirm/fix/teach/delete). The popup is per-child and this
// page is classroom-wide. If needed later, could render one popup per visible child.
'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { prefetchClassroomWorks } from '@/lib/montree/hooks/useClassroomWorks';
import { montreeApi } from '@/lib/montree/api';
import { invalidateEnglishWeekCache } from '@/lib/montree/cache';
import { offerEnglishAdvance } from '@/lib/montree/english-sequence/client-helper';
import { useFeaturesContext } from '@/lib/montree/features';
import type { Resolution as ThisIsResolution, ThisIsSheetPhoto } from '@/components/montree/photo-audit/ThisIsSheet';
import { getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';
import { drainStuckQueue } from '@/lib/montree/offline';

// Tier 3 perf: code-split heavy modals/tabs (~4k lines) — only downloaded when actually rendered.
// `loading` fallback prevents the blank-gap flash users saw while chunks downloaded.
// IMPORTANT: Turbopack requires next/dynamic options to be an INLINE object literal —
// hoisting them into a variable triggers "options must be an object literal" build errors.
// The fallback component reference IS allowed inside the literal; just keep the literal at the call site.
const DynamicLoading = () => (
  <div style={{
    minHeight: 220,
    display: 'grid',
    placeItems: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    letterSpacing: 0.3,
  }}>Loading…</div>
);
const WorkWheelPicker = dynamic(() => import('@/components/montree/WorkWheelPicker'), { ssr: false, loading: DynamicLoading });
const PhotoCropModal = dynamic(() => import('@/components/montree/media/PhotoCropModal'), { ssr: false, loading: DynamicLoading });
const WeeklyWrapTab = dynamic(() => import('@/components/montree/reports/WeeklyWrapTab'), { ssr: false, loading: DynamicLoading });
const WeeklyAdminTab = dynamic(() => import('@/components/montree/reports/WeeklyAdminTab'), { ssr: false, loading: DynamicLoading });
const ThisIsSheet = dynamic(() => import('@/components/montree/photo-audit/ThisIsSheet'), { ssr: false, loading: DynamicLoading });
const TellAiSheet = dynamic(() => import('@/components/montree/photo-audit/TellAiSheet'), { ssr: false, loading: DynamicLoading });
const VoiceDictate = dynamic(() => import('@/components/montree/voice/VoiceDictate'), { ssr: false, loading: DynamicLoading });

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
  identification_attempted_at?: string | null;
  teacher_confirmed?: boolean;
  discussion_flag?: boolean;
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
    /** AI's short reasoning / note (esp. on Other + failed states). */
    observation?: string;
    /** Marker for the "Other / not a curriculum work" classification. */
    is_other?: boolean;
    /** Top 3 fuzzy-match candidates (best-first). Powers the quick-tap chips. */
    top_candidates?: Array<{
      workName: string;
      workKey: string | null;
      area: string | null;
      score: number;
    }>;
  } | null;
}

type Zone = 'all' | 'green' | 'amber' | 'red' | 'untagged' | 'weekly_admin' | 'weekly_wrap' | 'discussion' | 'get_advice';
type DateRange = '24h' | '7d' | '30d' | 'all';

// A photo is "in-flight" (AI still identifying) when it has NOT reached any
// terminal identification result yet. Keyed on the RESULT — terminal status /
// work_id / sonnet_draft — NOT on identification_attempted_at: the background
// pipeline stamps attempted_at the moment it STARTS, so keying on it hid the
// entire 10-30s processing window behind a bare "Untagged" card that read like
// a failure. The 10-min recency cap lets a never-processed photo fall through
// to the Re-identify fallback instead of spinning "Identifying…" forever.
// SINGLE source of truth — used by BOTH the auto-refresh poll and the card
// render so the two can never drift apart (the drift was the original bug).
const TERMINAL_IDENT_STATUSES = new Set([
  'haiku_drafted', 'haiku_matched', 'sonnet_drafted', 'confirmed', 'failed', 'pending_review',
]);
const IN_FLIGHT_WINDOW_MS = 10 * 60 * 1000;
function isPhotoInFlight(
  photo: {
    identification_status?: string | null;
    work_id?: string | null;
    teacher_confirmed?: boolean;
    sonnet_draft?: unknown;
    captured_at?: string | null;
  },
  now: number,
): boolean {
  if (!now) return false; // clock not ready yet (nowTs starts at 0 on first paint)
  if (photo.work_id) return false;
  if (photo.teacher_confirmed) return false;
  if (photo.sonnet_draft) return false;
  if (photo.identification_status && TERMINAL_IDENT_STATUSES.has(photo.identification_status)) return false;
  if (!photo.captured_at) return false;
  return now - new Date(photo.captured_at).getTime() < IN_FLIGHT_WINDOW_MS;
}

// Animated hourglass for the "AI is identifying" state — the recognisable
// old-school sand timer so a processing photo clearly reads as WORKING, not
// broken/untagged. Self-contained SMIL animation (no global keyframes needed);
// iOS-Safari safe. Gold sand drains + the glass flips 180° like the real thing.
function ProcessingHourglass({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <g>
        {/* top + bottom caps */}
        <rect x="5.5" y="2.2" width="13" height="1.9" rx="0.95" fill="#5eead4" />
        <rect x="5.5" y="19.9" width="13" height="1.9" rx="0.95" fill="#5eead4" />
        {/* upper sand (draining) */}
        <path d="M7.4 4.1 H16.6 L12 12 Z" fill="#f5c96a" />
        {/* lower sand (filling) */}
        <path d="M12 12 L16.6 19.9 H7.4 Z" fill="rgba(245,201,106,0.4)" />
        {/* glass outline */}
        <path d="M7.4 4.1 H16.6 L12 12 L16.6 19.9 H7.4 L12 12 Z" fill="none" stroke="#99f6e4" strokeWidth="1.1" strokeLinejoin="round" />
        {/* falling sand stream */}
        <line x1="12" y1="11.4" x2="12" y2="16.6" stroke="#f5c96a" strokeWidth="1" strokeLinecap="round">
          <animate attributeName="opacity" values="0.15;1;0.15" dur="0.85s" repeatCount="indefinite" />
        </line>
        {/* flip like a real hourglass — rotate 180° with a hold at each end */}
        <animateTransform attributeName="transform" attributeType="XML" type="rotate"
          values="0 12 12; 0 12 12; 180 12 12; 180 12 12"
          keyTimes="0; 0.45; 0.55; 1" dur="2.2s" repeatCount="indefinite"
          calcMode="spline" keySplines="0 0 1 1; .4 0 .1 1; 0 0 1 1" />
      </g>
    </svg>
  );
}

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
      <div style={{ background: 'rgba(7,18,12,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 18, padding: 20, width: '100%', maxWidth: 380, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 14px', letterSpacing: -0.2 }}>
          {showAddForm ? (t('audit.addCustomWork') || 'Add Custom Work') : t('audit.pickArea')}
        </h3>

        {/* === INLINE ADD FORM === */}
        {showAddForm ? (
          <div className="overflow-y-auto flex-1 min-h-0 space-y-3">
            {/* Work name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' }}>{t('audit.workName') || 'Work Name'}</label>
              <input
                type="text"
                value={addWorkName}
                onChange={e => setAddWorkName(e.target.value)}
                maxLength={255}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>

            {/* Area selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' }}>{t('audit.area') || 'Area'}</label>
              <select
                value={addWorkArea}
                onChange={e => setAddWorkArea(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif", fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'right', marginTop: 3 }}>{addWorkDesc.length}/500</div>
            </div>

            {/* Preview results (editable) */}
            {showPreview && (
              <div style={{ border: '1px solid rgba(52,211,153,0.22)', borderRadius: 10, padding: 12, background: 'rgba(52,211,153,0.05)' }}>
                {previewLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: 8 }}>
                    <span className="animate-spin" style={{ fontSize: 16 }}>⏳</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('audit.generatingPreview') || 'Generating AI descriptions...'}</span>
                  </div>
                ) : previewData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{t('audit.previewDescription') || 'Description:'}</span>
                      <p style={{ color: 'rgba(255,255,255,0.80)', marginTop: 2, margin: '2px 0 0' }}>{previewData.description}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{t('audit.previewParent') || 'For parents:'}</span>
                      <p style={{ color: 'rgba(255,255,255,0.80)', margin: '2px 0 0' }}>{previewData.parent_description}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{t('audit.previewWhyMatters') || 'Why it matters:'}</span>
                      <p style={{ color: 'rgba(255,255,255,0.80)', margin: '2px 0 0' }}>{previewData.why_it_matters}</p>
                    </div>
                    {previewData.materials?.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{t('audit.previewMaterials') || 'Materials:'}</span>
                        <p style={{ color: 'rgba(255,255,255,0.80)', margin: '2px 0 0' }}>{previewData.materials.join(', ')}</p>
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
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontSize: 13, fontWeight: 600, cursor: !addWorkName.trim() || addSaving ? 'not-allowed' : 'pointer', opacity: !addWorkName.trim() || addSaving ? 0.5 : 1 }}
              >
                {addSaving ? (t('common.saving') || 'Saving...') : (previewData ? (t('audit.saveWithDescriptions') || 'Save with these descriptions') : (t('common.save') || 'Save'))}
              </button>
              {!showPreview && (
                <button
                  onClick={handlePreview}
                  disabled={!addWorkName.trim() || previewLoading || addSaving}
                  style={{ width: '100%', padding: '8px 0', fontSize: 13, color: '#34d399', background: 'none', border: 'none', cursor: !addWorkName.trim() || previewLoading || addSaving ? 'not-allowed' : 'pointer', opacity: !addWorkName.trim() || previewLoading || addSaving ? 0.5 : 1, fontWeight: 500 }}
                >
                  {t('audit.previewAI') || 'Preview AI Descriptions'}
                </button>
              )}
              <button
                onClick={() => { previewAbortRef.current?.abort(); setShowAddForm(false); setShowPreview(false); setPreviewData(null); }}
                style={{ width: '100%', padding: '8px 0', fontSize: 13, color: 'rgba(255,255,255,0.40)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('common.back') || 'Back'}
              </button>
            </div>
          </div>
        ) : (
        /* === SEARCH + AREA PICKER === */
        <>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('audit.searchWorks') || 'Search works across all areas...'}
            style={{ width: '100%', paddingLeft: 36, paddingRight: 36, paddingTop: 10, paddingBottom: 10, borderRadius: 10, border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid transparent', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0, backgroundColor: r.areaColor }}>
                    {r.areaKey[0].toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.work.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{r.areaLabel}</div>
                  </div>
                </button>
              ))}
              {/* "Add custom work" link below search results */}
              <button
                onClick={() => openAddForm()}
                style={{ width: '100%', textAlign: 'center', padding: '8px 0', fontSize: 13, color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                + {t('audit.addCustomWorkLink') || 'Add a custom work'}
              </button>
            </div>
          )}

          {/* Zero results — prominent add button */}
          {showSearch && searchResults.length === 0 && (
            <div className="text-center py-4">
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>{t('common.noResults') || 'No works found'}</p>
              <button
                onClick={() => openAddForm(query.trim())}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.12)', background: 'rgba(255,255,255,0.04)', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, backgroundColor: a.color }}>
                    {a.key[0].toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        <button
          onClick={() => { previewAbortRef.current?.abort(); onClose(); }}
          style={{ marginTop: 12, width: '100%', padding: '8px 0', fontSize: 13, color: 'rgba(255,255,255,0.40)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ─── Get Advice Tab ───────────────────────────────────────────────────────────
// Shows confirmed photos grouped by child. One tap → Guru streams Montessori
// advice on next steps for that child based on what they were observed doing.
function GetAdviceTab({ photos, classroomId }: { photos: AuditPhoto[]; classroomId: string }) {
  const { t } = useI18n();
  const [advice, setAdvice] = useState<Record<string, string>>({});
  const [adviceLoading, setAdviceLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Group confirmed photos by child — pick the most recent per child
  const childGroups = useMemo(() => {
    const byChild: Record<string, AuditPhoto[]> = {};
    for (const p of photos) {
      if (!p.teacher_confirmed || !p.child_id || !p.child_name || !p.work_name) continue;
      if (!byChild[p.child_id]) byChild[p.child_id] = [];
      byChild[p.child_id].push(p);
    }
    return Object.values(byChild)
      .map(ps => {
        const sorted = [...ps].sort(
          (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
        );
        return { child_id: sorted[0].child_id, child_name: sorted[0].child_name, photo: sorted[0], allPhotos: sorted };
      })
      .sort((a, b) => a.child_name.localeCompare(b.child_name));
  }, [photos]);

  const handleGetAdvice = async (childId: string, childName: string, workName: string) => {
    setAdviceLoading(prev => ({ ...prev, [childId]: true }));
    setAdvice(prev => ({ ...prev, [childId]: '' }));
    setExpanded(prev => ({ ...prev, [childId]: true }));

    const message = `I observed ${childName} working on "${workName}". Based on this, what would be the ideal next Montessori step for them? What direction should I take this work — what comes next in the sequence, or what related areas should I draw them toward?`;

    try {
      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          childId,
          message,
          mode: 'teacher',
          conversationHistory: [],
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'text') {
              setAdvice(prev => ({ ...prev, [childId]: (prev[childId] || '') + event.text }));
            }
          } catch {}
        }
      }
    } catch {
      setAdvice(prev => ({ ...prev, [childId]: 'Could not load advice. Please try again.' }));
    } finally {
      setAdviceLoading(prev => ({ ...prev, [childId]: false }));
    }
  };

  if (childGroups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(255,255,255,0.45)' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>🌱</p>
        <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>No confirmed observations yet</p>
        <p style={{ fontSize: 13 }}>Confirm photos in the Confirm tab first — Guru can then advise on next steps for each child.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 14px 96px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', padding: '0 4px 4px' }}>
        {childGroups.length} {childGroups.length === 1 ? 'child' : 'children'} with confirmed observations this week
      </p>
      {childGroups.map(({ child_id, child_name, photo }) => {
        const isLoading = !!adviceLoading[child_id];
        const adviceText = advice[child_id] || '';
        const isOpen = !!expanded[child_id];
        const hasAdvice = adviceText.length > 0;

        return (
          <div key={child_id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, overflow: 'hidden' }}>
            {/* Child row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
              {/* Photo thumbnail */}
              {photo.url && (
                <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.20)' }}>
                  <img
                    src={getThumbnailUrl(photo.url, photo.thumbnail_path)}
                    alt={child_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{child_name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                  {photo.work_name}
                  {photo.area && <span style={{ opacity: 0.60 }}> · {photo.area}</span>}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', margin: '2px 0 0' }}>
                  {new Date(photo.captured_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              {/* Action button */}
              <button
                onClick={() => {
                  if (hasAdvice || isLoading) {
                    setExpanded(prev => ({ ...prev, [child_id]: !isOpen }));
                  } else {
                    handleGetAdvice(child_id, child_name, photo.work_name!);
                  }
                }}
                disabled={isLoading}
                style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: isLoading ? 'wait' : 'pointer', background: isLoading ? 'rgba(52,211,153,0.08)' : hasAdvice ? 'rgba(52,211,153,0.10)' : 'rgba(52,211,153,0.18)', border: `1px solid ${hasAdvice || isLoading ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.50)'}`, color: isLoading ? 'rgba(52,211,153,0.50)' : hasAdvice ? '#34d399' : '#34d399', transition: 'all 120ms ease' }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="animate-spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(52,211,153,0.20)', borderTopColor: '#34d399', display: 'inline-block' }} />
                    Thinking…
                  </span>
                ) : hasAdvice ? (
                  isOpen ? 'Hide ▲' : 'Advice ▼'
                ) : (
                  '✦ Get Advice'
                )}
              </button>
            </div>

            {/* Advice panel — streams in */}
            {(isOpen || isLoading) && (
              <div style={{ borderTop: '1px solid rgba(52,211,153,0.10)', padding: '12px 16px', background: 'rgba(52,211,153,0.04)' }}>
                {adviceText ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {adviceText}
                    {isLoading && <span style={{ display: 'inline-block', width: 6, height: 16, background: '#34d399', marginLeft: 2, borderRadius: 2, verticalAlign: 'middle' }} className="animate-pulse" />}
                  </div>
                ) : isLoading ? (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)' }} className="animate-pulse">Guru is thinking…</p>
                ) : null}
                {/* Re-ask button after advice loads */}
                {hasAdvice && !isLoading && (
                  <button
                    onClick={() => handleGetAdvice(child_id, child_name, photo.work_name!)}
                    className="mt-3 text-xs text-emerald-600 hover:text-emerald-800 underline"
                  >
                    Ask again
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PhotoAuditPage() {
  const { t, locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  // Track photos confirmed in this session — prevents server refetch from overwriting optimistic green status
  const confirmedIdsRef = useRef<Set<string>>(new Set());
  // Track photos.length for load-more offset without making fetchPhotos depend
  // on photos.length (which made the callback identity churn on every confirm,
  // and was implicated in the Session 111 emergency regression).
  const photosLengthRef = useRef<number>(0);

  // Classroom (for WeeklyWrapTab)
  const [classroomIdState, setClassroomIdState] = useState<string>('');
  const classroomIdInitRef = useRef(false);

  // Core state
  const [photos, setPhotos] = useState<AuditPhoto[]>([]);
  const [counts, setCounts] = useState({ green: 0, amber: 0, red: 0, untagged: 0 });
  const [loading, setLoading] = useState(true);
  // Server-side load-more pagination. Initial fetch limit is 100 (was 500/200) to
  // keep mobile JSON payloads small. `hasMore` = server returned exactly `limit`
  // rows, suggesting more may exist. `loadingMore` gates the Load more button.
  // Distinct from client-side `PAGE_SIZE` pagination through fetched photos.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [zone, setZone] = useState<Zone>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  // "Today" filter chip on the Confirm tab — when on, shows every photo in the
  // last 24h including teacher-confirmed (the end-of-day sanity-check view).
  // Replaces the old standalone 'today_all' tab (Session 33 IA cleanup).
  const [todayFilter, setTodayFilter] = useState(false);
  const { isEnabled } = useFeaturesContext();

  // Backward-compat: if a deep link / old bookmark lands on one of the
  // pre-Session-33 zone values ('works_review', 'parent_reports', 'today_all'),
  // remap to the new unified zone. Accept 'any' cast since Zone type no longer
  // includes these values but they may still arrive from URL/localStorage.
  const didInitZoneRef = useRef(false);
  useEffect(() => {
    if (didInitZoneRef.current) return;
    const zoneAny = zone as unknown as string;
    if (zoneAny === 'works_review' || zoneAny === 'parent_reports') {
      setZone('weekly_wrap');
      didInitZoneRef.current = true;
      return;
    }
    if (zoneAny === 'today_all') {
      setZone('all');
      setTodayFilter(true);
      didInitZoneRef.current = true;
      return;
    }
    // Remap pending_review (Photo Bucket, now removed)
    if (zoneAny === 'pending_review') {
      setZone('all');
      didInitZoneRef.current = true;
      return;
    }
    if (zone !== undefined) {
      didInitZoneRef.current = true;
    }
  }, [zone]);
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
        toast.error(t('photoAudit.loginRequired'));
        return;
      }
      if (result.skipped && result.reason === 'offline') {
        toast.error(t('photoAudit.offlineSaved'));
        return;
      }
      if (result.reset === 0 && result.uploaded === 0) {
        toast.success(t('photoAudit.queueEmpty'));
        return;
      }
      if (result.uploaded > 0) {
        const failedPart = result.failed > 0 ? ` (${t('photoAudit.failed', { count: result.failed })})` : '';
        const msg = t('photoAudit.uploadedPhotos', { count: result.uploaded }) + failedPart;
        toast.success(msg);
        // Refresh the audit grid so the freshly-synced photos appear
        setTimeout(() => fetchPhotos(), 800);
      } else if (result.failed > 0) {
        const msg = t('photoAudit.syncFailedWithCount', { count: result.failed });
        toast.error(msg);
      } else if (result.reset > 0) {
        const msg = t('photoAudit.resetPhotos', { count: result.reset });
        toast.success(msg);
      }
    } catch (err) {
      console.error('[PhotoAudit] Sync queue error:', err);
      toast.error(t('photoAudit.syncError'));
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
    // Warm the "This is…" sheet's curriculum cache now, so the first time a
    // teacher opens the tagging sheet the works list is already there (no spinner).
    prefetchClassroomWorks(classroomId);
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

  // Initial fetch limit — lowered from 500/200 (Session 111) to 100 to keep
  // mobile JSON payloads small. ~50KB → ~10KB on the first paint. Subsequent
  // batches come on demand via the "Load more" button (see loadMorePhotos).
  const FETCH_LIMIT = 100;

  // Fetch photos when zone/date/page changes. `append=true` is the load-more
  // continuation path — appends to existing photos[] using offset = photos.length.
  const fetchPhotos = useCallback(async (append = false) => {
    // Non-photo tabs manage their own data — skip photo fetch to avoid count flicker.
    if (zone === 'pending_review' || zone === 'weekly_wrap' || zone === 'weekly_admin' || zone === 'get_advice') {
      setLoading(false);
      return;
    }
    // Load-more shares this function but does NOT abort the initial fetch
    // (that would cancel the photos[] state we're trying to extend).
    if (!append) {
      abortRef.current?.abort();
    }
    const controller = new AbortController();
    if (!append) abortRef.current = controller;
    if (append) setLoadingMore(true);
    else setLoading(true);

    // "Today" filter chip on the Confirm tab — overrides the date range to show
    // every photo from the last 24h regardless of teacher_confirmed status
    // (end-of-day sanity-check view for catching wrong auto-confirms).
    const isTodayAll = todayFilter && zone === 'all';
    // Discussion tab: fetch ALL photos (any zone, any status) so client-side
    // discussion_flag filter sees the full set. Without this, the API's zone
    // filtering excludes untagged or confirmed photos that were flagged.
    const isDiscussion = zone === 'discussion';
    const dateFrom = isTodayAll
      ? new Date(Date.now() - 86400000).toISOString()
      : isDiscussion ? new Date(Date.now() - 90 * 86400000).toISOString()
      : dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString()
      : dateRange === '7d' ? new Date(Date.now() - 7 * 86400000).toISOString()
      : dateRange === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
      : '2020-01-01T00:00:00Z';
    const effectiveZone = isDiscussion ? 'all' : zone;
    const includeConfirmedParam = (isTodayAll || isDiscussion) ? '&include_confirmed=1' : '';
    // On append, offset starts where photos[] currently ends. On initial fetch, 0.
    // Read via ref so fetchPhotos callback identity stays stable across photo
    // state changes (critical: photos.length in deps caused the callback to
    // re-create on every confirm, which broke the memoized AuditPhotoCard's
    // event handlers — Session 111 emergency regression).
    const offsetParam = append ? photosLengthRef.current : 0;

    try {
      const res = await fetch(
        `/api/montree/audit/photos?zone=${effectiveZone}&date_from=${dateFrom}&limit=${FETCH_LIMIT}&offset=${offsetParam}${includeConfirmedParam}`,
        // no-store: this is a live audit surface. The API sends max-age=30, which
        // would serve a stale (still-processing) response to the auto-refresh
        // poll and hide a result that already landed. Always fetch fresh here.
        { signal: controller.signal, cache: 'no-store' }
      );
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // Filter out photos confirmed in this session — they're "done" and should
      // not reappear even if the server returns stale confidence data (race condition)
      const incomingPhotos = (data.photos || []).filter((p: AuditPhoto) =>
        !confirmedIdsRef.current.has(p.id)
      );
      // hasMore is derived from RAW response length, not the post-filter list —
      // filtering out confirmed photos shouldn't make us think we've hit the end.
      const rawCount = (data.photos || []).length;
      setHasMore(rawCount >= FETCH_LIMIT);
      // Append vs replace based on the fetch mode. Functional setState so concurrent
      // optimistic updates (confirm/correct firing during a load-more) are preserved.
      if (append) {
        setPhotos(prev => {
          // Dedup by id in case the server returned overlapping rows (e.g. a row
          // got freshly captured_at-updated between page 1 and page 2).
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = incomingPhotos.filter((p: AuditPhoto) => !existingIds.has(p.id));
          return [...prev, ...newOnes];
        });
      } else {
        setPhotos(incomingPhotos);
      }
      // Seed work statuses from DB, defaulting to 'practicing' for any identified photo
      // (if a teacher photographed a child doing a work, they're at minimum practicing it)
      const initialStatuses: Record<string, string> = {};
      const needsDefault: Array<{ child_id: string; work_name: string; area: string | null }> = [];
      incomingPhotos.forEach((p: AuditPhoto) => {
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
        return append ? { ...prev, ...initialStatuses } : { ...initialStatuses, ...prev };
      });
      // Counts represent the FULL classification across the current batch of fetched
      // photos. On initial fetch they're authoritative for the visible set; on append
      // they refresh from the server-side count snapshot. Excluding confirmed-this-session
      // is best-effort recount when applicable.
      if (!append) {
        if (confirmedIdsRef.current.size > 0) {
          const recounted = { green: 0, amber: 0, red: 0, untagged: 0 };
          incomingPhotos.forEach((p: AuditPhoto) => {
            const z = p.zone as keyof typeof recounted;
            if (recounted[z] !== undefined) recounted[z]++;
          });
          setCounts(recounted);
        } else {
          setCounts(data.counts);
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (!append) {
        setPhotos([]);
        setCounts({ green: 0, amber: 0, red: 0, untagged: 0 });
        setHasMore(false);
      }
      toast.error(t('audit.fetchError'));
    } finally {
      if (append) {
        setLoadingMore(false);
      } else if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, dateRange, todayFilter]);

  // Load-more handler — passes append=true. Photos.length is read via
  // photosLengthRef inside fetchPhotos so we don't need to re-create the
  // callback on every confirm (Session 111 emergency fix).
  const loadMorePhotos = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    fetchPhotos(true);
  }, [fetchPhotos, hasMore, loading, loadingMore]);

  useEffect(() => {
    // Initial fetch only — append path triggered by user click, never by deps.
    // Reset hasMore optimistically so the new zone/range starts with a fresh
    // assumption that more may be available.
    setHasMore(false);
    fetchPhotos(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, dateRange, todayFilter]);
  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  // Keep photosLengthRef in sync so the load-more append path can read offset
  // without putting photos.length in fetchPhotos deps (Session 111 fix).
  useEffect(() => { photosLengthRef.current = photos.length; }, [photos.length]);

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

  // Auto-refresh while any visible photo is still being identified. The mount
  // sweep above fires /process; this surfaces the result without a manual
  // refresh. Polls every 9s, capped at 8 tries (~72s), stops the instant
  // nothing is in-flight. A photo is "in-flight" when it has no recorded
  // identification attempt, no work, isn't confirmed, was captured within the
  // last 10 min, and hasn't reached a draft/match state yet.
  // Clock for recency checks, kept in state so the card render stays pure
  // (no Date.now() in JSX — React-compiler purity rule). Ticks every 30s.
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const i = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  const pollRef = useRef<{ tries: number; timer: ReturnType<typeof setTimeout> | null }>({ tries: 0, timer: null });
  useEffect(() => {
    const inflight = photos.some(p => isPhotoInFlight(p, Date.now()));
    if (pollRef.current.timer) { clearTimeout(pollRef.current.timer); pollRef.current.timer = null; }
    if (!inflight) { pollRef.current.tries = 0; return; }
    if (pollRef.current.tries >= 10) return;
    const timer = setTimeout(() => {
      pollRef.current.tries += 1;
      fetchPhotos();
    }, 6000);
    pollRef.current.timer = timer;
    return () => { clearTimeout(timer); };
  }, [photos, fetchPhotos]);

  // Re-identify: reset a mis-filed (untagged / "Other") photo and re-run it
  // through the CURRENT two-pass pipeline. Recovers photos an older prompt got
  // wrong. The reset runs server-side (Railway→Supabase), then /process re-runs
  // the fixed pipeline; we refetch to surface the fresh suggestion.
  const handleReidentify = async (photo: AuditPhoto) => {
    setProcessingId(photo.id);
    try {
      const r = await montreeApi('/api/montree/photo-identification/requeue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: photo.id }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        toast.error(e?.error || 'Could not re-identify this photo');
        return;
      }
      // Optimistically clear so the card shows a fresh run immediately.
      setPhotos(prev => prev.map(p => p.id === photo.id
        ? { ...p, identification_status: null, identification_attempted_at: null, identification_confidence: null, sonnet_draft: null, work_id: null }
        : p));
      // Re-run the fixed two-pass pipeline, then refetch to show the result.
      await montreeApi('/api/montree/photo-identification/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: photo.id, locale: 'en' }),
      });
      fetchPhotos();
    } catch (err) {
      console.error('[Re-identify] failed:', err);
      toast.error('Could not re-identify this photo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleZoneChange = (z: Zone) => { setZone(z); setPage(0); setSelectedIds(new Set()); };
  const handleDateChange = (d: DateRange) => { setDateRange(d); setPage(0); setSelectedIds(new Set()); };

  // Single confirm
  // OPTIMISTIC pattern: photo vanishes instantly, API call runs in the background,
  // photo is restored only if the API fails. Teachers don't wait for the wheel.
  const handleConfirm = (photo: AuditPhoto) => {
    if (!photo.child_id) {
      // No child on this photo (e.g. a haiku_matched photo whose work was
      // identified but the child was never tagged). A confirmation has to
      // attach the work to a child, so a bare toast is a dead end — the
      // teacher taps ✓ Correct and nothing moves. Open the child tagger
      // so the flow continues: tag the child, then confirm.
      toast(t('photoAudit.tagChildFirst'));
      handleOpenChildTagger(photo);
      return;
    }
    if (!photo.work_id && !photo.work_name) {
      toast.error(t('photoAudit.tagWorkFirst'));
      return;
    }
    // Snapshot for revert if the API rejects.
    const oldZone = photo.zone || 'amber';
    const photoSnapshot = photo;
    // 1. Optimistic removal — vanish from grid + decrement counts NOW.
    confirmedIdsRef.current.add(photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setCounts(prev => ({
      ...prev,
      ...(oldZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
      ...(oldZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
      ...(oldZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
    }));
    // 2. Fire API in background. No await, no spinner.
    void (async () => {
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
        // Success — photo already gone. Silent. No toast.
        // Session 119: the english-missing list on /classroom-overview depends
        // on teacher_confirmed Language photos this week. After a successful
        // confirm, drop the cached entry so the next mount/focus refetches.
        invalidateEnglishWeekCache();
        // Session 119 Phase 2: if this was a Language-area photo, offer
        // the teacher a one-tap English-position advancement.
        offerEnglishAdvance({
          childId: photo.child_id,
          childName: photo.child_name,
          area: photo.area,
        });
      } catch (err: unknown) {
        // 3. API failed — restore the photo + counts and surface the error.
        confirmedIdsRef.current.delete(photo.id);
        setPhotos(prev => (prev.some(p => p.id === photoSnapshot.id) ? prev : [photoSnapshot, ...prev]));
        setCounts(prev => ({
          ...prev,
          ...(oldZone === 'amber' ? { amber: prev.amber + 1 } : {}),
          ...(oldZone === 'red' ? { red: prev.red + 1 } : {}),
          ...(oldZone === 'untagged' ? { untagged: prev.untagged + 1 } : {}),
        }));
        const msg = err instanceof Error ? err.message : t('audit.confirmFailed');
        toast.error(msg);
      }
    })();
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

  // Flag/unflag a photo for team discussion. Removes it from the Confirm queue
  // and moves it to the Discussion tab.
  const handleToggleDiscussion = async (photo: AuditPhoto) => {
    const newFlag = !photo.discussion_flag;
    setProcessingId(photo.id);
    try {
      const res = await montreeApi('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, discussion_flag: newFlag }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Update local state
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, discussion_flag: newFlag } : p
      ));
      toast.success(newFlag
        ? t('photoAudit.flaggedForDiscussion')
        : t('photoAudit.discussionFlagRemoved'));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
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

  // OPTIMISTIC pattern. Photo vanishes immediately, API runs in the background,
  // photo restored only on failure. Used by Tier 1 auto-attach path AND the
  // ThisIsSheet "pick existing" path. Teachers don't wait.
  const attachToExistingWork = async (photo: AuditPhoto, work: { id: string; name: string }, areaKey: string) => {
    const removedZone = photo.zone || 'untagged';
    const photoSnapshot = photo;
    // 1. Optimistic — vanish from grid + decrement counts now.
    // Add to confirmedIdsRef so a server refetch (Session 111 emergency fix)
    // won't resurface the photo before the corrections POST writes
    // teacher_confirmed=true on the server.
    confirmedIdsRef.current.add(photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setCounts(prev => ({
      ...prev,
      ...(removedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
      ...(removedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
      ...(removedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
      ...(removedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
    }));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
    // 2. Fire API in background.
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
      // Success — photo already gone. Silent.
      // Session 119: invalidate english-missing cache so /classroom-overview
      // reflects this child's new Language activity on next mount/focus.
      invalidateEnglishWeekCache();
      // Session 119 Phase 2: corrected to a Language work → offer advance.
      // areaKey is the CORRECTED area; that's the signal here (the original
      // could have been any area before this correction).
      offerEnglishAdvance({
        childId: photo.child_id,
        childName: photo.child_name,
        area: areaKey,
      });
      return true;
    } catch (err) {
      console.error('[AttachExisting] Failed:', err);
      // 3. API failed — restore the photo + counts, surface the error.
      confirmedIdsRef.current.delete(photo.id);
      setPhotos(prev => (prev.some(p => p.id === photoSnapshot.id) ? prev : [photoSnapshot, ...prev]));
      setCounts(prev => ({
        ...prev,
        ...(removedZone === 'green' ? { green: prev.green + 1 } : {}),
        ...(removedZone === 'amber' ? { amber: prev.amber + 1 } : {}),
        ...(removedZone === 'red' ? { red: prev.red + 1 } : {}),
        ...(removedZone === 'untagged' ? { untagged: prev.untagged + 1 } : {}),
      }));
      toast.error(err instanceof Error ? err.message : 'Failed to attach');
      return false;
    }
  };

  // "✓ Correct" for haiku_drafted / sonnet_drafted cards — teacher endorses
  // the AI draft. Three resolution passes BEFORE we give up and open the
  // picker. The picker should be the rare fallback, not the default.
  //
  // 🚨 Regression fix (Session 117+): the old version only tried
  // `proposed_name` and immediately opened the picker on miss. When Sonnet
  // proposes a name that's slightly off from the curriculum's exact spelling
  // (e.g. "Stamp Game Multiplication" vs "Stamp Game"), the teacher
  // tapping ✓ Correct deserves a one-tap commit, not a modal interrogation.
  // Fall back through closest_existing_match → top_candidates[0] → picker.
  const handleConfirmHaikuDraft = (photo: AuditPhoto) => {
    if (!photo.child_id) {
      // No child tagged — open the child tagger so the teacher can tag
      // and then confirm, instead of dead-ending on a toast.
      toast(t('photoAudit.tagChildFirst'));
      handleOpenChildTagger(photo);
      return;
    }
    const draft = photo.sonnet_draft;

    // Try 1: proposed_name (AI's primary guess)
    const proposed = draft?.proposed_name?.trim() || photo.work_name?.trim();
    if (proposed) {
      const r = findWorkByName(proposed, draft?.suggested_area);
      if (r) {
        console.log(`[HaikuConfirm] proposed_name match: "${proposed}" → attaching`);
        attachToExistingWork(photo, r.work, r.areaKey);
        return;
      }
    }

    // Try 2: closest_existing_match (Sonnet drafts populate this when the
    // proposed_name is novel but the AI knows a curriculum sibling.)
    const closest = (draft as { closest_existing_match?: { work_name?: string; work_key?: string } } | undefined)?.closest_existing_match;
    const closestName = closest?.work_name?.trim();
    if (closestName) {
      const r = findWorkByName(closestName, draft?.suggested_area);
      if (r) {
        console.log(`[HaikuConfirm] closest_existing_match: "${closestName}" → attaching`);
        attachToExistingWork(photo, r.work, r.areaKey);
        return;
      }
    }

    // Try 3: top_candidates[0] (V2 fuzzy matcher's best — Session 105 feature)
    const topCands = (draft as { top_candidates?: Array<{ workName?: string; area?: string }> } | undefined)?.top_candidates;
    const top = Array.isArray(topCands) && topCands.length > 0 ? topCands[0] : null;
    if (top?.workName) {
      const r = findWorkByName(top.workName, top.area || draft?.suggested_area);
      if (r) {
        console.log(`[HaikuConfirm] top_candidates[0]: "${top.workName}" → attaching`);
        attachToExistingWork(photo, r.work, r.areaKey);
        return;
      }
    }

    // True fallback: the AI proposed a work that isn't in the loaded
    // classroom curriculum yet. The teacher pressed ✓ Correct — they have
    // ALREADY endorsed the AI's identification. Dumping them into the
    // "This is…" picker here is the glitch the teacher sees ("clicking
    // Correct opens a search page"). Instead, create the work straight
    // from the AI draft via the new_custom resolve path. That route is
    // dedup-safe: if the work secretly already exists in the classroom it
    // delegates to the existing-work path instead of creating a duplicate,
    // so this is correct whether or not "Name Writing" is a real row.
    const VALID_RESOLVE_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const fallbackName = (proposed || closestName || top?.workName || '').trim();
    const rawArea = (draft?.suggested_area || top?.area || photo.area || '').trim().toLowerCase();
    const fallbackArea = VALID_RESOLVE_AREAS.includes(rawArea) ? rawArea : 'language';
    if (fallbackName.length >= 2 && fallbackName.length <= 80) {
      console.log(`[HaikuConfirm] No curriculum match — confirming "${fallbackName}" via new_custom (${fallbackArea})`);
      handleResolvePhoto(photo, { type: 'new_custom', name: fallbackName, area_key: fallbackArea });
      return;
    }

    // Last resort: the AI gave no usable name at all — open the picker so
    // the teacher can pick or type one.
    console.warn('[HaikuConfirm] No resolution found, opening picker:', {
      proposed, closestName, topCandName: top?.workName,
    });
    openThisIsSheet(photo, true);
  };

  // Quick-tap chip handler — teacher picks one of the top-3 candidates returned
  // by matchToCurriculumV2. Resolves the candidate to a curriculum work and
  // attaches the photo. If the chip is the AI's primary guess (workName matches
  // proposed_name), this is equivalent to ✓ Correct. If it's a sibling
  // candidate, it's a one-tap correction without typing.
  const handleConfirmCandidate = (
    photo: AuditPhoto,
    candidate: { workName: string; workKey: string | null; area: string | null }
  ) => {
    if (!photo.child_id) {
      // No child tagged — open the child tagger so the teacher can tag
      // and then confirm, instead of dead-ending on a toast.
      toast(t('photoAudit.tagChildFirst'));
      handleOpenChildTagger(photo);
      return;
    }
    const resolved = findWorkByName(candidate.workName, candidate.area || undefined);
    if (resolved) {
      console.log(`[ChipPick] Teacher tapped candidate "${candidate.workName}" → attaching`);
      attachToExistingWork(photo, resolved.work, resolved.areaKey);
    } else {
      // Candidate name not in curriculum — fall through to sheet so teacher can resolve
      console.warn(`[ChipPick] Candidate "${candidate.workName}" not found in curriculum — opening sheet`);
      openThisIsSheet(photo, true);
    }
  };

  // "This is..." — one button, one sheet, three resolution paths (existing / new_custom / confirm_ai).
  // Replaces the old Fix + Accept + AcceptDraftModal tangle.
  //
  // 🚨 The `allowAutoAttach` parameter is LOAD-BEARING for correctness.
  //
  // Tier 1a/1b shortcuts (Session 9 fix): when the Sonnet draft has a very
  // high-confidence closest_existing_match AND that match resolves to a real
  // classroom work, silently attach the photo to the AI's guess instead of
  // opening the sheet. Saves the teacher a tap when they're saying YES.
  //
  // BUT — these shortcuts are catastrophic when bound to "✏️ Wrong" / "🏷️ This
  // is…" buttons. The teacher's intent there is to REJECT or CHANGE the AI's
  // categorisation. A silent auto-attach to the AI's guess on those buttons
  // is the literal opposite of what the teacher wants — and it pollutes the
  // visual-memory moat with a positive example for a wrong association.
  //
  // Default: `false` — opens the sheet so the teacher can pick/correct.
  // Pass `true` only from "✓ Correct" fallback paths where the teacher has
  // already endorsed the AI's analysis and we just couldn't resolve their
  // endorsement to a specific work via proposed_name.
  const openThisIsSheet = (photo: AuditPhoto, allowAutoAttach: boolean = false) => {
    if (!photo.child_id) {
      // No child tagged — open the child tagger so the teacher can tag
      // and then confirm, instead of dead-ending on a toast.
      toast(t('photoAudit.tagChildFirst'));
      handleOpenChildTagger(photo);
      return;
    }
    if (allowAutoAttach) {
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
      // (confidence ≥ 0.85). ONLY applies to genuine Sonnet drafts — NOT haiku_pass2.
      // Haiku_pass2 sources are stored as haiku_drafted (trust threshold 0.85) so if
      // they're still in the queue the teacher WANTS to review them.
      const proposed = draft?.proposed_name?.trim();
      const draftConf = typeof draft?.confidence === 'number' ? draft.confidence : 0;
      const isHaikuPass2 = (draft as Record<string, unknown> | null)?._source === 'haiku_pass2';
      if (proposed && draftConf >= 0.85 && !isHaikuPass2) {
        const resolvedProposed = findWorkByName(proposed, draft?.suggested_area);
        if (resolvedProposed) {
          console.log(`[ThisIsSheet] Tier 1b auto-attach via proposed_name: "${proposed}" ${Math.round(draftConf * 100)}% — skipping sheet`);
          attachToExistingWork(photo, resolvedProposed.work, resolvedProposed.areaKey);
          return;
        }
      }
    }
    setThisIsPhoto(photo);
  };

  // Unified resolver — called by ThisIsSheet with a {type, ...} resolution.
  // OPTIMISTIC pattern: photo vanishes immediately, fetch runs in the background,
  // photo is restored only on failure. ThisIsSheet's fireAndClose closes the modal
  // BEFORE this fires, so the teacher's perceived flow is: tap → modal closed +
  // photo gone. No spinner, no wait.
  const handleResolvePhoto = async (photo: AuditPhoto, resolution: ThisIsResolution) => {
    const removedZone = photo.zone || 'untagged';
    const photoSnapshot = photo;
    // 1. Optimistic — vanish from grid + decrement counts now.
    // Add to confirmedIdsRef so a refetch can't resurface this photo before
    // the resolve POST persists teacher_confirmed=true on the server.
    confirmedIdsRef.current.add(photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setCounts(prev => ({
      ...prev,
      ...(removedZone === 'green' ? { green: Math.max(0, prev.green - 1) } : {}),
      ...(removedZone === 'amber' ? { amber: Math.max(0, prev.amber - 1) } : {}),
      ...(removedZone === 'red' ? { red: Math.max(0, prev.red - 1) } : {}),
      ...(removedZone === 'untagged' ? { untagged: Math.max(0, prev.untagged - 1) } : {}),
    }));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
    setThisIsPhoto(null);
    // Auto-set "practicing" optimistically too — fire-and-forget either way.
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
    // 2. Fire main resolve API in background.
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
      // Success — photo already gone. Silent. New-custom path also refreshes
      // the curriculum cache in the background so the next "This is…" picker
      // sees the new work immediately.
      if (resolution.type === 'new_custom') {
        fetchCurriculum();
      }
      // Session 119: invalidate english-missing cache so /classroom-overview
      // reflects this child's new Language activity on next mount/focus.
      invalidateEnglishWeekCache();
      // Session 119 Phase 2: offer English advance only when the resolution
      // is to an actual curriculum work. The 'other' type (snack, group
      // photo, etc.) is intentionally NOT curriculum — skip the prompt.
      if (resolution.type !== 'other') {
        offerEnglishAdvance({
          childId: photo.child_id,
          childName: photo.child_name,
          area: resolution.area_key,
        });
      }
    } catch (err) {
      console.error('[ResolvePhoto] Failed:', err);
      // 3. API failed — restore the photo + counts.
      confirmedIdsRef.current.delete(photo.id);
      setPhotos(prev => (prev.some(p => p.id === photoSnapshot.id) ? prev : [photoSnapshot, ...prev]));
      setCounts(prev => ({
        ...prev,
        ...(removedZone === 'green' ? { green: prev.green + 1 } : {}),
        ...(removedZone === 'amber' ? { amber: prev.amber + 1 } : {}),
        ...(removedZone === 'red' ? { red: prev.red + 1 } : {}),
        ...(removedZone === 'untagged' ? { untagged: prev.untagged + 1 } : {}),
      }));
      toast.error(err instanceof Error ? err.message : 'Failed to resolve');
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
      // Session 119: invalidate english-missing cache (Fix path could have
      // assigned a Language work to a previously-missing child).
      invalidateEnglishWeekCache();
      // Session 119 Phase 2: Fix to a Language work → offer advance.
      offerEnglishAdvance({
        childId: correctingPhoto.child_id,
        childName: correctingPhoto.child_name,
        area: effectiveArea,
      });
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
      // Skip photos missing child_id, work_id, or work_name — corrections route
      // requires all three and would 400. These surface in "Today (All)" tab when
      // a photo is untagged or its AI identification hasn't landed yet.
      if (!photo || !photo.child_id || (!photo.work_id && !photo.work_name)) { failed.push(ids[i]); continue; }
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
    // Session 119: if any photos were confirmed, refresh english-missing.
    if (succeeded > 0) {
      invalidateEnglishWeekCache();
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
    // Only select photos that can actually be confirmed — must have child_id AND
    // either work_id or work_name. Untagged/unidentified photos in "Today (All)"
    // would 400 on the corrections route and get stuck as "failed" in batch confirm.
    const visible = filteredPhotos
      .filter(p => p.child_id && (p.work_id || p.work_name))
      .map(p => p.id);
    if (visible.length === 0) return;
    // Toggle: if all confirmable are selected, deselect; otherwise select all confirmable
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

  // Filter photos by zone — 'all' shows everything needing review (non-green).
  // Today filter chip on the Confirm tab shows every photo in last 24h
  // regardless of teacher_confirmed (include_confirmed=1 at fetch time).
  const filteredPhotos = useMemo(() => {
    if (zone === 'weekly_wrap' || zone === 'weekly_admin') return []; // Non-photo tabs handled separately
    if (zone === 'discussion') return photos.filter(p => p.discussion_flag);
    if (zone === 'all' && todayFilter) return photos; // Today — every photo in last 24h incl. confirmed
    if (zone === 'green') return photos.filter(p => p.zone === 'green');
    // Exclude discussion-flagged photos from all non-discussion photo tabs
    const nonDiscussion = photos.filter(p => !p.discussion_flag);
    const nonGreen = nonDiscussion.filter(p => p.zone !== 'green');
    if (zone === 'all') return nonGreen;
    return nonGreen.filter(p => p.zone === zone);
  }, [photos, zone, todayFilter]);

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

  const isPhotoZone = zone === 'all' || zone === 'green' || zone === 'discussion';
  const isGetAdviceZone = zone === 'get_advice';

  // 3-tab layout: Confirm (needs review, with Today filter chip) + Weekly Wrap (Teacher + Parent
  // sub-views — the unified source of both teacher review and parent reports) +
  // Weekly Admin (standalone DOCX generator). Photos now go straight to AI (no Photo Bucket).
  const ZONE_TABS: { key: Zone; label: string; color: string; count: number | null }[] = [
    { key: 'all', label: t('photoAudit.confirmTab'), color: 'bg-amber-100 text-amber-700', count: (() => {
      // Subtract discussion-flagged photos — they appear in the Discussion tab, not here.
      const discussionCount = photos.filter(p => p.discussion_flag && p.zone !== 'green').length;
      const confirmCount = nonGreenCount - discussionCount;
      return confirmCount > 0 ? confirmCount : null;
    })() },
    { key: 'discussion', label: t('photoAudit.discussionTab'), color: 'bg-blue-100 text-blue-800', count: photos.filter(p => p.discussion_flag).length || null },
    { key: 'weekly_wrap', label: t('photoAudit.weeklyWrapTab'), color: 'bg-violet-100 text-violet-800', count: null },
    { key: 'weekly_admin', label: t('photoAudit.weeklyAdminTab'), color: 'bg-indigo-100 text-indigo-800', count: null },
    { key: 'get_advice', label: '✦ Get Advice', color: 'bg-emerald-100 text-emerald-800', count: null },
  ].filter(tab => {
    // Optional tabs gated per-school via super-admin ⚙️ Features. All default OFF —
    // a real Montessori school starts with just Confirm + Parent Reports. Whale
    // Class (the operator's personal class) has all three enabled by migration.
    if (tab.key === 'weekly_admin') return isEnabled('weekly_admin_docs');
    if (tab.key === 'discussion') return isEnabled('wrap_discussion');
    if (tab.key === 'get_advice') return isEnabled('wrap_get_advice');
    return true;
  });

  // ─── JSX ───
  return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', backgroundImage: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)', paddingBottom: 96, color: 'rgba(255,255,255,0.95)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(180deg, rgba(7,18,12,0.97), rgba(7,18,12,0.92))', borderBottom: '1px solid rgba(52,211,153,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '12px 16px' }}>
        <div className="flex items-center justify-between gap-2">
          <h1 style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: -0.3 }}>{t('photoAudit.wrapUpHeader')}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncQueue}
              disabled={syncingQueue}
              title={t('photoAudit.syncButtonTitle')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: syncingQueue ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${syncingQueue ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.12)'}`, color: syncingQueue ? '#f59e0b' : 'rgba(255,255,255,0.70)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: syncingQueue ? 'wait' : 'pointer', transition: 'all 120ms ease' }}
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
              <span>{syncingQueue ? t('photoAudit.syncing') : t('photoAudit.sync')}</span>
            </button>
            {zone === 'all' && (
              <button
                type="button"
                onClick={() => setTodayFilter(v => !v)}
                title={t('photoAudit.todayFilterTitle')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: todayFilter ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${todayFilter ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.12)'}`, color: todayFilter ? '#34d399' : 'rgba(255,255,255,0.70)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms ease' }}
              >
                {t('photoAudit.today')}
              </button>
            )}
            {isPhotoZone && !todayFilter && (
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as DateRange)}
                style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 8, color: 'rgba(255,255,255,0.70)', fontFamily: "'Inter', sans-serif", fontSize: 13, padding: '4px 8px', outline: 'none' }}
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
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
              <span>🧠 {t('audit.smartLearning')}</span>
              <span>{smartLearningStats.described}/{smartLearningStats.total} ({Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%)</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 4 }}>
              <div
                style={{ background: 'rgba(245,158,11,0.85)', borderRadius: 999, height: 4, transition: 'width 500ms ease', width: `${Math.round((smartLearningStats.described / smartLearningStats.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 4 tabs — same line, same style */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {ZONE_TABS.map((tab) => {
            const isActive = zone === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setZone(tab.key as Zone)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: isActive ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.10)'}`, color: isActive ? '#34d399' : 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 120ms ease' }}
              >
                {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Reclassify progress bar (shown during batch processing) */}
        {reclassifying && (
          <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.20)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#f59e0b' }}>
                {t('audit.reclassifyProgress') || 'Reclassifying'} {reclassifyProgress.current}/{reclassifyProgress.total}...
              </span>
              <button
                onClick={() => { reclassifyCancelledRef.current = true; }}
                style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer' }}
              >
                {t('audit.reclassifyCancel') || 'Cancel'}
              </button>
            </div>
            <div style={{ width: '100%', background: 'rgba(245,158,11,0.12)', borderRadius: 999, height: 6 }}>
              <div
                style={{ background: 'rgba(245,158,11,0.70)', borderRadius: 999, height: 6, transition: 'width 300ms ease', width: `${reclassifyProgress.total > 0 ? Math.round((reclassifyProgress.current / reclassifyProgress.total) * 100) : 0}%` }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10 }}>
              <span style={{ color: '#34d399' }}>{reclassifyProgress.green} identified</span>
              <span style={{ color: '#f59e0b' }}>{reclassifyProgress.amber} review</span>
              <span style={{ color: 'rgba(239,68,68,0.85)' }}>{reclassifyProgress.red} unknown</span>
              {reclassifyProgress.custom > 0 && <span style={{ color: 'rgba(96,165,250,0.85)' }}>{reclassifyProgress.custom} custom</span>}
              {reclassifyProgress.errors > 0 && <span style={{ color: 'rgba(255,255,255,0.40)' }}>{reclassifyProgress.errors} errors</span>}
            </div>
          </div>
        )}
      </div>

      {/* ─── Weekly Wrap (unified — Teacher + Parent sub-views toggled inside the tab) ─── */}
      {zone === 'weekly_wrap' && classroomIdState && (
        <WeeklyWrapTab
          classroomId={classroomIdState}
        />
      )}

      {/* ─── Weekly Admin Docs (Summary + Plan DOCX generation) ─── */}
      {zone === 'weekly_admin' && classroomIdState && (
        <WeeklyAdminTab
          classroomId={classroomIdState}
        />
      )}

      {/* ─── Get Advice (Guru next-steps per child) ─── */}
      {isGetAdviceZone && classroomIdState && (
        <GetAdviceTab
          photos={photos}
          classroomId={classroomIdState}
        />
      )}

      {/* Loading state */}
      {isPhotoZone && loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.20)', borderTopColor: '#34d399' }} />
        </div>
      )}

      {/* Empty state */}
      {isPhotoZone && !loading && filteredPhotos.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📷</div>
          <div style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.90)', letterSpacing: -0.2 }}>{t('audit.noPhotos')}</div>
        </div>
      )}

      {/* Photo grid */}
      {isPhotoZone && !loading && filteredPhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, padding: 16 }}>
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
              onToggleDiscussion={() => handleToggleDiscussion(photo)}
              rerunResult={rerunResults[photo.id] || null}
              onAcceptResult={() => handleAcceptResult(photo)}
              onAcceptDraft={() => openThisIsSheet(photo)}
              onConfirmDraft={() => handleConfirmHaikuDraft(photo)}
              onConfirmCandidate={(cand) => handleConfirmCandidate(photo, cand)}
              onTellAI={() => setTellAiPhoto(photo)}
              onReidentify={() => handleReidentify(photo)}
              onPhotoTap={() => photo.url && setLightboxUrl(photo.url)}
              onSaveNote={(caption) => handleSaveNote(photo.id, caption)}
              processing={processingId === photo.id}
              workStatus={workStatuses[`${photo.child_id}:${photo.work_name}`] || null}
              onSetStatus={(status) => handleSetStatus(photo, status)}
              unifiedTagger={isEnabled('unified_photo_tagger')}
              discussionEnabled={isEnabled('wrap_discussion')}
              nowTs={nowTs}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '16px 0' }}>
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: 14, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.35 : 1 }}
          >
            ←
          </button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: 14, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.35 : 1 }}
          >
            →
          </button>
        </div>
      )}

      {/* Load more photos from server. Only shown on photo zones with photos
          already loaded AND server signalled more may be available. Sits below
          client-side pagination so the natural read order is: scroll → page →
          load more from server. Padding-bottom buffers above the floating
          action bar (zIndex 20) which sits at viewport bottom. */}
      {isPhotoZone && !loading && photos.length > 0 && hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px 80px' }}>
          {loadingMore ? (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', padding: '8px 16px' }}>
              {t('audit.loadingMore')}
            </span>
          ) : (
            <button
              type="button"
              onClick={loadMorePhotos}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.25)', color: 'rgba(255,255,255,0.78)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms ease' }}
            >
              {t('audit.loadMore')}
            </button>
          )}
        </div>
      )}

      {/* Floating action bar (photo audit only) */}
      {isPhotoZone && filteredPhotos.length > 0 && !loading && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, rgba(7,18,12,0.92), rgba(7,18,12,0.97))', borderTop: '1px solid rgba(52,211,153,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '12px 16px', zIndex: 20 }}>
          {selectedIds.size === 0 ? (
            /* No selection — just Select All */
            <div className="flex items-center justify-center">
              <button
                onClick={selectAllVisible}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.20)', color: 'rgba(255,255,255,0.70)', fontSize: 13, cursor: 'pointer' }}
              >
                {t('audit.selectAll')} ({filteredPhotos.length})
              </button>
            </div>
          ) : (
            /* Photos selected — show action buttons */
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginRight: 4 }}>{selectedIds.size} of {filteredPhotos.length} selected</span>
              <button
                onClick={handleRunHaiku}
                disabled={haikusRunning || batchProcessing}
                style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.40)', color: 'rgba(165,180,252,0.90)', fontSize: 13, fontWeight: 500, cursor: haikusRunning || batchProcessing ? 'not-allowed' : 'pointer', opacity: haikusRunning || batchProcessing ? 0.5 : 1 }}
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
                style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontSize: 13, fontWeight: 600, cursor: haikusRunning || batchProcessing ? 'not-allowed' : 'pointer', opacity: haikusRunning || batchProcessing ? 0.5 : 1 }}
              >
                {batchProcessing ? `Confirming...` : `✓ Confirm ${selectedIds.size}`}
              </button>
              {haikusRunning && (
                <button
                  onClick={() => { haikuCancelledRef.current = true; }}
                  style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.60)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={clearSelection}
                style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 13, cursor: 'pointer' }}
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(7,18,12,0.90)', backdropFilter: 'blur(12px)', borderRadius: 999, border: '1px solid rgba(52,211,153,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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
            child_name: thisIsPhoto.child_name || thisIsPhoto.child_names?.[0] || '',
            captured_at: thisIsPhoto.captured_at || '',
            current_work_id: thisIsPhoto.work_id || null,
            current_work_name: thisIsPhoto.work_name || null,
            current_area: thisIsPhoto.area || null,
            sonnet_draft: thisIsPhoto.sonnet_draft || null,
          }}
          classroomId={getSession()?.classroom?.id || null}
          onResolve={(resolution) => handleResolvePhoto(thisIsPhoto, resolution)}
          onDiscussionFlag={(photoId) => {
            const p = photos.find(ph => ph.id === photoId);
            if (p) handleToggleDiscussion(p);
          }}
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
          <div style={{ background: 'rgba(7,18,12,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 18, maxWidth: 380, width: '100%', padding: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 8px' }}>🧠 {t('audit.teachAI')}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>{cropChoicePhoto.work_name}</p>

            {cropChoicePhoto.url && (
              <img src={cropChoicePhoto.url} alt={cropChoicePhoto.work_name || ''}
                loading="lazy" decoding="async"
                className="w-full h-36 object-cover rounded-lg mb-4" />
            )}

            <div className="space-y-2">
              <button
                onClick={handleCropAndTeach}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: 'rgba(165,180,252,0.90)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
              >
                ✂️ {t('audit.cropAndTeach')}
              </button>
              <button
                onClick={handleUseFullPhoto}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
              >
                🖼️ {t('audit.useFullPhoto')}
              </button>
              <button
                onClick={() => setCropChoicePhoto(null)}
                style={{ width: '100%', padding: '8px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
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
          <div style={{ background: 'rgba(7,18,12,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.20)', borderTopColor: '#34d399' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{t('audit.uploadingCrop')}</p>
          </div>
        </div>
      )}

      {/* Child Tagger Modal */}
      {taggingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setTaggingPhoto(null)}>
          <div style={{ background: 'rgba(7,18,12,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 18, maxWidth: 380, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 5px' }}>👶 {t('audit.tagChildren')}</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taggingPhoto.work_name || t('audit.untaggedWork')}</p>

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
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: checked ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 100ms ease' }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: checked ? 'rgba(52,211,153,0.25)' : 'transparent', border: `1.5px solid ${checked ? 'rgba(52,211,153,0.70)' : 'rgba(255,255,255,0.25)'}`, color: '#34d399', flexShrink: 0 }}>
                      {checked && '✓'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{child.name}</span>
                  </button>
                );
              })}
              {classroomChildren.length === 0 && (
                <p className="text-sm text-[#A1887F] text-center py-4">{t('common.loading')}</p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(52,211,153,0.10)' }}>
              <button
                onClick={handleSaveChildTags}
                disabled={taggingSaving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontWeight: 600, fontSize: 13, cursor: taggingSaving ? 'wait' : 'pointer', opacity: taggingSaving ? 0.6 : 1 }}
              >
                {taggingSaving ? '...' : t('common.save')}
              </button>
              <button
                onClick={() => setTaggingPhoto(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
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
          <div style={{ background: 'rgba(7,18,12,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 18, maxWidth: 460, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-lora), Georgia, serif", fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: '0 0 12px' }}>
              🧠 {t('audit.teachAI')}
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>{describingPhoto.work_name}</p>

            {/* Photo preview — show crop if available, else original */}
            {(croppedReferenceUrl || describingPhoto.url) && (
              <img src={croppedReferenceUrl || describingPhoto.url || ''} alt={describingPhoto.work_name || ''}
                loading="lazy" decoding="async"
                className="w-full h-40 object-cover rounded-lg mb-3" />
            )}

            {describeLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.20)', borderTopColor: '#34d399' }} />
                <span style={{ marginLeft: 12, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t('audit.describing')}</span>
              </div>
            )}

            {describeResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{t('audit.visualDescription')}</label>
                  <p style={{ fontSize: 12, marginTop: 0, background: 'rgba(0,0,0,0.20)', borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>{describeResult.visual_description}</p>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{t('audit.parentDescription')}</label>
                  <p style={{ fontSize: 12, marginTop: 0, background: 'rgba(0,0,0,0.20)', borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>{describeResult.parent_description}</p>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{t('audit.whyItMatters')}</label>
                  <p style={{ fontSize: 12, marginTop: 0, background: 'rgba(0,0,0,0.20)', borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>{describeResult.why_it_matters}</p>
                </div>
                {describeResult.key_materials.length > 0 && (
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>{t('audit.keyMaterials')}</label>
                    <p style={{ fontSize: 12, marginTop: 0, background: 'rgba(0,0,0,0.20)', borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>{describeResult.key_materials.join(', ')}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  <button
                    onClick={handleConfirmReference}
                    disabled={describeSaving}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.40)', color: 'rgba(165,180,252,0.90)', fontSize: 13, fontWeight: 500, cursor: describeSaving ? 'wait' : 'pointer', opacity: describeSaving ? 0.5 : 1 }}
                  >
                    {describeSaving ? '...' : t('audit.saveReference')}
                  </button>
                  <button
                    onClick={handleCancelReference}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {!describeLoading && !describeResult && (
              <button onClick={handleCancelReference}
                style={{ width: '100%', padding: '8px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 16 }}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared style for the fast custom hover tooltips on icon-only buttons.
// React state tracks hover (instead of HTML `title`) so the tooltip appears
// immediately rather than after the browser's slow ~1500ms native delay.
const iconTooltipStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(7,18,12,0.96)',
  color: 'rgba(255,255,255,0.95)',
  padding: '4px 9px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 50,
  border: '1px solid rgba(52,211,153,0.30)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.40)',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

// ─── AuditPhotoCard ───
// Wrapped in memo() at the bottom — unrelated state changes in the parent
// (note typing on a different card, filter changes, pagination) no longer
// cascade re-renders into every card. Critical when 200-500 photos are
// loaded on one page. The custom comparator on memo skips re-render unless
// the photo data, selection state, processing flag, or workStatus changed.
function AuditPhotoCardInner({ photo, selected, onToggle, onConfirm, onCorrect, onUseAsReference, onTagChildren, onDelete, onMarkAsPaperwork, onToggleDiscussion, rerunResult, onAcceptResult, onAcceptDraft, onConfirmDraft, onConfirmCandidate, onTellAI, onReidentify, onPhotoTap, onSaveNote, processing, workStatus, onSetStatus, unifiedTagger, discussionEnabled, nowTs, t }: {
  photo: AuditPhoto;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
  onUseAsReference: () => void;
  onTagChildren: () => void;
  onDelete: () => void;
  onMarkAsPaperwork: () => void;
  onToggleDiscussion: () => void;
  rerunResult: { work_name: string | null; work_id: string | null; area: string | null; confidence: number | null; scenario: string | null; visual_description: string | null; model_used: string | null; loading: boolean; error: string | null } | null;
  onAcceptResult: () => void;
  onAcceptDraft: () => void;
  onConfirmDraft: () => void;
  /** Quick-tap chip: teacher picks one of the top-3 candidates from
   *  matchToCurriculumV2. Resolves to a curriculum work + attaches the photo. */
  onConfirmCandidate: (candidate: { workName: string; workKey: string | null; area: string | null }) => void;
  onTellAI: () => void;
  onReidentify: () => void;
  onPhotoTap: () => void;
  onSaveNote: (caption: string) => void;
  processing: boolean;
  workStatus: string | null;
  onSetStatus: (status: 'presented' | 'practicing' | 'mastered') => void;
  unifiedTagger: boolean;
  discussionEnabled: boolean;
  /** Clock value (ms) refreshed in the parent on an interval — used for recency
   *  checks so the card never reads Date.now() during render (purity rule). */
  nowTs: number;
  t: (key: string) => string;
}) {
  const [noteText, setNoteText] = useState(photo.caption || '');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which icon button is currently hovered for the fast custom tooltip.
  // We use this instead of the HTML `title` attribute because native browser
  // tooltips have a slow ~1500ms delay and were invisible to teachers in
  // practice — they hover, see nothing, move on.
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

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

  // Flush-save on blur: when the teacher clicks away from the textarea, save
  // immediately instead of waiting for the 1.2s debounce. Avoids the "did it
  // save?" anxiety when navigating away from a card.
  const handleNoteBlur = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (noteText !== (photo.caption || '')) {
      setNoteSaving(true);
      onSaveNote(noteText);
      setTimeout(() => { setNoteSaving(false); setNoteSaved(true); }, 400);
    }
  }, [noteText, photo.caption, onSaveNote]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // zone accent colors for the top border strip
  const zoneAccent: Record<string, string> = {
    green: 'rgba(52,211,153,0.60)',
    amber: 'rgba(245,158,11,0.55)',
    red: 'rgba(239,68,68,0.55)',
    untagged: 'rgba(255,255,255,0.15)',
  };

  return (
    <div
      style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        background: selected ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${selected ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.15)'}`,
        boxShadow: selected ? '0 0 0 2px rgba(52,211,153,0.25)' : 'none',
        transition: 'border-color 150ms ease, background 150ms ease',
        contentVisibility: 'auto', containIntrinsicSize: '1px 320px',
        borderTop: `2px solid ${zoneAccent[photo.zone] || 'rgba(255,255,255,0.15)'}`,
      }}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, width: 24, height: 24, borderRadius: 6, background: selected ? 'rgba(52,211,153,0.30)' : 'rgba(7,18,12,0.82)', border: `1px solid ${selected ? 'rgba(52,211,153,0.70)' : 'rgba(255,255,255,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 120ms ease' }}
      >
        {selected && <span style={{ color: '#34d399', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </button>

      {/* Zone badge */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, width: 10, height: 10, borderRadius: '50%', background: photo.zone === 'green' ? '#34d399' : photo.zone === 'amber' ? '#f59e0b' : photo.zone === 'red' ? '#ef4444' : 'rgba(255,255,255,0.30)', boxShadow: '0 0 6px rgba(0,0,0,0.40)' }} />

      {/* Confirmed overlay — shown in "Today (All)" view so teachers can spot
          already-resolved photos at a glance while scanning the day's captures. */}
      {photo.teacher_confirmed === true && (
        <div style={{ position: 'absolute', top: 10, left: 40, zIndex: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,0.95)', color: '#06281a', fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
          ✓ CONFIRMED
        </div>
      )}

      {/* Photo — tap to view full size */}
      <div style={{ aspectRatio: '4/3', background: 'rgba(0,0,0,0.30)', cursor: 'pointer' }} onClick={onPhotoTap}>
        {photo.url ? (
          <img
            src={photo.thumbnail_path ? getThumbnailUrl(photo.thumbnail_path, 480) : photo.url}
            srcSet={photo.thumbnail_path ? getThumbnailSrcSet(photo.thumbnail_path, 480) : undefined}
            sizes="(max-width: 640px) 100vw, 50vw"
            alt={photo.work_name || 'Photo'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'rgba(255,255,255,0.20)' }}>📷</div>
        )}
      </div>

      {/* Sonnet draft — rich AI proposal for unidentified photos */}
      {photo.sonnet_draft && photo.identification_status === 'sonnet_drafted' && (
        <div style={{ padding: '10px 12px', background: 'rgba(139,92,246,0.08)', borderTop: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(196,181,253,0.90)', letterSpacing: 0.5, textTransform: 'uppercase' }}>✨ AI Draft</span>
            {typeof photo.sonnet_draft.confidence === 'number' && (
              <span style={{ fontSize: 9, color: 'rgba(196,181,253,0.60)' }}>· {Math.round(photo.sonnet_draft.confidence * 100)}%</span>
            )}
          </div>
          {photo.sonnet_draft.proposed_name && (
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(233,213,255,0.95)', lineHeight: 1.3, margin: '0 0 3px' }}>{photo.sonnet_draft.proposed_name}</p>
          )}
          {photo.sonnet_draft.suggested_area && (
            <p style={{ fontSize: 9, color: 'rgba(196,181,253,0.70)', textTransform: 'capitalize', margin: 0 }}>{photo.sonnet_draft.suggested_area.replace(/_/g, ' ')}</p>
          )}
          {photo.sonnet_draft.visual_description && (
            <p style={{ fontSize: 9, color: 'rgba(233,213,255,0.75)', lineHeight: 1.4, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{photo.sonnet_draft.visual_description}</p>
          )}
          {photo.sonnet_draft.key_materials && photo.sonnet_draft.key_materials.length > 0 && (
            <p style={{ fontSize: 9, color: 'rgba(196,181,253,0.70)', marginTop: 4 }}><span style={{ fontWeight: 600 }}>Materials:</span> {photo.sonnet_draft.key_materials.slice(0, 4).join(', ')}</p>
          )}
          {photo.sonnet_draft.closest_existing_match?.work_name && (
            <p style={{ fontSize: 9, color: 'rgba(245,158,11,0.80)', marginTop: 4 }}>
              ≈ Similar to <span style={{ fontWeight: 600 }}>{photo.sonnet_draft.closest_existing_match.work_name}</span>
              {typeof photo.sonnet_draft.closest_existing_match.similarity === 'number' && (
                <span style={{ opacity: 0.70 }}> ({Math.round(photo.sonnet_draft.closest_existing_match.similarity * 100)}%)</span>
              )}
            </p>
          )}
          {/* Top-3 candidate sibling chips — same pattern as haiku_matched / haiku_drafted.
              `matchToCurriculumV2` persists top_candidates to sonnet_draft (Session 105
              rule #32) so Sonnet drafts can also offer one-tap fixes when the #1 was
              wrong but #2 or #3 is right. Falls back to closest_existing_match if no
              top_candidates available. */}
          {(() => {
            const proposed = (photo.sonnet_draft?.proposed_name || '').toLowerCase().trim();
            const fromTop = (photo.sonnet_draft?.top_candidates || []).filter(
              (c) => c.workName.toLowerCase().trim() !== proposed
            ).slice(0, 2);
            // Fall back to closest_existing_match if top_candidates is empty but Sonnet
            // surfaced one alternative anyway. Shape-adapt so onConfirmCandidate works.
            const closest = photo.sonnet_draft?.closest_existing_match;
            const fromClosest =
              fromTop.length === 0 && closest?.work_name
                ? [{
                    workName: closest.work_name,
                    workKey: closest.work_name,
                    area: photo.sonnet_draft?.suggested_area || 'language',
                    score: closest.similarity ?? 0,
                  }]
                : [];
            const siblings = fromTop.length > 0 ? fromTop : fromClosest;
            if (siblings.length === 0) return null;
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(196,181,253,0.55)', alignSelf: 'center', marginRight: 2 }}>{t('audit.orPick')}:</span>
                {siblings.map((cand) => (
                  <button
                    key={cand.workKey || cand.workName}
                    onClick={() => onConfirmCandidate(cand)}
                    disabled={processing}
                    style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 999,
                      background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.32)',
                      color: 'rgba(233,213,255,0.92)', fontWeight: 500,
                      cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1,
                      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={`${cand.workName} (${Math.round((cand.score || 0) * 100)}%)`}
                  >
                    {cand.workName}
                  </button>
                ))}
              </div>
            );
          })()}
          {unifiedTagger ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={onConfirmDraft} disabled={processing} style={{ flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                {processing ? '...' : '✓ Correct'}
              </button>
              <button onClick={onAcceptDraft} disabled={processing} style={{ flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.40)', color: 'rgba(196,181,253,0.90)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                {processing ? '...' : '🏷️ This is…'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={onConfirmDraft} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                  {processing ? '...' : '✓ Correct'}
                </button>
                <button onClick={onCorrect} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(196,181,253,0.85)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                  ✏️ Fix
                </button>
              </div>
              <button onClick={onTellAI} disabled={processing} style={{ width: '100%', fontSize: 10, padding: '6px 0', marginTop: 4, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(196,181,253,0.70)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                🗣️ Tell AI what it is
              </button>
            </>
          )}
        </div>
      )}

      {/* Haiku draft — Gate A failed; Haiku result available for optional Sonnet enrichment.
          Teacher can click "Ask Sonnet" to enrich with full analysis, or "This is..." to resolve. */}
      {photo.identification_status === 'haiku_drafted' && photo.identification_confidence !== null && (
        <div style={{ padding: '10px 12px', background: 'rgba(20,184,166,0.07)', borderTop: '1px solid rgba(20,184,166,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(94,234,212,0.90)', letterSpacing: 0.5, textTransform: 'uppercase' }}>🧠 Haiku Draft</span>
            {typeof photo.identification_confidence === 'number' && (
              <span style={{ fontSize: 9, color: 'rgba(94,234,212,0.60)' }}>· {Math.round(photo.identification_confidence * 100)}%</span>
            )}
          </div>
          {(photo.work_name || photo.sonnet_draft?.proposed_name) && (
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(204,251,241,0.95)', lineHeight: 1.3, margin: '0 0 3px' }}>{photo.work_name || photo.sonnet_draft?.proposed_name}</p>
          )}
          {photo.sonnet_draft?.suggested_area && (
            <p style={{ fontSize: 9, color: 'rgba(94,234,212,0.65)', textTransform: 'capitalize', margin: 0 }}>{photo.sonnet_draft.suggested_area.replace(/_/g, ' ')}</p>
          )}
          <p style={{ fontSize: 9, color: 'rgba(94,234,212,0.65)', marginTop: 4, fontStyle: 'italic' }}>Haiku identified this, but has low confidence — ask Sonnet for deeper analysis.</p>
          {photo.sonnet_draft?.visual_description && (
            <p style={{ fontSize: 9, color: 'rgba(204,251,241,0.72)', lineHeight: 1.4, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>👁 {photo.sonnet_draft.visual_description}</p>
          )}
          {/* Top-3 candidate sibling chips — same pattern as haiku_matched */}
          {(() => {
            const proposed = (photo.sonnet_draft?.proposed_name || photo.work_name || '').toLowerCase().trim();
            const siblings = (photo.sonnet_draft?.top_candidates || []).filter(
              (c) => c.workName.toLowerCase().trim() !== proposed
            ).slice(0, 2);
            if (siblings.length === 0) return null;
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(94,234,212,0.55)', alignSelf: 'center', marginRight: 2 }}>{t('audit.orPick')}:</span>
                {siblings.map((cand) => (
                  <button
                    key={cand.workKey || cand.workName}
                    onClick={() => onConfirmCandidate(cand)}
                    disabled={processing}
                    style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 999,
                      background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.30)',
                      color: 'rgba(204,251,241,0.92)', fontWeight: 500,
                      cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1,
                      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={`${cand.workName} (${Math.round((cand.score || 0) * 100)}%)`}
                  >
                    {cand.workName}
                  </button>
                ))}
              </div>
            );
          })()}
          {/* Always show ✓ Correct + ✏️ Wrong — same pattern as haiku_matched */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={onConfirmDraft} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'rgba(20,184,166,0.20)', border: '1px solid rgba(20,184,166,0.40)', color: 'rgba(94,234,212,0.90)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
              {processing ? '...' : '✓ Correct'}
            </button>
            <button onClick={onAcceptDraft} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.28)', color: 'rgba(94,234,212,0.80)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
              ✏️ Wrong
            </button>
          </div>
          <button
            onClick={() => {
              // Call Ask Sonnet endpoint — teacher-triggered enrichment
              toast.promise(
                (async () => {
                  const response = await fetch('/api/montree/photo-identification/sonnet-review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ media_id: photo.id }),
                    credentials: 'include',
                  });
                  if (!response.ok) throw new Error('Sonnet enrichment failed');
                  const result = await response.json();
                  if (!result.success) throw new Error(result.errors?.join(', ') || 'Unknown error');
                  // Refetch photos to pick up the new sonnet_draft and updated identification_status
                  fetchPhotos();
                  return result;
                })(),
                {
                  loading: 'Asking Sonnet for deeper analysis...',
                  success: 'Sonnet analysis ready',
                  error: (err) => err.message,
                }
              );
            }}
            disabled={processing}
            style={{ width: '100%', fontSize: 10, padding: '6px 0', marginTop: 4, borderRadius: 8, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.22)', color: 'rgba(94,234,212,0.70)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
            title="Call Sonnet for richer analysis"
          >
            🧠 Ask Sonnet
          </button>
        </div>
      )}

      {/* Haiku auto-match banner — Gate A silently tagged this photo without
          Sonnet review. Rendered as a distinct amber card so teachers can
          spot + verify auto-tags instead of eye-passing them as confirmed. */}
      {photo.identification_status === 'haiku_matched' && photo.work_name && (
        <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.07)', borderTop: '1px solid rgba(245,158,11,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(253,230,138,0.90)', letterSpacing: 0.5, textTransform: 'uppercase' }}>🤖 Haiku Auto-Match</span>
            {typeof photo.identification_confidence === 'number' && (
              <span style={{ fontSize: 9, color: 'rgba(253,230,138,0.60)' }}>· {Math.round(photo.identification_confidence * 100)}%</span>
            )}
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(254,243,199,0.95)', lineHeight: 1.3, margin: '0 0 4px' }}>{photo.work_name}</p>
          <p style={{ fontSize: 9, color: 'rgba(253,230,138,0.65)', fontStyle: 'italic', margin: 0 }}>{t('audit.autoTaggedHint')}</p>
          {photo.sonnet_draft?.visual_description && (
            <p style={{ fontSize: 9, color: 'rgba(254,243,199,0.72)', lineHeight: 1.4, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>👁 {photo.sonnet_draft.visual_description}</p>
          )}
          {/* Top-3 candidate chips — only render the SIBLINGS (skip the one
              the AI already picked, since ✓ Correct does the same thing).
              Saves the teacher typing when Haiku's #2 or #3 is actually right. */}
          {(() => {
            const chosenName = (photo.work_name || '').toLowerCase().trim();
            const siblings = (photo.sonnet_draft?.top_candidates || []).filter(
              (c) => c.workName.toLowerCase().trim() !== chosenName
            ).slice(0, 2);
            if (siblings.length === 0) return null;
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(253,230,138,0.55)', alignSelf: 'center', marginRight: 2 }}>{t('audit.orPick')}:</span>
                {siblings.map((cand) => (
                  <button
                    key={cand.workKey || cand.workName}
                    onClick={() => onConfirmCandidate(cand)}
                    disabled={processing}
                    style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 999,
                      background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)',
                      color: 'rgba(254,243,199,0.92)', fontWeight: 500,
                      cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1,
                      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={`${cand.workName} (${Math.round((cand.score || 0) * 100)}%)`}
                  >
                    {cand.workName}
                  </button>
                ))}
              </div>
            );
          })()}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={onConfirm} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'rgba(245,158,11,0.20)', border: '1px solid rgba(245,158,11,0.40)', color: 'rgba(253,230,138,0.90)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
              {processing ? '...' : '✓ Correct'}
            </button>
            <button onClick={onAcceptDraft} disabled={processing} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,158,11,0.28)', color: 'rgba(253,230,138,0.80)', fontWeight: 600, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
              ✏️ Wrong
            </button>
          </div>
        </div>
      )}

      {/* Info + actions */}
      <div style={{ padding: '10px 12px 10px', background: 'rgba(0,0,0,0.18)' }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.work_name || photo.sonnet_draft?.proposed_name || t('audit.untaggedWork')}</p>
        {/* Multi-child display with tag button */}
        <button
          onClick={onTagChildren}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
          title={t('audit.tagChildren')}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {photo.child_names && photo.child_names.length > 0
              ? photo.child_names.join(', ')
              : photo.child_name || t('audit.noChildrenTagged')}
          </span>
          <span style={{ flexShrink: 0, opacity: 0.5 }}>👶+</span>
        </button>
        {photo.confidence !== null && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {Math.round(photo.confidence * 100)}%
          </p>
        )}
        {/* Re-run classification result display */}
        {rerunResult && !rerunResult.loading && !rerunResult.error && (
          <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(165,180,252,0.85)', marginBottom: 4 }}>
              Haiku Result
              {rerunResult.model_used && <span style={{ fontWeight: 400, color: 'rgba(165,180,252,0.50)', marginLeft: 4 }}>({rerunResult.model_used.includes('haiku') ? 'Haiku' : 'Sonnet'})</span>}
            </p>
            {rerunResult.visual_description && (
              <div style={{ marginBottom: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}>
                <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(196,181,253,0.70)', marginBottom: 3 }}>👁 Pass 1 — What AI Sees:</p>
                <p style={{ fontSize: 9, color: 'rgba(233,213,255,0.75)', lineHeight: 1.4, margin: 0 }}>{rerunResult.visual_description}</p>
              </div>
            )}
            {rerunResult.work_name ? (
              <>
                <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(165,180,252,0.90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{rerunResult.work_name}</p>
                <p style={{ fontSize: 9, color: 'rgba(165,180,252,0.55)', margin: '2px 0 0' }}>
                  {rerunResult.area && <span style={{ textTransform: 'capitalize' }}>{rerunResult.area.replace(/_/g, ' ')}</span>}
                  {rerunResult.confidence !== null && <span> · {Math.round(rerunResult.confidence * 100)}%</span>}
                </p>
                {rerunResult.work_id && (
                  <button onClick={onAcceptResult} disabled={processing} style={{ marginTop: 6, width: '100%', fontSize: 10, padding: '5px 0', borderRadius: 6, background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.40)', color: 'rgba(165,180,252,0.90)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}>
                    {processing ? '...' : '✓ Accept this match'}
                  </button>
                )}
              </>
            ) : (
              <p style={{ fontSize: 10, color: 'rgba(165,180,252,0.60)', fontStyle: 'italic', margin: 0 }}>
                No match found
                {rerunResult.confidence !== null && ` (${Math.round(rerunResult.confidence * 100)}%)`}
                {rerunResult.scenario && <span style={{ display: 'block', fontSize: 8, color: 'rgba(165,180,252,0.40)', marginTop: 2 }}>scenario: {rerunResult.scenario}</span>}
              </p>
            )}
          </div>
        )}
        {rerunResult?.loading && (
          <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
            <p style={{ fontSize: 10, color: 'rgba(165,180,252,0.70)', margin: 0 }} className="animate-pulse">{t('audit.rerunRunning')}</p>
          </div>
        )}
        {rerunResult?.error && (
          <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <p style={{ fontSize: 10, color: 'rgba(252,165,165,0.80)', margin: 0 }}>{rerunResult.error}</p>
            {rerunResult.visual_description && (
              <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}>
                <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(196,181,253,0.70)', marginBottom: 3 }}>👁 Pass 1 — What AI Sees:</p>
                <p style={{ fontSize: 9, color: 'rgba(233,213,255,0.75)', lineHeight: 1.4, margin: 0 }}>{rerunResult.visual_description}</p>
              </div>
            )}
          </div>
        )}
        {/* Work status: P/Pr/M buttons hidden — status auto-set to "practicing" on confirm.
            Kept in code for reinstatement if needed. See handleSetStatus + progressMap. */}
        {/* Fallback tag surface. Fires whenever NONE of the rich AI branches
            (sonnet_drafted / haiku_drafted / haiku_matched) rendered — which
            is the case for untagged photos whose cached sonnet_draft made the
            old `!photo.sonnet_draft` guard false, leaving the card with no way
            to tag a work. Always give the teacher a clear, prominent action. */}
        {(() => {
          const hasSonnetBranch = !!photo.sonnet_draft && photo.identification_status === 'sonnet_drafted';
          const hasHaikuDraftBranch = photo.identification_status === 'haiku_drafted' && photo.identification_confidence !== null;
          const hasHaikuMatchBranch = photo.identification_status === 'haiku_matched' && !!photo.work_name;
          if (hasSonnetBranch || hasHaikuDraftBranch || hasHaikuMatchBranch) return null;
          // PROCESSING state — the AI is still working on this capture (no
          // terminal result yet, captured recently). Show a clear "Identifying…"
          // indicator so an in-flight photo NEVER reads as a failure/Untagged.
          // Uses the shared isPhotoInFlight() — the SAME predicate that drives
          // the auto-refresh poll — so the spinner and the poll stay in lockstep
          // and the card flips to the AI's result the moment it lands.
          if (isPhotoInFlight(photo, nowTs)) {
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '14px 0', borderRadius: 8, background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.28)', color: 'rgba(94,234,212,0.95)', fontWeight: 600 }}>
                  <ProcessingHourglass size={30} />
                  <span>Identifying…</span>
                  <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(94,234,212,0.7)' }}>Reading the photo — usually a few seconds</span>
                </div>
                <button
                  onClick={onTellAI}
                  disabled={processing}
                  style={{ width: '100%', fontSize: 10, padding: '6px 0', marginTop: 5, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(196,181,253,0.70)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
                >
                  🗣️ Tell AI what it is
                </button>
              </div>
            );
          }
          // Gap 1 — always-suggest: even when the AI didn't land a tagged
          // draft (incl. "Other"), surface its closest curriculum guesses as
          // one-tap chips so this is never a blank dead-end.
          const fallbackCands = (photo.sonnet_draft?.top_candidates || []).slice(0, 2);
          return (
            <div style={{ marginTop: 8 }}>
              {/* Always show what the AI saw / its note, so this is never blank. */}
              {photo.sonnet_draft?.visual_description && (
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>👁 {photo.sonnet_draft.visual_description}</p>
              )}
              {!photo.sonnet_draft?.visual_description && photo.sonnet_draft?.observation && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4, marginBottom: 8 }}>{photo.sonnet_draft.observation}</p>
              )}
              {fallbackCands.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: 'rgba(94,234,212,0.65)', marginBottom: 4, fontWeight: 600 }}>🧠 Looks like — tap to tag:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {fallbackCands.map((cand) => (
                      <button
                        key={cand.workKey || cand.workName}
                        onClick={() => onConfirmCandidate(cand)}
                        disabled={processing}
                        style={{ fontSize: 10, padding: '4px 10px', borderRadius: 999, background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.30)', color: 'rgba(204,251,241,0.92)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={`${cand.workName} (${Math.round((cand.score || 0) * 100)}%)`}
                      >
                        {cand.workName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={onAcceptDraft}
                disabled={processing}
                style={{ width: '100%', fontSize: 12, padding: '10px 0', borderRadius: 8, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', color: '#06281a', fontWeight: 700, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
                title="Link this photo to a curriculum work"
              >
                {processing ? '...' : '🏷️ Tag a work'}
              </button>
              <button
                onClick={onTellAI}
                disabled={processing}
                style={{ width: '100%', fontSize: 10, padding: '6px 0', marginTop: 5, borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(196,181,253,0.70)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
              >
                🗣️ Tell AI what it is
              </button>
              <button
                onClick={onReidentify}
                disabled={processing}
                style={{ width: '100%', fontSize: 10, padding: '6px 0', marginTop: 5, borderRadius: 8, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.22)', color: 'rgba(94,234,212,0.70)', fontWeight: 500, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
                title="Re-run AI identification with the latest model"
              >
                {processing ? '...' : '↻ Re-identify'}
              </button>
            </div>
          );
        })()}
        {/* Utility actions — Confirm and Teach hidden (auto-handled on resolve/fix).
            Kept in code for reinstatement. Only delete remains visible. */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
          {/* 💬 Discussion flag toggle — instant tooltip via React state. Hidden
              when the Discussion tab is off for this school: flagging a photo
              pulls it out of the Confirm queue, so with no Discussion tab to hold
              it the photo would be stranded. */}
          {discussionEnabled && (
          <span
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setHoveredIcon('discussion')}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <button
              onClick={onToggleDiscussion}
              disabled={processing}
              style={{ fontSize: 10, padding: '4px 7px', borderRadius: 6, background: photo.discussion_flag ? 'rgba(96,165,250,0.18)' : 'rgba(96,165,250,0.07)', border: `1px solid ${photo.discussion_flag ? 'rgba(96,165,250,0.45)' : 'rgba(96,165,250,0.18)'}`, cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
              aria-label={photo.discussion_flag ? t('audit.toggleDiscussionRemove') : t('audit.toggleDiscussion')}
            >
              💬
            </button>
            {hoveredIcon === 'discussion' && (
              <span style={iconTooltipStyle}>
                {photo.discussion_flag ? t('audit.toggleDiscussionRemove') : t('audit.toggleDiscussion')}
              </span>
            )}
          </span>
          )}

          {/* 📋 Mark as paperwork. */}
          <span
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setHoveredIcon('paperwork')}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <button
              onClick={onMarkAsPaperwork}
              disabled={processing}
              style={{ fontSize: 10, padding: '4px 7px', borderRadius: 6, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
              aria-label={t('audit.markPaperwork')}
            >
              📋
            </button>
            {hoveredIcon === 'paperwork' && (
              <span style={iconTooltipStyle}>{t('audit.markPaperwork')}</span>
            )}
          </span>

          {/* 🗑️ Delete photo. */}
          <span
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setHoveredIcon('delete')}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <button
              onClick={onDelete}
              disabled={processing}
              style={{ fontSize: 10, padding: '4px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.5 : 1 }}
              aria-label={t('audit.deletePhoto')}
            >
              🗑️
            </button>
            {hoveredIcon === 'delete' && (
              <span style={iconTooltipStyle}>{t('audit.deletePhoto')}</span>
            )}
          </span>
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
            onBlur={handleNoteBlur}
            placeholder={t('audit.addNote')}
            style={{ width: '100%', fontSize: 10, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.12)', background: 'rgba(0,0,0,0.20)', color: 'rgba(255,255,255,0.75)', resize: 'none', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}
            rows={2}
          />
          {/* Save status indicator — bottom-right of the textarea so it doesn't
              collide with the mic button (z-10) up top. Visible 11px font on
              a translucent backdrop so the teacher actually sees feedback. */}
          {(noteSaving || noteSaved) && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                right: 6,
                fontSize: 10,
                fontWeight: 600,
                color: noteSaving ? 'rgba(255,255,255,0.55)' : '#34d399',
                background: 'rgba(7,18,12,0.85)',
                padding: '1px 6px',
                borderRadius: 4,
                pointerEvents: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {noteSaving ? `${t('audit.saving')}…` : `✓ ${t('audit.saved') || 'Saved'}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// memo() with a shallow comparator: re-render the card only when its OWN
// inputs change. Skips cascading renders when sibling cards mutate state
// (note typing, processing flips, selection toggles elsewhere in the grid).
// `t` is stable across the i18n locale lifetime, so we skip it from the
// comparison. Callbacks (onConfirm, onToggle, etc.) get new identities every
// parent render — we ignore them too: the parent passes them by closure and
// they always read the latest state from React's closure tree.
const AuditPhotoCard = memo(AuditPhotoCardInner, (prev, next) => {
  return (
    prev.photo === next.photo &&
    prev.selected === next.selected &&
    prev.processing === next.processing &&
    prev.workStatus === next.workStatus &&
    prev.rerunResult === next.rerunResult &&
    prev.unifiedTagger === next.unifiedTagger &&
    prev.discussionEnabled === next.discussionEnabled
  );
});
