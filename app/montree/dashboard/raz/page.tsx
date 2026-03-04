// /montree/dashboard/raz/page.tsx
// RAZ Reading Tracker - Daily reading log with photo evidence
// Shows all children in the class, take 3 photos per kid, toggle read/not_read/no_folder/absent
'use client';

import { useState, useEffect, useRef } from 'react';
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

const PHOTO_CONFIG: Record<PhotoType, { label: string; emoji: string; key: keyof RazRecord }> = {
  book: { label: 'Book Read', emoji: '📚', key: 'book_photo_url' },
  signature: { label: 'Signature', emoji: '✍️', key: 'signature_photo_url' },
  new_book: { label: 'New Book', emoji: '🎁', key: 'new_book_photo_url' },
};

export default function RazTrackerPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<Record<string, RazRecord>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadingFor, setUploadingFor] = useState<{ childId: string; type: PhotoType } | null>(null);
  const [nextPhotoQueue, setNextPhotoQueue] = useState<{ childId: string; nextType: PhotoType | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPromptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auth check
  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess);
  }, [router]);

  // Load children + records
  useEffect(() => {
    if (!session?.classroom?.id) return;
    // Abort previous in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadData(controller.signal);
    return () => controller.abort();
  }, [session, selectedDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPromptTimeoutRef.current) {
        clearTimeout(autoPromptTimeoutRef.current);
      }
    };
  }, []);

  async function loadData(signal?: AbortSignal) {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      // Load children + RAZ records in parallel
      const [childRes, razRes] = await Promise.all([
        fetch(`/api/montree/children?classroom_id=${session.classroom.id}`, { signal }),
        fetch(`/api/montree/raz?classroom_id=${session.classroom.id}&date=${selectedDate}`, { signal }),
      ]);
      const childData = await childRes.json();
      const razData = await razRes.json();
      const kids = childData.children || [];
      setChildren(kids);

      const recordMap: Record<string, RazRecord> = {};
      (razData.records || []).forEach((r: RazRecord) => {
        recordMap[r.child_id] = r;
      });
      setRecords(recordMap);
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Ignore aborted fetches
      console.error('Failed to load data:', err);
      toast.error('Failed to load data');
    }
    setLoading(false);
  }

  async function toggleStatus(childId: string, newStatus: StatusType) {
    if (!session?.classroom?.id) return;
    try {
      const res = await fetch('/api/montree/raz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          classroom_id: session.classroom.id,
          date: selectedDate,
          status: newStatus,
          recorded_by: session.teacher?.name || 'teacher',
        }),
      });
      const data = await res.json();
      if (data.success && res.ok) {
        setRecords(prev => ({ ...prev, [childId]: data.record }));
        toast.success(`${children.find(c => c.id === childId)?.name}: ${STATUS_CONFIG[newStatus].label}`);
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch (err) {
      toast.error('Failed to update');
    }
  }

  function triggerPhotoCapture(childId: string, type: PhotoType) {
    // Cancel any pending auto-prompt from previous photo
    if (autoPromptTimeoutRef.current) {
      clearTimeout(autoPromptTimeoutRef.current);
      autoPromptTimeoutRef.current = null;
    }
    // Clear queue if it's for a different child (prevents confusion)
    if (nextPhotoQueue?.childId !== childId) {
      setNextPhotoQueue(null);
    }
    setUploadingFor({ childId, type });
    setTimeout(() => fileInputRef.current?.click(), 100);
  }

  // After each photo, determine the next photo to prompt for
  function getNextPhotoType(currentType: PhotoType): PhotoType | null {
    const sequence: PhotoType[] = ['book', 'signature', 'new_book'];
    const currentIndex = sequence.indexOf(currentType);
    if (currentIndex === -1 || currentIndex === sequence.length - 1) return null;
    return sequence[currentIndex + 1];
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !uploadingFor || !session?.classroom?.id) return;
    const file = e.target.files[0];
    const { childId, type } = uploadingFor;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('date', selectedDate);
    formData.append('photoType', type);
    formData.append('classroomId', session.classroom.id);

    try {
      toast.loading('Uploading photo...');
      const res = await fetch('/api/montree/raz/upload', { method: 'POST', body: formData });
      const data = await res.json();
      toast.dismiss();

      if (data.success) {
        setRecords(prev => ({ ...prev, [childId]: data.record }));
        const childName = children.find(c => c.id === childId)?.name;
        const photoLabel = PHOTO_CONFIG[type].label;
        toast.success(`${PHOTO_CONFIG[type].emoji} ${photoLabel} saved for ${childName}`);

        // Queue next photo with a visual pulse
        const nextType = getNextPhotoType(type);
        if (nextType) {
          setNextPhotoQueue({ childId, nextType });
          // Auto-prompt after a brief delay
          autoPromptTimeoutRef.current = setTimeout(() => {
            triggerPhotoCapture(childId, nextType);
            autoPromptTimeoutRef.current = null;
          }, 800);
        } else {
          setNextPhotoQueue(null);
        }
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Upload failed');
    }
    setUploadingFor(null);
    // Reset file input for next capture
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Stats - include absent count
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
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

      {/* Stats Bar - 5 columns now */}
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

      {/* Children Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children.map(child => {
          const record = records[child.id];
          const status = record?.status as StatusType | undefined;
          const config = status ? STATUS_CONFIG[status] : null;
          const isAbsent = status === 'absent';
          const photosDisabled = isAbsent;

          return (
            <div
              key={child.id}
              style={{
                background: '#1e293b',
                borderRadius: 14,
                padding: 14,
                border: config ? `2px solid ${config.color}` : '2px solid #334155',
                opacity: isAbsent ? 0.7 : 1,
              }}
            >
              {/* Child Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: child.color || '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, overflow: 'hidden',
                }}>
                  {child.photo_url ? (
                    <img src={child.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    child.avatar_emoji || child.name.charAt(0)
                  )}
                </div>

                {/* Name + Status Badge */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{child.name}</div>
                  {config && (
                    <span style={{
                      display: 'inline-block', fontSize: 11, padding: '2px 8px',
                      borderRadius: 20, background: config.bg, color: config.color,
                      fontWeight: 600, marginTop: 2,
                    }}>
                      {config.emoji} {config.label}
                    </span>
                  )}
                </div>

                {/* Book title if entered */}
                {record?.book_title && !isAbsent && (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    {record.book_title}
                  </div>
                )}
              </div>

              {/* Photos Row - 3 columns (hidden if absent) */}
              {!isAbsent && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  {(['book', 'signature', 'new_book'] as PhotoType[]).map(photoType => {
                    const photoKey = PHOTO_CONFIG[photoType].key;
                    const photoUrl = record?.[photoKey] as string | undefined;
                    const isNextQueued = nextPhotoQueue?.childId === child.id && nextPhotoQueue?.nextType === photoType;

                    return (
                      <button
                        key={photoType}
                        onClick={() => {
                          if (!photosDisabled) {
                            triggerPhotoCapture(child.id, photoType);
                          }
                        }}
                        disabled={photosDisabled}
                        style={{
                          background: photoUrl ? 'transparent' : '#0f172a',
                          border: isNextQueued ? '3px solid #f59e0b' : '2px dashed #475569',
                          borderRadius: 10,
                          height: 90,
                          cursor: photosDisabled ? 'default' : 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 4,
                          padding: 0,
                          position: 'relative',
                          animation: isNextQueued ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                          opacity: photosDisabled ? 0.5 : 1,
                        }}
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt={PHOTO_CONFIG[photoType].label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                        ) : (
                          <>
                            <span style={{ fontSize: 24 }}>{PHOTO_CONFIG[photoType].emoji}</span>
                            <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '0 4px' }}>{PHOTO_CONFIG[photoType].label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Status Toggle Buttons - 4 now */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(Object.entries(STATUS_CONFIG) as [StatusType, typeof STATUS_CONFIG[StatusType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => toggleStatus(child.id, key)}
                    style={{
                      background: status === key ? cfg.bg : '#0f172a',
                      border: status === key ? `2px solid ${cfg.color}` : '1px solid #334155',
                      borderRadius: 8, padding: '8px 4px',
                      color: status === key ? cfg.color : '#94a3b8',
                      fontWeight: status === key ? 700 : 400,
                      fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
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

      {/* Bottom padding for mobile */}
      <div style={{ height: 80 }} />

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
