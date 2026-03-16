// app/montree/dashboard/capture/page.tsx
// Native-feeling capture flow: Camera opens instantly → Take photo → Tag child → Upload
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import CameraCapture from '@/components/montree/media/CameraCapture';
import { compressImage, generateThumbnail } from '@/lib/montree/media/compression';
import { uploadVideo } from '@/lib/montree/media/upload';
import { startAnalysis } from '@/lib/montree/photo-insight-store';
import type { MontreeChild, CapturedPhoto, CapturedVideo, CapturedMedia } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

type FlowStep = 'camera' | 'tag-child';

// ============================================
// LOADING FALLBACK
// ============================================

function CaptureLoading() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-4" />
        <p className="text-white/70">{t('common.loading')}</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN CONTENT COMPONENT
// ============================================

function CaptureContent() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();

  // Pre-selected child from URL (e.g. from week view capture button)
  const preSelectedChildId = searchParams.get('child');
  const isClassMode = searchParams.get('class') === 'true';

  // Work context from URL (passed from Week view Capture button)
  const workName = searchParams.get('workName');
  const workArea = searchParams.get('area');
  const workIdFromUrl = searchParams.get('workId');

  // State
  const [step, setStep] = useState<FlowStep>('camera');
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    preSelectedChildId ? [preSelectedChildId] : []
  );
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [schoolId, setSchoolId] = useState<string>('');
  const [classroomId, setClassroomId] = useState<string>('');
  const [workId, setWorkId] = useState<string | null>(workIdFromUrl);

  // ============================================
  // INIT: Session + Children + Work lookup
  // ============================================

  useEffect(() => {
    const session = getSession();
    if (session) {
      if (session.school?.id) setSchoolId(session.school.id);
      if (session.classroom?.id) setClassroomId(session.classroom.id);
    }
  }, []);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/montree/children');
        if (!response.ok) {
          console.error('Children API error:', response.status);
          return;
        }
        const data = await response.json();
        if (data.children) setChildren(data.children);
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  useEffect(() => {
    if (workIdFromUrl || !workName || !classroomId) return;
    const lookupWorkId = async () => {
      try {
        const res = await fetch(`/api/montree/works/search?q=${encodeURIComponent(workName)}&classroom_id=${classroomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.works?.length > 0) {
          const exactMatch = data.works.find((w: Record<string, unknown>) =>
            (w.name as string)?.toLowerCase() === workName.toLowerCase()
          );
          const match = exactMatch || data.works[0];
          if (match?.id) setWorkId(match.id as string);
        }
      } catch (err) {
        console.error('Failed to lookup work_id:', err);
      }
    };
    lookupWorkId();
  }, [workName, classroomId, workIdFromUrl]);

  // ============================================
  // UPLOAD + SMART CAPTURE
  // ============================================

  const doUploadAndAnalyze = async (media: CapturedMedia, childIds: string[]) => {
    const idsToTag = isClassMode ? children.map(c => c.id) : childIds;
    const isVideo = media.type === 'video';
    const label = isVideo ? 'Video' : 'Photo';

    // Guard: school_id is required for upload — if missing, session is broken
    if (!schoolId) {
      console.error('Upload failed: no school_id in session');
      toast.error('Session error — please log in again', { duration: 5000 });
      router.push('/montree/login');
      return;
    }

    // For videos: still await the full upload (no Canvas compression needed, but large files)
    if (isVideo) {
      setIsUploading(true);
      try {
        const result = await uploadVideo(media.data as CapturedVideo, {
          school_id: schoolId,
          classroom_id: classroomId || undefined,
          child_id: idsToTag.length === 1 ? idsToTag[0] : undefined,
          child_ids: idsToTag.length > 1 ? idsToTag : undefined,
          is_class_photo: isClassMode,
          work_id: workId || undefined,
          caption: workName || undefined,
          tags: workArea ? [workArea] : undefined,
        });
        if (result.success) {
          toast.success(`${label} saved!`, { duration: 2000 });
        } else {
          toast.error(`${label} failed: ${result.error || 'Upload error'}`, { duration: 5000 });
        }
      } catch (err) {
        console.error('Video upload error:', err);
        toast.error(`${label} upload failed`, { duration: 5000 });
      }
      // Navigate after video upload
      navigateAfterCapture(childIds);
      return;
    }

    // PHOTOS: Fire-and-forget pattern
    // Step 1: Compress image + generate thumbnail (needs live DOM — ~200ms, must await)
    const photo = media.data as CapturedPhoto;
    let compressedBlob: Blob;
    let compressedWidth = photo.width;
    let compressedHeight = photo.height;
    let thumbnailBlob: Blob | null = null;

    try {
      const compressed = await compressImage(photo.blob);
      compressedBlob = compressed.blob;
      compressedWidth = compressed.width;
      compressedHeight = compressed.height;
    } catch (err) {
      console.error('Compression failed, using original:', err);
      compressedBlob = photo.blob;
    }

    try {
      const thumb = await generateThumbnail(compressedBlob);
      thumbnailBlob = thumb.blob;
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
    }

    // Step 2: Build FormData (synchronous, no DOM needed)
    const formData = new FormData();
    formData.append('file', compressedBlob, `photo-${Date.now()}.jpg`);
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob, `thumb-${Date.now()}.jpg`);
    }
    formData.append('metadata', JSON.stringify({
      school_id: schoolId,
      classroom_id: classroomId || undefined,
      child_id: idsToTag.length === 1 ? idsToTag[0] : undefined,
      child_ids: idsToTag.length > 1 ? idsToTag : undefined,
      is_class_photo: isClassMode,
      media_type: 'photo',
      captured_at: new Date().toISOString(),
      work_id: workId || undefined,
      caption: workName || undefined,
      tags: workArea ? [workArea] : undefined,
      width: compressedWidth,
      height: compressedHeight,
    }));

    // Step 3: Navigate IMMEDIATELY — don't wait for network
    toast.success(`${label} saved!`, { duration: 2000 });
    navigateAfterCapture(childIds);

    // Step 4: Fire-and-forget upload (fetch survives page navigation)
    fetch('/api/montree/media/upload', { method: 'POST', body: formData })
      .then(res => { if (!res.ok) throw new Error(`Upload failed: ${res.status}`); return res.json(); })
      .then(result => {
        if (result.success && result.media?.id && idsToTag.length > 0) {
          // Auto-trigger Smart Capture for ALL tagged photos (single + group)
          // For group photos, analyze once for the first child (cost optimization ~$0.06/call)
          // Photo is still tagged to all children via metadata child_ids
          const currentLocale = localStorage.getItem('montree_lang') || 'en';
          startAnalysis(result.media.id, idsToTag[0], currentLocale);
        }
        if (!result.success) {
          console.error('Background upload failed:', result.error);
          toast.error('Photo upload failed — please retake', { duration: 5000 });
        }
      })
      .catch(err => {
        console.error('Background upload error:', err);
        toast.error('Photo upload failed — please retake', { duration: 5000 });
      });
  };

  const navigateAfterCapture = (childIds: string[]) => {
    if (preSelectedChildId) {
      router.push(`/montree/dashboard/${preSelectedChildId}`);
    } else if (childIds.length === 1) {
      router.push(`/montree/dashboard/${childIds[0]}`);
    } else {
      router.push('/montree/dashboard');
    }
  };

  // ============================================
  // CAMERA HANDLERS
  // ============================================

  const handleMediaCapture = (media: CapturedMedia) => {
    // If child is pre-selected or class mode, skip tagging — upload directly
    if (preSelectedChildId || isClassMode) {
      doUploadAndAnalyze(media, preSelectedChildId ? [preSelectedChildId] : []);
      return;
    }

    // If children are still loading, save the media and go to tagging screen
    // (the tagging screen shows a spinner while children load)
    if (loadingChildren) {
      setCapturedMedia(media);
      setStep('tag-child');
      return;
    }

    // If only one child in classroom, auto-tag and upload directly
    if (children.length === 1) {
      doUploadAndAnalyze(media, [children[0].id]);
      return;
    }

    // Multiple children (or zero — let them see the empty state) — show tagging screen
    setCapturedMedia(media);
    setStep('tag-child');
  };

  const handleCameraCancel = () => {
    router.back();
  };

  // ============================================
  // TAG CHILD HANDLERS
  // ============================================

  const toggleChild = (childId: string) => {
    setSelectedChildIds(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const handleSaveWithTags = () => {
    if (!capturedMedia || selectedChildIds.length === 0) return;
    doUploadAndAnalyze(capturedMedia, selectedChildIds);
  };

  const handleSkipTagging = () => {
    if (!capturedMedia) return;
    // Upload without child tag — will still appear in classroom media
    doUploadAndAnalyze(capturedMedia, []);
  };

  // ============================================
  // RENDER
  // ============================================

  // Uploading overlay (only for video uploads which still block)
  if (isUploading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <Toaster position="top-center" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent" />
          <p className="text-white text-lg font-medium">
            {t('capture.uploading')}
          </p>
        </div>
      </div>
    );
  }

  // Step 1: Camera (opens immediately)
  if (step === 'camera') {
    return (
      <>
        <Toaster position="top-center" />
        <CameraCapture
          onCapture={handleMediaCapture}
          onCancel={handleCameraCancel}
          allowVideo={true}
        />
      </>
    );
  }

  // Step 2: Tag child(ren) after photo is taken
  const photoPreview = capturedMedia?.type === 'photo'
    ? (capturedMedia.data as CapturedPhoto).dataUrl
    : null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <Toaster position="top-center" />

      {/* Photo preview as background */}
      {photoPreview && (
        <div className="absolute inset-0">
          <img
            src={photoPreview}
            alt="Captured"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 px-4 pt-12 pb-3">
        <h2 className="text-white text-xl font-bold text-center">
          {t('capture.whoIsThis')}
        </h2>
        <p className="text-white/60 text-sm text-center mt-1">
          {t('capture.tagChildHint')}
        </p>
      </div>

      {/* Child grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
        {loadingChildren ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {children.map(child => {
              const isSelected = selectedChildIds.includes(child.id);
              return (
                <button
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                    ${isSelected
                      ? 'bg-emerald-500/30 ring-2 ring-emerald-400'
                      : 'bg-white/10 active:bg-white/20'
                    }
                  `}
                >
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all
                    ${isSelected
                      ? 'bg-emerald-500 text-white scale-110'
                      : 'bg-white/20 text-white/80'
                    }
                  `}>
                    {child.photo_url ? (
                      <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      child.name.charAt(0)
                    )}
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-emerald-300' : 'text-white/70'}`}>
                    {child.name}
                  </span>
                  {isSelected && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 px-4 pb-8 pt-3 flex flex-col gap-2">
        <button
          onClick={handleSaveWithTags}
          disabled={selectedChildIds.length === 0}
          className={`
            w-full py-4 rounded-2xl font-bold text-lg transition-all
            ${selectedChildIds.length > 0
              ? 'bg-emerald-500 text-white active:scale-[0.98]'
              : 'bg-white/10 text-white/30'
            }
          `}
        >
          {selectedChildIds.length === 0
            ? t('capture.selectChild')
            : selectedChildIds.length === 1
              ? `✓ ${t('capture.save')}`
              : `✓ ${t('capture.saveForCount').replace('{count}', String(selectedChildIds.length))}`
          }
        </button>
        <button
          onClick={handleSkipTagging}
          className="w-full py-3 text-white/50 text-sm font-medium"
        >
          {t('capture.skipTagging')}
        </button>
      </div>
    </div>
  );
}

// ============================================
// PAGE EXPORT WITH SUSPENSE
// ============================================

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureLoading />}>
      <CaptureContent />
    </Suspense>
  );
}
