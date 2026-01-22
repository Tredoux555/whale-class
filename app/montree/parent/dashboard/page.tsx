// /montree/parent/dashboard/page.tsx
// Parent Dashboard - View child's progress, media, and reports
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
  age?: number;
  classroom_name?: string;
}

interface ProgressStats {
  presented: number;
  practicing: number;
  mastered: number;
  total: number;
}

interface MediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  work_name?: string;
  taken_at: string;
}

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  share_token?: string;
}

const AREA_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  practical_life: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '🧹' },
  sensorial: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: '👁️' },
  mathematics: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '🔢' },
  language: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '📖' },
  cultural: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🌍' },
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [areaProgress, setAreaProgress] = useState<any[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch parent's child data
      const res = await fetch('/api/montree/parent/dashboard');
      const data = await res.json();

      if (!data.success) {
        // Not authenticated, redirect to login
        router.push('/montree/parent');
        return;
      }

      setChild(data.child);
      setProgress(data.progress);
      setAreaProgress(data.areaProgress || []);
      setRecentMedia(data.recentMedia || []);
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      router.push('/montree/parent');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/montree/parent/auth/logout', { method: 'POST' });
      router.push('/montree/parent');
    } catch {
      router.push('/montree/parent');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">🌳</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Child Found</h2>
          <p className="text-gray-500 mb-4">Please contact your teacher to link your account.</p>
          <Link href="/montree/parent" className="text-emerald-600 hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = progress ? Math.round(((progress.mastered) / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                {child.photo_url ? (
                  <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  child.name.charAt(0)
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{child.name}</h1>
                <p className="text-sm text-gray-500">
                  {child.classroom_name || 'Montessori Class'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-2"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Overview Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Learning Progress</h2>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">{progressPercent}%</div>
              <p className="text-xs text-gray-500">mastered</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full flex">
              <div 
                className="bg-green-500 transition-all" 
                style={{ width: `${(progress?.mastered || 0) / Math.max(progress?.total || 1, 1) * 100}%` }} 
              />
              <div 
                className="bg-blue-400 transition-all" 
                style={{ width: `${(progress?.practicing || 0) / Math.max(progress?.total || 1, 1) * 100}%` }} 
              />
              <div 
                className="bg-yellow-400 transition-all" 
                style={{ width: `${(progress?.presented || 0) / Math.max(progress?.total || 1, 1) * 100}%` }} 
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-gray-600">{progress?.presented || 0} Presented</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-gray-600">{progress?.practicing || 0} Practicing</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">{progress?.mastered || 0} Mastered</span>
            </span>
          </div>
        </div>

        {/* Area Progress */}
        {areaProgress.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Progress by Area</h2>
            <div className="space-y-3">
              {areaProgress.map((area) => {
                const colors = AREA_COLORS[area.id] || AREA_COLORS.practical_life;
                const areaPercent = area.total > 0 ? Math.round((area.mastered / area.total) * 100) : 0;
                
                return (
                  <div key={area.id} className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{colors.icon}</span>
                        <span className={`font-medium ${colors.text}`}>{area.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${colors.text}`}>{areaPercent}%</span>
                    </div>
                    <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-current opacity-60 transition-all rounded-full"
                        style={{ width: `${areaPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {area.mastered} of {area.total} works mastered
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Photos */}
        {recentMedia.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Photos</h2>
              <Link href={`/montree/parent/media`} className="text-sm text-emerald-600 hover:underline">
                See All →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentMedia.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
                >
                  {item.media_type === 'video' ? (
                    <>
                      <video src={item.media_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </>
                  ) : (
                    <img src={item.media_url} alt={item.work_name || ''} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Reports */}
        {reports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Weekly Reports</h2>
            <div className="space-y-2">
              {reports.slice(0, 4).map((report) => (
                <Link
                  key={report.id}
                  href={report.share_token ? `/montree/report/${report.share_token}` : '#'}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <span className="text-emerald-600">📄</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Week of {new Date(report.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">{report.status}</p>
                    </div>
                  </div>
                  <span className="text-gray-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Games Section */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🎮</span>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">Learning Games</h2>
              <p className="text-white/80 text-sm">Practice at home with fun activities</p>
            </div>
          </div>
          <Link
            href="/games"
            className="mt-4 block w-full py-3 bg-white text-purple-600 font-bold rounded-xl text-center hover:bg-purple-50 transition-colors"
          >
            Play Games →
          </Link>
        </div>

        {/* Contact Teacher */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h3 className="font-bold text-amber-900">Questions?</h3>
              <p className="text-sm text-amber-700 mt-1">
                Contact your child&apos;s teacher for more information about their progress.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setSelectedMedia(null)}
        >
          <button 
            onClick={() => setSelectedMedia(null)} 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl z-10"
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {selectedMedia.media_type === 'video' ? (
              <video 
                src={selectedMedia.media_url} 
                controls 
                autoPlay
                className="max-w-full max-h-[70vh] rounded-xl"
              />
            ) : (
              <img 
                src={selectedMedia.media_url} 
                alt={selectedMedia.work_name || ''} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            )}
          </div>

          <div className="bg-black/50 p-4 text-white text-center" onClick={e => e.stopPropagation()}>
            <p className="font-semibold">{selectedMedia.work_name || 'Learning Moment'}</p>
            <p className="text-sm text-white/70">
              {new Date(selectedMedia.taken_at).toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400">
        <p>Montree • Montessori Progress Tracking</p>
      </footer>
    </div>
  );
}
