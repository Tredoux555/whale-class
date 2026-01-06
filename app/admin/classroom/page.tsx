'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

interface ChildWithAssignments {
  id: string;
  name: string;
  focus_area?: string;
  observation_notes?: string;
  assignments: WorkAssignment[];
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
}

interface WorkDetail {
  id: string;
  name: string;
  chinese_name?: string;
  video_url?: string;
  video_channel?: string;
  area?: string;
  description?: string;
}

interface Media {
  id: string;
  media_url: string;
  media_type: 'photo' | 'video';
  taken_at: string;
  assignment_id?: string;
  work_name: string;
  parent_visible?: boolean;
}

const STATUS_CONFIG = {
  not_started: { label: '○', fullLabel: 'Not Started', color: 'bg-gray-200 text-gray-600', bgHover: 'hover:bg-gray-300', next: 'presented' },
  presented: { label: 'P', fullLabel: 'Presented', color: 'bg-amber-200 text-amber-800', bgHover: 'hover:bg-amber-300', next: 'practicing' },
  practicing: { label: 'Pr', fullLabel: 'Practicing', color: 'bg-blue-200 text-blue-800', bgHover: 'hover:bg-blue-300', next: 'mastered' },
  mastered: { label: 'M', fullLabel: 'Mastered', color: 'bg-green-200 text-green-800', bgHover: 'hover:bg-green-300', next: 'not_started' },
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'border-l-amber-500 bg-amber-50',
  sensorial: 'border-l-pink-500 bg-pink-50',
  mathematics: 'border-l-blue-500 bg-blue-50',
  math: 'border-l-blue-500 bg-blue-50',
  language: 'border-l-green-500 bg-green-50',
  culture: 'border-l-purple-500 bg-purple-50',
};

const AREA_LABELS: Record<string, { short: string; full: string; color: string }> = {
  practical_life: { short: 'P', full: 'Practical Life', color: 'bg-amber-100 text-amber-800' },
  sensorial: { short: 'S', full: 'Sensorial', color: 'bg-pink-100 text-pink-800' },
  mathematics: { short: 'M', full: 'Mathematics', color: 'bg-blue-100 text-blue-800' },
  math: { short: 'M', full: 'Mathematics', color: 'bg-blue-100 text-blue-800' },
  language: { short: 'L', full: 'Language', color: 'bg-green-100 text-green-800' },
  culture: { short: 'C', full: 'Culture', color: 'bg-purple-100 text-purple-800' },
};

// File size limits
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-lg text-white font-medium
      ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {message}
    </div>
  );
}

export default function ClassroomPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClassroomView />
    </Suspense>
  );
}

function ClassroomView() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<ChildWithAssignments[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // Work Detail Modal State
  const [selectedWork, setSelectedWork] = useState<{ assignment: WorkAssignment; child: ChildWithAssignments } | null>(null);
  const [workDetail, setWorkDetail] = useState<WorkDetail | null>(null);
  const [workMedia, setWorkMedia] = useState<Media[]>([]);
  const [loadingWorkDetail, setLoadingWorkDetail] = useState(false);
  
  // Media capture state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [shareWithParents, setShareWithParents] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureType, setCaptureType] = useState<'photo' | 'video'>('photo');

  useEffect(() => {
    fetchWeeklyPlans();
  }, []);

  useEffect(() => {
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');
    if (weekParam && yearParam) {
      const plan = weeklyPlans.find(p => 
        p.week_number === parseInt(weekParam) && p.year === parseInt(yearParam)
      );
      if (plan) {
        setSelectedPlanId(plan.id);
        setSelectedWeek(plan.week_number);
        setSelectedYear(plan.year);
      }
    }
  }, [searchParams, weeklyPlans]);

  useEffect(() => {
    if (selectedPlanId) {
      fetchAssignments(selectedPlanId);
    }
  }, [selectedPlanId]);

  // Fetch work detail when modal opens
  useEffect(() => {
    if (selectedWork) {
      fetchWorkDetail(selectedWork.assignment);
      fetchWorkMedia(selectedWork.assignment.id);
    }
  }, [selectedWork]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  async function fetchWeeklyPlans() {
    try {
      const res = await fetch('/api/weekly-planning/list');
      const data = await res.json();
      setWeeklyPlans(data.plans || []);
      if (data.plans?.length > 0) {
        const firstPlan = data.plans[0];
        setSelectedPlanId(firstPlan.id);
        setSelectedWeek(firstPlan.week_number);
        setSelectedYear(firstPlan.year);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssignments(planId: string) {
    try {
      const params = new URLSearchParams();
      if (selectedWeek && selectedYear) {
        params.set('week', selectedWeek.toString());
        params.set('year', selectedYear.toString());
      } else {
        params.set('planId', planId);
      }
      const res = await fetch(`/api/weekly-planning/by-plan?${params}`);
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }

  async function fetchWorkDetail(assignment: WorkAssignment) {
    setLoadingWorkDetail(true);
    try {
      // Fetch from curriculum if work_id exists, or search by name
      const searchParam = assignment.work_id || assignment.work_name;
      const res = await fetch(`/api/admin/curriculum-works/detail?search=${encodeURIComponent(searchParam)}`);
      const data = await res.json();
      if (data.work) {
        setWorkDetail(data.work);
      } else {
        // Fallback: use assignment data
        setWorkDetail({
          id: assignment.work_id || assignment.id,
          name: assignment.work_name,
          chinese_name: assignment.work_name_chinese,
          video_url: assignment.video_url,
          area: assignment.area,
        });
      }
    } catch (err) {
      console.error('Failed to fetch work detail:', err);
      // Fallback
      setWorkDetail({
        id: assignment.work_id || assignment.id,
        name: assignment.work_name,
        chinese_name: assignment.work_name_chinese,
        video_url: assignment.video_url,
        area: assignment.area,
      });
    } finally {
      setLoadingWorkDetail(false);
    }
  }

  async function fetchWorkMedia(assignmentId: string) {
    try {
      const res = await fetch(`/api/media?assignmentId=${assignmentId}`);
      const data = await res.json();
      if (data.success) {
        setWorkMedia(data.media || []);
      }
    } catch (err) {
      console.error('Failed to fetch work media:', err);
    }
  }

  async function updateProgress(assignmentId: string, newStatus: string) {
    // Update local state immediately
    setChildren(prev => prev.map(child => ({
      ...child,
      assignments: child.assignments.map(a => 
        a.id === assignmentId ? { ...a, progress_status: newStatus as any } : a
      )
    })));

    // Also update selectedWork if open
    if (selectedWork && selectedWork.assignment.id === assignmentId) {
      setSelectedWork({
        ...selectedWork,
        assignment: { ...selectedWork.assignment, progress_status: newStatus as any }
      });
    }

    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
      fetchAssignments(selectedPlanId);
    }
  }

  const handleStatusTap = (e: React.MouseEvent, assignment: WorkAssignment) => {
    e.preventDefault();
    e.stopPropagation();
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    updateProgress(assignment.id, nextStatus);
  };

  const handleWorkClick = (e: React.MouseEvent, assignment: WorkAssignment, child: ChildWithAssignments) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWork({ assignment, child });
    setWorkDetail(null);
    setWorkMedia([]);
  };

  const closeWorkModal = () => {
    setSelectedWork(null);
    setWorkDetail(null);
    setWorkMedia([]);
  };

  const startCapture = (type: 'photo' | 'video') => {
    setCaptureType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWork) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    const maxSizeMB = isVideo ? '50MB' : '10MB';
    
    if (file.size > maxSize) {
      showToast(`File too large! Max ${maxSizeMB} for ${isVideo ? 'videos' : 'photos'}`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', selectedWork.child.id);
    formData.append('assignmentId', selectedWork.assignment.id);
    formData.append('workId', selectedWork.assignment.work_id || '');
    formData.append('workName', selectedWork.assignment.work_name);
    formData.append('weekNumber', selectedWeek.toString());
    formData.append('year', selectedYear.toString());
    formData.append('parentVisible', shareWithParents.toString());

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
        fetchWorkMedia(selectedWork.assignment.id);
      } else {
        showToast('Failed to upload: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload error:', err);
      showToast('Failed to upload media', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getChildStats = (assignments: WorkAssignment[]) => {
    const total = assignments.length;
    const mastered = assignments.filter(a => a.progress_status === 'mastered').length;
    const inProgress = assignments.filter(a => 
      a.progress_status === 'presented' || a.progress_status === 'practicing'
    ).length;
    return { total, mastered, inProgress, notStarted: total - mastered - inProgress };
  };

  const filteredChildren = children.map(child => ({
    ...child,
    assignments: filterArea === 'all'
      ? child.assignments
      : child.assignments.filter(a => a.area === filterArea)
  }));

  const getEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // YouTube playlist
    const plMatch = url.match(/youtube\.com\/playlist\?list=([^&]+)/);
    if (plMatch) return `https://www.youtube.com/embed/videoseries?list=${plMatch[1]}`;
    
    return url;
  };

  if (loading) {
    return <LoadingSpinner />;
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
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
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

      <header className="sticky top-0 z-50 bg-white shadow-md px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-xl font-bold">🐋 Classroom View</h1>
          </div>
          
          <select
            value={selectedPlanId}
            onChange={(e) => {
              const plan = weeklyPlans.find(p => p.id === e.target.value);
              setSelectedPlanId(e.target.value);
              if (plan) {
                setSelectedWeek(plan.week_number);
                setSelectedYear(plan.year);
              }
            }}
            className="px-4 py-2 border rounded-lg font-medium"
          >
            <option value="">Select week...</option>
            {weeklyPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                Week {plan.week_number}, {plan.year}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'practical_life', label: 'P' },
              { key: 'sensorial', label: 'S' },
              { key: 'mathematics', label: 'M' },
              { key: 'language', label: 'L' },
              { key: 'culture', label: 'C' },
            ].map(area => (
              <button
                key={area.key}
                onClick={() => setFilterArea(area.key)}
                className={`w-10 h-10 rounded-full text-sm font-bold transition-colors
                  ${filterArea === area.key 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {area.label}
              </button>
            ))}
            
            {selectedWeek > 0 && (
              <Link
                href={`/admin/classroom/print?week=${selectedWeek}&year=${selectedYear}`}
                target="_blank"
                className="ml-2 w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center hover:bg-blue-200 transition-colors"
                title="Print weekly plan"
              >
                🖨️
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-sm max-w-7xl mx-auto">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <span key={key} className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center font-bold`}>
                {config.label}
              </span>
              <span className="capitalize">{key.replace('_', ' ')}</span>
            </span>
          ))}
        </div>
      </div>

      <main className="p-4 max-w-7xl mx-auto">
        {!selectedPlanId ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600 text-lg">Select a week to view assignments</p>
            <Link
              href="/admin/weekly-planning"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Weekly Plan
            </Link>
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600">No assignments for Week {selectedWeek} yet</p>
            <Link
              href="/admin/weekly-planning"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Weekly Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredChildren.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                stats={getChildStats(child.assignments)}
                weekNumber={selectedWeek}
                year={selectedYear}
                onStatusTap={handleStatusTap}
                onWorkClick={handleWorkClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center"
          onClick={closeWorkModal}
        >
          <div 
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 p-4 border-b ${AREA_COLORS[selectedWork.assignment.area] || 'bg-gray-50'} rounded-t-2xl`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${AREA_LABELS[selectedWork.assignment.area]?.color || 'bg-gray-100'}`}>
                      {AREA_LABELS[selectedWork.assignment.area]?.full || selectedWork.assignment.area}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedWork.assignment.work_name}</h2>
                  {(workDetail?.chinese_name || selectedWork.assignment.work_name_chinese) && (
                    <p className="text-gray-600 mt-1">{workDetail?.chinese_name || selectedWork.assignment.work_name_chinese}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    For: <span className="font-medium text-gray-700">{selectedWork.child.name}</span>
                  </p>
                </div>
                <button
                  onClick={closeWorkModal}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-600 shadow-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Status Selector */}
            <div className="p-4 border-b">
              <p className="text-sm text-gray-500 mb-2">Status</p>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => updateProgress(selectedWork.assignment.id, key)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all
                      ${selectedWork.assignment.progress_status === key 
                        ? `${config.color} ring-2 ring-offset-2 ring-gray-400` 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <span className="text-lg">{config.label}</span>
                    <span className="block text-xs mt-0.5">{config.fullLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Refresher Video Section */}
            <div className="p-4 border-b">
              <p className="text-sm text-gray-500 mb-2">📹 Refresher Video</p>
              {loadingWorkDetail ? (
                <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : workDetail?.video_url ? (
                <div>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden">
                    <iframe
                      src={getEmbedUrl(workDetail.video_url)}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                  {workDetail.video_channel && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Source: {workDetail.video_channel}
                    </p>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
                  <span className="text-4xl mb-2">🎬</span>
                  <p className="text-sm">No video available yet</p>
                  <p className="text-xs mt-1">Coming soon!</p>
                </div>
              )}
            </div>

            {/* Capture Section */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">📷 Capture Progress</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={shareWithParents}
                    onChange={(e) => setShareWithParents(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-600">Share with parents</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => startCapture('photo')}
                  className="flex-1 py-4 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-medium transition-colors active:scale-95"
                >
                  <span className="text-2xl block mb-1">📷</span>
                  Take Photo
                </button>
                <button
                  onClick={() => startCapture('video')}
                  className="flex-1 py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition-colors active:scale-95"
                >
                  <span className="text-2xl block mb-1">🎥</span>
                  Record Video
                </button>
              </div>
            </div>

            {/* Captured Media */}
            {workMedia.length > 0 && (
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">Captured ({workMedia.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {workMedia.map(item => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative"
                    >
                      {item.media_type === 'video' ? (
                        <>
                          <video src={item.media_url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="text-white text-xl">▶</span>
                          </div>
                        </>
                      ) : (
                        <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                      )}
                      {item.parent_visible && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">
                          👁
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedWork.assignment.notes && (
              <div className="p-4 bg-gray-50 border-t">
                <p className="text-sm text-gray-500 mb-1">📝 Notes</p>
                <p className="text-gray-700">{selectedWork.assignment.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChildCardProps {
  child: ChildWithAssignments;
  stats: { total: number; mastered: number; inProgress: number; notStarted: number };
  weekNumber: number;
  year: number;
  onStatusTap: (e: React.MouseEvent, assignment: WorkAssignment) => void;
  onWorkClick: (e: React.MouseEvent, assignment: WorkAssignment, child: ChildWithAssignments) => void;
}

function ChildCard({ child, stats, weekNumber, year, onStatusTap, onWorkClick }: ChildCardProps) {
  const completionPercent = stats.total > 0 
    ? Math.round((stats.mastered / stats.total) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Child Header - Still clickable to go to child detail */}
      <Link
        href={`/admin/classroom/${child.id}?week=${weekNumber}&year=${year}`}
        className="block bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 hover:from-blue-600 hover:to-blue-700 transition-colors"
      >
        <h3 className="text-white font-bold text-lg truncate">{child.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-blue-400/30 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-blue-100 text-xs">{completionPercent}%</span>
        </div>
      </Link>

      {child.focus_area && (
        <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-100">
          <p className="text-xs text-yellow-800 truncate">🎯 {child.focus_area}</p>
        </div>
      )}

      {/* Works - Click opens modal */}
      <div className="divide-y">
        {child.assignments.slice(0, 5).map(assignment => (
          <div
            key={assignment.id}
            onClick={(e) => onWorkClick(e, assignment, child)}
            className={`flex items-center gap-2 px-3 py-2 border-l-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${AREA_COLORS[assignment.area] || 'border-l-gray-300'}`}
          >
            <button
              onClick={(e) => onStatusTap(e, assignment)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                ${STATUS_CONFIG[assignment.progress_status].color}
                ${STATUS_CONFIG[assignment.progress_status].bgHover}
                active:scale-95 transition-transform touch-manipulation`}
            >
              {STATUS_CONFIG[assignment.progress_status].label}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{assignment.work_name}</p>
              {assignment.work_name_chinese && (
                <p className="text-xs text-gray-400 truncate">{assignment.work_name_chinese}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {child.assignments.length > 5 && (
        <div className="px-3 py-2 text-center text-xs text-gray-400 border-t">
          +{child.assignments.length - 5} more works
        </div>
      )}

      <div className="px-3 py-2 bg-gray-50 flex justify-between text-xs">
        <span className="text-gray-500">{stats.total} works</span>
        <span className="text-green-600 font-medium">{stats.mastered} done</span>
      </div>
    </div>
  );
}
