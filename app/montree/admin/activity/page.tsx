'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface TeacherActivity {
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  photos_this_week: number;
  photos_this_month: number;
  work_updates_this_week: number;
  work_updates_this_month: number;
  observations_this_week: number;
  sessions_this_week: number;
  last_active_at: string | null;
  last_activity_type: string | null;
}

interface StudentCoverage {
  child_id: string;
  child_name: string;
  classroom_id: string;
  last_photo_at: string | null;
  last_update_at: string | null;
  days_without_activity: number;
}

interface ActivityFeed {
  timestamp: string;
  teacher_name: string;
  action_type: string;
  action_description: string;
  child_name?: string;
  count?: number;
}

interface Summary {
  total_teachers: number;
  active_this_week: number;
  total_students_covered_this_week: number;
  students_without_activity: number;
}

const ACTIVITY_ICONS: Record<string, string> = {
  photo: '📷',
  work_update: '✓',
  observation: '👁️',
  session: '🎯',
};

const ACTIVITY_LABELS: Record<string, string> = {
  photo: 'Photo',
  work_update: 'Work Update',
  observation: 'Observation',
  session: 'Session',
};

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function SimpleSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return <span className="text-gray-400">-</span>;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 24;

  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.map((value, i) => {
        const normalized = (value - min) / range;
        const barHeight = Math.max(2, normalized * height);
        return (
          <div
            key={i}
            className="flex-1 bg-emerald-500 rounded-sm opacity-70"
            style={{ height: `${barHeight}px` }}
            title={`${value}`}
          />
        );
      })}
    </div>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherActivity[]>([]);
  const [students, setStudents] = useState<StudentCoverage[]>([]);
  const [feed, setFeed] = useState<ActivityFeed[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'coverage' | 'feed'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivity();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }
    fetchActivity();
  };

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const school = schoolData ? JSON.parse(schoolData) : null;
    const principal = principalData ? JSON.parse(principalData) : null;
    return {
      'Content-Type': 'application/json',
      'x-school-id': school?.id || '',
      'x-principal-id': principal?.id || '',
    };
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/montree/admin/activity', {
        headers: getHeaders(),
      });

      if (res.status === 401) {
        router.push('/montree/principal/login');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch activity');

      const data = await res.json();
      setTeachers(data.teacher_activity || []);
      setStudents(data.student_coverage || []);
      setFeed(data.activity_feed || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activity data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-emerald-400">Activity Dashboard</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  autoRefresh
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {autoRefresh ? '🔄 Live' : '⏸ Paused'}
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchActivity();
                }}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm font-medium transition-colors border border-gray-700"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Teachers</div>
              <div className="text-3xl font-bold text-emerald-400">{summary?.total_teachers || 0}</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Active This Week</div>
              <div className="text-3xl font-bold text-emerald-400">{summary?.active_this_week || 0}</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Students Documented</div>
              <div className="text-3xl font-bold text-emerald-400">{summary?.total_students_covered_this_week || 0}</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Needs Attention</div>
              <div className="text-3xl font-bold text-amber-400">{summary?.students_without_activity || 0}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-800 flex gap-1 px-6 bg-gray-950">
          {[
            { id: 'overview', label: '👥 Teacher Activity', icon: '📊' },
            { id: 'coverage', label: '👧 Student Coverage', icon: '📋' },
            { id: 'feed', label: '⏱️ Activity Feed', icon: '🔔' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div>
            <div className="space-y-3">
              {teachers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No teacher activity data yet</p>
                </div>
              ) : (
                teachers.map((teacher) => {
                  const totalActivityWeek =
                    teacher.photos_this_week +
                    teacher.work_updates_this_week +
                    teacher.observations_this_week +
                    teacher.sessions_this_week;

                  const isActive = teacher.last_active_at
                    ? new Date(teacher.last_active_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    : false;

                  return (
                    <div
                      key={teacher.teacher_id}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{teacher.teacher_name}</h3>
                            {isActive && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>}
                          </div>
                          <p className="text-gray-400 text-sm">{teacher.teacher_email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-400">{totalActivityWeek}</div>
                          <div className="text-gray-400 text-sm">actions this week</div>
                        </div>
                      </div>

                      {/* Activity Breakdown */}
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-800/40 rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📷</span>
                            <span className="text-gray-400 text-xs">Photos</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-emerald-400">{teacher.photos_this_week}</span>
                            <span className="text-gray-500 text-xs">({teacher.photos_this_month}m)</span>
                          </div>
                        </div>

                        <div className="bg-gray-800/40 rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✓</span>
                            <span className="text-gray-400 text-xs">Updates</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-emerald-400">{teacher.work_updates_this_week}</span>
                            <span className="text-gray-500 text-xs">({teacher.work_updates_this_month}m)</span>
                          </div>
                        </div>

                        <div className="bg-gray-800/40 rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">👁️</span>
                            <span className="text-gray-400 text-xs">Observations</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-400">{teacher.observations_this_week}</div>
                        </div>

                        <div className="bg-gray-800/40 rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🎯</span>
                            <span className="text-gray-400 text-xs">Sessions</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-400">{teacher.sessions_this_week}</div>
                        </div>
                      </div>

                      {/* Last Active */}
                      <div className="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-gray-800">
                        <div>
                          <span>Last active: </span>
                          <span className="text-gray-300 font-medium">
                            {formatTimeAgo(teacher.last_active_at)}
                          </span>
                          {teacher.last_activity_type && (
                            <span className="ml-2">
                              ({ACTIVITY_ICONS[teacher.last_activity_type]}{' '}
                              {ACTIVITY_LABELS[teacher.last_activity_type]})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {selectedTab === 'coverage' && (
          <div>
            <div className="space-y-2">
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No student data yet</p>
                </div>
              ) : (
                students.map((student) => {
                  const needsAttention = student.days_without_activity >= 7;

                  return (
                    <div
                      key={student.child_id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        needsAttention
                          ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-100 mb-1">{student.child_name}</h4>
                        <div className="flex gap-4 text-sm text-gray-400">
                          {student.last_photo_at && (
                            <span>
                              📷 Photo: {formatTimeAgo(student.last_photo_at)}
                            </span>
                          )}
                          {student.last_update_at && (
                            <span>
                              ✓ Update: {formatTimeAgo(student.last_update_at)}
                            </span>
                          )}
                          {!student.last_photo_at && !student.last_update_at && (
                            <span className="text-gray-500 italic">No activity recorded</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {needsAttention && (
                          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
                            ⚠️ {student.days_without_activity}d ago
                          </div>
                        )}
                        <div className="text-2xl font-bold text-emerald-400">
                          {student.days_without_activity === 999 ? '—' : student.days_without_activity}
                        </div>
                        <div className="text-gray-400 text-xs">days idle</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {selectedTab === 'feed' && (
          <div>
            <div className="space-y-3">
              {feed.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No recent activity</p>
                </div>
              ) : (
                feed.map((event, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
                    <div className="text-2xl">{ACTIVITY_ICONS[event.action_type] || '•'}</div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-emerald-400">{event.teacher_name}</span>
                        <span className="text-gray-400">{event.action_description}</span>
                        {event.child_name && (
                          <span className="text-gray-300">
                            of <span className="font-medium">{event.child_name}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatTimeAgo(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
