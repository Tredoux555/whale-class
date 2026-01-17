// /montree/dashboard/student/[id]/page.tsx
// STUDENT DETAIL PAGE - Real progress data
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  date_of_birth?: string;
  display_order?: number;
}

interface AreaProgress {
  id: string;
  name: string;
  emoji: string;
  color: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

interface RecentWork {
  id: string;
  workId: string;
  name: string;
  status: string;
  date: string;
  hasPhoto: boolean;
  notes?: string;
}

interface StudentData {
  student: Student;
  progress: {
    overall: {
      totalWorks: number;
      completed: number;
      inProgress: number;
      percentage: number;
    };
    byArea: AreaProgress[];
  };
  recentWorks: RecentWork[];
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  async function fetchStudentData() {
    try {
      const res = await fetch(`/api/montree/students/${studentId}`);
      if (!res.ok) throw new Error('Failed to fetch student');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading student...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          <p className="font-medium">Error loading student</p>
          <p className="text-sm mt-1">{error || 'Student not found'}</p>
          <button 
            onClick={() => router.back()}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const { student, progress, recentWorks } = data;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{student.name}</h1>
          <p className="text-slate-500 text-sm">
            {progress.overall.completed} works completed
          </p>
        </div>
        <Link
          href={`/montree/dashboard/student/${studentId}/add-work`}
          className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-all"
        >
          + Work
        </Link>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Overall Progress</h2>
          <span className="text-3xl font-bold text-teal-400">{progress.overall.percentage}%</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500 rounded-full transition-all duration-700"
            style={{ width: `${progress.overall.percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-slate-500">
            <span className="text-green-400">{progress.overall.completed}</span> completed
          </span>
          <span className="text-slate-500">
            <span className="text-amber-400">{progress.overall.inProgress}</span> in progress
          </span>
          <span className="text-slate-500">
            {progress.overall.totalWorks} total
          </span>
        </div>
      </div>

      {/* Progress by Area */}
      <div>
        <h2 className="text-white font-semibold mb-3">By Area</h2>
        <div className="space-y-2">
          {progress.byArea.map((area) => (
            <Link
              key={area.id}
              href={`/montree/dashboard/student/${studentId}/area/${area.id}`}
              className="w-full flex items-center gap-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all group"
            >
              <span className="text-2xl">{area.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">{area.name}</div>
                <div className="text-slate-500 text-sm">{area.completed}/{area.totalWorks} works</div>
              </div>
              <div className="w-24">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${area.percentage}%`,
                      backgroundColor: area.color 
                    }}
                  />
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Works */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent Works</h2>
          <Link 
            href={`/montree/dashboard/student/${studentId}/history`}
            className="text-teal-400 text-sm hover:text-teal-300"
          >
            View All →
          </Link>
        </div>
        
        {recentWorks.length > 0 ? (
          <div className="space-y-2">
            {recentWorks.map((work) => (
              <div
                key={work.id}
                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3"
              >
                {work.hasPhoto ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-xl">
                    📷
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 border-dashed rounded-lg flex items-center justify-center text-slate-600 text-sm">
                    +📷
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{work.name}</div>
                  <div className="text-slate-500 text-sm">{formatDate(work.date)}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  work.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : work.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {work.status === 'completed' ? '✓ Done' : work.status === 'in_progress' ? '◐ Practice' : '○ Presented'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-slate-500 text-sm">No works recorded yet</p>
            <Link
              href={`/montree/dashboard/student/${studentId}/add-work`}
              className="inline-block mt-3 text-teal-400 text-sm hover:text-teal-300"
            >
              Add first work →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/montree/dashboard/student/${studentId}/add-work`}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/40 rounded-xl p-4 text-teal-400 font-medium hover:from-teal-500/30 hover:to-cyan-500/30 transition-all"
        >
          📸 Capture
        </Link>
        <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl p-4 text-amber-400 font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all">
          📹 Video
        </button>
        <Link
          href={`/montree/dashboard/reports?student=${studentId}`}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/40 rounded-xl p-4 text-violet-400 font-medium hover:from-violet-500/30 hover:to-purple-500/30 transition-all"
        >
          📝 Report
        </Link>
        <Link
          href="/montree/dashboard/games"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/40 rounded-xl p-4 text-pink-400 font-medium hover:from-pink-500/30 hover:to-rose-500/30 transition-all"
        >
          🎮 Games
        </Link>
      </div>
    </div>
  );
}
