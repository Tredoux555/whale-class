// /montree/dashboard/[childId]/gallery/page.tsx
// Gallery — Photo gallery with Smart Capture AI review, area grouping, timeline view
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import PhotoInsightButton from '@/components/montree/guru/PhotoInsightButton';
import TeachGuruWorkModal from '@/components/montree/guru/TeachGuruWorkModal';
import { updateEntryAfterCorrection } from '@/lib/montree/photo-insight-store';
import DeleteConfirmDialog from '@/components/montree/media/DeleteConfirmDialog';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import type { MontreeMedia } from '@/lib/montree/media/types';

interface GalleryItem extends MontreeMedia {
  area?: string;
  work_name?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  status?: string;
  sequence?: number;
  dbSequence?: number;
}

export default function GalleryPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { t, locale } = useI18n();
  const session = getSession();

  // Core state
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Editing state
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerArea, setPickerArea] = useState('');
  const [pickerPhotoId, setPickerPhotoId] = useState<string | null>(null);
  const [pickerCurrentWork, setPickerCurrentWork] = useState<string | undefined>(undefined);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [allProgress, setAllProgress] = useState<Array<{ work_name: string; status: string }>>([]);

  // Area picker state
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaPickerPhotoId, setAreaPickerPhotoId] = useState<string | null>(null);

  // Delete state
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Photo detail expansion
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Teach Guru Work modal state
  const [teachModalData, setTeachModalData] = useState<{ workName: string; area: string | null; mediaId: string } | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Lesson notes state
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  // Image URL cache
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const batchUrlLoadedRef = useRef(false);
  const prevChildIdRef = useRef(childId);

  // Reset URL cache when childId changes
  useEffect(() => {
    if (prevChildIdRef.current !== childId) {
      prevChildIdRef.current = childId;
      batchUrlLoadedRef.current = false;
      setImageUrls({});
      curriculumLoadedRef.current = false;
    }
  }, [childId]);

  // Fetch photos
  const fetchPhotosControllerRef = useRef<AbortController | null>(null);
  const fetchPhotos = useCallback(() => {
    if (!childId) return;
    // Abort any in-flight fetch
    fetchPhotosControllerRef.current?.abort();
    const controller = new AbortController();
    fetchPhotosControllerRef.current = controller;
    setLoading(true);
    batchUrlLoadedRef.current = false;
    fetch(`/api/montree/media?child_id=${childId}&limit=1000`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        const sorted = (data.media || []).sort((a: GalleryItem, b: GalleryItem) =>
          new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
        );
        setPhotos(sorted);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') toast.error(t('gallery.loadPhotosError'));
      })
      .finally(() => setLoading(false));
  }, [childId, t]);

  useEffect(() => {
    fetchPhotos();
    return () => { fetchPhotosControllerRef.current?.abort(); };
  }, [fetchPhotos]);

  // Fetch curriculum for wheel picker (lazy load)
  const curriculumLoadedRef = useRef(false);
  const curriculumLoadingRef = useRef(false);
  const loadCurriculum = useCallback(async () => {
    if (curriculumLoadedRef.current || curriculumLoadingRef.current) return;
    curriculumLoadingRef.current = true;
    try {
      const res = await fetch('/api/montree/works/search');
      if (!res.ok) throw new Error('Failed to load curriculum');
      const data = await res.json();
      const byArea: Record<string, CurriculumWork[]> = {};
      for (const w of data.works || []) {
        const areaKey = w.area?.area_key || 'unknown';
        if (!byArea[areaKey]) byArea[areaKey] = [];
        byArea[areaKey].push({
          id: w.id,
          name: w.name,
          name_chinese: w.name_chinese,
          sequence: w.sequence,
          dbSequence: w.sequence,
        });
      }
      setCurriculum(byArea);
      curriculumLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      curriculumLoadingRef.current = false;
    }
  }, []);

  // Batch-load all image URLs
  useEffect(() => {
    if (photos.length === 0 || batchUrlLoadedRef.current) return;
    batchUrlLoadedRef.current = true;

    const paths = photos.map(p => p.storage_path).filter(Boolean);
    if (paths.length === 0) return;

    const controller = new AbortController();
    fetch('/api/montree/media/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`Batch URL request failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.urls) {
          const urlMap: Record<string, string> = {};
          for (const photo of photos) {
            if (data.urls[photo.storage_path]) {
              urlMap[photo.id] = data.urls[photo.storage_path];
            }
          }
          setImageUrls(urlMap);
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Failed to batch-load image URLs:', err);
          batchUrlLoadedRef.current = false;
        }
      });
    return () => controller.abort();
  }, [photos]);

  // Photos grouped by area for the grid view
  const photosByArea = useMemo(() => {
    const map: Record<string, GalleryItem[]> = {};
    for (const area of AREA_ORDER) map[area] = [];
    map['untagged'] = [];
    for (const photo of photos) {
      const area = photo.area ? normalizeArea(photo.area) : 'untagged';
      if (!map[area]) map[area] = [];
      map[area].push(photo);
    }
    return map;
  }, [photos]);

  // Filtered photos based on view + area selection
  const filteredPhotos = useMemo(() => {
    if (selectedArea) return photos.filter(p => (p.area ? normalizeArea(p.area) : 'untagged') === selectedArea);
    return photos;
  }, [photos, selectedArea]);

  // Timeline grouping — memoized to avoid re-computing on every render
  const timelineGroups = useMemo(() => {
    const byDate = new Map<string, GalleryItem[]>();
    for (const photo of filteredPhotos) {
      const dateKey = new Date(photo.captured_at).toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(photo);
    }
    return Array.from(byDate.entries());
  }, [filteredPhotos]);

  // Clamp lightbox index when filtered photos change (e.g. after deletion or filter switch)
  useEffect(() => {
    if (lightboxOpen && filteredPhotos.length > 0 && lightboxIndex >= filteredPhotos.length) {
      setLightboxIndex(filteredPhotos.length - 1);
    } else if (lightboxOpen && filteredPhotos.length === 0) {
      setLightboxOpen(false);
      setLightboxIndex(0);
    }
  }, [filteredPhotos.length, lightboxOpen, lightboxIndex]);

  // ── Handlers ──

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const openWorkPicker = async (photo: GalleryItem) => {
    await loadCurriculum();
    if (!photo.area) {
      setAreaPickerPhotoId(photo.id);
      setShowAreaPicker(true);
      return;
    }
    setPickerArea(photo.area);
    setPickerPhotoId(photo.id);
    setPickerCurrentWork(photo.work_name || undefined);
    setPickerOpen(true);
  };

  const handleAreaSelected = (area: string) => {
    setShowAreaPicker(false);
    setPickerArea(area);
    setPickerPhotoId(areaPickerPhotoId);
    setPickerCurrentWork(undefined);
    setPickerOpen(true);
    setAreaPickerPhotoId(null);
  };

  const handleWorkSelected = async (work: CurriculumWork) => {
    if (!pickerPhotoId) return;
    setPickerOpen(false);
    try {
      const res = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pickerPhotoId, work_id: work.id }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setPhotos(prev => prev.map(p =>
        p.id === pickerPhotoId ? { ...p, work_id: work.id, work_name: work.name, area: pickerArea } : p
      ));
      toast.success(t('gallery.workUpdated'));
    } catch {
      toast.error(t('gallery.workUpdateError'));
    }
  };

  const saveCaption = async (photoId: string) => {
    setSavingCaption(true);
    try {
      const res = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId, caption: captionDraft }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, caption: captionDraft } : p
      ));
      setEditingCaption(null);
      toast.success(t('gallery.descriptionSaved'));
    } catch {
      toast.error(t('gallery.descriptionSaveError'));
    } finally {
      setSavingCaption(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/montree/media?id=${photoToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      // Clean up image URL cache for deleted photo
      setImageUrls(prev => { const next = { ...prev }; delete next[photoToDelete.id]; return next; });
      toast.success(t('gallery.photoDeletedSuccessfully'));
      setPhotoToDelete(null);
    } catch {
      toast.error(t('gallery.deletePhotoError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/montree/media?ids=${Array.from(selectedIds).join(',')}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      // Clean up image URL cache for deleted photos
      setImageUrls(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next; });
      toast.success(t('gallery.photosDeletedSuccessfully').replace('{count}', selectedIds.size.toString()));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setSelectionMode(false);
    } catch {
      toast.error(t('gallery.deletePhotosError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProgressUpdate = useCallback(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Use refs to avoid stale closures + recreation on every keystroke
  const notesDraftRef = useRef(notesDraft);
  notesDraftRef.current = notesDraft;
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const handleSaveNote = useCallback(async (photoId: string) => {
    const note = notesDraftRef.current[photoId]?.trim();
    if (!note) return;
    setSavingNote(photoId);
    try {
      const res = await fetch('/api/montree/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          behavior_description: note,
          activity_during: photosRef.current.find(p => p.id === photoId)?.work_name || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('gallery.noteSaved'));
      setNotesDraft(prev => { const next = { ...prev }; delete next[photoId]; return next; });
    } catch {
      toast.error(t('gallery.noteSaveError'));
    } finally {
      setSavingNote(null);
    }
  }, [childId, t]);

  const getAreaConfig = (area: string) =>
    AREA_CONFIG[normalizeArea(area)] || { name: area, icon: '?', color: '#888' };

  const getPickerWorks = (): CurriculumWork[] => {
    const works = curriculum[pickerArea] || [];
    return works.map(w => ({
      ...w,
      status: allProgress.find(p => p.work_name === w.name)?.status || 'not_started',
    }));
  };

  // ── Render: Photo Card ──
  const renderPhotoCard = (photo: GalleryItem) => {
    const isExpanded = expandedPhoto === photo.id;
    const isEditingThis = editingCaption === photo.id;
    const url = imageUrls[photo.id];

    return (
      <div
        key={photo.id}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Photo */}
        <div className="relative group">
          {selectionMode && (
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={selectedIds.has(photo.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedIds);
                  e.target.checked ? newSet.add(photo.id) : newSet.delete(photo.id);
                  setSelectedIds(newSet);
                }}
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (url) {
                const idx = filteredPhotos.findIndex(p => p.id === photo.id);
                setLightboxIndex(idx >= 0 ? idx : 0);
                setLightboxOpen(true);
              }
              setExpandedPhoto(isExpanded ? null : photo.id);
            }}
            className="w-full"
          >
            {url ? (
              <img
                src={url}
                alt={photo.work_name || photo.caption || 'Photo'}
                className={`w-full object-cover transition-all ${isExpanded ? 'max-h-[60vh]' : 'aspect-[4/3]'}`}
              />
            ) : (
              <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}
          </button>

          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-xs font-medium backdrop-blur-sm">
            {formatDate(photo.captured_at)}
          </div>

          {!selectionMode && (
            <button
              onClick={() => setPhotoToDelete(photo)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/40 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
              aria-label="Delete photo"
            >
              🗑
            </button>
          )}
        </div>

        {/* Work tag + AI Review */}
        <div className="p-3 space-y-2">
          {/* Work tag */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openWorkPicker(photo)}
              className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left group/tag"
            >
              {photo.area ? (
                <AreaBadge area={photo.area} size="sm" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">?</div>
              )}
              <span className="font-semibold text-gray-800 text-sm truncate flex-1">
                {photo.work_name || t('gallery.untagged')}
              </span>
              <span className="text-gray-400 text-xs opacity-0 group-hover/tag:opacity-100 transition-opacity">
                {t('gallery.tapToChange')}
              </span>
            </button>
          </div>

          {/* Caption editing */}
          {isEditingThis ? (
            <div className="space-y-2">
              <textarea
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={3}
                autoFocus
                placeholder={t('gallery.addDescription')}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCaption(null)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => saveCaption(photo.id)}
                  disabled={savingCaption}
                  className="flex-1 px-3 py-1.5 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {savingCaption ? '...' : t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingCaption(photo.id);
                setCaptionDraft(photo.caption || '');
              }}
              className="w-full text-left"
            >
              {photo.caption ? (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 hover:text-gray-800 transition-colors">
                  {photo.caption}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic hover:text-gray-600 transition-colors">
                  {t('gallery.tapToAddDescription')}
                </p>
              )}
            </button>
          )}

          {/* Smart Capture / Photo Insight — AI confirm/reject UI */}
          <div className="pt-1 border-t border-gray-50">
            <PhotoInsightButton
              mediaId={photo.id}
              childId={childId}
              classroomId={session?.classroom?.id}
              onProgressUpdate={handleProgressUpdate}
              onTeachWork={(data) => setTeachModalData(data)}
              onAddToClassroom={() => fetchPhotos()}
              onAddToShelf={() => fetchPhotos()}
            />
          </div>

          {/* Lesson Notes — observation textarea */}
          <div className="pt-1 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-500 mb-1">{t('gallery.lessonNotes')}</p>
            <textarea
              value={notesDraft[photo.id] || ''}
              onChange={(e) => setNotesDraft(prev => ({ ...prev, [photo.id]: e.target.value }))}
              placeholder={t('gallery.notePlaceholder')}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
            />
            {notesDraft[photo.id]?.trim() && (
              <button
                onClick={() => handleSaveNote(photo.id)}
                disabled={savingNote === photo.id}
                className="mt-1 px-3 py-1 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {savingNote === photo.id ? '...' : t('gallery.saveNote')}
              </button>
            )}
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs text-gray-500">{formatDateTime(photo.captured_at)}</p>
              {photo.captured_by && (
                <p className="text-xs text-gray-500">{t('gallery.capturedBy')} {photo.captured_by}</p>
              )}
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {photo.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl p-3 shadow-sm animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="gallery" role="parent" />
      )}

      {/* ══════════════════════════════════════════════
          VIEW CONTROLS + AREA FILTER + SELECTION
          ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setViewMode('grid'); setSelectedArea(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('review.allPhotos' as any) || 'All Photos'}
          </button>
          <button
            onClick={() => { setViewMode('timeline'); setSelectedArea(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'timeline' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('gallery.timeline' as any) || 'Timeline'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{filteredPhotos.length} {t('gallery.photosTotal')}</span>
          {filteredPhotos.length > 0 && (
            <button
              onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-xs ${
                selectionMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {selectionMode ? `✓ ${t('gallery.select')}` : t('gallery.select')}
            </button>
          )}
        </div>
      </div>

      {/* Area filter chips */}
      {viewMode === 'grid' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors border-2 ${
              !selectedArea ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
            }`}
          >
            {t('common.all')}
          </button>
          {AREA_ORDER.map(area => {
            const config = AREA_CONFIG[area];
            const count = photosByArea[area]?.length || 0;
            if (count === 0) return null;
            const isActive = selectedArea === area;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(isActive ? null : area)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1.5 border-2 ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                }`}
              >
                <AreaBadge area={area} size="xs" />
                <span>{config.name}</span>
                <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selection toolbar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.size} {selectedIds.size !== 1 ? t('gallery.photosSelected') : t('gallery.photoSelected')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (selectedIds.size === filteredPhotos.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
                }
              }}
              className="text-sm px-3 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
            >
              {selectedIds.size === filteredPhotos.length ? t('gallery.deselectAll') : t('gallery.selectAll')}
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              {t('gallery.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          PHOTO GRID
          ══════════════════════════════════════════════ */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-4xl mb-3">📷</div>
          <h2 className="text-base font-bold text-gray-800 mb-1">
            {selectedArea
              ? (t('review.noPhotosInArea' as any) || 'No photos in this area yet')
              : (t('review.noPhotos' as any) || 'No photos yet')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('review.takePhotos' as any) || 'Take photos of the child working to build their portfolio'}
          </p>
        </div>
      ) : viewMode === 'timeline' && !selectedArea ? (
        // Timeline view — grouped by date
        <div className="space-y-6">
          {timelineGroups.map(([dateKey, datePhotos]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-gray-800 text-sm">
                    {new Date(dateKey + 'T12:00:00').toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">
                    {datePhotos.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {datePhotos.map(photo => renderPhotoCard(photo))}
                </div>
              </div>
            ))}
        </div>
      ) : selectedArea ? (
        // Single area view
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPhotos.map(photo => renderPhotoCard(photo))}
          </div>
        </div>
      ) : (
        // Default grid view — grouped by area
        <div className="space-y-6">
          {AREA_ORDER.map(area => {
            const areaPhotos = photosByArea[area] || [];
            if (areaPhotos.length === 0) return null;
            const config = AREA_CONFIG[area];
            return (
              <div key={area}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <AreaBadge area={area} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{config.name}</p>
                    <p className="text-xs text-gray-500">{areaPhotos.length} {areaPhotos.length !== 1 ? t('gallery.photos') : t('gallery.photo')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {areaPhotos.map(photo => renderPhotoCard(photo))}
                </div>
              </div>
            );
          })}

          {/* Untagged photos at the end */}
          {(photosByArea['untagged']?.length || 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">?</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{t('gallery.untagged')}</p>
                  <p className="text-xs text-gray-500">{photosByArea['untagged'].length} {t('gallery.photosTotal')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {photosByArea['untagged'].map(photo => renderPhotoCard(photo))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODALS + OVERLAYS
          ══════════════════════════════════════════════ */}

      {/* Area Picker (for untagged photos) */}
      {showAreaPicker && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => { setShowAreaPicker(false); setAreaPickerPhotoId(null); }}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t('gallery.chooseArea')}</h3>
              <button
                onClick={() => { setShowAreaPicker(false); setAreaPickerPhotoId(null); }}
                className="p-2 text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {AREA_ORDER.map(area => {
                const config = getAreaConfig(area);
                return (
                  <button
                    key={area}
                    onClick={() => handleAreaSelected(area)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <AreaBadge area={area} size="md" />
                    <span className="font-medium text-gray-800">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Work Wheel Picker */}
      <WorkWheelPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        area={pickerArea}
        works={getPickerWorks()}
        currentWorkName={pickerCurrentWork}
        onSelectWork={(work, _status) => handleWorkSelected(work as CurriculumWork)}
        onWorkAdded={() => {
          curriculumLoadedRef.current = false;
          setCurriculum({});
          loadCurriculum();
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!photoToDelete}
        count={1}
        onConfirm={handleDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={showBulkDeleteConfirm}
        count={selectedIds.size}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        isDeleting={isDeleting}
      />

      {/* Photo Lightbox */}
      {(() => {
        const safeIndex = Math.min(lightboxIndex, Math.max(filteredPhotos.length - 1, 0));
        const currentPhoto = filteredPhotos[safeIndex];
        return (
          <PhotoLightbox
            isOpen={lightboxOpen && filteredPhotos.length > 0}
            onClose={() => setLightboxOpen(false)}
            src={currentPhoto ? (imageUrls[currentPhoto.id] || '') : ''}
            alt={currentPhoto?.work_name || currentPhoto?.caption || 'Photo'}
            photos={filteredPhotos.map(p => ({
              url: imageUrls[p.id] || '',
              caption: p.caption,
              date: p.captured_at,
            }))}
            currentIndex={safeIndex}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        );
      })()}

      {/* Teach Guru Work Modal */}
      {teachModalData && session?.classroom?.id && (
        <TeachGuruWorkModal
          isOpen={true}
          onClose={() => setTeachModalData(null)}
          initialWorkName={teachModalData.workName}
          initialArea={teachModalData.area}
          mediaId={teachModalData.mediaId}
          classroomId={session.classroom.id}
          childId={childId}
          onWorkSaved={(work) => {
            // Update the photo-insight-store so gallery shows the corrected work
            if (teachModalData) {
              updateEntryAfterCorrection(teachModalData.mediaId, childId, work.name, work.area);
            }
            setTeachModalData(null);
            fetchPhotos();
          }}
        />
      )}
    </div>
  );
}
