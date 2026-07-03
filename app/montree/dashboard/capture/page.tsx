// app/montree/dashboard/capture/page.tsx
// Native-feeling capture flow: Camera opens instantly → Take photo → Tag child → Upload
// Dark forest visual treatment — all wiring intact
'use client';

import React, { useState, useEffect, Suspense, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, Check, PartyPopper } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import CameraCapture from '@/components/montree/media/CameraCapture';
import { compressImage } from '@/lib/montree/media/compression';
import { uploadVideo } from '@/lib/montree/media/upload';
import { enqueuePhoto, syncQueue } from '@/lib/montree/offline';
import {
  addTask,
  getTaskSignal,
  completeTask,
  failTask,
} from '@/lib/montree/background-task-store';
import type { MontreeChild, MontreeEvent, CapturedPhoto, CapturedVideo, CapturedMedia } from '@/lib/montree/media/types';
import DailyLanguageSix from '@/components/montree/capture/DailyLanguageSix';
import TodaysFocusStrip from '@/components/montree/focus/TodaysFocusStrip';
import { useFeatures } from '@/hooks/useFeatures';

// Tier 5 perf: EventPicker is modal-gated, code-split it.
const EventPicker = dynamic(() => import('@/components/montree/media/EventPicker'), { ssr: false });

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// ============================================
// TYPES
// ============================================

type FlowStep = 'camera' | 'tag-child';

// ============================================
// AVATAR BUTTON COMPONENT
// ============================================

function ChildAvatarButton({ child, isSelected }: { child: MontreeChild; isSelected: boolean }) {
  const [showFallback, setShowFallback] = useState(!child.photo_url);

  const wrapperStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: T.sans,
    fontSize: 14,
    fontWeight: 700,
    background: isSelected ? T.emerald : 'rgba(255,255,255,0.18)',
    color: isSelected ? '#06281a' : 'rgba(255,255,255,0.85)',
    transition: 'all 120ms ease',
    overflow: 'hidden',
  };

  if (!showFallback && child.photo_url) {
    return (
      <div style={wrapperStyle}>
        <img
          src={getProxyUrl(child.photo_url)}
          alt={child.name}
          onError={() => setShowFallback(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      {child.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

function CaptureLoading() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.sans,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 36,
          height: 36,
          border: `4px solid ${T.emeraldDim}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'cap-spin 0.9s linear infinite',
          marginBottom: 14,
        }} />
        <p style={{ margin: 0, color: T.textSecondary, fontSize: 13 }}>
          {t('common.loading')}
        </p>
      </div>
      <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================
// MAIN CONTENT COMPONENT
// ============================================

function CaptureContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled } = useFeatures();
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
  const [schoolId, setSchoolId] = useState<string>('');
  const [classroomId, setClassroomId] = useState<string>('');
  const [workId, setWorkId] = useState<string | null>(workIdFromUrl);
  const [selectedEvent, setSelectedEvent] = useState<MontreeEvent | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);

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

    if (isVideo) {
      const videoBlob = 'blob' in (media.data as CapturedVideo)
        ? (media.data as CapturedVideo).blob
        : media.data as Blob;

      toast.success(t('offline.photoSaved') || `${label} saved!`, { duration: 2000 });
      navigateAfterCapture(childIds);

      const taskId = addTask({
        type: 'video_upload',
        label: t('bgTask.uploadingVideo'),
      });

      const signal = getTaskSignal(taskId);

      (async () => {
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
            event_id: selectedEvent?.id || undefined,
          });

          if (signal?.aborted) return;

          if (result.success) {
            completeTask(taskId, { message: `✓ ${t('bgTask.videoComplete')}` });
          } else {
            failTask(taskId, result.error || t('bgTask.videoFailed'));
          }
        } catch (err) {
          if (signal?.aborted) return;
          console.error('Video upload error:', err);
          failTask(taskId, t('bgTask.videoFailed'));
        }
      })();

      return;
    }

    const photo = media.data as CapturedPhoto;
    let compressedBlob: Blob;
    let compressedWidth = photo.width;
    let compressedHeight = photo.height;

    console.log('[CAPTURE] Starting compression. Blob size:', photo.blob.size, 'type:', photo.blob.type, 'dimensions:', photo.width, 'x', photo.height);

    try {
      const compressed = await Promise.race([
        compressImage(photo.blob),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Compression timed out after 10s')), 10_000)
        ),
      ]);
      compressedBlob = compressed.blob;
      compressedWidth = compressed.width;
      compressedHeight = compressed.height;
      console.log('[CAPTURE] Compression complete. New size:', compressedBlob.size, 'dimensions:', compressedWidth, 'x', compressedHeight);
    } catch (err) {
      console.error('[CAPTURE] Compression failed, using original:', err);
      compressedBlob = photo.blob;
    }

    console.log('[CAPTURE] Enqueueing photo. child_id:', idsToTag[0] || '(none)', 'school_id:', schoolId, 'blob size:', compressedBlob.size);
    try {
      await enqueuePhoto(compressedBlob, {
        child_id: idsToTag[0] || '',
        child_ids: idsToTag.length > 1 ? idsToTag : undefined,
        classroom_id: classroomId,
        school_id: schoolId,
        work_id: workId || undefined,
        work_name: workName || undefined,
        work_area: workArea || undefined,
        is_class_photo: isClassMode,
        event_id: selectedEvent?.id || undefined,
        width: compressedWidth,
        height: compressedHeight,
      });
    } catch (err) {
      console.error('Failed to enqueue photo:', err);
      // DIAGNOSABILITY: only show "queue full" when the queue is actually full.
      // This catch used to blanket-label EVERY enqueue failure (IndexedDB
      // unavailable, storage quota, private browsing...) as "Photo queue full",
      // which sent debugging in the wrong direction. Surface the real error.
      const msg = err instanceof Error ? err.message : String(err);
      if (/queue is full/i.test(msg)) {
        toast.error(t('offline.queueFull') || 'Photo queue full', { duration: 5000 });
      } else {
        toast.error(`Photo could not be saved: ${msg}`, { duration: 8000 });
      }
      return;
    }

    console.log('[CAPTURE] Photo enqueued successfully, showing toast and navigating');
    toast.success(t('offline.photoSaved') || `${label} saved!`, { duration: 2000 });
    navigateAfterCapture(childIds);

    syncQueue().catch(e => console.error('[CAPTURE] Background sync failed:', e));
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
    console.log('[CAPTURE] handleMediaCapture called. type:', media.type, 'preSelectedChildId:', preSelectedChildId, 'isClassMode:', isClassMode, 'children:', children.length);
    if (preSelectedChildId || isClassMode) {
      doUploadAndAnalyze(media, preSelectedChildId ? [preSelectedChildId] : []);
      return;
    }

    if (loadingChildren) {
      setCapturedMedia(media);
      setStep('tag-child');
      return;
    }

    if (children.length === 1) {
      doUploadAndAnalyze(media, [children[0].id]);
      return;
    }

    setCapturedMedia(media);
    setStep('tag-child');
  };

  // Safe exit: router.back() is a silent no-op when there's no history entry
  // (opened in a new tab, deep link, PWA cold-start, or after the error screen).
  // That left the fullscreen camera stuck with a dead Cancel button. Fall back to
  // a known destination if back() doesn't actually navigate away.
  const safeExit = () => {
    const before = window.location.pathname;
    const fallback = preSelectedChildId
      ? `/montree/dashboard/${preSelectedChildId}`
      : '/montree/dashboard';
    router.back();
    window.setTimeout(() => {
      if (window.location.pathname === before) {
        router.push(fallback);
      }
    }, 350);
  };

  const handleCameraCancel = () => {
    safeExit();
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
    doUploadAndAnalyze(capturedMedia, []);
  };

  // ============================================
  // RENDER
  // ============================================

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

  const hasChildren = children.length > 0;
  const allSelected = selectedChildIds.length === children.length && hasChildren;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      <Toaster position="top-center" />

      {/* Photo preview as background */}
      {photoPreview && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}>
          <img
            src={photoPreview}
            alt="Captured"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.18,
            }}
          />
          {/* Vignette overlay so glass surfaces stay legible over preview */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,26,15,0.55), rgba(10,26,15,0.85))',
          }} />
        </div>
      )}

      {/* Event banner */}
      {selectedEvent && (
        <div style={{
          position: 'relative',
          zIndex: 10,
          margin: '48px 16px 8px',
          padding: '12px 14px',
          borderRadius: 14,
          background: T.amberSoft,
          border: `1px solid ${T.amberBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <PartyPopper size={18} strokeWidth={1.75} color={T.amber} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              color: '#fbbf24',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: T.sans,
            }}>
              {t('capture.eventBanner').replace('{eventName}', selectedEvent.name)}
            </span>
          </div>
          <button
            onClick={() => setShowEventPicker(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.amber,
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            {t('common.change') || 'Change'}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: selectedEvent ? '0 16px 8px' : '40px 16px 8px',
      }}>
        <button
          onClick={safeExit}
          aria-label="Cancel"
          style={{
            position: 'absolute',
            left: 12,
            top: selectedEvent ? -2 : 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: T.textPrimary,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <h2 style={{
          margin: 0,
          fontFamily: T.serif,
          fontSize: 20,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.2,
          textAlign: 'center',
        }}>
          {t('capture.whoIsThis')}
        </h2>
        <p style={{
          margin: '4px 0 0',
          fontFamily: T.sans,
          fontSize: 12,
          color: T.textMuted,
          textAlign: 'center',
        }}>
          {t('capture.tagChildHint')}
        </p>
      </div>

      {/* Select All + Event picker row */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={() => {
            if (selectedChildIds.length === children.length) {
              setSelectedChildIds([]);
            } else {
              setSelectedChildIds(children.map(c => c.id));
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: T.emerald,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {allSelected ? t('capture.deselectAll') : t('capture.selectAll')}
        </button>
        {!selectedEvent && (
          <button
            onClick={() => setShowEventPicker(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.amber,
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: 0,
            }}
          >
            <PartyPopper size={13} strokeWidth={1.75} />
            {t('events.selectEvent')}
          </button>
        )}
      </div>

      {/* Today's Focus strip */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '8px 12px 0',
      }}>
        <TodaysFocusStrip compact />
      </div>

      {/* Daily Language 6 */}
      {isEnabled('daily_language_6') && (
        <DailyLanguageSix
          selectedChildIds={selectedChildIds}
          onToggleChild={toggleChild}
        />
      )}

      {/* Child grid */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        overflow: 'hidden',
        padding: '4px 12px',
      }}>
        {loadingChildren ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: `4px solid ${T.emeraldDim}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'cap-spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (() => {
          const count = children.length;
          const cols = count <= 24 ? 4 : 5;
          const rows = Math.ceil(count / cols);
          return (
            <div style={{
              height: '100%',
              display: 'grid',
              gap: 8,
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}>
              {children.map(child => {
                const isSelected = selectedChildIds.includes(child.id);
                return (
                  <button
                    key={child.id}
                    onClick={() => toggleChild(child.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      background: isSelected
                        ? 'rgba(52,211,153,0.20)'
                        : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isSelected ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: isSelected ? T.emerald : T.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      minHeight: 0,
                      padding: 4,
                    }}
                  >
                    <ChildAvatarButton child={child} isSelected={isSelected} />
                    <span style={{
                      marginTop: 4,
                      fontFamily: T.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: isSelected ? T.emerald : 'rgba(255,255,255,0.70)',
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}>
                      {child.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Bottom actions */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '8px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <button
          onClick={handleSaveWithTags}
          disabled={selectedChildIds.length === 0}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 16,
            background: selectedChildIds.length > 0
              ? 'linear-gradient(180deg, #34d399, #10b981)'
              : 'rgba(255,255,255,0.08)',
            border: selectedChildIds.length > 0
              ? '1px solid rgba(52,211,153,0.55)'
              : '1px solid rgba(255,255,255,0.08)',
            color: selectedChildIds.length > 0 ? '#06281a' : 'rgba(255,255,255,0.30)',
            fontFamily: T.sans,
            fontSize: 15,
            fontWeight: 700,
            cursor: selectedChildIds.length > 0 ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            transition: 'all 120ms ease',
            boxShadow: selectedChildIds.length > 0 ? '0 6px 20px rgba(16,185,129,0.30)' : 'none',
          }}
        >
          {selectedChildIds.length === 0 ? (
            <>{t('capture.selectChild')}</>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              {selectedChildIds.length === 1
                ? t('capture.save')
                : t('capture.saveForCount').replace('{count}', String(selectedChildIds.length))}
            </>
          )}
        </button>
        <button
          onClick={handleSkipTagging}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.50)',
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t('capture.skipTagging')}
        </button>
      </div>

      {/* Event Picker Modal */}
      {showEventPicker && (
        <EventPicker
          schoolId={schoolId}
          selectedEventId={selectedEvent?.id || null}
          onSelect={(event) => setSelectedEvent(event)}
          onClose={() => setShowEventPicker(false)}
        />
      )}

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
