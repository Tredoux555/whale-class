'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SwipeableWorkRow from './SwipeableWorkRow';

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

interface School {
  id: string;
  name: string;
  slug: string;
  settings?: { owner?: boolean };
}

interface School {
  id: string;
  name: string;
  slug: string;
  settings?: { owner?: boolean; placeholder?: boolean };
}

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

// Area display order: 1. Practical Life, 2. Sensorial, 3. Math, 4. Language, 5. Culture
const AREA_ORDER = ['practical_life', 'sensorial', 'math', 'mathematics', 'language', 'culture'];

const AREA_CONFIG: Record<string, { letter: string; color: string }> = {
  practical_life: { letter: 'P', color: 'bg-amber-100 text-amber-700' },
  sensorial: { letter: 'S', color: 'bg-pink-100 text-pink-700' },
  math: { letter: 'M', color: 'bg-blue-100 text-blue-700' },
  mathematics: { letter: 'M', color: 'bg-blue-100 text-blue-700' },
  language: { letter: 'L', color: 'bg-green-100 text-green-700' },
  culture: { letter: 'C', color: 'bg-purple-100 text-purple-700' },
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
  
  // School selector
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('00000000-0000-0000-0000-000000000001');
  
  // Video modal
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);
  
  // Capture state
  const [activeCapture, setActiveCapture] = useState<{ assignment: WorkAssignment; child: ChildWithAssignments } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSchools();
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
  }, [selectedPlanId, selectedSchoolId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  async function fetchSchools() {
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  }

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
      if (selectedSchoolId) {
        params.set('schoolId', selectedSchoolId);
      }
      const res = await fetch(`/api/weekly-planning/by-plan?${params}`);
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }

  async function updateProgress(assignmentId: string, newStatus: string) {
    setChildren(prev => prev.map(child => ({
      ...child,
      assignments: child.assignments.map(a => 
        a.id === assignmentId ? { ...a, progress_status: newStatus as any } : a
      )
    })));

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

  // Watch video
  const handleWatchVideo = async (assignment: WorkAssignment) => {
    // First check if assignment has video_url
    if (assignment.video_url) {
      setVideoModal({ url: assignment.video_url, title: assignment.work_name });
      return;
    }
    
    // Otherwise fetch from curriculum
    try {
      const res = await fetch(`/api/admin/curriculum-works/detail?search=${encodeURIComponent(assignment.work_name)}`);
      const data = await res.json();
      if (data.work?.video_url) {
        setVideoModal({ url: data.work.video_url, title: assignment.work_name });
      } else {
        showToast('No video available for this work yet', 'error');
      }
    } catch (err) {
      showToast('Could not load video', 'error');
    }
  };

  // Capture photo/video
  const handleCapture = (assignment: WorkAssignment, child: ChildWithAssignments) => {
    setActiveCapture({ assignment, child });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCapture) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    const maxSizeMB = isVideo ? '50MB' : '10MB';
    
    if (file.size > maxSize) {
      showToast(`File too large! Max ${maxSizeMB}`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveCapture(null);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', activeCapture.child.id);
    formData.append('assignmentId', activeCapture.assignment.id);
    formData.append('workId', activeCapture.assignment.work_id || '');
    formData.append('workName', activeCapture.assignment.work_name);
    formData.append('weekNumber', selectedWeek.toString());
    formData.append('year', selectedYear.toString());
    formData.append('parentVisible', 'false');

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 15, 90));
    }, 150);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Saved to ${activeCapture.child.name}'s folder!`, 'success');
      } else {
        showToast('Failed to save: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload error:', err);
      showToast('Failed to save', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setActiveCapture(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const plMatch = url.match(/youtube\.com\/playlist\?list=([^&]+)/);
    if (plMatch) return `https://www.youtube.com/embed/videoseries?list=${plMatch[1]}`;
    return url;
  };

  const getChildStats = (assignments: WorkAssignment[]) => {
    const total = assignments.length;
    const mastered = assignments.filter(a => a.progress_status === 'mastered').length;
    return { total, mastered, percent: total > 0 ? Math.round((mastered / total) * 100) : 0 };
  };

  const filteredChildren = children.map(child => ({
    ...child,
    assignments: filterArea === 'all'
      ? child.assignments
      : child.assignments.filter(a => a.area === filterArea)
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-100" style={{ overscrollBehaviorX: 'none' }}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Hidden file input - accepts both photo and video */}
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
            <div className="text-4xl mb-3">📤</div>
            <p className="font-semibold mb-3">Saving...</p>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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

          {/* School Selector */}
          {schools.length > 1 && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-4 py-2 border rounded-lg font-medium bg-emerald-50"
            >
              {schools.filter(s => !s.settings?.placeholder).map(school => (
                <option key={school.id} value={school.id}>
                  🏫 {school.name}
                </option>
              ))}
            </select>
          )}

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
                className="ml-2 w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center hover:bg-blue-200"
                title="Print weekly plan"
              >
                🖨️
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Legend */}
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

      {/* Main Grid */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChildren.map(child => {
              const stats = getChildStats(child.assignments);
              return (
                <div key={child.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Child Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h3 className="text-white font-bold text-lg truncate">{child.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-blue-400/30 rounded-full h-2">
                        <div 
                          className="bg-white rounded-full h-2 transition-all"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                      <span className="text-blue-100 text-xs">{stats.percent}%</span>
                    </div>
                  </div>

                  {/* Works List - swipe left/right on each row to change work in that area */}
                  <div className="divide-y" style={{ overscrollBehavior: 'contain' }}>
                    {[...child.assignments].sort((a, b) => {
                      const aIndex = AREA_ORDER.indexOf(a.area);
                      const bIndex = AREA_ORDER.indexOf(b.area);
                      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                    }).map(assignment => {
                      const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'bg-gray-100 text-gray-600' };
                      const status = STATUS_CONFIG[assignment.progress_status];
                      
                      return (
                        <SwipeableWorkRow
                          key={assignment.id}
                          assignment={assignment}
                          childId={child.id}
                          areaConfig={area}
                          statusConfig={status}
                          onStatusTap={(e) => handleStatusTap(e, assignment)}
                          onCapture={() => handleCapture(assignment, child)}
                          onWatchVideo={() => handleWatchVideo(assignment)}
                          onWorkChanged={(assignmentId, newWorkId, newWorkName) => {
                            setChildren(prev => prev.map(c => ({
                              ...c,
                              assignments: c.assignments.map(a => 
                                a.id === assignmentId 
                                  ? { ...a, work_id: newWorkId, work_name: newWorkName }
                                  : a
                              )
                            })));
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-3 py-2 bg-gray-50 flex justify-between text-xs">
                    <span className="text-gray-500">{stats.total} works</span>
                    <span className="text-green-600 font-medium">{stats.mastered} done</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {videoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <div 
            className="bg-white rounded-xl overflow-hidden max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold truncate pr-4">{videoModal.title}</h3>
              <button 
                onClick={() => setVideoModal(null)} 
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={getEmbedUrl(videoModal.url)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
