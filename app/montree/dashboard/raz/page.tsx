// /montree/dashboard/raz/page.tsx
// RAZ Reading Tracker - Streamlined: status-first, Read triggers camera flow
// Flow: Tap Read → camera opens → Book → Signature → New Book → done, next kid
// Not Read / No Folder / Absent = one tap, no camera
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';

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
  book: 'Book Read',
  signature: 'Signature',
  new_book: 'New Book',
};
const PHOTO_URL_KEYS: Record<PhotoType, keyof RazRecord> = {
  book: 'book_photo_url',
  signature: 'signature_photo_url',
  new_book: 'new_book_photo_url',
};

// All camera flow state lives in a ref — set synchronously, no React batching issues
interface CameraFlowState {
  childId: string;
  childName: string;
  step: number;       // index into PHOTO_SEQUENCE
  oneShot: boolean;   // true = retake single photo, don't continue sequence
}

export default function RazTrackerPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<Record<string, RazRecord>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Camera flow — ref is the source of truth, state is for UI rendering only
  const flowRef = useRef<CameraFlowState | null>(null);
  const [cameraFlowUI, setCameraFlowUI] = useState<CameraFlowState | null>(null);

  // Busy guard
  const [busy, setBusy] = useState(false);

  // Track in-flight uploads
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const uploadAbortRefs = useRef<Map<string, AbortController>>(new Map());

  // Session ref for use inside callbacks without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;

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
      uploadAbortRefs.current.forEach(c => c.abort());
      uploadAbortRefs.current.clear();
      flowRef.current = null;
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

  // Set status via API — returns true on success
  async function setStatus(childId: string, newStatus: StatusType): Promise<boolean> {
    const sess = sessionRef.current;
    if (!sess?.classroom?.id) return false;
    try {
      const res = await fetch('/api/montree/raz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          classroom_id: sess.classroom.id,
          date: dateRef.current,
          status: newStatus,
          recorded_by: sess.teacher?.name || 'teacher',
        }),
      });
      const data = await res.json();
      if (data.success && res.ok) {
        if (mountedRef.current) {
          setRecords(prev => ({ ...prev, [childId]: data.record }));
        }
        return true;
      }
      if (mountedRef.current) toast.error('Failed to save');
      return false;
    } catch {
      if (mountedRef.current) toast.error('Failed to save');
      return false;
    }
  }

  // Handle status button tap
  async function handleStatusTap(child: Child, status: StatusType) {
    if (busy) return;

    const currentStatus = records[child.id]?.status;

    // Tapping same status = toggle off → persist as not_read
    if (currentStatus === status) {
      setBusy(true);
      await setStatus(child.id, 'not_read');
      if (mountedRef.current) setBusy(false);
      return;
    }

    if (status === 'read') {
      // Read: save status first, then camera
      setBusy(true);
      const success = await setStatus(child.id, 'read');
      if (!mountedRef.current) return;
      if (success) {
        openCamera(child.id, child.name, 0, false);
      } else {
        setBusy(false);
      }
    } else {
      // Non-read: save with error feedback
      const success = await setStatus(child.id, status);
      if (!success && mountedRef.current) {
        toast.error(`Failed to mark ${child.name}`);
      }
    }
  }

  // Retake a specific photo
  function retakePhoto(child: Child, photoType: PhotoType) {
    if (busy) return;
    setBusy(true);
    const step = PHOTO_SEQUENCE.indexOf(photoType);
    openCamera(child.id, child.name, step, true);
  }

  // Open camera — sets ref synchronously THEN triggers file input
  function openCamera(childId: string, childName: string, step: number, oneShot: boolean) {
    const flow: CameraFlowState = { childId, childName, step, oneShot };
    flowRef.current = flow;          // Ref set FIRST — synchronous, no batching
    setCameraFlowUI(flow);           // State for UI re-render
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 150);
  }

  function endCameraFlow() {
    flowRef.current = null;
    setCameraFlowUI(null);
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Single photo capture handler — reads from flowRef (always in sync)
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const flow = flowRef.current;

    // No file or no active flow → user dismissed camera
    if (!e.target.files?.[0] || !flow) {
      endCameraFlow();
      return;
    }

    const sess = sessionRef.current;
    if (!sess?.classroom?.id) {
      endCameraFlow();
      return;
    }

    const file = e.target.files[0];
    const { childId, childName, step, oneShot } = flow;
    const photoType = PHOTO_SEQUENCE[step];
    const date = dateRef.current;

    // Reset file input immediately
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Background upload with AbortController
    const uploadKey = `${oneShot ? 'retake-' : ''}${childId}-${photoType}`;
    const uploadController = new AbortController();
    uploadAbortRefs.current.set(uploadKey, uploadController);

    if (mountedRef.current) {
      setUploading(prev => new Set(prev).add(uploadKey));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('date', date);
    formData.append('photoType', photoType);
    formData.append('classroomId', sess.classroom.id);

    fetch('/api/montree/raz/upload', {
      method: 'POST',
      body: formData,
      signal: uploadController.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (!mountedRef.current) return;
        if (data.success) {
          // Only merge the photo URL — never overwrite status
          setRecords(prev => {
            const existing = prev[childId];
            if (!existing) return { ...prev, [childId]: data.record };
            return {
              ...prev,
              [childId]: {
                ...existing,
                [PHOTO_URL_KEYS[photoType]]: data.record[PHOTO_URL_KEYS[photoType]],
              },
            };
          });
        } else {
          toast.error(`Failed: ${PHOTO_LABELS[photoType]}`);
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        if (mountedRef.current) toast.error(`Upload failed: ${PHOTO_LABELS[photoType]}`);
      })
      .finally(() => {
        uploadAbortRefs.current.delete(uploadKey);
        if (mountedRef.current) {
          setUploading(prev => {
            const next = new Set(prev);
            next.delete(uploadKey);
            return next;
          });
        }
      });

    // Quick feedback
    toast.success(
      oneShot ? `📸 Retaken: ${PHOTO_LABELS[photoType]}` : `📸 ${PHOTO_LABELS[photoType]} — ${childName}`,
      { duration: 1200 },
    );

    // Continue sequence or end
    if (oneShot) {
      endCameraFlow();
    } else {
      const nextStep = step + 1;
      if (nextStep < PHOTO_SEQUENCE.length) {
        openCamera(childId, childName, nextStep, false);
      } else {
        endCameraFlow();
        toast.success(`✅ ${childName} done!`, { duration: 1500 });
      }
    }
  }, []); // No deps needed — reads everything from refs

  // Stats
  const totalKids = children.length;
  const readCount = children.filter(c => records[c.id]?.status === 'read').length;
  const notReadCount = children.filter(c => records[c.id]?.status === 'not_read').length;
  const noFolderCount = children.filter(c => records[c.id]?.status === 'no_folder').length;
  const absentCount = children.filter(c => records[c.id]?.status === 'absent').length;
  const unmarked = totalKids - readCount - notReadCount - noFolderCount - absentCount;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ color: '#94a3b8', fontSize: 18 }}>Loading RAZ Tracker...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '16px' }}>
      <Toaster position="top-center" />

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoCapture}
      />

      {/* Camera flow overlay */}
      {cameraFlowUI && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: cameraFlowUI.oneShot ? '#3b82f6' : '#22c55e',
          color: '#fff', padding: '12px 16px',
          zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{cameraFlowUI.childName}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {cameraFlowUI.oneShot
                ? `📸 Retake: ${PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlowUI.step]]}`
                : `📸 ${PHOTO_LABELS[PHOTO_SEQUENCE[cameraFlowUI.step]]} (${cameraFlowUI.step + 1}/3)`
              }
            </div>
          </div>
          <button
            onClick={endCameraFlow}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              padding: '6px 14px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: cameraFlowUI ? 56 : 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📚 RAZ Reading Tracker</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            {session?.classroom?.name || 'Classroom'} &middot; {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => router.push('/montree/dashboard')}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
        >
          ← Back
        </button>
      </div>

      {/* Date Picker */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => {
            const d = new Date(selectedDate + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split('T')[0]);
          }}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 16 }}
        >←</button>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 14, flex: 1 }}
        />
        <button
          onClick={() => {
            const d = new Date(selectedDate + 'T12:00:00');
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().split('T')[0]);
          }}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 16 }}
        >→</button>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}
        >Today</button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        <div style={{ background: '#dcfce7', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{readCount}</div>
          <div style={{ fontSize: 11, color: '#166534' }}>📖 Read</div>
        </div>
        <div style={{ background: '#fee2e2', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#991b1b' }}>{notReadCount}</div>
          <div style={{ fontSize: 11, color: '#991b1b' }}>❌ Not Read</div>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>{noFolderCount}</div>
          <div style={{ fontSize: 11, color: '#92400e' }}>📁 No Folder</div>
        </div>
        <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4b5563' }}>{absentCount}</div>
          <div style={{ fontSize: 11, color: '#4b5563' }}>🚫 Absent</div>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8' }}>{unmarked}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>⏳ Unmarked</div>
        </div>
      </div>

      {/* Children List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children.map(child => {
          const record = records[child.id];
          const status = record?.status as StatusType | undefined;
          const config = status ? STATUS_CONFIG[status] : null;
          const photoCount = [record?.book_photo_url, record?.signature_photo_url, record?.new_book_photo_url].filter(Boolean).length;
          const hasPhotos = photoCount > 0;
          const isUploading = uploading.has(`${child.id}-book`) || uploading.has(`${child.id}-signature`) || uploading.has(`${child.id}-new_book`)
            || uploading.has(`retake-${child.id}-book`) || uploading.has(`retake-${child.id}-signature`) || uploading.has(`retake-${child.id}-new_book`);
          const isInCameraFlow = cameraFlowUI?.childId === child.id;

          return (
            <div
              key={child.id}
              style={{
                background: isInCameraFlow ? '#1a2e1a' : '#1e293b',
                borderRadius: 12,
                padding: '10px 12px',
                border: config ? `2px solid ${config.color}` : '2px solid #334155',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Single row: Avatar + Name + Status buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: child.color || '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, overflow: 'hidden', position: 'relative',
                }}>
                  {child.photo_url ? (
                    <img src={child.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    child.avatar_emoji || child.name.charAt(0)
                  )}
                  {isUploading && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                    }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    </div>
                  )}
                </div>

                {/* Name + photo count */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.name}</span>
                    {photoCount > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>📷{photoCount}/3</span>
                    )}
                  </div>
                </div>

                {/* Status buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {(Object.entries(STATUS_CONFIG) as [StatusType, typeof STATUS_CONFIG[StatusType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusTap(child, key)}
                      disabled={busy}
                      aria-label={cfg.label}
                      style={{
                        width: 40, height: 40,
                        background: status === key ? cfg.bg : '#0f172a',
                        border: status === key ? `2px solid ${cfg.color}` : '1px solid #334155',
                        borderRadius: 8,
                        color: status === key ? cfg.color : '#64748b',
                        fontSize: 18, cursor: busy ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s ease',
                        padding: 0,
                        opacity: busy ? 0.5 : 1,
                      }}
                      title={cfg.label}
                    >
                      {cfg.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo thumbnails — tappable for retake */}
              {hasPhotos && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {PHOTO_SEQUENCE.map(pt => {
                    const url = record?.[PHOTO_URL_KEYS[pt]] as string | undefined;
                    if (!url) return null;
                    return (
                      <button
                        key={pt}
                        onClick={() => retakePhoto(child, pt)}
                        disabled={busy}
                        title={`Retake ${PHOTO_LABELS[pt]}`}
                        aria-label={`Retake ${PHOTO_LABELS[pt]}`}
                        style={{
                          width: 48, height: 48, borderRadius: 6, overflow: 'hidden',
                          flexShrink: 0, padding: 0, border: '2px solid transparent',
                          cursor: busy ? 'default' : 'pointer', background: 'none',
                          position: 'relative',
                        }}
                      >
                        <img src={url} alt={PHOTO_LABELS[pt]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                        <div style={{
                          position: 'absolute', bottom: 1, right: 1,
                          background: 'rgba(0,0,0,0.6)', borderRadius: 4,
                          fontSize: 10, padding: '1px 3px', color: '#fff',
                        }}>↻</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {children.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p>No children found in this classroom.</p>
          <p style={{ fontSize: 13 }}>Add students in the admin panel first.</p>
        </div>
      )}

      <div style={{ height: 80 }} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
