// /montree/parent/dashboard/page.tsx
// Parent Dashboard - Simple, actionable view for parents
// Redesigned: Session 63 - Jan 24, 2026
// Focus: What did my child do today? What games can we play at home?
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
  age?: number;
  classroom_name?: string;
}

interface TodayActivity {
  work_id: string;
  work_name: string;
  area: string;
  area_name: string;
  area_icon: string;
  total_minutes: number;
  session_count: number;
}

interface RecommendedGame {
  game_id: string;
  game_name: string;
  game_url: string;
  game_icon?: string;
  game_description?: string;
}

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  share_token?: string;
  summary_preview?: string;
}

interface MediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  work_name?: string;
  taken_at: string;
}

export default function ParentDashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ParentDashboardContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl animate-bounce">🌳</span>
        </div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ParentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [child, setChild] = useState<Child | null>(null);
  const [todayActivities, setTodayActivities] = useState<TodayActivity[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<RecommendedGame[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const testChild = searchParams.get('test');
      const url = testChild 
        ? `/api/montree/parent/dashboard?test=${encodeURIComponent(testChild)}`
        : '/api/montree/parent/dashboard';
      
      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) {
        if (!testChild) {
          router.push('/montree/parent');
        }
        return;
      }

      setChild(data.child);
      setTodayActivities(data.todayActivities || []);
      setRecommendedGames(data.recommendedGames || []);
      setReports(data.reports || []);
      setRecentMedia(data.recentMedia || []);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <LoadingScreen />;

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-md flex items-center justify-center">
              <span className="text-2xl">🌳</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{child.name}&apos;s Journey</h1>
              <p className="text-sm text-gray-500">{child.classroom_name || 'My Classroom'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* TODAY'S ACTIVITIES */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-50 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <h2 className="font-bold text-gray-900">Today</h2>
                <p className="text-sm text-gray-500">{getTodayDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="p-5">
            {todayActivities.length > 0 ? (
              <div className="space-y-3">
                <p className="text-gray-600 font-medium mb-3">{child.name} worked on:</p>
                {todayActivities.map((activity, idx) => (
                  <div 
                    key={activity.work_id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-2xl">{activity.area_icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.work_name}</p>
                      <p className="text-sm text-gray-500">{activity.area_name}</p>
                    </div>
                    {activity.total_minutes > 0 && (
                      <span className="text-sm text-gray-400">
                        {activity.total_minutes} min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">🌟</span>
                <p className="text-gray-500">No activities recorded yet today.</p>
                <p className="text-sm text-gray-400 mt-1">Check back later!</p>
              </div>
            )}
          </div>
        </section>

        {/* PRACTICE AT HOME - GAMES */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-50 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎮</span>
              <div>
                <h2 className="font-bold text-gray-900">Practice at Home</h2>
                <p className="text-sm text-gray-500">Games that reinforce classroom learning</p>
              </div>
            </div>
          </div>
          
          <div className="p-5">
            {recommendedGames.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {recommendedGames.map((game) => (
                  <Link
                    key={game.game_id}
                    href={game.game_url}
                    className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all hover:scale-[1.02] border border-purple-100"
                  >
                    <span className="text-3xl mb-2">{game.game_icon || '🎯'}</span>
                    <span className="font-medium text-gray-900 text-center text-sm">
                      {game.game_name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-3xl mb-2 block">🎲</span>
                <p className="text-gray-500 text-sm">Games will appear here based on classroom activities</p>
                <Link 
                  href="/games" 
                  className="inline-block mt-3 text-emerald-600 hover:underline text-sm font-medium"
                >
                  Browse all games →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* WEEKLY REPORTS */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h2 className="font-bold text-gray-900">Weekly Reports</h2>
                <p className="text-sm text-gray-500">Teacher summaries of {child.name}&apos;s progress</p>
              </div>
            </div>
          </div>
          
          <div className="p-5">
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report, idx) => (
                  <div 
                    key={report.id}
                    className={`p-4 rounded-xl border ${
                      idx === 0 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Week of {formatDate(report.week_start)} - {formatDate(report.week_end)}
                      </span>
                      {report.status === 'published' && report.share_token && (
                        <Link
                          href={`/montree/reports/${report.share_token}`}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                        >
                          View
                        </Link>
                      )}
                      {report.status !== 'published' && (
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                          {report.status}
                        </span>
                      )}
                    </div>
                    {report.summary_preview && idx === 0 && (
                      <p className="text-sm text-gray-600 italic">
                        &ldquo;{report.summary_preview}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-3xl mb-2 block">📝</span>
                <p className="text-gray-500 text-sm">No reports available yet</p>
                <p className="text-xs text-gray-400 mt-1">Reports are generated weekly</p>
              </div>
            )}
          </div>
        </section>

        {/* RECENT PHOTOS */}
        {recentMedia.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-50 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">📸</span>
                <div>
                  <h2 className="font-bold text-gray-900">Recent Photos</h2>
                  <p className="text-sm text-gray-500">{child.name} at work</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-3 gap-2">
                {recentMedia.map((media) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMedia(media)}
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:ring-2 ring-emerald-400 transition-all"
                  >
                    <img
                      src={media.media_url}
                      alt={media.work_name || 'Activity photo'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer spacing */}
        <div className="h-8" />
      </main>

      {/* Media Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="max-w-2xl max-h-[80vh] relative">
            <img
              src={selectedMedia.media_url}
              alt={selectedMedia.work_name || 'Activity photo'}
              className="max-w-full max-h-[80vh] rounded-xl"
            />
            {selectedMedia.work_name && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 rounded-b-xl">
                <p className="font-medium">{selectedMedia.work_name}</p>
                <p className="text-sm text-gray-300">{formatDate(selectedMedia.taken_at)}</p>
              </div>
            )}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-2 right-2 w-10 h-10 bg-black/50 rounded-full text-white text-xl hover:bg-black/70"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
