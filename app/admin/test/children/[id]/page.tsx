// app/admin/test/children/[id]/page.tsx
// Child assessment history with progress tracking

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Calendar, TrendingUp, Play } from 'lucide-react';

interface Assessment {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_score: number;
  total_possible: number;
  overall_percentage: number | null;
  overall_level: string | null;
  duration_seconds: number | null;
}

interface ChildInfo {
  id: string;
  name: string;
  date_of_birth?: string;
}

export default function ChildDetailPage() {
  const params = useParams();
  const childId = params.id as string;
  
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildData();
  }, [childId]);

  const loadChildData = async () => {
    try {
      // Load all sessions for this child
      const res = await fetch(`/api/assessment/sessions?child_id=${childId}`);
      const data = await res.json();
      
      if (data.sessions && data.sessions.length > 0) {
        setChild({
          id: childId,
          name: data.sessions[0].child_name
        });
        setAssessments(data.sessions);
      } else {
        // Try to get child info from children API
        const childRes = await fetch('/api/assessment/children');
        const childData = await childRes.json();
        const foundChild = childData.children?.find((c: any) => c.id === childId);
        if (foundChild) {
          setChild({ id: foundChild.id, name: foundChild.name });
        }
      }
    } catch (err) {
      console.error('Error loading child data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'proficient': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'developing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'emerging': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLevelEmoji = (level: string | null) => {
    switch (level) {
      case 'proficient': return '🌟';
      case 'developing': return '📈';
      case 'emerging': return '🌱';
      default: return '⏳';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Calculate progress trend
  const completedAssessments = assessments
    .filter(a => a.status === 'completed' && a.overall_percentage !== null)
    .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime());

  const latestScore = completedAssessments[completedAssessments.length - 1]?.overall_percentage;
  const previousScore = completedAssessments[completedAssessments.length - 2]?.overall_percentage;
  const trend = latestScore && previousScore ? latestScore - previousScore : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐋</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <p>Child not found</p>
          <Link href="/admin/test/children" className="text-blue-400 mt-2 inline-block">
            ← Back to children
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/test/children"
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{child.name}</h1>
              <p className="text-gray-400 text-sm">
                {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link
            href="/assessment"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            <Play size={18} />
            New Test
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Summary Cards */}
        {completedAssessments.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <p className="text-3xl font-bold">{latestScore}%</p>
              <p className="text-gray-400 text-sm">Latest Score</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <p className="text-3xl font-bold">{completedAssessments.length}</p>
              <p className="text-gray-400 text-sm">Tests Taken</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              {trend !== null ? (
                <>
                  <p className={`text-3xl font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend >= 0 ? '+' : ''}{trend}%
                  </p>
                  <p className="text-gray-400 text-sm">Progress</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">—</p>
                  <p className="text-gray-400 text-sm">Progress</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Progress Chart (simple visual) */}
        {completedAssessments.length > 1 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Progress Over Time
            </h2>
            <div className="flex items-end gap-2 h-32">
              {completedAssessments.slice(-8).map((a, i) => (
                <div key={a.id} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t ${
                      a.overall_level === 'proficient' ? 'bg-green-500' :
                      a.overall_level === 'developing' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ height: `${a.overall_percentage}%` }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(a.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment History */}
        <h2 className="text-xl font-bold mb-4">Assessment History</h2>
        <div className="space-y-3">
          {assessments.length > 0 ? (
            assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/admin/test/sessions/${assessment.id}`}
                className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {getLevelEmoji(assessment.overall_level)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-300">
                          {new Date(assessment.started_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {assessment.status === 'completed' 
                          ? `${assessment.total_score}/${assessment.total_possible} • ${formatDuration(assessment.duration_seconds)}`
                          : 'In progress'
                        }
                      </p>
                    </div>
                  </div>

                  {assessment.status === 'completed' && assessment.overall_percentage !== null ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getLevelColor(assessment.overall_level)}`}>
                      {assessment.overall_percentage}%
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      ⏳ In Progress
                    </span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>No assessments yet</p>
              <Link 
                href="/assessment" 
                className="text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                Start first assessment →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
