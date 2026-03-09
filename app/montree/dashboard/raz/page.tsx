// /montree/dashboard/raz/page.tsx
// RAZ Reading Tracker - Custom camera via getUserMedia for instant captures
// Flow: Tap Read → live camera preview → tap tap tap (3 photos) → done, next kid
// No iOS "Use Photo" confirmation, no file picker, no delay between shots
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';
import { RAZSkeleton } from '@/components/montree/Skeletons';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
  avatar_emoji?: string;
  color?: string;
}

interface RazRecord {
  id?: string;
  child_id: string;
  record_date: string;
  status: 'read' | 'not_read' | 'no_folder' | 'absent';
  book_photo_url?: string;
  signature_photo_url?: string;
  new_book_photo_url?: string;
  book_title?: string;
  notes?: string;
}

type StatusType = 'read' | 'not_read' | 'no_folder' | 'absent';
type PhotoType = 'book' | 'signature' | 'new_book';

const STATUS_CONFIG: Record<StatusType, { label: string; emoji: string; color: string; bg: string }> = {
  read: { label: 'Read', emoji: '📖', color: '#22c55e', bg: '#dcfce7' },
  not_read: { label: 'Not Read', emoji: '❌', color: '#ef4444', bg: '#fee2e2' },
  no_folder: { label: 'No Folder', emoji: '📁', color: '#f59e0b', bg: '#fef3c7' },
  absent: { label: 'Absent', emoji: '🚫', color: '#6b7280', bg: '#f3f4f6' },
};

const PHOTO_SEQUENCE: PhotoType[] = ['book', 'signature', 'new_book'];
const PHOTO_LABELS: Record<PhotoType, string> = {
  book: '📖 Book',
  signature: '✍️ Signature',
  new_book: '📗 New Book',
};
const PHOTO_URL_KEYS: Record<PhotoType, keyof RazRecord> = {
  book: 'book_photo_url',
  signature: 'signature_photo_url',
  new_book: 'new_book_photo_url',
};

interface CameraFlowState {
  childId: string;
  childName: string;
  step: number;
  oneShot: boolean;
  // Local preview URLs for instant feedback (before upload finishes)
  previews: (string | null)[];
}

export default function RazTrackerPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<Record<string, RazRecord>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Custom camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera flow state
  const [cameraFlow, setCameraFlow] = useState<CameraFlowState | null>(null);
  const flowRef = useRef<CameraFlowState | null>(null);

  // File input fallback (for browsers without getUserMedia)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Photo lightbox viewer
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; label: string; childName: string } | null>(null);

  // Track in-flight uploads
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const uploadAbortRefs = useRef<Map<string, AbortController>>(new Map());

  // Refs for use inside callbacks without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;
  const childrenRef = useRef(children);
  childrenRef.current = children;
  const recordsRef = useRef(records);
  recordsRef.current = records;

  // Auth check
  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess);
  }, [router]);

  // Load children + records
  useEffect(() => {
    if (!session?.classroom?.id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadData(controller.signal);
    return () => controller.abort();
  }, [session, selectedDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopCamera();
      uploadAbortRefs.current.forEach(c => c.abort());
      uploadAbortRefs.current.clear();
    };
  }, []);

  async function loadData(signal?: AbortSignal) {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const [childRes, razRes] = await Promise.all([
        fetch(`/api/montree/children?classroom_id=${session.classroom.id}`, { signal }),
        fetch(`/api/montree/raz?classroom_id=${session.classroom.id}&date=${selectedDate}`, { signal }),
      ]);
      const childData = await childRes.json();
      const razData = await razRes.json();
      setChildren(childData.children || []);
      const recordMap: Record<string, RazRecord> = {};
      (razData.records || []).forEach((r: RazRecord) => { recordMap[r.child_id] = r; });
      setRecords(recordMap);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast.error('Failed to load data');
    }
    setLoading(false);
  }

  // --- Auto-advance: find next child who hasn't been marked yet ---

  function getNextUnmarkedChild(afterChildId: string): Child | null {
    const kids = childrenRef.current;
    const recs = recordsRef.current;
    const currentIdx = kids.findIndex(c => c.id === afterChildId);
    if (currentIdx === -1) return null;
    // Search forward from current child
    for (let i = currentIdx + 1; i < kids.length; i++) {
      if (!recs[kids[i].id]?.status || recs[kids[i].id]?.status === 'not_read') {
        return kids[i];
      }
    }
    return null;
  }

  function advanceToNextChild(finishedChildId: string, finishedChildName: string) {
    const sess = sessionRef.current;
    if (!sess?.classroom?.id) { endCameraFlow(); return; }

    const next = getNextUnmarkedChild(finishedChildId);
    if (!next) {
      // No more unmarked children — done!
      endCameraFlow();
      toast.success(`✅ ${finishedChildName} done! All students checked.`, { duration: 1500 });
      return;
    }

    // Set "read" status on next child (optimistic + background save)
    setRecords(prev => ({
      ...prev,
      [next.id]: { ...prev[next.id], child_id: next.id, record_date: dateRef.current, status: 'read' },
    }));
    setStatus(next.id, 'read');

    // Keep camera open — just switch to new child's flow
    toast.success(`✅ ${finishedChildName} done → ${next.name}`, { duration: 1000 });
    const nextFlow: CameraFlowState = { childId: next.id, childName: next.name, step: 0, oneShot: false, previews: [null, null, null] };
    flowRef.current = nextFlow;
    setCameraFlow(nextFlow);
    // Camera stream stays open — no stopCamera/startCamera cycle needed
  }

  // --- Camera functions ---

  async function startCamera(childId: string, childName: string, step: number, oneShot: boolean) {
    const flow: CameraFlowState = { childId, childName, step, oneShot, previews: [null, null, null] };
    flowRef.current = flow;
    setCameraFlow(flow);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      // getUserMedia failed (permission denied, not supported) → fall back to file input
      if (!mountedRef.current) return;
      setUseFallback(true);
      triggerFileInput();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function endCameraFlow() {
    stopCamera();
    flowRef.current = null;
    setCameraFlow(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Capture a frame from the live video — INSTANT, no confirmation
  function captureFrame() {
    const flow = flowRef.current;
    if (!flow) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const sess = sessionRef.current;
    if (!sess?.classroom?.id) return;

    // Draw current video frame to canvas
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get local preview URL immediately
    const previewUrl = canvas.toDataURL('image/jpeg', 0.5);

    // Update flow with preview
    const newPreviews = [...flow.previews];
    newPreviews[flow.step] = previewUrl;
    const updatedFlow = { ...flow, previews: newPreviews };

    const { childId, childName, step, oneShot } = flow;
    const photoType = PHOTO_SEQUENCE[step];
    const date = dateRef.current;

    // Convert canvas to blob and upload in background
    canvas.toBlob((blob) => {
      if (!mountedRef.current) return;
      if (!blob || blob.size === 0) {
        toast.error('Camera capture failed — try again');
        return;
      }
      const file = new File([blob], `raz-${photoType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      uploadPhoto(file, childId, date, photoType, sess.classroom.id);
    }, 'image/jpeg', 0.8);

    // Flash feedback
    toast.success(`${PHOTO_LABELS[photoType]}`, { duration: 800 });

    // Advance to next step or finish
    if (oneShot) {
      endCameraFlow();
    } else {
      const nextStep = step + 1;
      if (nextStep < PHOTO_SEQUENCE.length) {
        const nextFlow = { ...updatedFlow, step: nextStep };
        flowRef.current = nextFlow;
        setCameraFlow(nextFlow);
        // Camera stays open — no delay, just tap again
      } else {
        // All 3 photos done → auto-advance to next child (camera stays open)
        advanceToNextChild(childId, childName);
      }
    }
  }

  // Background upload — fire and forget
  function uploadPhoto(file: File, childId: string, date: string, photoType: PhotoType, classroomId: string) {
    const uploadKey = `${childId}-${photoType}`;
    const uploadController = new AbortController();
    uploadAbortRefs.current.set(uploadKey, uploadController);
    if (mountedRef.current) setUploading(prev => new Set(prev).add(uploadKey));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('date', date);
    formData.append('photoType', photoType);
    formData.append('classroomId', classroomId);

    fetch('/api/montree/raz/upload', {
      method: 'POST',
      body: formData,
      signal: uploadController.signal,
    })
      .then(async res => {
        if (!res.ok) {
          // Non-2xx status — try to parse error body for detail
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error;
          } catch { /* response wasn't JSON, use HTTP status */ }
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then(data => {
        if (!mountedRef.current) return;
        if (data.success && data.record) {
          // Safely merge only the photo URL field (never overwrite other fields)
          const photoUrlValue = data.record[PHOTO_URL_KEYS[photoType]];
          setRecords(prev => {
            const existing = prev[childId];
            if (!existing) return { ...prev, [childId]: data.record };
            return { ...prev, [childId]: { ...existing, [PHOTO_URL_KEYS[photoType]]: photoUrlValue } };
          });
        } else if (data.success && data.photoUrl) {
          // Upload succeeded but record might be null — still update with photoUrl
          setRecords(prev => {
            const existing = prev[childId];
            if (!existing) return prev;
            return { ...prev, [childId]: { ...existing, [PHOTO_URL_KEYS[photoType]]: data.photoUrl } };
          });
        } else if (!data.success) {
          if (mountedRef.current) toast.error(`Upload failed: ${data.error || PHOTO_LABELS[photoType]}`);
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        if (mountedRef.current) toast.error(`Upload failed: ${err.message || PHOTO_LABELS[photoType]}`);
      })
      .finally(() => {
        uploadAbortRefs.current.delete(uploadKey);
        if (mountedRef.current) {
          setUploading(prev => { const n = new Set(prev); n.delete(uploadKey); return n; });
        }
      });
  }

  // --- File input fallback ---

  function triggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  const handleFileCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const flow = flowRef.current;
    if (!e.target.files?.[0] || !flow) { endCameraFlow(); return; }
    const sess = sessionRef.current;
    if (!sess?.classroom?.id) { endCameraFlow(); return; }

    const file = e.target.files[0];
    const { childId, childName, step, oneShot } = flow;
    const photoType = PHOTO_SEQUENCE[step];
    if (fileInputRef.current) fileInputRef.current.value = '';

    uploadPhoto(file, childId, dateRef.current, photoType, sess.classroom.id);
    toast.success(`${PHOTO_LABELS[photoType]}`, { duration: 800 });

    if (oneShot) {
      endCameraFlow();
    } else {
      const nextStep = step + 1;
      if (nextStep < PHOTO_SEQUENCE.length) {
        const nextFlow = { ...flow, step: nextStep };
        flowRef.current = nextFlow;
        setCameraFlow(nextFlow);
        // Try auto-open file input — if this fails silently on mobile,
        // the fallback banner (with "Open Camera" button) lets the user continue
        try {
          if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
        } catch {
          // Some browsers throw on programmatic click — banner provides manual trigger
        }
      } else {
        // All 3 photos done → auto-advance to next child
        advanceToNextChild(childId, childName);
      }
    }
  }, []);

  // --- Status + record management ---

  async function setStatus(childId: string, newStatus: StatusType): Promise<boolean> {
    const sess = sessionRef.current;
    if (!sess?.classroom?.id) return false;
    try {
      const res = await fetch('/api/montree/raz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId, classroom_id: sess.classroom.id,
          date: dateRef.current, status: newStatus,
          recorded_by: sess.teacher?.name || 'teacher',
        }),
      });
      const data = await res.json();
      if (data.success && res.ok) {
        if (mountedRef.current) setRecords(prev => ({ ...prev, [childId]: data.record }));
        return true;
      }
      if (mountedRef.current) toast.error('Failed to save');
      return false;
    } catch {
      if (mountedRef.current) toast.error('Failed to save');
      return false;
    }
  }

  function handleStatusTap(child: Child, status: StatusType) {
    if (cameraFlow) return; // camera is open, ignore

    const currentStatus = records[child.id]?.status;

    // Toggle off
    if (currentStatus === status) {
      setStatus(child.id, 'not_read');
      setRecords(prev => ({
        ...prev,
        [child.id]: { ...prev[child.id], child_id: child.id, record_date: selectedDate, status: 'not_read' },
      }));
      return;
    }

    if (status === 'read') {
      // Optimistic update + fire-and-forget save + open camera
      setRecords(prev => ({
        ...prev,
        [child.id]: { ...prev[child.id], child_id: child.id, record_date: selectedDate, status: 'read' },
      }));
      setStatus(child.id, 'read');
      if (useFallback) {
        // File input fallback
        const flow: CameraFlowState = { childId: child.id, childName: child.name, step: 0, oneShot: false, previews: [null, null, null] };
        flowRef.current = flow;
        setCameraFlow(flow);
        triggerFileInput();
      } else {
        startCamera(child.id, child.name, 0, false);
      }
    } else {
      // Non-read: optimistic + background save
      setRecords(prev => ({
        ...prev,
        [child.id]: { ...prev[child.id], child_id: child.id, record_date: selectedDate, status },
      }));
      setStatus(child.id, status);
    }
  }

  function retakePhoto(child: Child, photoType: PhotoType) {
    if (cameraFlow) return;
    const step = PHOTO_SEQUENCE.indexOf(photoType);
    if (useFallback) {
      const flow: CameraFlowState = { childId: child.id, childName: child.name, step, oneShot: true, previews: [null, null, null] };
      flowRef.current = flow;
      setCameraFlow(flow);
      triggerFileInput();
    } else {
      startCamera(child.id, child.name, step, true);
    }
  }

  // --- Stats ---
  const readCount = children.filter(c => records[c.id]?.status === 'read').length;
  const notReadCount = children.filter(c => records[c.id]?.status === 'not_read').length;
  const noFolderCount = children.filter(c => records[c.id]?.status === 'no_folder').length;
  const absentCount = children.filter(c => records[c.id]?.status === 'absent').length;
  const unmarked = children.length - readCount - notReadCount - noFolderCount - absentCount;

  if (loading) return <RAZSkeleton />;

  // --- Render ---
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '16px' }}>
      <Toaster position="top-center" />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input (fallback) */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFileCapture} />

      {/* ========= FALLBACK MODE BANNER (file input) ========= */}
      {cameraFlow && useFallback && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#1e293b', borderTop: '2px solid #22c55e',
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
              📷 {cameraFlow.childName} — {PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]]}
              {!cameraFlow.oneShot && ` (${cameraFlow.step + 1}/3)`}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {cameraFlow.oneShot ? 'Take retake photo' : 'Take photo to continue'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => triggerFileInput()} style={{
              background: '#22c55e', border: 'none', borderRadius: 8,
              padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>📷 Open Camera</button>
            <button onClick={endCameraFlow} style={{
              background: '#334155', border: 'none', borderRadius: 8,
              padding: '8px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ========= CUSTOM CAMERA OVERLAY ========= */}
      {cameraFlow && !useFallback && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#000', display: 'flex', flexDirection: 'column',
        }}>
          {/* Top bar: child name + step */}
          <div style={{
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(0,0,0,0.7)', zIndex: 2,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{cameraFlow.childName}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {cameraFlow.oneShot
                  ? `Retake: ${PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]]}`
                  : `${PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]]}  •  ${cameraFlow.step + 1}/3`
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!cameraFlow.oneShot && (
                <button onClick={() => advanceToNextChild(cameraFlow.childId, cameraFlow.childName)} style={{
                  background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)', borderRadius: 8,
                  padding: '8px 14px', color: '#4ade80', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                }}>
                  Skip →
                </button>
              )}
              <button onClick={endCameraFlow} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                padding: '8px 16px', color: '#fff', fontSize: 14, cursor: 'pointer',
              }}>
                {cameraFlow.oneShot ? 'Cancel' : 'Done'}
              </button>
            </div>
          </div>

          {/* Live video feed */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
              }}
            />
            {/* Step label overlay */}
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '6px 16px',
              color: '#fff', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]]}
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{
            padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 20, background: 'rgba(0,0,0,0.85)',
          }}>
            {/* Previews of captured shots */}
            <div style={{ display: 'flex', gap: 6, position: 'absolute', left: 16 }}>
              {cameraFlow.previews.map((prev, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                  border: i === cameraFlow.step ? '2px solid #22c55e' : '2px solid #334155',
                  background: '#1e293b',
                }}>
                  {prev ? (
                    <img src={prev} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#475569' }}>
                      {i + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CAPTURE BUTTON — the magic tap */}
            <button
              onClick={captureFrame}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#fff', border: '4px solid rgba(255,255,255,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(255,255,255,0.2)',
                position: 'relative',
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: '#fff', border: '3px solid #e2e8f0',
              }} />
            </button>

            {/* Progress dots */}
            {!cameraFlow.oneShot && (
              <div style={{ display: 'flex', gap: 6, position: 'absolute', right: 24 }}>
                {PHOTO_SEQUENCE.map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < cameraFlow.step ? '#22c55e' : i === cameraFlow.step ? '#fff' : '#475569',
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo lightbox viewer */}
      {viewingPhoto && (
        <div onClick={() => setViewingPhoto(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 16, cursor: 'pointer',
        }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
            {viewingPhoto.childName} — {viewingPhoto.label}
          </div>
          <img src={viewingPhoto.url} alt={viewingPhoto.label}
            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain' }} />
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Tap anywhere to close</div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📚 RAZ Tracker</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            {session?.classroom?.name || 'Classroom'} · {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => router.push('/montree/dashboard')}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← Back
        </button>
      </div>

      {/* Date Picker */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => {
          const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1);
          setSelectedDate(d.toISOString().split('T')[0]);
        }} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 16 }}>←</button>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 14, flex: 1 }} />
        <button onClick={() => {
          const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1);
          setSelectedDate(d.toISOString().split('T')[0]);
        }} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>Today</button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { count: readCount, bg: '#dcfce7', fg: '#166534', label: '📖 Read' },
          { count: notReadCount, bg: '#fee2e2', fg: '#991b1b', label: '❌ Not' },
          { count: noFolderCount, bg: '#fef3c7', fg: '#92400e', label: '📁 No F' },
          { count: absentCount, bg: '#f3f4f6', fg: '#4b5563', label: '🚫 Away' },
          { count: unmarked, bg: '#1e293b', fg: '#94a3b8', label: '⏳' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.fg }}>{s.count}</div>
            <div style={{ fontSize: 10, color: s.fg }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Children List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children.map(child => {
          const record = records[child.id];
          const status = record?.status as StatusType | undefined;
          const config = status ? STATUS_CONFIG[status] : null;
          const photoCount = [record?.book_photo_url, record?.signature_photo_url, record?.new_book_photo_url].filter(Boolean).length;
          const hasPhotos = photoCount > 0;
          const isUploading = uploading.has(`${child.id}-book`) || uploading.has(`${child.id}-signature`) || uploading.has(`${child.id}-new_book`);

          return (
            <div key={child.id} style={{
              background: '#1e293b', borderRadius: 12, padding: '10px 12px',
              border: config ? `2px solid ${config.color}` : '2px solid #334155',
              transition: 'border-color 0.15s ease',
            }}>
              {/* Row: Avatar + Name + Status buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: child.color || '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, overflow: 'hidden', position: 'relative',
                }}>
                  {child.photo_url ? (
                    <img src={child.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (child.avatar_emoji || child.name.charAt(0))}
                  {isUploading && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                    }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.name}</span>
                    {photoCount > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>📷{photoCount}/3</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {(Object.entries(STATUS_CONFIG) as [StatusType, typeof STATUS_CONFIG[StatusType]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => handleStatusTap(child, key)}
                      disabled={!!cameraFlow} aria-label={cfg.label}
                      style={{
                        width: 40, height: 40,
                        background: status === key ? cfg.bg : '#0f172a',
                        border: status === key ? `2px solid ${cfg.color}` : '1px solid #334155',
                        borderRadius: 8,
                        color: status === key ? cfg.color : '#64748b',
                        fontSize: 18, cursor: cameraFlow ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, opacity: cameraFlow ? 0.5 : 1,
                        transition: 'all 0.12s ease',
                      }}
                    >{cfg.emoji}</button>
                  ))}
                </div>
              </div>

              {/* Photo thumbnails — tap to view, retake overlay */}
              {hasPhotos && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {PHOTO_SEQUENCE.map(pt => {
                    const url = record?.[PHOTO_URL_KEYS[pt]] as string | undefined;
                    if (!url) return null;
                    return (
                      <div key={pt} style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setViewingPhoto({ url, label: PHOTO_LABELS[pt], childName: child.name })}
                          aria-label={`View ${PHOTO_LABELS[pt]}`}
                          style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden', padding: 0, border: '2px solid #334155', cursor: 'pointer', background: 'none' }}>
                          <img src={url} alt={PHOTO_LABELS[pt]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                        </button>
                        <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
                          {PHOTO_LABELS[pt].split(' ')[1]}
                        </div>
                        <button onClick={() => retakePhoto(child, pt)} disabled={!!cameraFlow}
                          aria-label={`Retake ${PHOTO_LABELS[pt]}`}
                          style={{
                            position: 'absolute', top: -4, right: -4,
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#3b82f6', border: '2px solid #0f172a',
                            color: '#fff', fontSize: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                          }}>↻</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {children.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p>No children found in this classroom.</p>
          <p style={{ fontSize: 13 }}>Add students in the admin panel first.</p>
        </div>
      )}

      <div style={{ height: 80 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
