'use client';

import { useState, useEffect } from 'react';
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

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'border-l-amber-500 bg-amber-50',
  sensorial: 'border-l-pink-500 bg-pink-50',
  mathematics: 'border-l-blue-500 bg-blue-50',
  language: 'border-l-green-500 bg-green-50',
  culture: 'border-l-purple-500 bg-purple-50',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'P',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  culture: 'C',
};

export default function ClassroomView() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<ChildWithAssignments[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchWeeklyPlans();
  }, []);

  useEffect(() => {
    // Check URL params for week/year
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
      const res = await fetch(`/api/weekly-planning/by-plan?planId=${planId}`);
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
      fetchAssignments(selectedPlanId);
    }
  }

  const handleStatusTap = (e: React.MouseEvent, assignment: WorkAssignment) => {
    e.preventDefault();
    e.stopPropagation();
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    updateProgress(assignment.id, nextStatus);
  };

  // Calculate completion stats for each child
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
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-xl font-bold">🐋 Classroom View</h1>
          </div>
          
          {/* Week Selector */}
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

          {/* Area Filter */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredChildren.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                stats={getChildStats(child.assignments)}
                weekNumber={selectedWeek}
                year={selectedYear}
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
  stats: { total: number; mastered: number; inProgress: number; notStarted: number };
  weekNumber: number;
  year: number;
  onStatusTap: (e: React.MouseEvent, assignment: WorkAssignment) => void;
  onVideoTap: (url: string, title: string) => void;
}

function ChildCard({ child, stats, weekNumber, year, onStatusTap, onVideoTap }: ChildCardProps) {
  const completionPercent = stats.total > 0 
    ? Math.round((stats.mastered / stats.total) * 100) 
    : 0;

  return (
    <Link
      href={`/admin/classroom/${child.id}?week=${weekNumber}&year=${year}`}
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer block"
    >
      {/* Child Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
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
      </div>

      {/* Focus Area (if exists) */}
      {child.focus_area && (
        <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-100">
          <p className="text-xs text-yellow-800 truncate">
            🎯 {child.focus_area}
          </p>
        </div>
      )}

      {/* Work Summary - Show first 5 works */}
      <div className="divide-y">
        {child.assignments.slice(0, 5).map(assignment => (
          <div
            key={assignment.id}
            className={`flex items-center gap-2 px-3 py-2 border-l-4 ${AREA_COLORS[assignment.area] || 'border-l-gray-300'}`}
          >
            {/* Status Button */}
            <button
              onClick={(e) => onStatusTap(e, assignment)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                ${STATUS_CONFIG[assignment.progress_status].color}
                active:scale-95 transition-transform touch-manipulation`}
            >
              {STATUS_CONFIG[assignment.progress_status].label}
            </button>

            {/* Work Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{assignment.work_name}</p>
              {assignment.work_name_chinese && (
                <p className="text-xs text-gray-400 truncate">{assignment.work_name_chinese}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* More indicator */}
      {child.assignments.length > 5 && (
        <div className="px-3 py-2 text-center text-xs text-gray-400 border-t">
          +{child.assignments.length - 5} more works
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-3 py-2 bg-gray-50 flex justify-between text-xs">
        <span className="text-gray-500">{stats.total} works</span>
        <span className="text-green-600 font-medium">{stats.mastered} done</span>
      </div>
    </Link>
  );
}

interface VideoModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

function VideoModal({ url, title, onClose }: VideoModalProps) {
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
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
