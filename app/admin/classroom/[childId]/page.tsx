'use client';

import { useState, useEffect } from 'react';
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
  presented_date?: string;
  practicing_date?: string;
  mastered_date?: string;
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

const STATUS_CONFIG = {
  not_started: { label: '○', fullLabel: 'Not Started', color: 'bg-gray-200 text-gray-700', next: 'presented' },
  presented: { label: 'P', fullLabel: 'Presented', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', fullLabel: 'Practicing', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', fullLabel: 'Mastered', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  practical_life: { label: 'Practical Life', color: 'text-amber-800', bgColor: 'bg-amber-50 border-amber-200' },
  sensorial: { label: 'Sensorial', color: 'text-pink-800', bgColor: 'bg-pink-50 border-pink-200' },
  mathematics: { label: 'Math', color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200' },
  language: { label: 'Language', color: 'text-green-800', bgColor: 'bg-green-50 border-green-200' },
  culture: { label: 'Culture', color: 'text-purple-800', bgColor: 'bg-purple-50 border-purple-200' },
};

export default function ChildDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params.childId as string;
  const weekNumber = searchParams.get('week') || '';
  const year = searchParams.get('year') || '';
  
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (childId) {
      fetchChildDetail();
    }
  }, [childId, weekNumber, year]);

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

  async function updateProgress(assignmentId: string, newStatus: string) {
    if (!child) return;
    
    // Optimistic update
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

  // Group assignments by area
  const assignmentsByArea = child?.assignments.reduce((acc, a) => {
    if (!acc[a.area]) acc[a.area] = [];
    acc[a.area].push(a);
    return acc;
  }, {} as Record<string, WorkAssignment[]>) || {};

  // Calculate stats
  const stats = child ? {
    total: child.assignments.length,
    mastered: child.assignments.filter(a => a.progress_status === 'mastered').length,
    practicing: child.assignments.filter(a => a.progress_status === 'practicing').length,
    presented: child.assignments.filter(a => a.progress_status === 'presented').length,
    notStarted: child.assignments.filter(a => a.progress_status === 'not_started').length,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/admin/classroom?week=${weekNumber}&year=${year}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">←</span>
              <span>Back to Class</span>
            </Link>
            <span className="text-sm text-gray-500">Week {weekNumber}, {year}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Child Header Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{child.name}</h1>
          
          {child.age_group && (
            <p className="text-blue-100 mb-4">Age group: {child.age_group}</p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Week Progress</span>
              <span>{stats ? Math.round((stats.mastered / stats.total) * 100) : 0}% complete</span>
            </div>
            <div className="h-3 bg-blue-400/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${stats ? (stats.mastered / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
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

        {/* Works by Area */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">This Week's Works</h2>
        
        {Object.entries(AREA_CONFIG).map(([areaKey, areaConfig]) => {
          const areaAssignments = assignmentsByArea[areaKey] || [];
          if (areaAssignments.length === 0) return null;

          return (
            <div key={areaKey} className={`rounded-xl border mb-4 overflow-hidden ${areaConfig.bgColor}`}>
              <div className={`px-4 py-3 border-b ${areaConfig.bgColor}`}>
                <h3 className={`font-semibold ${areaConfig.color}`}>
                  {areaConfig.label}
                  <span className="ml-2 text-sm font-normal opacity-70">
                    ({areaAssignments.length} {areaAssignments.length === 1 ? 'work' : 'works'})
                  </span>
                </h3>
              </div>
              
              <div className="bg-white divide-y">
                {areaAssignments.map(assignment => (
                  <div key={assignment.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Large Status Button */}
                      <button
                        onClick={() => handleStatusTap(assignment)}
                        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold
                          ${STATUS_CONFIG[assignment.progress_status].color}
                          active:scale-95 transition-transform touch-manipulation shadow-sm`}
                      >
                        <span className="text-xl">{STATUS_CONFIG[assignment.progress_status].label}</span>
                        <span className="text-[10px] font-normal opacity-70">tap</span>
                      </button>

                      {/* Work Info */}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{assignment.work_name}</p>
                        {assignment.work_name_chinese && (
                          <p className="text-sm text-gray-500">{assignment.work_name_chinese}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Status: {STATUS_CONFIG[assignment.progress_status].fullLabel}
                        </p>
                      </div>

                      {/* Video Button */}
                      {assignment.video_url && (
                        <button
                          onClick={() => setVideoModal({ 
                            url: assignment.video_url!, 
                            title: assignment.work_name 
                          })}
                          className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors"
                        >
                          ▶️
                        </button>
                      )}
                    </div>

                    {/* Assignment Notes */}
                    {assignment.notes && (
                      <div className="mt-3 pl-20 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                        {assignment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {child.assignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600">No works assigned for this week</p>
          </div>
        )}
      </main>

      {/* Video Modal */}
      {videoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <div 
            className="bg-white rounded-xl overflow-hidden max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{videoModal.title}</h3>
              <button onClick={() => setVideoModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
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
    </div>
  );
}
