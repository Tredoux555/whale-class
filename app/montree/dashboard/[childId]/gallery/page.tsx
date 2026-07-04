// /montree/dashboard/[childId]/gallery/page.tsx
// Gallery — DISPLAY-ONLY photo gallery (timeline grouping + area filters).
//
// Jul 4 2026: all identification confirm/correct affordances (✓ confirm, work
// picker, area picker, Special Events tagging) were REMOVED — corrections and
// confirms now happen in Wrap Up (/montree/dashboard/photo-audit), which owns
// the moat-seeding corrections flow. The per-child Parent Report preview/publish
// flow moved to the Parents tab (/montree/dashboard/parent-codes) via
// components/montree/reports/ChildReportPreviewModal.tsx. The gallery keeps:
// photos, filters, lightbox, download, crop, delete, child-tagging, captions +
// Lesson Notes. Work labels are read-only; an unconfirmed AI guess links to
// Wrap Up.
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import PhotoQueueBanner from '@/components/montree/media/PhotoQueueBanner';
import { useFeaturesContext } from '@/lib/montree/features';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { getProxyUrl, getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

// Tier 6 perf: code-split modal components (~2.9k lines deferred).
const DeleteConfirmDialog = dynamic(() => import('@/components/montree/media/DeleteConfirmDialog'), { ssr: false });
const PhotoLightbox = dynamic(() => import('@/components/montree/media/PhotoLightbox'), { ssr: false });
const PhotoCropModal = dynamic(() => import('@/components/montree/media/PhotoCropModal'), { ssr: false });
const EventAttendanceModal = dynamic(() => import('@/components/montree/events/EventAttendanceModal'), { ssr: false });
const VoiceDictate = dynamic(() => import('@/components/montree/voice/VoiceDictate'), { ssr: false });

interface GalleryItem extends MontreeMedia {
  area?: string;
  work_name?: string;
  // The AI two-pass pipeline writes its identification into sonnet_draft.
  // work_id stays NULL until the teacher (or Gate A) CONFIRMS — so on a
  // brand-new / cold classroom every photo is DRAFTED-BUT-UNCONFIRMED. We
  // surface sonnet_draft.proposed_name as a one-tap "AI suggestion" instead
  // of rendering a blank "Untagged" (which is what made the feed look broken).
  identification_status?: string | null;
  sonnet_draft?: {
    is_other?: boolean;
    other_note?: string | null;
    other_classified_at?: string | null;
    proposed_name?: string | null;
    confidence?: number | null;
  } | null;
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

// ── "Identifying…" in-flight state ──────────────────────────────────────────
// SINGLE source of truth for "is this photo still being processed by the AI",
// ported verbatim from app/montree/dashboard/photo-audit/page.tsx so the child
// gallery and the Wrap Up / Photo Audit surface can NEVER drift apart. Keying on
// the RESULT (no work_id + no draft + non-terminal status + captured recently),
// NOT on identification_attempted_at — the pipeline stamps attempted_at the
// moment it STARTS, so keying on it hid the whole 10-30s processing window
// behind a bare "Untagged" card that read like a failure. The 10-min recency cap
// lets a never-processed photo fall through instead of spinning forever.
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

// Animated hourglass for the "AI is identifying" state — recognisable old-school
// sand timer so a processing photo clearly reads as WORKING, not broken/untagged.
// Self-contained SMIL animation (no global keyframes needed); iOS-Safari safe.
function ProcessingHourglass({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <g>
        <rect x="5.5" y="2.2" width="13" height="1.9" rx="0.95" fill="#5eead4" />
        <rect x="5.5" y="19.9" width="13" height="1.9" rx="0.95" fill="#5eead4" />
        <path d="M7.4 4.1 H16.6 L12 12 Z" fill="#f5c96a" />
        <path d="M12 12 L16.6 19.9 H7.4 Z" fill="rgba(245,201,106,0.4)" />
        <path d="M7.4 4.1 H16.6 L12 12 L16.6 19.9 H7.4 L12 12 Z" fill="none" stroke="#99f6e4" strokeWidth="1.1" strokeLinejoin="round" />
        <line x1="12" y1="11.4" x2="12" y2="16.6" stroke="#f5c96a" strokeWidth="1" strokeLinecap="round">
          <animate attributeName="opacity" values="0.15;1;0.15" dur="0.85s" repeatCount="indefinite" />
        </line>
        <animateTransform attributeName="transform" attributeType="XML" type="rotate"
          values="0 12 12; 0 12 12; 180 12 12; 180 12 12"
          keyTimes="0; 0.45; 0.55; 1" dur="2.2s" repeatCount="indefinite"
          calcMode="spline" keySplines="0 0 1 1; .4 0 .1 1; 0 0 1 1" />
      </g>
    </svg>
  );
}

export default function GalleryPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { t, locale } = useI18n();
  const session = getSession();
  const { isEnabled } = useFeaturesContext();

  // Core state
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  // Bulk download — ZIP build runs in-browser via JSZip dynamic import.
  // downloadProgress is "i of N" so the toolbar pill can show progress
  // during the per-photo blob fetch (the slow part).
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  // Editing state
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);


  // Delete state
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Crop state
  const [cropPhoto, setCropPhoto] = useState<{ id: string; url: string } | null>(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  // Photo detail expansion
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);


  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Lesson notes state
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  // Event attendance
  const [eventAttendanceOpen, setEventAttendanceOpen] = useState(false);

  // Child tag editing state
  const [childTagPhotoId, setChildTagPhotoId] = useState<string | null>(null);
  const [classroomChildren, setClassroomChildren] = useState<Array<{ id: string; name: string }>>([]);
  const [taggedChildIds, setTaggedChildIds] = useState<Set<string>>(new Set());
  const [savingChildTags, setSavingChildTags] = useState(false);
  const [loadingChildTags, setLoadingChildTags] = useState(false);

  // Crop URL overrides — only populated when a photo is cropped in this session.
  // Default URLs are computed inline via getProxyUrl(storage_path) (Session 25 pattern).
  const [cropUrlOverrides, setCropUrlOverrides] = useState<Record<string, string>>({});
  const prevChildIdRef = useRef(childId);

  // Live clock for the "Identifying…" in-flight state — ticks every 15s so the
  // recency window re-evaluates and a processing card re-renders. Starts at 0
  // (isPhotoInFlight returns false until the clock is set) to avoid an SSR/first
  // -paint flash of "Identifying…" before hydration.
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const i = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(i);
  }, []);

  // Reset overrides when childId changes
  useEffect(() => {
    if (prevChildIdRef.current !== childId) {
      prevChildIdRef.current = childId;
      setCropUrlOverrides({});
    }
  }, [childId]);

  // Helper: get the display URL for a photo (crop override → proxy URL)
  const getPhotoUrl = useCallback((photo: GalleryItem) => {
    return cropUrlOverrides[photo.id] || getProxyUrl(photo.storage_path);
  }, [cropUrlOverrides]);

  // Fetch photos
  const fetchPhotosControllerRef = useRef<AbortController | null>(null);
  const fetchPhotos = useCallback((opts?: { silent?: boolean }) => {
    if (!childId) return;
    // Abort any in-flight fetch
    fetchPhotosControllerRef.current?.abort();
    const controller = new AbortController();
    fetchPhotosControllerRef.current = controller;
    // silent: background poll for the "Identifying…" state — must NOT flip the
    // full-screen loading spinner (line ~1458), which would flicker the whole
    // gallery every few seconds.
    if (!opts?.silent) setLoading(true);
    // no-store: the media API sends `max-age=60, stale-while-revalidate=120`, so
    // without this the browser can serve a pre-capture "0 photos" snapshot for
    // up to ~3 min after new photos are taken. Always hit the server fresh.
    fetch(`/api/montree/media?child_id=${childId}&limit=50`, { signal: controller.signal, cache: 'no-store' })
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
        if (err?.name !== 'AbortError' && !opts?.silent) toast.error(t('gallery.loadPhotosError'));
      })
      .finally(() => { if (!opts?.silent) setLoading(false); });
  }, [childId, t]);

  useEffect(() => {
    fetchPhotos();
    return () => { fetchPhotosControllerRef.current?.abort(); };
  }, [fetchPhotos]);

  // Refetch when the page becomes visible / regains focus — e.g. returning from
  // the capture screen. Guarantees freshly-captured photos appear without a
  // manual pull-to-refresh, even if the component stayed mounted.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') fetchPhotos(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchPhotos]);

  // While any freshly-captured photo is still being identified, SILENTLY poll the
  // media endpoint every 6s so the "Identifying…" card flips to its tagged /
  // suggestion state on its own — no need for the teacher to background + refocus.
  // Self-terminating: bounded to 12 tries (~72s, well inside the 10-min in-flight
  // window) so a genuinely stuck photo stops polling instead of hammering the API.
  const pollTriesRef = useRef(0);
  useEffect(() => {
    const anyInFlight = photos.some(p => isPhotoInFlight(p, Date.now()));
    if (!anyInFlight) { pollTriesRef.current = 0; return; }
    if (pollTriesRef.current >= 12) return;
    const id = setTimeout(() => { pollTriesRef.current += 1; fetchPhotos({ silent: true }); }, 6000);
    return () => clearTimeout(id);
  }, [photos, fetchPhotos]);


  // Batch URL fetch eliminated — URLs computed inline via getProxyUrl (Health Check #5)

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
    return date.toLocaleDateString(getIntlLocale(locale), {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(getIntlLocale(locale), {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
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
      // Clean up crop URL override for deleted photo
      setCropUrlOverrides(prev => { const next = { ...prev }; delete next[photoToDelete.id]; return next; });
      // Reset lightbox index to prevent out-of-bounds
      setLightboxIndex(0);
      toast.success(t('gallery.photoDeletedSuccessfully'));
      setPhotoToDelete(null);
    } catch {
      toast.error(t('gallery.deletePhotoError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk-download selected photos as a ZIP. Used when the teacher curates
  // a set of photos to send a parent before a meeting (e.g. via WhatsApp /
  // email / Drive). Browser-side ZIP via dynamic-imported JSZip — same
  // pattern as the QR generator + flashcards tools (CLAUDE.md Tier 5.4).
  //
  // Per-photo filename mirrors the existing single-photo download:
  //   {work_name}_{captured_date}.jpg — sanitized.
  // ZIP filename: montree-photos-{YYYY-MM-DD}.zip.
  //
  // Robustness: per-photo fetch failures are logged but don't abort the
  // whole ZIP — the teacher gets whatever succeeded. A summary toast at
  // the end says how many made it in.
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0 || downloadingZip) return;
    const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
    if (selectedPhotos.length === 0) return;
    setDownloadingZip(true);
    setDownloadProgress({ done: 0, total: selectedPhotos.length });
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usedNames = new Set<string>(); // collision guard for same work+date
      let succeeded = 0;
      let failed = 0;
      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        const photoUrl = getPhotoUrl(photo);
        if (!photoUrl) {
          failed++;
          setDownloadProgress({ done: i + 1, total: selectedPhotos.length });
          continue;
        }
        try {
          const res = await fetch(photoUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          // Mirror the single-photo download filename convention.
          const safeWork = (photo.work_name || 'photo').replace(/[^a-zA-Z0-9]/g, '_');
          const safeDate = formatDate(photo.captured_at).replace(/[^a-zA-Z0-9]/g, '_');
          let name = `${safeWork}_${safeDate}.jpg`;
          // Collision guard — multiple photos of the same work on the same
          // day would otherwise overwrite each other inside the ZIP.
          let suffix = 2;
          while (usedNames.has(name)) {
            name = `${safeWork}_${safeDate}_${suffix}.jpg`;
            suffix++;
          }
          usedNames.add(name);
          zip.file(name, blob);
          succeeded++;
        } catch (err) {
          console.error('[gallery bulk download] photo fetch failed', photo.id, err);
          failed++;
        }
        setDownloadProgress({ done: i + 1, total: selectedPhotos.length });
      }

      if (succeeded === 0) {
        toast.error('Could not download any photos. Try again or save them one by one.');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `montree-photos-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      if (failed > 0) {
        toast.success(`Downloaded ${succeeded} of ${succeeded + failed} photos. ${failed} failed.`);
      } else {
        toast.success(`Downloaded ${succeeded} photo${succeeded === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      console.error('[gallery bulk download] ZIP build failed', err);
      toast.error('Could not build the ZIP file. Try again.');
    } finally {
      setDownloadingZip(false);
      setDownloadProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/montree/media?ids=${Array.from(selectedIds).join(',')}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      // Clean up crop URL overrides for deleted photos
      setCropUrlOverrides(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next; });
      // Reset lightbox index to prevent out-of-bounds
      setLightboxIndex(0);
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
      const data = await res.json();

      // Update the crop URL override so the gallery shows the cropped version
      if (data.media?.cropped_url) {
        setCropUrlOverrides(prev => ({
          ...prev,
          [cropPhoto.id]: data.media.cropped_url,
        }));
      } else {
        // Fallback: clear override so it falls back to getProxyUrl
        setCropUrlOverrides(prev => {
          const next = { ...prev };
          delete next[cropPhoto.id];
          return next;
        });
      }

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


  // ── Child Tag Editing ──
  const openChildTagEditor = useCallback(async (photoId: string) => {
    setChildTagPhotoId(photoId);
    setLoadingChildTags(true);

    try {
      // Fetch classroom children list (if not already loaded)
      if (classroomChildren.length === 0) {
        const childrenRes = await fetch('/api/montree/children', { credentials: 'include' });
        if (childrenRes.ok) {
          const childrenData = await childrenRes.json();
          setClassroomChildren((childrenData.children || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      }

      // Fetch currently tagged children for this photo
      const tagRes = await fetch(`/api/montree/media/children?media_id=${photoId}`, { credentials: 'include' });
      if (tagRes.ok) {
        const tagData = await tagRes.json();
        setTaggedChildIds(new Set(tagData.child_ids || []));
      }
    } catch (err) {
      console.error('[ChildTagEditor] Failed to load:', err);
      toast.error('Failed to load child tags');
    }
    setLoadingChildTags(false);
  }, [classroomChildren.length]);

  const toggleChildTag = useCallback((cid: string) => {
    setTaggedChildIds(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  }, []);

  const saveChildTags = useCallback(async () => {
    if (!childTagPhotoId) return;
    setSavingChildTags(true);
    try {
      const newIds = Array.from(taggedChildIds);
      const res = await fetch('/api/montree/media/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ media_id: childTagPhotoId, action: 'set', child_ids: newIds }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // If the current gallery child was removed, remove this photo from the local list
      if (!taggedChildIds.has(childId)) {
        setPhotos(prev => prev.filter(p => p.id !== childTagPhotoId));
        toast.success(t('gallery.photoRemovedFromGallery'));
      } else {
        toast.success(t('gallery.taggedChildrenUpdated'));
      }
      setChildTagPhotoId(null);
    } catch (err) {
      console.error('[ChildTagEditor] Save failed:', err);
      toast.error('Failed to save child tags');
    }
    setSavingChildTags(false);
  }, [childTagPhotoId, taggedChildIds, childId, locale]);

  // ── Render: Photo Card ──
  const renderPhotoCard = (photo: GalleryItem) => {
    const isExpanded = expandedPhoto === photo.id;
    const isEditingThis = editingCaption === photo.id;
    const url = getPhotoUrl(photo);

    return (
      <div
        key={photo.id}
        style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 420px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' }}
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
                    src={photo.storage_path && !isExpanded ? getThumbnailUrl(photo.storage_path, 480) : url}
                    srcSet={photo.storage_path && !isExpanded ? getThumbnailSrcSet(photo.storage_path, 480) : undefined}
                    sizes="(max-width: 640px) 100vw, 480px"
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
                  src={photo.storage_path && !isExpanded ? getThumbnailUrl(photo.storage_path, 480) : url}
                  srcSet={photo.storage_path && !isExpanded ? getThumbnailSrcSet(photo.storage_path, 480) : undefined}
                  sizes="(max-width: 640px) 100vw, 480px"
                  alt={photo.work_name || photo.caption || 'Photo'}
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover transition-all ${isExpanded ? 'max-h-[60vh]' : 'aspect-[4/3]'}`}
                />
              )
            ) : (
              <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#34d399' }} />
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
                  const photoUrl = getPhotoUrl(photo);
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
                onClick={() => openChildTagEditor(photo.id)}
                className="w-8 h-8 bg-black/40 hover:bg-violet-500 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-sm"
                aria-label={t('gallery.editTaggedChildren')}
              >
                👤
              </button>
              <button
                onClick={() => setCropPhoto({ id: photo.id, url: getPhotoUrl(photo) })}
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
          {/* Work tag — read-only area badge + work label. Corrections happen in Wrap Up. */}
          <div className="flex items-center gap-2">
            {/* Read-only area badge — corrections happen in Wrap Up */}
            <div className="flex-shrink-0">
              {photo.area ? (
                <AreaBadge area={photo.area} size="sm" />
              ) : isPhotoInFlight(photo, nowTs) ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.30)' }}><ProcessingHourglass size={15} /></div>
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.60)' }}>?</div>
              )}
            </div>
            {/* Read-only work label. Photos saved as Other
                (sonnet_draft.is_other=true) show a distinct 📌 chip in muted
                slate; an unconfirmed AI guess shows ✨ + a "Review in Wrap Up"
                link. All (re)tagging happens in Wrap Up. */}
            {(() => {
              // Still being identified by the AI — show a working "Identifying…"
              // label (with the animated hourglass in the avatar slot above)
              // instead of a bare "Untagged" that reads like a failure. The 6s
              // silent poll flips this to the suggestion/tag state on its own.
              if (isPhotoInFlight(photo, nowTs)) {
                return (
                  <div className="flex flex-col flex-1 min-w-0" style={{ padding: '6px 8px' }}>
                    <span className="text-sm" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(94,234,212,0.95)' }}>
                      Identifying…
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(94,234,212,0.65)' }}>
                      Reading the photo — usually a few seconds
                    </span>
                  </div>
                );
              }
              const isOther = photo.sonnet_draft?.is_other === true;
              const DRAFT_STATUSES = ['haiku_drafted', 'haiku_matched', 'sonnet_drafted'];
              const proposed = photo.sonnet_draft?.proposed_name?.trim() || '';
              // Drafted-but-unconfirmed: the AI has a guess (proposed_name) but
              // work_id is still NULL. Show that guess as a one-tap suggestion —
              // never a blank "Untagged" when the AI actually identified it.
              const isSuggestion = !photo.work_id && !isOther && !!proposed
                && (!photo.identification_status || DRAFT_STATUSES.includes(photo.identification_status));
              // Gate-A auto-filed but NOT yet teacher-confirmed: work_id is SET
              // but identification_status is still 'haiku_matched'. Give it the
              // same ✨ AI-tagged treatment + one-tap ✓ so it reads DISTINCTLY
              // from a teacher-confirmed photo — the teacher can confirm (which
              // seeds the moat) or tap the name to correct. Jul 4 2026.
              const isAiTagged = !!photo.work_id && !isOther && photo.identification_status === 'haiku_matched';
              const isAiConfirmable = isSuggestion || isAiTagged;
              const label = isOther
                ? (t('gallery.savedAsOther') || 'Saved as Other')
                : (photo.work_name || (isSuggestion ? proposed : t('gallery.untagged')));
              return (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {/* Read-only work label — the AI's guess or the confirmed
                      work. Corrections + confirms happen in Wrap Up now. */}
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 rounded-lg text-left"
                    style={{ padding: '6px 8px' }}
                  >
                    {isOther && <span style={{ fontSize: 13 }}>📌</span>}
                    {isAiConfirmable && <span style={{ fontSize: 13 }}>✨</span>}
                    <span className="text-sm truncate flex-1" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, color: isOther ? 'rgba(203,213,225,0.85)' : isAiConfirmable ? 'rgba(233,213,255,0.92)' : 'rgba(255,255,255,0.90)', fontStyle: isOther ? 'italic' : 'normal' }}>
                      {label}
                    </span>
                  </div>
                  {/* Unconfirmed AI guess — link to Wrap Up (the home of
                      confirm/correct) instead of a one-tap confirm here. */}
                  {isAiConfirmable && (
                    <Link
                      href="/montree/dashboard/photo-audit"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded-lg transition-transform active:scale-95 whitespace-nowrap"
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'rgba(233,213,255,0.92)', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.30)', textDecoration: 'none' }}
                    >
                      {t('gallery.reviewInWrapUp')}
                    </Link>
                  )}
                </div>
              );
            })()}
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
              <div className="flex items-center gap-2">
                <VoiceDictate
                  size="sm"
                  onAppend={(text) => setCaptionDraft((prev) => (prev ? prev + ' ' + text : text))}
                  onError={(msg) => toast.error(msg)}
                />
                <button
                  onClick={() => setEditingCaption(null)}
                  className="flex-1 rounded-lg"
                  style={{ padding: '6px 12px', fontSize: 14, color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
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
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.70)', fontFamily: '"Inter", sans-serif' }}>
                  {photo.caption}
                </p>
              ) : (
                <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: '"Inter", sans-serif' }}>
                  {t('gallery.tapToAddDescription')}
                </p>
              )}
            </button>
          )}

          {/* Lesson Notes — observation textarea */}
          <div className="pt-1" style={{ borderTop: '1px solid rgba(52,211,153,0.10)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"Inter", sans-serif' }}>{t('gallery.lessonNotes')}</p>
              <VoiceDictate
                size="sm"
                onAppend={(text) => {
                  setNotesDraft((prev) => {
                    const cur = prev[photo.id] || '';
                    return { ...prev, [photo.id]: cur ? cur + ' ' + text : text };
                  });
                  // Fire-and-forget auto-save so the transcript is persisted without another tap.
                  setTimeout(() => handleSaveNote(photo.id), 50);
                }}
                onError={(msg) => toast.error(msg)}
              />
            </div>
            <textarea
              value={notesDraft[photo.id] || ''}
              onChange={(e) => setNotesDraft(prev => ({ ...prev, [photo.id]: e.target.value }))}
              placeholder={t('gallery.notePlaceholder')}
              rows={2}
              className="w-full text-sm rounded-lg resize-none focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.80)', fontFamily: '"Inter", sans-serif', padding: '6px 8px' }}
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
            <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(52,211,153,0.10)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"Inter", sans-serif' }}>{formatDateTime(photo.captured_at)}</p>
              {photo.captured_by && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"Inter", sans-serif' }}>{t('gallery.capturedBy')} {photo.captured_by}</p>
              )}
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {photo.tags.map(tag => (
                    <span key={tag} className="px-2 rounded-full text-xs" style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.12)' }}>{tag}</span>
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
            <div key={i} className="animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 14, padding: 12 }}>
              <div style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 12 }} />
              <div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '75%', marginBottom: 8 }} />
              <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 6, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <Toaster position="top-center" richColors />

      {/* Offline Photo Queue Status */}
      <PhotoQueueBanner childId={childId} />

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="gallery" role="parent" />
      )}


      {/* ══════════════════════════════════════════════
          VIEW CONTROLS + AREA FILTER + SELECTION
          ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* spacer — area chips below handle the "All" filter */}
        </div>

        <div className="flex items-center gap-2">
          <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{filteredPhotos.length} {t('gallery.photosTotal')}</span>
          {filteredPhotos.length > 0 && (
            <button
              onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
              style={{ padding: '7px 12px', borderRadius: 10, fontFamily: '"Inter", sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 120ms ease', background: selectionMode ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${selectionMode ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.12)'}`, color: selectionMode ? '#34d399' : 'rgba(255,255,255,0.60)' }}
            >
              {selectionMode ? `✓ ${t('gallery.select')}` : t('gallery.select')}
            </button>
          )}
        </div>
      </div>

      {/* Area filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedArea(null)}
          style={{
            padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 120ms ease', border: `1px solid ${!selectedArea ? 'rgba(52,211,153,0.55)' : 'rgba(52,211,153,0.15)'}`,
            background: !selectedArea ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
            color: !selectedArea ? '#34d399' : 'rgba(255,255,255,0.60)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          }}
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
              style={{
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 120ms ease', display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${isActive ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.15)'}`,
                background: isActive ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#34d399' : 'rgba(255,255,255,0.60)',
                backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <AreaBadge area={area} size="xs" />
              <span>{config.name}</span>
              <span style={{ opacity: 0.55, fontSize: 11 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Selection toolbar */}
      {selectionMode && selectedIds.size > 0 && (
        <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, color: '#34d399' }}>
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
              style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)', borderRadius: 8, color: '#34d399', fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
            >
              {selectedIds.size === filteredPhotos.length ? t('gallery.deselectAll') : t('gallery.selectAll')}
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={downloadingZip}
              style={{ fontSize: 12, padding: '5px 12px', background: downloadingZip ? 'rgba(232,201,106,0.25)' : 'rgba(232,201,106,0.85)', border: 'none', borderRadius: 8, color: downloadingZip ? '#E8C96A' : '#0a1a0f', fontFamily: '"Inter", sans-serif', fontWeight: 600, cursor: downloadingZip ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              aria-label="Download selected photos as a ZIP"
            >
              {downloadingZip && downloadProgress
                ? `Zipping ${downloadProgress.done}/${downloadProgress.total}…`
                : '💾 Download'}
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(239,68,68,0.80)', border: 'none', borderRadius: 8, color: 'white', fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
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
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, padding: '32px 24px', textAlign: 'center', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' }}>
          <div className="text-4xl mb-3">📷</div>
          <h2 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.90)', marginBottom: 6 }}>
            {selectedArea
              ? t('review.noPhotosInArea')
              : t('review.noPhotos')}
          </h2>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {t('review.takePhotos')}
          </p>
        </div>
      ) : (
        // Chronological view — grouped by date (newest first)
        <div className="space-y-6">
          {timelineGroups.map(([dateKey, datePhotos]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                  <h3 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                    {new Date(dateKey + 'T12:00:00').toLocaleDateString(getIntlLocale(locale), {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </h3>
                  <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, padding: '3px 9px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 999, color: '#34d399', fontWeight: 600 }}>
                    {datePhotos.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {datePhotos.map(photo => renderPhotoCard(photo))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODALS + OVERLAYS
          ══════════════════════════════════════════════ */}


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
            src={currentPhoto ? getPhotoUrl(currentPhoto) : ''}
            alt={currentPhoto?.work_name || currentPhoto?.caption || 'Photo'}
            photos={filteredPhotos.map(p => ({
              url: getPhotoUrl(p),
              caption: p.caption,
              date: p.captured_at,
            }))}
            currentIndex={safeIndex}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        );
      })()}



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

      {/* Child Tag Editor Modal */}
      {childTagPhotoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setChildTagPhotoId(null)}
        >
          <div
            className="w-full max-w-sm max-h-[70vh] flex flex-col"
            style={{ background: 'rgba(7,18,12,0.97)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 18, backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(52,211,153,0.12)' }}>
              <h3 style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 500, fontSize: 16, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                {'👤 ' + t('gallery.editTaggedChildren')}
              </h3>
              <button
                onClick={() => setChildTagPhotoId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loadingChildTags ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(139,92,246,0.20)', borderTopColor: 'rgba(139,92,246,0.80)' }} />
                </div>
              ) : (
                <div className="space-y-1">
                  {classroomChildren.map(child => {
                    const isTagged = taggedChildIds.has(child.id);
                    const isCurrent = child.id === childId;
                    return (
                      <button
                        key={child.id}
                        onClick={() => toggleChildTag(child.id)}
                        className="w-full flex items-center gap-3 rounded-xl transition-colors"
                        style={{ padding: '10px 12px', background: isTagged ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isTagged ? 'rgba(139,92,246,0.30)' : 'rgba(255,255,255,0.07)'}` }}
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center border-2 transition-colors" style={{ background: isTagged ? 'rgba(139,92,246,0.80)' : 'transparent', borderColor: isTagged ? 'rgba(139,92,246,0.80)' : 'rgba(255,255,255,0.30)', color: 'white' }}>
                          {isTagged && <span className="text-xs">✓</span>}
                        </div>
                        <span className="text-sm font-medium" style={{ fontFamily: '"Inter", sans-serif', color: isTagged ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.80)' }}>
                          {child.name}
                        </span>
                        {isCurrent && (
                          <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {t('gallery.current')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2" style={{ padding: '12px 16px', borderTop: '1px solid rgba(52,211,153,0.12)' }}>
              <button
                onClick={() => setChildTagPhotoId(null)}
                className="flex-1 rounded-xl transition-colors"
                style={{ padding: '8px 16px', fontSize: 13, fontFamily: '"Inter", sans-serif', color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveChildTags}
                disabled={savingChildTags}
                className="flex-1 rounded-xl disabled:opacity-50 transition-colors"
                style={{ padding: '8px 16px', fontSize: 13, fontFamily: '"Inter", sans-serif', color: 'white', background: 'rgba(139,92,246,0.75)', border: '1px solid rgba(139,92,246,0.40)', cursor: 'pointer' }}
              >
                {savingChildTags ? '...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

