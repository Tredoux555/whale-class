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
import PhotoCropModal from '@/components/montree/media/PhotoCropModal';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import PhotoSelectionModal from '@/components/montree/PhotoSelectionModal';
import PhotoQueueBanner from '@/components/montree/media/PhotoQueueBanner';
import InviteParentModal from '@/components/montree/InviteParentModal';
import EventAttendanceModal from '@/components/montree/events/EventAttendanceModal';
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

// ── Report Types ──
interface ReportItem {
  work_id: string | null;
  work_name: string;
  chineseName?: string | null;
  area: string;
  status: string;
  photo_url: string | null;
  photo_id: string | null;
  photo_caption: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
  has_description: boolean;
  source: 'progress' | 'photo';
}

interface ReportStats {
  total: number;
  with_photos: number;
  with_descriptions: number;
  mastered: number;
  practicing: number;
  presented: number;
  documented: number;
  unassigned_photos?: number;
  from_progress: number;
  from_photos: number;
  has_selections: boolean;
}

interface UnassignedPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface ReportPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  work_name?: string;
}

interface SentReport {
  id?: string;
  sent_at?: string;
  published_at?: string;
  created_at: string;
  week_start: string;
  content: {
    child?: { name?: string };
    summary?: { works_this_week?: number; photos_this_week?: number; overall_progress?: { mastered?: number } };
    works?: Array<{ name: string; status: string; status_label?: string; photo_url?: string | null; photo_caption?: string | null; parent_description?: string | null; why_it_matters?: string | null; chineseName?: string | null }>;
    photos?: Array<{ id: string; url?: string; thumbnail_url?: string; caption?: string | null; work_name?: string | null }>;
  };
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
  const [showSpecialEventsPicker, setShowSpecialEventsPicker] = useState(false);
  const [specialEventsPhotoId, setSpecialEventsPhotoId] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Delete state
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Crop state
  const [cropPhoto, setCropPhoto] = useState<{ id: string; url: string } | null>(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);

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

  // ── Report State ──
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [reportChildName, setReportChildName] = useState('');
  const [reportUnassigned, setReportUnassigned] = useState<UnassignedPhoto[]>([]);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewSelectedArea, setPreviewSelectedArea] = useState<string | null>(null);
  const [previewExpandedCard, setPreviewExpandedCard] = useState<string | null>(null);
  const [excludedWorks, setExcludedWorks] = useState<Set<string>>(new Set());
  const [reportLightboxSrc, setReportLightboxSrc] = useState('');
  const [reportLightboxOpen, setReportLightboxOpen] = useState(false);
  // Photo selection modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentReportPhotos, setCurrentReportPhotos] = useState<ReportPhoto[]>([]);
  const [allReportPhotos, setAllReportPhotos] = useState<ReportPhoto[]>([]);
  // Past reports
  const [showLastReport, setShowLastReport] = useState(false);
  const [lastReport, setLastReport] = useState<SentReport | null>(null);
  const [loadingLastReport, setLoadingLastReport] = useState(false);
  // Invite parent
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  // Event attendance
  const [eventAttendanceOpen, setEventAttendanceOpen] = useState(false);

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
    fetch(`/api/montree/media?child_id=${childId}&limit=50`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        const sorted = (data.media || []).sort((a: GalleryItem, b: GalleryItem) => {
          const dateA = new Date(a.captured_at || a.created_at || 0).getTime();
          const dateB = new Date(b.captured_at || b.created_at || 0).getTime();
          const cmp = dateB - dateA;
          if (cmp !== 0) return cmp;
          // Tiebreaker: created_at (DB insert order — newest first)
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
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

  // Fetch curriculum for wheel picker (pre-load on mount for instant picker)
  const curriculumLoadedRef = useRef(false);
  const curriculumLoadingRef = useRef(false);
  const loadCurriculum = useCallback(async () => {
    if (curriculumLoadedRef.current || curriculumLoadingRef.current) return;
    curriculumLoadingRef.current = true;
    try {
      const classroomId = session?.classroom?.id;
      const url = classroomId
        ? `/api/montree/works/search?classroom_id=${classroomId}`
        : '/api/montree/works/search';
      const res = await fetch(url);
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

  // Pre-load curriculum on mount (background, non-blocking)
  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

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
    if (area === 'special_events') {
      // Special Events has no curriculum works — show quick-create picker instead
      setShowSpecialEventsPicker(true);
      setSpecialEventsPhotoId(areaPickerPhotoId);
      setAreaPickerPhotoId(null);
      return;
    }
    setPickerArea(area);
    setPickerPhotoId(areaPickerPhotoId);
    setPickerCurrentWork(undefined);
    setPickerOpen(true);
    setAreaPickerPhotoId(null);
  };

  const SPECIAL_EVENT_PRESETS = [
    { name: locale === 'zh' ? '生日庆祝' : 'Birthday Celebration', emoji: '🎂' },
    { name: locale === 'zh' ? '实地考察' : 'Field Trip', emoji: '🚌' },
    { name: locale === 'zh' ? '节日派对' : 'Holiday Party', emoji: '🎄' },
    { name: locale === 'zh' ? '运动会' : 'Sports Day', emoji: '⚽' },
    { name: locale === 'zh' ? '文化日' : 'Cultural Day', emoji: '🌍' },
    { name: locale === 'zh' ? '毕业典礼' : 'Graduation', emoji: '🎓' },
    { name: locale === 'zh' ? '美术展' : 'Art Show', emoji: '🎨' },
    { name: locale === 'zh' ? '科学展览' : 'Science Fair', emoji: '🔬' },
    { name: locale === 'zh' ? '音乐表演' : 'Music Performance', emoji: '🎵' },
    { name: locale === 'zh' ? '社区活动' : 'Community Event', emoji: '🤝' },
  ];

  const handleSpecialEventTag = async (eventName: string) => {
    if (!specialEventsPhotoId || creatingEvent) return;
    const classroomId = session?.classroom?.id;
    if (!classroomId) {
      toast.error(t('gallery.noClassroomFound'));
      return;
    }
    setCreatingEvent(true);
    try {
      // 1. Create or find this event as a custom work in the classroom curriculum
      const createRes = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classroom_id: classroomId,
          name: eventName,
          area_key: 'special_events',
          is_custom: true,
        }),
      });

      let workId: string | null = null;
      if (createRes.ok) {
        const createData = await createRes.json();
        workId = createData.id || createData.work?.id || null;
      } else if (createRes.status === 409 || createRes.status === 500) {
        // Already exists or insert failed — look it up from curriculum
        const existRes = await fetch(`/api/montree/curriculum?classroom_id=${classroomId}`, { credentials: 'include' });
        if (existRes.ok) {
          const existData = await existRes.json();
          // GET response shape: { curriculum: [...], byArea: { special_events: [...], ... }, total: N }
          const specialWorks = existData.byArea?.special_events || existData.curriculum || [];
          const match = specialWorks.find((w: { name: string; id: string }) =>
            w.name.toLowerCase() === eventName.toLowerCase()
          );
          if (match) workId = match.id;
        }
      }

      if (!workId) {
        toast.error(t('gallery.couldNotCreateEvent'));
        return;
      }

      // 2. Tag the photo with this work
      const tagRes = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: specialEventsPhotoId, work_id: workId }),
      });
      if (!tagRes.ok) throw new Error('Failed to tag');

      // 3. Update local state
      setPhotos(prev => prev.map(p =>
        p.id === specialEventsPhotoId ? { ...p, work_id: workId!, work_name: eventName, area: 'special_events' } : p
      ));
      toast.success(t('gallery.workUpdated'));
      setShowSpecialEventsPicker(false);
      setSpecialEventsPhotoId(null);
    } catch {
      toast.error(t('gallery.workUpdateError'));
    } finally {
      setCreatingEvent(false);
    }
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

  const handleCropSave = async (blob: Blob, width: number, height: number) => {
    if (!cropPhoto) return;
    setIsSavingCrop(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'cropped.jpg');
      formData.append('media_id', cropPhoto.id);
      formData.append('width', String(width));
      formData.append('height', String(height));

      const res = await fetch('/api/montree/media/crop', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save cropped image');

      // Clear the cached image URL so it reloads with the new crop
      setImageUrls(prev => {
        const next = { ...prev };
        delete next[cropPhoto.id];
        return next;
      });

      // Refresh gallery to get updated photo
      fetchPhotos();
      toast.success(t('gallery.crop'));
      setCropPhoto(null);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsSavingCrop(false);
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

  // ── Report Handlers ──

  const fetchReportPreview = useCallback(async () => {
    setReportLoading(true);
    try {
      const controller = new AbortController();
      const [previewRes, photosRes] = await Promise.all([
        fetch(`/api/montree/reports/preview?child_id=${childId}&locale=${locale}`, { signal: controller.signal }),
        fetch(`/api/montree/reports/available-photos?child_id=${childId}&locale=${locale}`, { signal: controller.signal }),
      ]);
      if (!previewRes.ok || !photosRes.ok) throw new Error('Fetch failed');
      const previewData = await previewRes.json();
      const photosData = await photosRes.json();

      if (previewData.success && photosData.success) {
        setReportChildName(previewData.child_name || 'Student');
        setReportItems(previewData.items || []);
        setReportStats(previewData.stats || null);
        setLastReportDate(previewData.last_report_date);
        setReportUnassigned(previewData.unassigned_photos || []);

        const allAvailablePhotos = photosData.photos || [];
        const reportedWorkNames = new Set(
          (previewData.items || []).filter((item: ReportItem) => item.photo_url).map((item: ReportItem) => item.work_name)
        );
        const reportedPhotos = allAvailablePhotos.filter((p: ReportPhoto) => p.work_name && reportedWorkNames.has(p.work_name));
        setCurrentReportPhotos(reportedPhotos);
        setAllReportPhotos(allAvailablePhotos);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch report preview:', err);
      toast.error(t('reports.loadError'));
    }
    setReportLoading(false);
  }, [childId, locale, t]);

  const handleOpenReportPreview = useCallback(async () => {
    setPreviewSelectedArea(null);
    setPreviewExpandedCard(null);
    // Don't reset exclusions — teacher's delete choices should persist across reopens
    await fetchReportPreview();
    setShowReportPreview(true);
  }, [fetchReportPreview]);

  const sendReport = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/montree/reports/send?locale=${locale}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          excluded_works: excludedWorks.size > 0 ? Array.from(excludedWorks) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        toast.success(t('reports.published'));
        setReportItems([]);
        setReportStats(null);
        setExcludedWorks(new Set());
        setLastReportDate(new Date().toISOString());
        setShowReportPreview(false);
      } else {
        toast.error(data.error || t('common.failedToSend'));
      }
    } catch {
      toast.error(t('common.failedToSend'));
    }
    setSending(false);
  };

  const handlePhotoSelectionSave = async (selectedMediaIds: string[]) => {
    try {
      const res = await fetch('/api/montree/reports/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, selected_media_ids: selectedMediaIds }),
      });
      if (!res.ok) throw new Error(`Photo update failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await fetchReportPreview();
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      console.error('Failed to update photos:', err);
      toast.error(t('reports.photoUpdateFailed'));
      throw err;
    }
  };

  const fetchLastReport = async () => {
    if (!lastReportDate) return;
    setLoadingLastReport(true);
    try {
      const res = await fetch(`/api/montree/reports?child_id=${childId}&status=sent&limit=1&locale=${locale}`);
      if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success && data.reports && data.reports.length > 0) {
        setLastReport(data.reports[0]);
        setShowLastReport(true);
      } else {
        toast.error(t('reports.noReportsFound'));
      }
    } catch (err) {
      console.error('Failed to fetch last report:', err);
      toast.error(t('reports.loadLastReportError'));
    }
    setLoadingLastReport(false);
  };

  // Memoize available photos for photo selection modal
  const availableForSelection = useMemo(() => {
    const ids = new Set(currentReportPhotos.map(cp => cp.id));
    return allReportPhotos.filter(p => !ids.has(p.id));
  }, [currentReportPhotos, allReportPhotos]);

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
              photo.auto_crop ? (
                <div className={`w-full overflow-hidden ${isExpanded ? 'max-h-[60vh]' : 'aspect-[4/3]'}`}>
                  <img
                    src={url}
                    alt={photo.work_name || photo.caption || 'Photo'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full"
                    style={{
                      objectFit: 'cover',
                      objectPosition: `${(photo.auto_crop.x + photo.auto_crop.width / 2) * 100}% ${(photo.auto_crop.y + photo.auto_crop.height / 2) * 100}%`,
                    }}
                  />
                </div>
              ) : (
                <img
                  src={url}
                  alt={photo.work_name || photo.caption || 'Photo'}
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover transition-all ${isExpanded ? 'max-h-[60vh]' : 'aspect-[4/3]'}`}
                />
              )
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
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const photoUrl = imageUrls[photo.id] || photo.url;
                  if (!photoUrl) return;
                  try {
                    const res = await fetch(photoUrl);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `${(photo.work_name || 'photo').replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(photo.captured_at).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                  } catch {
                    // Fallback: open in new tab for manual save
                    window.open(photoUrl, '_blank');
                  }
                }}
                className="w-8 h-8 bg-black/40 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-sm"
                aria-label={t('gallery.downloadPhoto') || 'Download photo'}
              >
                💾
              </button>
              <button
                onClick={() => setCropPhoto({ id: photo.id, url: imageUrls[photo.id] || photo.url })}
                className="w-8 h-8 bg-black/40 hover:bg-blue-500 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-sm"
                aria-label={t('gallery.cropPhoto')}
              >
                ✂️
              </button>
              <button
                onClick={() => setPhotoToDelete(photo)}
                className="w-8 h-8 bg-black/40 hover:bg-red-500 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-sm"
                aria-label={t('gallery.deletePhoto')}
              >
                🗑
              </button>
            </div>
          )}
        </div>

        {/* Work tag + AI Review */}
        <div className="p-3 space-y-2">
          {/* Work tag — area badge is tappable to change area, work name opens work picker */}
          <div className="flex items-center gap-2">
            {/* Tappable area badge — opens area picker to change area */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await loadCurriculum();
                setAreaPickerPhotoId(photo.id);
                setShowAreaPicker(true);
              }}
              className="flex-shrink-0 hover:scale-110 transition-transform"
              aria-label={t('gallery.changeArea')}
            >
              {photo.area ? (
                <AreaBadge area={photo.area} size="sm" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">?</div>
              )}
            </button>
            {/* Tappable work name — opens work picker within current area */}
            <button
              onClick={() => openWorkPicker(photo)}
              className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left group/tag"
            >
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

      {/* Offline Photo Queue Status */}
      <PhotoQueueBanner childId={childId} />

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="gallery" role="parent" />
      )}

      {/* ══════════════════════════════════════════════
          REPORT ACTION BAR — Preview & Send + Past Reports
          ══════════════════════════════════════════════ */}
      {session && !isHomeschoolParent(session) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">📤 {t('reports.parentReport')}</h3>
              <p className="text-xs text-gray-400">
                {lastReportDate
                  ? `${t('reports.lastSent')}: ${new Date(lastReportDate).toLocaleDateString()}`
                  : (t('reports.noReportsSentYet'))}
              </p>
            </div>
            <div className="flex gap-2">
              {lastReportDate && (
                <button
                  onClick={fetchLastReport}
                  disabled={loadingLastReport}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50 text-xs"
                >
                  {loadingLastReport ? '⏳' : '📄'} {t('reports.lastReport')}
                </button>
              )}
              <button
                onClick={handleOpenReportPreview}
                disabled={reportLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 text-xs"
              >
                {reportLoading ? '⏳' : '👁️'} {t('reports.previewReport')}
              </button>
            </div>
          </div>
          {/* Invite Parent */}
          <button
            onClick={() => setInviteModalOpen(true)}
            className="mt-2 w-full text-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            ✉️ {t('reports.inviteParent')}
          </button>
        </div>
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
            {t('review.allPhotos')}
          </button>
          <button
            onClick={() => { setViewMode('timeline'); setSelectedArea(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'timeline' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('gallery.timeline')}
          </button>
          {!isHomeschoolParent() && (
            <button
              onClick={() => setEventAttendanceOpen(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            >
              🎉 Tag Event
            </button>
          )}
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
              ? t('review.noPhotosInArea')
              : t('review.noPhotos')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('review.takePhotos')}
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

      {/* Special Events Quick-Create Picker */}
      {showSpecialEventsPicker && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => { setShowSpecialEventsPicker(false); setSpecialEventsPhotoId(null); }}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">🎉 {t('gallery.tagSpecialEvent')}</h3>
              <button
                onClick={() => { setShowSpecialEventsPicker(false); setSpecialEventsPhotoId(null); }}
                className="p-2 text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_EVENT_PRESETS.map(event => (
                <button
                  key={event.name}
                  disabled={creatingEvent}
                  onClick={() => handleSpecialEventTag(event.name)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors text-left disabled:opacity-50"
                >
                  <span className="text-xl">{event.emoji}</span>
                  <span className="font-medium text-gray-800 text-sm">{event.name}</span>
                </button>
              ))}
            </div>
            {creatingEvent && (
              <div className="text-center py-2 text-sm text-gray-500 mt-2">Tagging photo...</div>
            )}
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
            if (teachModalData) {
              updateEntryAfterCorrection(teachModalData.mediaId, childId, work.name, work.area);
            }
            setTeachModalData(null);
            fetchPhotos();
          }}
        />
      )}

      {/* ══════════════════════════════════════════════
          REPORT PREVIEW MODAL
          ══════════════════════════════════════════════ */}
      {showReportPreview && (() => {
        const PREVIEW_AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string }> = {
          practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899' },
          sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6' },
          mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
          math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
          language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b' },
          cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e' },
          special_events: { emoji: '🎉', label: 'Special Events', labelZh: '特别活动', color: '#e11d48' },
        };
        const PREVIEW_AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'special_events'];
        const normalizePreviewArea = (area: string) => area === 'math' ? 'mathematics' : area;
        const getPreviewAreaConf = (area: string) => PREVIEW_AREA_CONFIG[normalizePreviewArea(area)] || PREVIEW_AREA_CONFIG['cultural'];
        const getPreviewAreaLabel = (area: string) => {
          const conf = getPreviewAreaConf(area);
          return locale === 'zh' ? conf.labelZh : conf.label;
        };

        // Separate included vs excluded items for accurate counts
        const includedItems = reportItems.filter(i => !excludedWorks.has(i.work_name));

        const previewWorksByArea: Record<string, ReportItem[]> = {};
        for (const area of PREVIEW_AREA_ORDER) previewWorksByArea[area] = [];
        for (const item of includedItems) {
          const area = normalizePreviewArea(item.area || 'other');
          if (!previewWorksByArea[area]) previewWorksByArea[area] = [];
          previewWorksByArea[area].push(item);
        }

        const previewMastered = includedItems.filter(i => i.status === 'mastered' || i.status === 'completed').length;
        const previewPracticing = includedItems.filter(i => i.status === 'practicing').length;
        const previewPresented = includedItems.filter(i => i.status === 'presented').length;

        // Filter for display still uses ALL items (so excluded cards show with opacity)
        const previewFiltered = previewSelectedArea
          ? reportItems.filter(i => normalizePreviewArea(i.area) === previewSelectedArea)
          : reportItems;

        const toggleExcludeWork = (workName: string) => {
          setExcludedWorks(prev => {
            const next = new Set(prev);
            if (next.has(workName)) {
              next.delete(workName);
              toast.success(t('gallery.restoredToReport'));
            } else {
              next.add(workName);
              toast.success(t('gallery.excludedFromReport'));
            }
            return next;
          });
        };

        const renderPreviewCard = (item: ReportItem, i: number) => {
          const displayName = locale === 'zh' && item.chineseName ? item.chineseName : item.work_name;
          const areaConf = getPreviewAreaConf(item.area);
          const cardKey = `${item.work_name}-${i}`;
          const isExpanded = previewExpandedCard === cardKey;
          const isExcluded = excludedWorks.has(item.work_name);

          return (
            <div key={cardKey} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative ${isExcluded ? 'border-red-200 opacity-50' : 'border-gray-100'}`}>
              {/* Exclude/Restore button */}
              <button
                onClick={() => toggleExcludeWork(item.work_name)}
                className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-colors ${
                  isExcluded
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-red-500/80 text-white hover:bg-red-600'
                }`}
                title={isExcluded ? t('gallery.restore') : t('gallery.removeFromReport')}
              >
                {isExcluded ? '↩' : '✕'}
              </button>
              {isExcluded && (
                <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
                  <div className="bg-red-500/80 text-white px-3 py-1 rounded-lg text-xs font-bold">
                    {t('gallery.removed')}
                  </div>
                </div>
              )}
              {item.photo_url ? (
                <div className="relative group">
                  <button onClick={() => { setReportLightboxSrc(item.photo_url!); setReportLightboxOpen(true); }} className="w-full">
                    <img src={item.photo_url} alt={displayName} loading="lazy" decoding="async" className="w-full aspect-[4/3] object-cover" />
                  </button>
                  {item.photo_caption && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-xs font-medium backdrop-blur-sm max-w-[70%] truncate">
                      {item.photo_caption}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: `${areaConf.color}10` }}>
                  <div className="text-center">
                    <span className="text-4xl">{areaConf.emoji}</span>
                    <p className="text-xs mt-1 font-medium" style={{ color: areaConf.color }}>{getPreviewAreaLabel(item.area)}</p>
                  </div>
                </div>
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: areaConf.color }}>
                    {areaConf.emoji.length <= 2 ? areaConf.emoji : (locale === 'zh' ? areaConf.labelZh : areaConf.label).charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1">{displayName}</span>
                  <ReportStatusBadge status={item.status} locale={locale} />
                </div>
                {item.parent_description && <p className="text-gray-600 text-sm leading-relaxed">{item.parent_description}</p>}
                {item.why_it_matters && (
                  <button onClick={() => setPreviewExpandedCard(isExpanded ? null : cardKey)} className="w-full text-left">
                    <div className={`bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 transition-all ${isExpanded ? '' : 'cursor-pointer hover:bg-emerald-100/50'}`}>
                      <p className="text-[11px] font-semibold text-emerald-700 mb-0.5 flex items-center gap-1">
                        💡 {locale === 'zh' ? '为什么重要' : 'Why this matters'}
                        {!isExpanded && <span className="text-emerald-400 text-[10px]">▼</span>}
                      </p>
                      {isExpanded && <p className="text-xs text-emerald-800 leading-relaxed mt-1">{item.why_it_matters}</p>}
                    </div>
                  </button>
                )}
                {!item.parent_description && !item.why_it_matters && (
                  <p className="text-gray-400 text-xs">
                    {locale === 'zh'
                      ? `您的孩子在${getPreviewAreaLabel(item.area)}方面进行了学习。`
                      : `Your child explored this ${getPreviewAreaLabel(item.area).toLowerCase()} activity.`}
                  </p>
                )}
              </div>
            </div>
          );
        };

        return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">📋 {t('reports.reportPreview')}</h3>
                  <p className="text-emerald-100 text-sm">{t('reports.thisIsWhatParentsSee')}</p>
                </div>
                <button onClick={() => setShowReportPreview(false)} className="text-white/80 hover:text-white text-2xl">×</button>
              </div>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all text-sm"
              >
                ✏️ {t('reports.editPhotos')}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="p-4 space-y-4">

              {/* Report Header */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                      {reportChildName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">
                        {locale === 'zh' ? `${reportChildName}的学习报告` : `${reportChildName}'s Learning Report`}
                      </h2>
                      <p className="text-emerald-100 text-sm">
                        {reportItems.length - excludedWorks.size} {t('reports.activitiesToShare')}
                        {excludedWorks.size > 0 && (
                          <span className="text-red-200 ml-1">({excludedWorks.size} {locale === 'zh' ? '已移除' : 'removed'})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {reportItems.length > 0 && (
                    <div className="flex gap-3 mt-4">
                      {previewMastered > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">⭐ {previewMastered}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已掌握' : 'Mastered'}</p>
                        </div>
                      )}
                      {previewPracticing > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🔄 {previewPracticing}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '练习中' : 'Practicing'}</p>
                        </div>
                      )}
                      {previewPresented > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🌱 {previewPresented}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已展示' : 'Introduced'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inspiring progress summary */}
                <div className="px-5 py-4 border-l-4 border-emerald-400 bg-emerald-50 mx-4 mt-4 mb-2 rounded-r-xl">
                  <p className="text-gray-700 leading-relaxed text-[15px]">
                    {(() => {
                      const areasCount = Object.values(previewWorksByArea).filter(a => a.length > 0).length;
                      if (locale === 'zh') {
                        const parts = [`${reportChildName}度过了充实而专注的一周！本周共探索了${includedItems.length}项工作。`];
                        if (areasCount >= 3) parts.push(`涵盖了${areasCount}个不同领域——全面发展正是蒙特梭利教育的精髓。`);
                        if (previewPracticing > 0) parts.push(`正在练习的工作说明孩子正处于深入学习中——重复是通往精通的道路。`);
                        return parts.join('');
                      }
                      const parts = [`${reportChildName} had a wonderful week of learning! This week they explored ${includedItems.length} different activities.`];
                      if (areasCount >= 3) parts.push(` Active across ${areasCount} areas — well-rounded exploration is at the heart of Montessori.`);
                      if (previewPracticing > 0) parts.push(` The works still being practiced show deep learning in progress — in Montessori, repetition is the path to mastery.`);
                      return parts.join('');
                    })()}
                  </p>
                </div>

                {/* Mastered highlights */}
                {(() => {
                  const masteredItems = includedItems.filter(i => i.status === 'mastered' || i.status === 'completed');
                  if (masteredItems.length === 0) return null;
                  return (
                    <div className="px-5 py-3 pb-4">
                      {masteredItems.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-gray-600 text-sm leading-relaxed mb-1">
                          ⭐ {locale === 'zh' && item.chineseName ? item.chineseName : item.work_name} ({locale === 'zh' ? '已掌握' : 'Mastered'})
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Area filter chips */}
              {reportItems.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setPreviewSelectedArea(null)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors border-2 flex-shrink-0 ${
                      !previewSelectedArea ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                    }`}
                  >
                    {locale === 'zh' ? '全部' : 'All'}
                  </button>
                  {PREVIEW_AREA_ORDER.map(area => {
                    const config = PREVIEW_AREA_CONFIG[area];
                    const count = previewWorksByArea[area]?.length || 0;
                    if (count === 0) return null;
                    const isActive = previewSelectedArea === area;
                    return (
                      <button
                        key={area}
                        onClick={() => setPreviewSelectedArea(isActive ? null : area)}
                        className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1.5 border-2 flex-shrink-0 ${
                          isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: config.color }}>{config.emoji}</div>
                        <span>{locale === 'zh' ? config.labelZh : config.label}</span>
                        <span className="text-xs opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Work Cards */}
              {previewFiltered.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500 text-sm">
                    {previewSelectedArea
                      ? (locale === 'zh' ? '此领域暂无活动记录' : 'No activities in this area')
                      : (locale === 'zh' ? '本周暂无活动记录' : 'No activities this week')}
                  </p>
                </div>
              ) : previewSelectedArea ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewFiltered.map((item, i) => renderPreviewCard(item, i))}
                </div>
              ) : (
                <div className="space-y-6">
                  {PREVIEW_AREA_ORDER.map(area => {
                    const areaWorks = previewWorksByArea[area] || [];
                    if (areaWorks.length === 0) return null;
                    const config = PREVIEW_AREA_CONFIG[area];
                    return (
                      <div key={area}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: config.color }}>{config.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-sm">{locale === 'zh' ? config.labelZh : config.label}</p>
                            <p className="text-xs text-gray-500">{areaWorks.length} {locale === 'zh' ? '项活动' : areaWorks.length === 1 ? 'activity' : 'activities'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {areaWorks.map((item, i) => renderPreviewCard(item, i))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra Photos */}
              {!previewSelectedArea && reportUnassigned.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">📸</div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{t('gallery.moreMoments')}</p>
                      <p className="text-xs text-gray-500">{reportUnassigned.length} {t('gallery.photos')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {reportUnassigned.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => { setReportLightboxSrc(photo.url); setReportLightboxOpen(true); }}
                        className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm cursor-zoom-in relative group"
                      >
                        <img src={photo.url} alt={photo.caption || t('reports.learningMoment')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-medium backdrop-blur-sm">
                          {new Date(photo.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {includedItems.filter(i => i.status === 'mastered' || i.status === 'practicing').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                    💡 {locale === 'zh' ? '在家可以这样做' : 'Try This at Home'}
                  </h4>
                  <div className="space-y-2">
                    {includedItems.filter(i => i.status === 'mastered' || i.status === 'practicing').slice(0, 3).map((item, i) => (
                      <p key={i} className="text-amber-900 text-sm leading-relaxed flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        <span>
                          {locale === 'zh'
                            ? `让${reportChildName}在家里也尝试${item.chineseName || item.work_name}相关的活动。`
                            : `Encourage ${reportChildName} to practice ${item.work_name}-related activities at home.`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing */}
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-gray-600 leading-relaxed">
                  {locale === 'zh'
                    ? `我们很开心有${reportChildName}在课堂上，下周见！`
                    : `We love having ${reportChildName} in our classroom. See you next week!`}
                  {' '}🌿
                </p>
              </div>

              <div className="text-center text-xs text-gray-400 py-2">
                {new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' · Montree'}
              </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowReportPreview(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                {t('common.close')}
              </button>
              <button
                onClick={sendReport}
                disabled={sending || includedItems.length === 0}
                className="flex-1 py-3 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {sending ? `⏳ ${t('reports.publishing')}` : includedItems.length === 0 ? `${locale === 'zh' ? '没有可发送的活动' : 'No activities to send'}` : `✅ ${t('reports.publishReport')}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSave={handlePhotoSelectionSave}
        currentPhotos={currentReportPhotos}
        availablePhotos={availableForSelection}
        childId={childId}
      />

      {/* Last Sent Report Modal */}
      {showLastReport && lastReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">📄 {t('reports.lastSentReport')}</h3>
                  <p className="text-blue-100 text-sm">
                    {t('reports.sentOn')} {new Date(lastReport.sent_at || lastReport.published_at || lastReport.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => setShowLastReport(false)} className="text-white/80 hover:text-white text-2xl">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {lastReport.content ? (
                <>
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-2 flex items-center justify-center text-2xl">
                      {lastReport.content.child?.name?.charAt(0) || reportChildName.charAt(0) || '?'}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {lastReport.content.child?.name || reportChildName}'s {t('reports.progress')}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {t('reports.weekOf')} {new Date(lastReport.week_start).toLocaleDateString()}
                    </p>
                  </div>
                  {lastReport.content.summary && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-lg">📚</span>
                        <p className="text-xl font-bold text-gray-700">{lastReport.content.summary.works_this_week || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.works')}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <span className="text-lg">📸</span>
                        <p className="text-xl font-bold text-blue-600">{lastReport.content.summary.photos_this_week || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.photos')}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <span className="text-lg">⭐</span>
                        <p className="text-xl font-bold text-emerald-600">{lastReport.content.summary.overall_progress?.mastered || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.mastered')}</p>
                      </div>
                    </div>
                  )}
                  {lastReport.content.works && lastReport.content.works.length > 0 && (
                    <div className="space-y-4">
                      {lastReport.content.works.map((work, i) => (
                        <div key={`work-${work.name || i}`} className="bg-gray-50 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <ReportStatusBadge status={work.status} locale={locale} />
                            <h4 className="font-bold text-gray-800">{locale === 'zh' && work.chineseName ? work.chineseName : work.name}</h4>
                          </div>
                          {work.photo_url && (
                            <div className="relative -mx-4 my-3">
                              <button
                                onClick={() => { setReportLightboxSrc(work.photo_url!); setReportLightboxOpen(true); }}
                                className="aspect-[4/3] w-full overflow-hidden rounded-lg shadow-lg block cursor-zoom-in"
                              >
                                <img src={work.photo_url} alt={work.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              </button>
                              {work.photo_caption && (
                                <p className="mt-2 px-4 text-sm text-gray-600 italic text-center">{work.photo_caption}</p>
                              )}
                            </div>
                          )}
                          {work.parent_description ? (
                            <div className="space-y-2">
                              <p className="text-gray-700 text-sm leading-relaxed">{work.parent_description}</p>
                              {work.why_it_matters && (
                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                  <p className="text-xs font-semibold text-emerald-700 mb-1">💡 {t('reports.whyItMatters')}</p>
                                  <p className="text-sm text-emerald-800">{work.why_it_matters}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm italic">{t('reports.noDescriptionAvailable')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('reports.contentNotAvailable')}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => setShowLastReport(false)} className="w-full py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Lightbox */}
      <PhotoLightbox
        isOpen={reportLightboxOpen}
        onClose={() => setReportLightboxOpen(false)}
        src={reportLightboxSrc}
      />

      {/* Invite Parent Modal */}
      {session && !isHomeschoolParent(session) && (
        <InviteParentModal
          childId={childId}
          childName={reportChildName || 'Child'}
          teacherId={session?.teacher?.id}
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}

      {/* Event Attendance Modal */}
      {session?.classroom?.id && session?.school?.id && (
        <EventAttendanceModal
          isOpen={eventAttendanceOpen}
          onClose={() => setEventAttendanceOpen(false)}
          classroomId={session.classroom.id}
          schoolId={session.school.id}
          onSaved={() => setEventAttendanceOpen(false)}
        />
      )}

      {/* Crop Photo Modal */}
      {cropPhoto && (
        <PhotoCropModal
          imageUrl={cropPhoto.url}
          isOpen={!!cropPhoto}
          onClose={() => setCropPhoto(null)}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}

// ── Report Status Badge ──
function ReportStatusBadge({ status, locale }: { status: string; locale?: string }) {
  const isZh = locale === 'zh';
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', label: isZh ? '🌱 已展示' : '🌱 Introduced' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: isZh ? '🔄 练习中' : '🔄 Practicing' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    documented: { bg: 'bg-purple-100', text: 'text-purple-700', label: isZh ? '📸 已记录' : '📸 Documented' },
  };
  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: '○ Started' };
  return <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
}
