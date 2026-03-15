// /montree/dashboard/[childId]/gallery/page.tsx
// Gallery — the central workflow hub for managing captured work
// Photo → Work → Description flow. All post-capture work happens here.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import PhotoInsightButton from '@/components/montree/guru/PhotoInsightButton';
import TeachGuruWorkModal from '@/components/montree/guru/TeachGuruWorkModal';
import DeleteConfirmDialog from '@/components/montree/media/DeleteConfirmDialog';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';
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
  const [childName, setChildName] = useState('');

  // Filter state
  const [filterTab, setFilterTab] = useState<'all' | 'timeline' | 'area' | 'work'>('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Editing state
  const [editingCaption, setEditingCaption] = useState<string | null>(null); // photo id being edited
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerArea, setPickerArea] = useState('');
  const [pickerPhotoId, setPickerPhotoId] = useState<string | null>(null);
  const [pickerCurrentWork, setPickerCurrentWork] = useState<string | undefined>(undefined);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [allProgress, setAllProgress] = useState<Array<{ work_name: string; status: string }>>([]);

  // Area picker state (shown when photo has no area before opening wheel picker)
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaPickerPhotoId, setAreaPickerPhotoId] = useState<string | null>(null);

  // Delete state
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Photo detail expansion
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Teach Guru Work modal state (correction flow from Smart Capture)
  const [teachModalData, setTeachModalData] = useState<{ workName: string; area: string | null; mediaId: string } | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Image URL cache
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const batchUrlLoadedRef = useRef(false);

  // Fetch child info
  useEffect(() => {
    if (!childId) return;
    const controller = new AbortController();
    fetch(`/api/montree/children/${childId}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.child?.name) setChildName(data.child.name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [childId]);

  // Fetch photos
  const fetchPhotos = useCallback(() => {
    if (!childId) return;
    setLoading(true);
    batchUrlLoadedRef.current = false; // Reset so URLs are re-fetched for new photos
    fetch(`/api/montree/media?child_id=${childId}&limit=1000`)
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
      .catch(() => toast.error(t('gallery.loadPhotosError')))
      .finally(() => setLoading(false));
  }, [childId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Fetch curriculum for wheel picker (lazy load)
  const curriculumLoadedRef = useRef(false);
  const loadCurriculum = useCallback(async () => {
    if (curriculumLoadedRef.current) return;
    curriculumLoadedRef.current = true;
    try {
      const res = await fetch('/api/montree/works/search');
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
    } catch {
      curriculumLoadedRef.current = false; // Allow retry on error
    }
  }, []);

  // Fetch child progress for status badges on works
  useEffect(() => {
    if (!childId) return;
    fetch(`/api/montree/progress?child_id=${childId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.progress) {
          setAllProgress(data.progress.map((p: Record<string, unknown>) => ({
            work_name: p.work_name as string,
            status: p.status as string,
          })));
        }
      })
      .catch(() => {});
  }, [childId]);

  // Batch-load all image URLs in a single request (replaces N individual fetches)
  useEffect(() => {
    if (photos.length === 0 || batchUrlLoadedRef.current) return;
    batchUrlLoadedRef.current = true;

    const paths = photos.map(p => p.storage_path).filter(Boolean);
    if (paths.length === 0) return;

    fetch('/api/montree/media/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`Batch URL request failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.urls) {
          // Map storage_path→signedUrl to photo.id→signedUrl
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
        console.error('Failed to batch-load image URLs:', err);
        batchUrlLoadedRef.current = false; // Allow retry
      });
  }, [photos]);

  // Unique areas and works
  const uniqueAreas = Array.from(new Set(photos.map(p => p.area).filter(Boolean)));
  const uniqueWorks = Array.from(new Set(photos.map(p => p.work_name).filter(Boolean)));

  // Filter photos
  const getFilteredPhotos = (): GalleryItem[] => {
    if (filterTab === 'area' && selectedArea) {
      return photos.filter(p => p.area === selectedArea);
    }
    if (filterTab === 'work' && selectedWork) {
      return photos.filter(p => p.work_name === selectedWork);
    }
    return photos;
  };

  const filteredPhotos = getFilteredPhotos();

  // Group photos by work+area for the "all" view
  const groupPhotosByWork = (items: GalleryItem[]) => {
    const groups: Array<{ key: string; area: string; work: string; items: GalleryItem[] }> = [];
    const map = new Map<string, GalleryItem[]>();

    items.forEach(item => {
      const area = item.area || 'untagged';
      const work = item.work_name || 'Untagged';
      const key = `${area}|${work}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    map.forEach((groupItems, key) => {
      const [area, work] = key.split('|');
      groups.push({ key, area, work, items: groupItems });
    });

    return groups;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Open wheel picker for a specific photo
  const openWorkPicker = async (photo: GalleryItem) => {
    await loadCurriculum();
    if (!photo.area) {
      // No area yet — show area picker first
      setAreaPickerPhotoId(photo.id);
      setShowAreaPicker(true);
      return;
    }
    setPickerArea(photo.area);
    setPickerPhotoId(photo.id);
    setPickerCurrentWork(photo.work_name || undefined);
    setPickerOpen(true);
  };

  // Handle area selection from area picker (for untagged photos)
  const handleAreaSelected = (area: string) => {
    setShowAreaPicker(false);
    setPickerArea(area);
    setPickerPhotoId(areaPickerPhotoId);
    setPickerCurrentWork(undefined);
    setPickerOpen(true);
    setAreaPickerPhotoId(null);
  };

  // Handle work selection from wheel picker
  const handleWorkSelected = async (work: CurriculumWork) => {
    if (!pickerPhotoId) return;

    setPickerOpen(false);

    try {
      const res = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pickerPhotoId,
          work_id: work.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      setPhotos(prev => prev.map(p =>
        p.id === pickerPhotoId
          ? { ...p, work_id: work.id, work_name: work.name, area: pickerArea }
          : p
      ));
      toast.success(t('gallery.workUpdated'));
    } catch {
      toast.error(t('gallery.workUpdateError'));
    }
  };

  // Save caption/description edit
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

  // Delete handlers
  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/montree/media?id=${photoToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
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

  // Progress update callback for PhotoInsight
  const handleProgressUpdate = () => {
    fetchPhotos();
  };

  // Get area config safely
  const getAreaConfig = (area: string) =>
    AREA_CONFIG[normalizeArea(area)] || { name: area, icon: '?', color: '#888' };

  // Merge curriculum works with progress statuses for the wheel picker
  const getPickerWorks = (): CurriculumWork[] => {
    const works = curriculum[pickerArea] || [];
    return works.map(w => ({
      ...w,
      status: allProgress.find(p => p.work_name === w.name)?.status || 'not_started',
    }));
  };

  // Render a single photo card (the core unit of the gallery)
  const renderPhotoCard = (photo: GalleryItem) => {
    const isExpanded = expandedPhoto === photo.id;
    const isEditingThis = editingCaption === photo.id;
    const url = imageUrls[photo.id];

    return (
      <div
        key={photo.id}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Photo + Date overlay */}
        <div className="relative group">
          {/* Selection checkbox */}
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

          {/* The image — tap to open fullscreen lightbox */}
          <button
            onClick={() => {
              if (url) {
                // Find index of this photo in filteredPhotos for navigation
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

          {/* Date badge — always visible */}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-xs font-medium backdrop-blur-sm">
            {formatDate(photo.captured_at)}
          </div>

          {/* Delete button (on hover/expanded) */}
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

        {/* Work tag + Description section */}
        <div className="p-3 space-y-2">
          {/* Work tag bar — tappable to change */}
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

          {/* AI Description / Caption — editable */}
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
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 hover:text-gray-800 transition-colors">
                  {photo.caption}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic hover:text-gray-600 transition-colors">
                  {t('gallery.tapToAddDescription')}
                </p>
              )}
            </button>
          )}

          {/* Smart Capture / Photo Insight — shows AI analysis inline */}
          <div className="pt-1">
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

  // Render the grouped "all" view
  const renderGroupedView = () => {
    const groups = groupPhotosByWork(filteredPhotos);

    if (groups.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-gray-500">{t('gallery.noPhotos')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {groups.map(group => {
          const areaConfig = getAreaConfig(group.area);
          return (
            <div key={group.key}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <AreaBadge area={group.area} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{group.work}</p>
                  {group.area !== 'untagged' && (
                    <p className="text-xs text-gray-500">{areaConfig.name}</p>
                  )}
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">
                  {group.items.length} {group.items.length !== 1 ? t('gallery.photos') : t('gallery.photo')}
                </span>
              </div>

              {/* Photo cards in this group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.items.map(photo => renderPhotoCard(photo))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render flat grid view (for area/work filters)
  const renderFlatView = () => {
    if (filteredPhotos.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-gray-500">{loading ? t('gallery.loadingPhotos') : t('gallery.noPhotosInFilter')}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredPhotos.map(photo => renderPhotoCard(photo))}
      </div>
    );
  };

  // Render chronological timeline — grouped by date, newest first
  const renderTimelineView = () => {
    if (filteredPhotos.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-gray-500">{t('gallery.noPhotos')}</p>
        </div>
      );
    }

    // Group by date (YYYY-MM-DD), already sorted newest first
    const byDate = new Map<string, GalleryItem[]>();
    for (const photo of filteredPhotos) {
      const dateKey = new Date(photo.captured_at).toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(photo);
    }

    return (
      <div className="space-y-6">
        {Array.from(byDate.entries()).map(([dateKey, datePhotos]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-gray-800 text-sm">
                {new Date(dateKey + 'T12:00:00').toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
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
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {childName ? (locale === 'zh' ? `${childName}的${t('gallery.gallery')}` : `${childName}'s ${t('gallery.gallery')}`) : t('gallery.photoGallery')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {photos.length} {t('gallery.photosTotal')}
          </p>
        </div>

        {filteredPhotos.length > 0 && (
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              selectionMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {selectionMode ? `✓ ${t('gallery.select')}` : t('gallery.select')}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'timeline', 'area', 'work'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setFilterTab(tab);
              if (tab === 'all' || tab === 'timeline') { setSelectedArea(null); setSelectedWork(null); }
              if (tab === 'area' && !selectedArea && uniqueAreas.length > 0) setSelectedArea(uniqueAreas[0]);
              if (tab === 'work' && !selectedWork && uniqueWorks.length > 0) setSelectedWork(uniqueWorks[0] || null);
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors text-sm ${
              filterTab === tab
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab === 'all' ? t('gallery.allPhotos') : tab === 'timeline' ? (t('gallery.timeline' as any) || 'Timeline') : tab === 'area' ? t('gallery.byArea') : t('gallery.byWork')}
          </button>
        ))}
      </div>

      {/* Area sub-filter */}
      {filterTab === 'area' && uniqueAreas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {uniqueAreas.map(area => {
            const config = getAreaConfig(area || '');
            const count = photos.filter(p => p.area === area).length;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area || null)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedArea === area
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <AreaBadge area={area || ''} size="xs" />
                <span>{config.name}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Work sub-filter */}
      {filterTab === 'work' && uniqueWorks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {uniqueWorks.map(work => {
            const count = photos.filter(p => p.work_name === work).length;
            return (
              <button
                key={work}
                onClick={() => setSelectedWork(work || null)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedWork === work
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <span className="truncate">{work}</span>
                <span className="text-xs opacity-75 ml-1">({count})</span>
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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : filterTab === 'all' ? (
        renderGroupedView()
      ) : filterTab === 'timeline' ? (
        renderTimelineView()
      ) : (
        renderFlatView()
      )}

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
              {['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'].map(area => {
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
          // Refresh curriculum cache
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

      {/* Photo Lightbox — fullscreen zoom + download + navigation */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={imageUrls[filteredPhotos[lightboxIndex]?.id] || ''}
        alt={filteredPhotos[lightboxIndex]?.work_name || filteredPhotos[lightboxIndex]?.caption || 'Photo'}
        photos={filteredPhotos.map(p => ({
          url: imageUrls[p.id] || '',
          caption: p.caption,
          date: p.captured_at,
        }))}
        currentIndex={lightboxIndex}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />

      {/* Teach Guru Work Modal — correction flow when Smart Capture misidentifies */}
      {teachModalData && session?.classroom?.id && (
        <TeachGuruWorkModal
          isOpen={true}
          onClose={() => setTeachModalData(null)}
          initialWorkName={teachModalData.workName}
          initialArea={teachModalData.area}
          mediaId={teachModalData.mediaId}
          classroomId={session.classroom.id}
          onWorkSaved={() => { setTeachModalData(null); fetchPhotos(); }}
        />
      )}
    </div>
  );
}
