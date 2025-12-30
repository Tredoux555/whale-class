'use client';

import { useState, useEffect } from 'react';

interface WorkAssignment {
  id: string;
  work_name: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  work_id?: string;
  video_url?: string;
}

interface ChildWithAssignments {
  id: string;
  name: string;
  assignments: WorkAssignment[];
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
}

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'border-l-amber-500',
  sensorial: 'border-l-pink-500',
  mathematics: 'border-l-blue-500',
  language: 'border-l-green-500',
  culture: 'border-l-purple-500',
};

export default function ClassroomView() {
  const [children, setChildren] = useState<ChildWithAssignments[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchWeeklyPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchAssignments(selectedPlanId);
    }
  }, [selectedPlanId]);

  async function fetchWeeklyPlans() {
    try {
      const res = await fetch('/api/weekly-planning/list');
      const data = await res.json();
      setWeeklyPlans(data.plans || []);
      if (data.plans?.length > 0) {
        setSelectedPlanId(data.plans[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssignments(planId: string) {
    try {
      const res = await fetch(`/api/weekly-planning/assignments?planId=${planId}`);
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }

  async function updateProgress(assignmentId: string, newStatus: string) {
    // Optimistic update
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
      // Revert on error
      fetchAssignments(selectedPlanId);
    }
  }

  const handleStatusTap = (assignment: WorkAssignment) => {
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    updateProgress(assignment.id, nextStatus);
  };

  const filteredChildren = children.map(child => ({
    ...child,
    assignments: filterArea === 'all'
      ? child.assignments
      : child.assignments.filter(a => a.area === filterArea)
  })).filter(child => child.assignments.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Fixed */}
      <header className="sticky top-0 z-50 bg-white shadow-md px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">🐋 Classroom View</h1>
          
          {/* Week Selector */}
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="px-4 py-2 border rounded-lg font-medium"
          >
            {weeklyPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                Week {plan.week_number}, {plan.year}
              </option>
            ))}
          </select>

          {/* Area Filter */}
          <div className="flex gap-1">
            {['all', 'practical_life', 'sensorial', 'mathematics', 'language', 'culture'].map(area => (
              <button
                key={area}
                onClick={() => setFilterArea(area)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filterArea === area 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {area === 'all' ? 'All' : area.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-sm max-w-7xl mx-auto">
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">○</span>
            Not started
          </span>
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center font-bold">P</span>
            Presented
          </span>
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold">Pr</span>
            Practicing
          </span>
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center font-bold">M</span>
            Mastered
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <main className="p-4 max-w-7xl mx-auto">
        {filteredChildren.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600">No assignments for this week yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Upload a weekly plan to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChildren.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                onStatusTap={handleStatusTap}
                onVideoTap={(url, title) => setVideoModal({ url, title })}
              />
            ))}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          url={videoModal.url}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
}

interface ChildCardProps {
  child: ChildWithAssignments;
  onStatusTap: (assignment: WorkAssignment) => void;
  onVideoTap: (url: string, title: string) => void;
}

function ChildCard({ child, onStatusTap, onVideoTap }: ChildCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Child Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
        <h3 className="text-white font-bold text-lg">{child.name}</h3>
        <p className="text-blue-100 text-sm">{child.assignments.length} works this week</p>
      </div>

      {/* Work List */}
      <div className="divide-y">
        {child.assignments.map(assignment => (
          <div
            key={assignment.id}
            className={`flex items-center gap-3 p-3 border-l-4 ${AREA_COLORS[assignment.area]}`}
          >
            {/* Status Button - Large touch target */}
            <button
              onClick={() => onStatusTap(assignment)}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                ${STATUS_CONFIG[assignment.progress_status].color}
                active:scale-95 transition-transform touch-manipulation`}
            >
              {STATUS_CONFIG[assignment.progress_status].label}
            </button>

            {/* Work Name */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{assignment.work_name}</p>
              <p className="text-xs text-gray-400 capitalize">
                {assignment.area.replace('_', ' ')}
              </p>
            </div>

            {/* Video Button */}
            {assignment.video_url && (
              <button
                onClick={() => onVideoTap(assignment.video_url!, assignment.work_name)}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
              >
                ▶️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface VideoModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

function VideoModal({ url, title, onClose }: VideoModalProps) {
  // Extract video ID for embedding
  const getEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl overflow-hidden max-w-4xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            src={getEmbedUrl(url)}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    </div>
  );
}
