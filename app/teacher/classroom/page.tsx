'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  age_group: string;
  photo_url: string | null;
  age: number;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
  lastGame?: {
    name: string;
    playedAt: string;
    duration: number | null;
  } | null;
  totalGameSessions?: number;
}

const AVATAR_COLORS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-pink-500',
];

// Helper to format relative time
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper to check if played today
function isActiveToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export default function TeacherClassroomPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewingAsPrincipal, setViewingAsPrincipal] = useState(false);

  useEffect(() => {
    // Check URL param first (for principal viewing teacher's classroom)
    const params = new URLSearchParams(window.location.search);
    const urlTeacher = params.get('teacher');
    
    if (urlTeacher) {
      setViewingAsPrincipal(true);
    }
    
    // Then check localStorage
    const storedName = localStorage.getItem('teacherName');
    const name = urlTeacher || storedName;
    
    if (!name) {
      router.push('/teacher');
      return;
    }
    setTeacherName(name);
    if (!urlTeacher) {
      ensureCookieSet(name);
    }
    fetchChildren(name);
  }, [router]);

  const ensureCookieSet = async (name: string) => {
    try {
      await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch (err) {
      console.log('Cookie refresh failed, continuing');
    }
  };

  const fetchChildren = async (teacherNameParam?: string) => {
    try {
      const url = teacherNameParam 
        ? `/api/teacher/classroom?teacher=${encodeURIComponent(teacherNameParam)}`
        : '/api/teacher/classroom';
      const res = await fetch(url);
      const data = await res.json();
      setChildren(data.children || []);
      if (data.message) setMessage(data.message);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressPercentage = (child: Child) => {
    const totalWorks = 268;
    return Math.round(((child.progress?.mastered || 0) / totalWorks) * 100);
  };

  const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

  // Calculate totals
  const totalMastered = children.reduce((sum, c) => sum + (c.progress?.mastered || 0), 0);
  const totalPracticing = children.reduce((sum, c) => sum + (c.progress?.practicing || 0), 0);
  const totalPresented = children.reduce((sum, c) => sum + (c.progress?.presented || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🐋</span>
          </div>
          <p className="text-gray-600 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Back to Principal link */}
      {viewingAsPrincipal && (
        <div className="bg-indigo-600 text-white px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <Link href="/principal" className="inline-flex items-center gap-2 text-sm hover:text-indigo-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Principal Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl">👥</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">My Classroom</h1>
                <p className="text-emerald-100">{children.length} students • {teacherName}</p>
              </div>
            </div>
            {children.length > 0 && (
              <Link
                href="/teacher/progress"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors shadow-lg"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Track Progress</span>
              </Link>
            )}
          </div>

          {/* Stats Bar */}
          {children.length > 0 && (
            <div className="flex gap-6 mt-6 pt-4 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalMastered}</div>
                <div className="text-xs text-emerald-200">Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalPracticing}</div>
                <div className="text-xs text-emerald-200">Practicing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalPresented}</div>
                <div className="text-xs text-emerald-200">Presented</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Message from API */}
        {message && children.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-amber-800">{message}</p>
          </div>
        )}

        {/* Search */}
        {children.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {children.length === 0 && !message && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👶</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No students assigned</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Contact your administrator to assign students to your classroom.
            </p>
          </div>
        )}

        {/* Children Grid */}
        {filteredChildren.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredChildren.map((child, index) => (
              <div
                key={child.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                {/* Header with Avatar */}
                <div className={`bg-gradient-to-br ${getAvatarColor(index)} p-4 relative`}>
                  {/* Active Today indicator */}
                  {isActiveToday(child.lastGame?.playedAt) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-white font-medium">Active</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {child.name.charAt(0)}
                    </div>
                    <div className="text-white">
                      <h3 className="font-bold text-lg truncate">{child.name}</h3>
                      <p className="text-white/80 text-sm">
                        Age {child.age?.toFixed(1) || '?'} • {child.age_group || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="p-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span className="font-medium text-gray-900">{getProgressPercentage(child)}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full flex">
                      <div 
                        className="bg-green-500 transition-all duration-500" 
                        style={{ width: `${((child.progress?.mastered || 0) / 268) * 100}%` }} 
                      />
                      <div 
                        className="bg-blue-500 transition-all duration-500" 
                        style={{ width: `${((child.progress?.practicing || 0) / 268) * 100}%` }} 
                      />
                      <div 
                        className="bg-yellow-500 transition-all duration-500" 
                        style={{ width: `${((child.progress?.presented || 0) / 268) * 100}%` }} 
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-gray-600">{child.progress?.presented || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600">{child.progress?.practicing || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-600">{child.progress?.mastered || 0}</span>
                    </div>
                  </div>

                  {/* Game Activity */}
                  {child.lastGame ? (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span className="text-purple-600">🎮</span> {child.lastGame.name}
                      <span className="text-gray-400 ml-1">
                        • {formatTimeAgo(child.lastGame.playedAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      🎮 No games yet
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <Link
                    href={`/teacher/progress?child=${child.id}`}
                    className="flex-1 text-center text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2.5 rounded-xl transition-colors font-medium"
                  >
                    📊 Progress
                  </Link>
                  <Link
                    href={`/teacher/progress?child=${child.id}&tab=games`}
                    className="flex-1 text-center text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 py-2.5 rounded-xl transition-colors font-medium"
                  >
                    🎮 Games
                  </Link>
                  <Link
                    href={`/admin/child-progress/${child.id}`}
                    className="flex-1 text-center text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 py-2.5 rounded-xl transition-colors font-medium"
                  >
                    📋 Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
