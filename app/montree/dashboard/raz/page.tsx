// /montree/dashboard/raz/page.tsx
// RAZ Reading Tracker - Custom camera via getUserMedia for instant captures
// Flow: Tap Read → live camera preview → tap tap tap tap (4 photos) → done, next kid
// No iOS "Use Photo" confirmation, no file picker, no delay between shots
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
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
  new_book_signature_photo_url?: string;
  book_title?: string;
  notes?: string;
}

type StatusType = 'read' | 'not_read' | 'no_folder' | 'absent';
type PhotoType = 'book' | 'signature' | 'new_book' | 'new_book_signature';

const STATUS_CONFIG_BASE: Record<StatusType, { emoji: string; color: string; bg: string }> = {
  read: { emoji: '📖', color: '#22c55e', bg: '#dcfce7' },
  not_read: { emoji: '❌', color: '#ef4444', bg: '#fee2e2' },
  no_folder: { emoji: '📁', color: '#f59e0b', bg: '#fef3c7' },
  absent: { emoji: '🚫', color: '#6b7280', bg: '#f3f4f6' },
};

// Custom RAZ ordering — teacher-defined student sequence
const RAZ_NAME_ORDER = [
  'Amy', 'Austin', 'Eric', 'Hayden', 'Segina', 'Joey', 'Jimmy', 'Leo', 'Lucky',
  'Mingxi', 'Maomao', 'Kevin', 'Yo-yo', 'Rachel', 'Ryan', 'Yueze', 'Henry', 'Kayla', 'Stella',
];

function sortChildrenForRaz(children: Child[]): Child[] {
  return [...children].sort((a, b) => {
    const aIdx = RAZ_NAME_ORDER.findIndex(n => a.name.toLowerCase().startsWith(n.toLowerCase()));
    const bIdx = RAZ_NAME_ORDER.findIndex(n => b.name.toLowerCase().startsWith(n.toLowerCase()));
    // Known names sort by their position; unknown names go to the end alphabetically
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

const PHOTO_SEQUENCE: PhotoType[] = ['book', 'signature', 'new_book', 'new_book_signature'];
const getPhotoLabels = (t: ReturnType<typeof useI18n>['t']) => ({
  book: t('raz.photoBook'),
  signature: t('raz.photoSignature'),
  new_book: t('raz.photoNewBook'),
  new_book_signature: t('raz.photoNewBookSignature'),
});
const PHOTO_URL_KEYS: Record<PhotoType, keyof RazRecord> = {
  book: 'book_photo_url',
  signature: 'signature_photo_url',
  new_book: 'new_book_photo_url',
  new_book_signature: 'new_book_signature_photo_url',
};

const getStatusConfig = (t: ReturnType<typeof useI18n>['t']) => ({
  read: { emoji: '📖', color: '#22c55e', bg: '#dcfce7', label: t('raz.statusRead') },
  not_read: { emoji: '❌', color: '#ef4444', bg: '#fee2e2', label: t('raz.statusNotRead') },
  no_folder: { emoji: '📁', color: '#f59e0b', bg: '#fef3c7', label: t('raz.statusNoFolder') },
  absent: { emoji: '🚫', color: '#6b7280', bg: '#f3f4f6', label: t('raz.statusAbsent') },
});

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
  const { t } = useI18n();
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

  // Tab system: today (default), summary, audit
  const [activeTab, setActiveTab] = useState<'today' | 'summary' | 'audit'>('today');

  // Audit state
  interface AuditDay { date: string; status: string | null; }
  interface AuditWeek {
    weekStart: string; weekEnd: string; days: AuditDay[];
    readCount: number; notReadCount: number; noFolderCount: number; absentCount: number; totalDays: number;
  }
  interface AuditTotals {
    totalRead: number; totalNotRead: number; totalNoFolder: number; totalAbsent: number;
    totalWeeks: number; weeksWithNoRead: number; weeksWithNoFolder: number;
  }
  interface AuditData { weeks: AuditWeek[]; totals: AuditTotals; childId: string; from: string; to: string; }

  const [auditChildId, setAuditChildId] = useState<string | null>(null);
  const [auditWeeks, setAuditWeeks] = useState(12);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // After 3rd photo: show child picker instead of auto-advancing
  const [pickingNextChild, setPickingNextChild] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Track children whose 4-photo flow just finished (uploads still in-flight)
  const [justFinished, setJustFinished] = useState<Set<string>>(new Set());

  // Track in-flight uploads
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const uploadAbortRefs = useRef<Map<string, AbortController>>(new Map());

  // Refs for use inside callbacks without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;
  // childrenRef / recordsRef removed — were only used by deleted auto-advance logic

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
      setChildren(sortChildrenForRaz(childData.children || []));
      const recordMap: Record<string, RazRecord> = {};
      (razData.records || []).forEach((r: RazRecord) => { recordMap[r.child_id] = r; });
      setRecords(recordMap);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast.error(t('raz.failedToLoad'));
    }
    setLoading(false);
  }

  // --- Audit data loader ---
  async function loadAudit(childId: string, weeks: number) {
    if (!session?.classroom?.id) return;
    setAuditLoading(true);
    setAuditData(null);
    try {
      const res = await fetch(
        `/api/montree/raz/summary?type=audit&classroom_id=${session.classroom.id}&child_id=${childId}&weeks=${weeks}`
      );
      if (!mountedRef.current) return;
      if (!res.ok) {
        toast.error(t('raz.failedToLoad'));
        setAuditLoading(false);
        return;
      }
      const data = await res.json();
      if (!mountedRef.current) return;
      setAuditData(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) toast.error(t('raz.failedToLoad'));
    }
    if (mountedRef.current) setAuditLoading(false);
  }

  // --- Child picker: teacher selects next child manually ---

  function showChildPicker(finishedChildName: string) {
    // After 3rd photo — show child picker overlay (camera stays open in background)
    const flow = flowRef.current;
    if (flow) {
      setJustFinished(prev => new Set(prev).add(flow.childId));
    }
    const doneMsg = t('raz.childDone').replace('{name}', finishedChildName);
    toast.success(doneMsg, { duration: 1000 });
    setChildSearch('');
    setPickingNextChild(true);
    // Auto-focus search input after render
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  function pickChild(child: Child) {
    // Teacher selected next child from picker — start their 4-photo flow
    setPickingNextChild(false);

    // Set "read" status optimistically + background save
    setRecords(prev => ({
      ...prev,
      [child.id]: { ...prev[child.id], child_id: child.id, record_date: dateRef.current, status: 'read' },
    }));
    setStatus(child.id, 'read');

    // Camera stream stays open — just switch to new child's flow
    const nextFlow: CameraFlowState = { childId: child.id, childName: child.name, step: 0, oneShot: false, previews: [null, null, null, null] };
    flowRef.current = nextFlow;
    setCameraFlow(nextFlow);
  }

  function markChildInPicker(child: Child, status: StatusType) {
    // Mark a child with a non-read status from the picker (no camera)
    setRecords(prev => ({
      ...prev,
      [child.id]: { ...prev[child.id], child_id: child.id, record_date: dateRef.current, status },
    }));
    setStatus(child.id, status);
    const cfg = STATUS_CONFIG_BASE[status];
    const label = status === 'read' ? t('raz.statusRead') : status === 'not_read' ? t('raz.statusNotRead') : status === 'no_folder' ? t('raz.statusNoFolder') : t('raz.statusAbsent');
    toast.success(`${cfg.emoji} ${child.name} — ${label}`, { duration: 1000 });
  }

  function finishAll() {
    // Teacher taps "Done" — close everything
    setPickingNextChild(false);
    endCameraFlow();
  }

  // --- Camera functions ---

  async function startCamera(childId: string, childName: string, step: number, oneShot: boolean) {
    const flow: CameraFlowState = { childId, childName, step, oneShot, previews: [null, null, null, null] };
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
        toast.error(t('raz.cameraFailed'));
        return;
      }
      const file = new File([blob], `raz-${photoType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      uploadPhoto(file, childId, date, photoType, sess.classroom.id);
    }, 'image/jpeg', 0.8);

    // Flash feedback
    const photoLabels = getPhotoLabels(t);
    toast.success(`${photoLabels[photoType]}`, { duration: 800 });

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
        // All 4 photos done → show child picker (camera stays open, uploads continue in background)
        showChildPicker(childName);
      }
    }
  }

  // Background upload — fire and forget with retry + timeout
  // 2 retries with exponential backoff (1s, 3s), 30s timeout per attempt
  function uploadPhoto(file: File, childId: string, date: string, photoType: PhotoType, classroomId: string) {
    const photoLabels = getPhotoLabels(t);
    const uploadKey = `${childId}-${photoType}`;
    if (mountedRef.current) setUploading(prev => new Set(prev).add(uploadKey));

    const MAX_RETRIES = 2;
    const UPLOAD_TIMEOUT_MS = 30_000;
    const BACKOFF_MS = [1000, 3000]; // 1s, 3s

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('date', date);
    formData.append('photoType', photoType);
    formData.append('classroomId', classroomId);

    async function attemptUpload(attempt: number): Promise<{ success: boolean; record?: RazRecord; photoUrl?: string; error?: string }> {
      const controller = new AbortController();
      uploadAbortRefs.current.set(uploadKey, controller);
      const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        const res = await fetch('/api/montree/raz/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error;
          } catch { /* response wasn't JSON */ }
          throw new Error(errorMsg);
        }
        return await res.json();
      } catch (err) {
        clearTimeout(timeout);
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        // Retry on network errors (not on intentional abort from unmount)
        if (!isAbort && attempt < MAX_RETRIES && mountedRef.current) {
          await new Promise(r => setTimeout(r, BACKOFF_MS[attempt] || 3000));
          if (!mountedRef.current) throw err; // Component unmounted during backoff
          return attemptUpload(attempt + 1);
        }
        throw err;
      }
    }

    attemptUpload(0)
      .then(data => {
        if (!mountedRef.current) return;
        if (data.success && data.record) {
          const photoUrlValue = data.record[PHOTO_URL_KEYS[photoType]];
          setRecords(prev => {
            const existing = prev[childId];
            if (!existing) return { ...prev, [childId]: data.record as RazRecord };
            return { ...prev, [childId]: { ...existing, [PHOTO_URL_KEYS[photoType]]: photoUrlValue } };
          });
        } else if (data.success && data.photoUrl) {
          setRecords(prev => {
            const existing = prev[childId];
            if (!existing) return prev;
            return { ...prev, [childId]: { ...existing, [PHOTO_URL_KEYS[photoType]]: data.photoUrl } };
          });
        } else if (!data.success) {
          if (mountedRef.current) toast.error(`${t('raz.uploadFailed')}: ${data.error || photoLabels[photoType]}`);
        }
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (mountedRef.current) toast.error(`${t('raz.uploadFailed')}: ${err?.message || photoLabels[photoType]}`);
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
    const photoLabels = getPhotoLabels(t);
    toast.success(`${photoLabels[photoType]}`, { duration: 800 });

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
        // All 4 photos done → show child picker
        showChildPicker(childName);
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
      if (mountedRef.current) toast.error(t('raz.failedToSave'));
      return false;
    } catch {
      if (mountedRef.current) toast.error(t('raz.failedToSave'));
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
        const flow: CameraFlowState = { childId: child.id, childName: child.name, step: 0, oneShot: false, previews: [null, null, null, null] };
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
      const flow: CameraFlowState = { childId: child.id, childName: child.name, step, oneShot: true, previews: [null, null, null, null] };
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
  const STATUS_CONFIG = getStatusConfig(t);
  const PHOTO_LABELS = getPhotoLabels(t);

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
              {!cameraFlow.oneShot && ` (${cameraFlow.step + 1}/${PHOTO_SEQUENCE.length})`}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {cameraFlow.oneShot ? t('raz.takeRetakePhoto') : t('raz.takePhoto')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => triggerFileInput()} style={{
              background: '#22c55e', border: 'none', borderRadius: 8,
              padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>📷 {t('raz.openCamera')}</button>
            <button onClick={endCameraFlow} style={{
              background: '#334155', border: 'none', borderRadius: 8,
              padding: '8px 14px', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
            }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* ========= CUSTOM CAMERA OVERLAY ========= */}
      {cameraFlow && !useFallback && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#000', display: 'flex', flexDirection: 'column',
        }}>
          {/* Top bar: child name + step — with iOS safe area padding */}
          <div style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)',
            paddingLeft: 16, paddingRight: 16, paddingBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(0,0,0,0.7)', zIndex: 2,
          }}>
            {/* Cancel / back button */}
            <button onClick={endCameraFlow} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              color: '#94a3b8', fontSize: 24, lineHeight: 1, flexShrink: 0,
            }} aria-label={t('common.cancel')}>✕</button>

            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{cameraFlow.childName}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {cameraFlow.oneShot
                  ? t('raz.retake').replace('{label}', PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]])
                  : `${PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlow.step]]}  •  ${cameraFlow.step + 1}/${PHOTO_SEQUENCE.length}`
                }
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!cameraFlow.oneShot && (
                <>
                  <button onClick={() => showChildPicker(cameraFlow.childName)} style={{
                    background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)', borderRadius: 8,
                    padding: '8px 14px', color: '#4ade80', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                  }}>
                    {t('common.next')} →
                  </button>
                  <button onClick={endCameraFlow} style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                    padding: '8px 16px', color: '#fff', fontSize: 14, cursor: 'pointer',
                  }}>
                    {t('common.done')}
                  </button>
                </>
              )}
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
          </div>

          {/* Bottom controls — with iOS safe area */}
          <div style={{
            padding: '16px', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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

      {/* ========= CHILD PICKER OVERLAY (after 3rd photo) ========= */}
      {pickingNextChild && cameraFlow && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)', paddingLeft: 16, paddingRight: 16, paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>{t('raz.nextQuestion')}</h2>
            <input
              ref={searchInputRef}
              type="text"
              value={childSearch}
              onChange={e => setChildSearch(e.target.value)}
              placeholder={t('raz.searchPlaceholder')}
              autoComplete="off"
              style={{
                flex: 1, background: '#1e293b', border: '2px solid #475569', borderRadius: 10,
                padding: '10px 14px', color: '#fff', fontSize: 15, outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = '#22c55e'; }}
              onBlur={e => { e.target.style.borderColor = '#475569'; }}
            />
          </div>

          <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
            {children.filter(c => !childSearch || c.name.toLowerCase().includes(childSearch.toLowerCase())).map(child => {
              const rec = records[child.id];
              const isDone = justFinished.has(child.id) || (rec?.status === 'read' && rec.book_photo_url && rec.signature_photo_url && rec.new_book_photo_url && rec.new_book_signature_photo_url);
              const isMarkedOther = rec?.status && rec.status !== 'read' && rec.status !== 'not_read';
              const photoCount = [rec?.book_photo_url, rec?.signature_photo_url, rec?.new_book_photo_url, rec?.new_book_signature_photo_url].filter(Boolean).length;

              return (
                <div
                  key={child.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isDone ? '#0f2918' : isMarkedOther ? '#1a1a2e' : '#1e293b',
                    border: isDone ? '1px solid #166534' : isMarkedOther ? '1px solid #334155' : '1px solid #475569',
                    borderRadius: 10, padding: '8px 10px',
                    opacity: isMarkedOther ? 0.5 : 1,
                  }}
                >
                  {/* Tap name/avatar area → read + camera */}
                  <button
                    onClick={() => pickChild(child)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: child.color || '#334155',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, overflow: 'hidden', color: '#fff',
                    }}>
                      {child.photo_url ? (
                        <img src={child.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (child.avatar_emoji || child.name.charAt(0))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.name}</div>
                    </div>
                    {isDone ? (
                      <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, flexShrink: 0 }}>✅</span>
                    ) : photoCount > 0 ? (
                      <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>📷{photoCount}/{PHOTO_SEQUENCE.length}</span>
                    ) : null}
                  </button>
                  {/* Status buttons: Not Read / No Folder / Absent */}
                  {!isDone && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {(['not_read', 'no_folder', 'absent'] as StatusType[]).map(st => (
                        <button
                          key={st}
                          onClick={() => markChildInPicker(child, st)}
                          style={{
                            width: 32, height: 32, borderRadius: 6,
                            background: rec?.status === st ? STATUS_CONFIG[st].bg : '#0f172a',
                            border: rec?.status === st ? `2px solid ${STATUS_CONFIG[st].color}` : '1px solid #334155',
                            color: rec?.status === st ? STATUS_CONFIG[st].color : '#64748b',
                            fontSize: 14, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                          }}
                          aria-label={STATUS_CONFIG[st].label}
                        >{STATUS_CONFIG[st].emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '12px 16px', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)', display: 'flex', justifyContent: 'center' }}>
            <button onClick={finishAll} style={{
              background: '#334155', border: 'none', borderRadius: 10,
              padding: '12px 32px', color: '#e2e8f0', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              {t('raz.doneBackToList')}
            </button>
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
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>{t('raz.tapToClose')}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📚 {t('raz.title')}</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            {session?.classroom?.name || t('raz.classroom')} · {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => router.push('/montree/dashboard')}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← {t('common.back')}
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
          style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>{t('raz.today')}</button>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#1e293b', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'today' as const, label: t('raz.tabToday'), emoji: '📋' },
          { key: 'summary' as const, label: t('raz.tabSummary'), emoji: '📊' },
          { key: 'audit' as const, label: t('raz.tabAudit'), emoji: '🔍' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? '#334155' : 'transparent',
            color: activeTab === tab.key ? '#fff' : '#64748b',
            fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13,
            transition: 'all 0.15s ease',
          }}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Bar — only on Today tab */}
      {activeTab === 'today' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { count: readCount, bg: '#dcfce7', fg: '#166534', label: `📖 ${t('raz.statusRead')}` },
          { count: notReadCount, bg: '#fee2e2', fg: '#991b1b', label: `❌ ${t('raz.statusNotRead')}` },
          { count: noFolderCount, bg: '#fef3c7', fg: '#92400e', label: `📁 ${t('raz.statusNoFolder')}` },
          { count: absentCount, bg: '#f3f4f6', fg: '#4b5563', label: `🚫 ${t('raz.statusAbsent')}` },
          { count: unmarked, bg: '#1e293b', fg: '#94a3b8', label: '⏳' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.fg }}>{s.count}</div>
            <div style={{ fontSize: 10, color: s.fg }}>{s.label}</div>
          </div>
        ))}
      </div>
      )}

      {/* ========= SUMMARY TAB ========= */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary header */}
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              {(() => {
                const recorded = children.filter(c => records[c.id]?.status).length;
                return recorded === children.length
                  ? t('raz.allStudentsRecorded')
                  : t('raz.studentsRecorded').replace('{count}', String(recorded)).replace('{total}', String(children.length));
              })()}
            </div>
          </div>

          {/* Read & Returned */}
          {(() => {
            const readKids = children.filter(c => records[c.id]?.status === 'read');
            return readKids.length > 0 && (
              <div style={{ background: '#0f2918', border: '1px solid #166534', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#22c55e', marginBottom: 10 }}>
                  📖 {t('raz.readAndReturned')} ({readKids.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {readKids.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a3a24', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color || '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, overflow: 'hidden' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_emoji || c.name.charAt(0))}
                      </div>
                      <span style={{ fontSize: 13, color: '#86efac', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Didn't Read */}
          {(() => {
            const kids = children.filter(c => records[c.id]?.status === 'not_read');
            return kids.length > 0 && (
              <div style={{ background: '#2a1215', border: '1px solid #991b1b', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#ef4444', marginBottom: 10 }}>
                  ❌ {t('raz.didNotRead')} ({kids.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kids.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3a1a1e', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color || '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, overflow: 'hidden' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_emoji || c.name.charAt(0))}
                      </div>
                      <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* No Folder */}
          {(() => {
            const kids = children.filter(c => records[c.id]?.status === 'no_folder');
            return kids.length > 0 && (
              <div style={{ background: '#2a2210', border: '1px solid #92400e', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b', marginBottom: 10 }}>
                  📁 {t('raz.noFolderBrought')} ({kids.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kids.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3a3018', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color || '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, overflow: 'hidden' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_emoji || c.name.charAt(0))}
                      </div>
                      <span style={{ fontSize: 13, color: '#fcd34d', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Absent */}
          {(() => {
            const kids = children.filter(c => records[c.id]?.status === 'absent');
            return kids.length > 0 && (
              <div style={{ background: '#1a1a2e', border: '1px solid #4b5563', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#6b7280', marginBottom: 10 }}>
                  🚫 {t('raz.absentToday')} ({kids.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kids.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#252538', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color || '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, overflow: 'hidden' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_emoji || c.name.charAt(0))}
                      </div>
                      <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Not Recorded */}
          {(() => {
            const kids = children.filter(c => !records[c.id]?.status);
            return kids.length > 0 && (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#94a3b8', marginBottom: 10 }}>
                  ⏳ {t('raz.notRecorded')} ({kids.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kids.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color || '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, overflow: 'hidden' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_emoji || c.name.charAt(0))}
                      </div>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========= AUDIT TAB ========= */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Child selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={auditChildId || ''}
              onChange={e => {
                const cid = e.target.value;
                setAuditChildId(cid || null);
                if (cid) loadAudit(cid, auditWeeks);
                else setAuditData(null);
              }}
              style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14 }}
            >
              <option value="">{t('raz.selectChild')}</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={auditWeeks}
              onChange={e => {
                const w = parseInt(e.target.value, 10);
                setAuditWeeks(w);
                if (auditChildId) loadAudit(auditChildId, w);
              }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14 }}
            >
              {[4, 8, 12, 24, 52].map(w => (
                <option key={w} value={w}>{w} {t('raz.weeksToAudit')}</option>
              ))}
            </select>
          </div>

          {auditLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ width: 24, height: 24, border: '3px solid #334155', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 8px' }} />
            </div>
          )}

          {!auditLoading && auditData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Totals summary card */}
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                  {t('raz.auditSummary')
                    .replace('{name}', children.find(c => c.id === auditChildId)?.name || '')
                    .replace('{weeks}', String(auditWeeks))
                  }
                </h3>

                {/* Read rate badge */}
                {(() => {
                  const tot = auditData.totals;
                  const totalTracked = tot.totalRead + tot.totalNotRead + tot.totalNoFolder;
                  const rate = totalTracked > 0 ? Math.round((tot.totalRead / totalTracked) * 100) : 0;
                  const rateColor = rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : rate >= 40 ? '#f97316' : '#ef4444';
                  const rateLabel = rate >= 80 ? t('raz.excellent') : rate >= 60 ? t('raz.good') : rate >= 40 ? t('raz.needsAttention') : t('raz.critical');
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${rateColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: rateColor }}>{rate}%</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: rateColor }}>{rateLabel}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('raz.readRate')}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stat grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    { label: t('raz.totalDaysRead'), value: auditData.totals.totalRead, color: '#22c55e', bg: '#0f2918' },
                    { label: t('raz.totalDaysNotRead'), value: auditData.totals.totalNotRead, color: '#ef4444', bg: '#2a1215' },
                    { label: t('raz.totalDaysNoFolder'), value: auditData.totals.totalNoFolder, color: '#f59e0b', bg: '#2a2210' },
                    { label: t('raz.totalDaysAbsent'), value: auditData.totals.totalAbsent, color: '#6b7280', bg: '#1a1a2e' },
                    { label: t('raz.weeksNoReading'), value: auditData.totals.weeksWithNoRead, color: '#ef4444', bg: '#2a1215' },
                    { label: t('raz.weeksNoFolder'), value: auditData.totals.weeksWithNoFolder, color: '#f59e0b', bg: '#2a2210' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${s.color}33` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(auditData.weeks || []).slice().reverse().map((week: AuditWeek) => (
                  <div key={week.weekStart} style={{
                    background: '#1e293b', borderRadius: 10, padding: '10px 12px',
                    border: week.readCount === 0 && week.totalDays > 0 ? '2px solid #ef4444' : '1px solid #334155',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {t('raz.weekOf').replace('{date}', new Date(week.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                        {week.readCount > 0 && <span style={{ color: '#22c55e' }}>📖{week.readCount}</span>}
                        {week.notReadCount > 0 && <span style={{ color: '#ef4444' }}>❌{week.notReadCount}</span>}
                        {week.noFolderCount > 0 && <span style={{ color: '#f59e0b' }}>📁{week.noFolderCount}</span>}
                        {week.absentCount > 0 && <span style={{ color: '#6b7280' }}>🚫{week.absentCount}</span>}
                      </div>
                    </div>
                    {/* Day-by-day dots */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {week.days.map((day: AuditDay) => {
                        const dotColor = day.status === 'read' ? '#22c55e' : day.status === 'not_read' ? '#ef4444' : day.status === 'no_folder' ? '#f59e0b' : day.status === 'absent' ? '#6b7280' : '#334155';
                        const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
                        return (
                          <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>{dayLabel}</div>
                            <div style={{ width: '100%', height: 6, borderRadius: 3, background: dotColor }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {(auditData.weeks || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                    <div>{t('raz.noRecords')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!auditLoading && !auditData && !auditChildId && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p>{t('raz.selectChild')}</p>
            </div>
          )}
        </div>
      )}

      {/* Children List — only on Today tab */}
      {activeTab === 'today' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children.map(child => {
          const record = records[child.id];
          const status = record?.status as StatusType | undefined;
          const config = status ? STATUS_CONFIG[status] : null;
          const photoCount = [record?.book_photo_url, record?.signature_photo_url, record?.new_book_photo_url, record?.new_book_signature_photo_url].filter(Boolean).length;
          const hasPhotos = photoCount > 0;
          const isUploading = uploading.has(`${child.id}-book`) || uploading.has(`${child.id}-signature`) || uploading.has(`${child.id}-new_book`) || uploading.has(`${child.id}-new_book_signature`);

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
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>📷{photoCount}/{PHOTO_SEQUENCE.length}</span>
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
      )}

      {children.length === 0 && activeTab === 'today' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p>{t('raz.noStudents')}</p>
          <p style={{ fontSize: 13 }}>{t('raz.addStudentsFirst')}</p>
        </div>
      )}

      <div style={{ height: 80 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
