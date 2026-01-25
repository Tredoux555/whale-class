'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

interface WorkAssignment {
  id: string;
  work_name: string;
  work_name_chinese?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  work_id?: string;
  video_url?: string;
  notes?: string;
}

interface Media {
  id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  taken_at: string;
  assignment_id?: string;
  work_name: string;
  duration_seconds?: number;
  parent_visible?: boolean;
  is_featured?: boolean;
}

interface ChildDetail {
  id: string;
  name: string;
  date_of_birth?: string;
  age_group?: string;
  focus_area?: string;
  observation_notes?: string;
  assignments: WorkAssignment[];
}

// File size limits
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const STATUS_CONFIG = {
  not_started: { label: '○', fullLabel: 'Not Started', color: 'bg-gray-200 text-gray-700', next: 'presented' },
  presented: { label: 'P', fullLabel: 'Presented', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', fullLabel: 'Practicing', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', fullLabel: 'Mastered', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

// Area display order: 1. Practical Life, 2. Sensorial, 3. Math, 4. Language, 5. Culture
const AREA_ORDER = ['practical_life', 'sensorial', 'math', 'mathematics', 'language', 'culture'];

const AREA_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  practical_life: { label: 'Practical Life', color: 'text-amber-800', bgColor: 'bg-amber-50 border-amber-200' },
  sensorial: { label: 'Sensorial', color: 'text-pink-800', bgColor: 'bg-pink-50 border-pink-200' },
  math: { label: 'Math', color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
  mathematics: { label: 'Math', color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
  language: { label: 'Language', color: 'text-green-800', bgColor: 'bg-green-50 border-green-200' },
  culture: { label: 'Culture', color: 'text-purple-800', bgColor: 'bg-purple-50 border-purple-200' },
};

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-medium
      ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {message}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

export default function ChildDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChildDetailContent />
    </Suspense>
  );
}

function ChildDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params.childId as string;
  const weekNumber = searchParams.get('week') || '';
  const year = searchParams.get('year') || '';
  
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);
  const [mediaModal, setMediaModal] = useState<Media | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareWithParents, setShareWithParents] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCaptureOptions, setShowCaptureOptions] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAssignment, setActiveAssignment] = useState<WorkAssignment | null>(null);
  const [captureType, setCaptureType] = useState<'photo' | 'video'>('photo');

  useEffect(() => {
    if (childId) {
      fetchChildDetail();
      fetchMedia();
    }
  }, [childId, weekNumber, year]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  async function fetchChildDetail() {
    try {
      const res = await fetch(`/api/weekly-planning/child-detail?childId=${childId}&week=${weekNumber}&year=${year}`);
      const data = await res.json();
      setChild(data.child || null);
    } catch (err) {
      console.error('Failed to fetch child detail:', err);
    }
    setLoading(false);
  }

  async function fetchMedia() {
    try {
      const res = await fetch(`/api/media?childId=${childId}&week=${weekNumber}&year=${year}`);
      const data = await res.json();
      if (data.success) setMedia(data.media || []);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
  }

  async function updateProgress(assignmentId: string, newStatus: string) {
    if (!child) return;
    setChild({
      ...child,
      assignments: child.assignments.map(a => 
        a.id === assignmentId ? { ...a, progress_status: newStatus as any } : a
      )
    });
    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
      fetchChildDetail();
    }
  }

  const handleStatusTap = (assignment: WorkAssignment) => {
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    updateProgress(assignment.id, nextStatus);
  };

  const handleCaptureClick = (assignment: WorkAssignment) => {
    setShowCaptureOptions(showCaptureOptions === assignment.id ? null : assignment.id);
  };

  const startCapture = (assignment: WorkAssignment, type: 'photo' | 'video') => {
    setActiveAssignment(assignment);
    setCaptureType(type);
    setShowCaptureOptions(null);
    
    // Update file input accept and capture attributes
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAssignment || !child) return;

    // Check file size
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    const maxSizeMB = isVideo ? '50MB' : '10MB';
    
    if (file.size > maxSize) {
      showToast(`File too large! Max ${maxSizeMB} for ${isVideo ? 'videos' : 'photos'}`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(activeAssignment.id);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', child.id);
    formData.append('assignmentId', activeAssignment.id);
    formData.append('workId', activeAssignment.work_id || '');
    formData.append('workName', activeAssignment.work_name);
    formData.append('weekNumber', weekNumber);
    formData.append('year', year);
    formData.append('parentVisible', shareWithParents.toString());

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${isVideo ? 'Video' : 'Photo'} saved!${shareWithParents ? ' (Shared with parents)' : ''}`, 'success');
        fetchMedia();
      } else {
        showToast('Failed to upload: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload error:', err);
      showToast('Failed to upload media', 'error');
    } finally {
      setUploading(null);
      setUploadProgress(0);
      setActiveAssignment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (mediaItem: Media) => {
    if (!confirm(`Delete this ${mediaItem.media_type}? This cannot be undone.`)) return;
    
    setDeleting(mediaItem.id);
    try {
      const res = await fetch(`/api/media?id=${mediaItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('🗑️ Deleted', 'success');
        setMediaModal(null);
        fetchMedia();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch (err) {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const toggleParentVisible = async (mediaItem: Media) => {
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mediaId: mediaItem.id, 
          parentVisible: !mediaItem.parent_visible 
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setMedia(media.map(m => m.id === mediaItem.id ? { ...m, parent_visible: !m.parent_visible } : m));
        setMediaModal(prev => prev ? { ...prev, parent_visible: !prev.parent_visible } : null);
        showToast(mediaItem.parent_visible ? 'Hidden from parents' : '👁 Shared with parents!', 'success');
      }
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  const toggleFeatured = async (mediaItem: Media) => {
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mediaId: mediaItem.id, 
          isFeatured: !mediaItem.is_featured 
        })
      });
      const data = await res.json();
      if (data.success) {
        setMedia(media.map(m => m.id === mediaItem.id ? { ...m, is_featured: !m.is_featured } : m));
        setMediaModal(prev => prev ? { ...prev, is_featured: !prev.is_featured } : null);
        showToast(mediaItem.is_featured ? 'Removed from featured' : '⭐ Added to featured!', 'success');
      }
    } catch (err) {
      console.error('Failed to update featured:', err);
    }
  };

  const getMediaForAssignment = (assignmentId: string) => {
    return media.filter(m => m.assignment_id === assignmentId);
  };

  const assignmentsByArea = child?.assignments.reduce((acc, a) => {
    if (!acc[a.area]) acc[a.area] = [];
    acc[a.area].push(a);
    return acc;
  }, {} as Record<string, WorkAssignment[]>) || {};

  const stats = child ? {
    total: child.assignments.length,
    mastered: child.assignments.filter(a => a.progress_status === 'mastered').length,
    practicing: child.assignments.filter(a => a.progress_status === 'practicing').length,
    presented: child.assignments.filter(a => a.progress_status === 'presented').length,
    notStarted: child.assignments.filter(a => a.progress_status === 'not_started').length,
  } : null;

  const mediaCounts = {
    photos: media.filter(m => m.media_type === 'photo').length,
    videos: media.filter(m => m.media_type === 'video').length
  };

  if (loading) return <LoadingSpinner />;

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600">Child not found</p>
          <Link href="/admin/classroom" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-72 text-center">
            <div className="text-4xl mb-3">{captureType === 'video' ? '🎥' : '📷'}</div>
            <p className="font-semibold mb-3">Uploading {captureType}...</p>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/admin/classroom?week=${weekNumber}&year=${year}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </Link>
            <span className="text-sm text-gray-500">Week {weekNumber}, {year}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Child Header Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{child.name}</h1>
          {child.age_group && <p className="text-blue-100 mb-4">Age group: {child.age_group}</p>}
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Week Progress</span>
              <span>{stats ? Math.round((stats.mastered / Math.max(stats.total, 1)) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-blue-400/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${stats ? (stats.mastered / Math.max(stats.total, 1)) * 100 : 0}%` }}
              />
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/20 rounded-lg py-2">
                <div className="text-2xl font-bold">{stats.notStarted}</div>
                <div className="text-xs text-blue-100">To Do</div>
              </div>
              <div className="bg-white/20 rounded-lg py-2">
                <div className="text-2xl font-bold">{stats.presented}</div>
                <div className="text-xs text-blue-100">Presented</div>
              </div>
              <div className="bg-white/20 rounded-lg py-2">
                <div className="text-2xl font-bold">{stats.practicing}</div>
                <div className="text-xs text-blue-100">Practicing</div>
              </div>
              <div className="bg-white/20 rounded-lg py-2">
                <div className="text-2xl font-bold">{stats.mastered}</div>
                <div className="text-xs text-blue-100">Mastered</div>
              </div>
            </div>
          )}
        </div>

        {/* Share with Parents Toggle */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Auto-share with parents</p>
            <p className="text-sm text-gray-500">New captures will be visible to parents</p>
          </div>
          <button
            onClick={() => setShareWithParents(!shareWithParents)}
            className={`w-14 h-8 rounded-full transition-colors relative ${shareWithParents ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${shareWithParents ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {/* Media Gallery */}
        {media.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow">
            <h2 className="font-semibold text-gray-800 mb-3">
              📸 This Week's Media 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({mediaCounts.photos} 📷, {mediaCounts.videos} 🎥)
              </span>
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {media.slice(0, 12).map(item => (
                <button
                  key={item.id}
                  onClick={() => setMediaModal(item)}
                  className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative"
                >
                  {item.media_type === 'video' ? (
                    <>
                      <video src={item.media_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-white text-2xl">▶</span>
                      </div>
                    </>
                  ) : (
                    <img src={item.media_url} alt={item.work_name} className="w-full h-full object-cover" />
                  )}
                  {item.parent_visible && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">
                      👁
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Focus Area */}
        {child.focus_area && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-yellow-800 mb-1">🎯 Focus Area</h2>
            <p className="text-yellow-900">{child.focus_area}</p>
          </div>
        )}

        {/* Observation Notes */}
        {child.observation_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-blue-800 mb-1">📝 Notes</h2>
            <p className="text-blue-900 whitespace-pre-wrap">{child.observation_notes}</p>
          </div>
        )}

        <h2 className="text-lg font-bold text-gray-800 mb-4">This Week's Works</h2>
        
        {/* Works by Area */}
        {AREA_ORDER.map(areaKey => {
          const areaConfig = AREA_CONFIG[areaKey];
          if (!areaConfig) return null;
          const areaAssignments = assignmentsByArea[areaKey] || [];
          if (areaAssignments.length === 0) return null;

          return (
            <div key={areaKey} className={`rounded-xl border mb-4 overflow-hidden ${areaConfig.bgColor}`}>
              <div className={`px-4 py-3 border-b ${areaConfig.bgColor}`}>
                <h3 className={`font-semibold ${areaConfig.color}`}>
                  {areaConfig.label}
                  <span className="ml-2 text-sm font-normal opacity-70">
                    ({areaAssignments.length})
                  </span>
                </h3>
              </div>
              
              <div className="bg-white divide-y">
                {areaAssignments.map(assignment => {
                  const assignmentMedia = getMediaForAssignment(assignment.id);
                  const isOptionsOpen = showCaptureOptions === assignment.id;
                  
                  return (
                    <div key={assignment.id} className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Status Button */}
                        <button
                          onClick={() => handleStatusTap(assignment)}
                          className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold
                            ${STATUS_CONFIG[assignment.progress_status].color}
                            active:scale-95 transition-transform touch-manipulation shadow-sm`}
                        >
                          <span className="text-lg">{STATUS_CONFIG[assignment.progress_status].label}</span>
                          <span className="text-[9px] font-normal opacity-70">tap</span>
                        </button>

                        {/* Work Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{assignment.work_name}</p>
                          {assignment.work_name_chinese && (
                            <p className="text-sm text-gray-500 truncate">{assignment.work_name_chinese}</p>
                          )}
                        </div>

                        {/* Combined Capture Button */}
                        <div className="relative">
                          <button
                            onClick={() => handleCaptureClick(assignment)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
                              ${isOptionsOpen 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} 
                              active:scale-95`}
                          >
                            📹
                          </button>
                          
                          {/* Capture Options Popup */}
                          {isOptionsOpen && (
                            <div className="absolute right-0 top-14 bg-white rounded-xl shadow-xl border p-2 z-10 flex gap-2">
                              <button
                                onClick={() => startCapture(assignment, 'photo')}
                                className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex flex-col items-center justify-center hover:bg-green-200 active:scale-95"
                              >
                                <span className="text-xl">📷</span>
                                <span className="text-[10px]">Photo</span>
                              </button>
                              <button
                                onClick={() => startCapture(assignment, 'video')}
                                className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex flex-col items-center justify-center hover:bg-purple-200 active:scale-95"
                              >
                                <span className="text-xl">🎥</span>
                                <span className="text-[10px]">Video</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Demo Video Button */}
                        {assignment.video_url && (
                          <button
                            onClick={() => setVideoModal({ url: assignment.video_url!, title: assignment.work_name })}
                            className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 active:scale-95"
                          >
                            ▶️
                          </button>
                        )}
                      </div>

                      {/* Media Thumbnails */}
                      {assignmentMedia.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {assignmentMedia.map(item => (
                            <button
                              key={item.id}
                              onClick={() => setMediaModal(item)}
                              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative"
                            >
                              {item.media_type === 'video' ? (
                                <>
                                  <video src={item.media_url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <span className="text-white text-lg">▶</span>
                                  </div>
                                </>
                              ) : (
                                <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                              )}
                              {item.parent_visible && (
                                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-[8px]">👁</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {assignment.notes && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                          {assignment.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {child.assignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600">No works assigned for this week</p>
          </div>
        )}
      </main>

      {/* Demo Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <div className="bg-white rounded-xl overflow-hidden max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{videoModal.title}</h3>
              <button onClick={() => setVideoModal(null)} className="p-2 hover:bg-gray-100 rounded-lg text-xl">✕</button>
            </div>
            <div className="aspect-video">
              <iframe
                src={videoModal.url.includes('youtube.com') || videoModal.url.includes('youtu.be')
                  ? `https://www.youtube.com/embed/${videoModal.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1]}`
                  : videoModal.url
                }
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {mediaModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setMediaModal(null)}>
          {/* Close button */}
          <button 
            onClick={() => setMediaModal(null)} 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl z-10"
          >
            ✕
          </button>

          {/* Media content */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {mediaModal.media_type === 'video' ? (
              <video 
                src={mediaModal.media_url} 
                controls 
                autoPlay
                className="max-w-full max-h-[60vh] rounded-xl"
              />
            ) : (
              <img 
                src={mediaModal.media_url} 
                alt={mediaModal.work_name} 
                className="max-w-full max-h-[60vh] object-contain rounded-xl"
              />
            )}
          </div>

          {/* Info bar */}
          <div className="bg-black/50 p-4" onClick={e => e.stopPropagation()}>
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between text-white mb-3">
                <div>
                  <p className="font-semibold">{mediaModal.work_name}</p>
                  <p className="text-sm text-white/70">
                    {mediaModal.media_type === 'video' ? '🎥 Video' : '📷 Photo'} • {' '}
                    {new Date(mediaModal.taken_at).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleParentVisible(mediaModal)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    mediaModal.parent_visible 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {mediaModal.parent_visible ? '👁 Shared' : '👁 Share'}
                </button>
                <button
                  onClick={() => toggleFeatured(mediaModal)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    mediaModal.is_featured 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {mediaModal.is_featured ? '⭐ Featured' : '⭐ Feature'}
                </button>
                <button
                  onClick={() => handleDelete(mediaModal)}
                  disabled={deleting === mediaModal.id}
                  className="px-4 py-3 bg-red-500/80 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting === mediaModal.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close capture options */}
      {showCaptureOptions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowCaptureOptions(null)}
        />
      )}
    </div>
  );
}
