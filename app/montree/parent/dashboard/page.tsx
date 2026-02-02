'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

interface Child {
  id: string;
  name: string;
  nickname: string | null;
  date_of_birth: string;
  photo_url: string | null;
}

interface WeeklyReport {
  id: string;
  week_number: number;
  year: number;
  parent_summary: string | null;
  created_at: string;
}

interface Stats {
  works_this_week: number;
  total_mastered: number;
  total_works: number;
}

interface Activity {
  work_name: string;
  area: string;
  status: string;
  updated_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

interface Photo {
  id: string;
  thumbnail_url: string | null;
  caption: string | null;
  captured_at: string;
}

interface Milestone {
  id: string;
  title: string;
  area: string;
  date: string;
  icon: string;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Check session and load data
  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      if (session.expires < Date.now()) {
        localStorage.removeItem('montree_parent_session');
        router.push('/montree/parent/login');
        return;
      }
      setParentName(session.name);
      loadChildren(session.parentId);
    } catch {
      router.push('/montree/parent/login');
    }
  }, [router]);

  const loadChildren = async (parentId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/children?parentId=${parentId}`);
      const data = await res.json();
      if (data.children) {
        setChildren(data.children);
        if (data.children.length === 1) {
          const child = data.children[0];
          setSelectedChild(child);
          localStorage.setItem('montree_selected_child', JSON.stringify({ id: child.id, name: child.nickname || child.name }));
          loadReports(child.id);
          loadStats(child.id);
          loadAnnouncements(child.id);
          loadPhotos(child.id);
          loadMilestones(child.id);
        }
      }
    } catch (err) {
      console.error('Failed to load children:', err);
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (childId: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/montree/parent/reports?childId=${childId}`);
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const loadStats = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/stats?child_id=${childId}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recent_activity || []);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadAnnouncements = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/announcements?child_id=${childId}&limit=3`);
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const loadPhotos = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/photos?child_id=${childId}&limit=4`);
      const data = await res.json();
      if (data.success) {
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  };

  const loadMilestones = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/milestones?child_id=${childId}&limit=5`);
      const data = await res.json();
      if (data.success) {
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
    }
  };

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    // Save to localStorage for other pages
    localStorage.setItem('montree_selected_child', JSON.stringify({ id: child.id, name: child.nickname || child.name }));
    // Load all data
    loadReports(child.id);
    loadStats(child.id);
    loadAnnouncements(child.id);
    loadPhotos(child.id);
    loadMilestones(child.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_parent_session');
    router.push('/montree/parent/login');
  };

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years < 1) return `${months}mo`;
    if (months < 0) return `${years - 1}y ${12 + months}mo`;
    return `${years}y ${months}mo`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌱</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="top-center" />
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌳</span>
            <div>
              <h1 className="font-bold text-gray-800">Montree</h1>
              <p className="text-sm text-gray-500">Welcome, {parentName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Your Children</h2>
            <div className="flex gap-3 flex-wrap">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleSelectChild(child)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                    selectedChild?.id === child.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
                    {child.photo_url ? (
                      <img src={child.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      child.name.charAt(0)
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-800">{child.nickname || child.name}</div>
                    <div className="text-xs text-gray-500">{getAge(child.date_of_birth)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Child View */}
        {selectedChild ? (
          <div className="space-y-6">
            {/* Child Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
                  {selectedChild.photo_url ? (
                    <img src={selectedChild.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    selectedChild.name.charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedChild.nickname || selectedChild.name}
                  </h2>
                  <p className="text-gray-500">{getAge(selectedChild.date_of_birth)} old</p>
                </div>
              </div>
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 shadow-sm border border-amber-200">
                <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span>📢</span> Announcements
                </h3>
                <div className="space-y-2">
                  {announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-3 rounded-xl">
                      <p className="font-medium text-gray-800">{ann.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Reports */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📊</span> Weekly Reports
              </h3>

              {loadingReports ? (
                <div className="text-center py-8 text-gray-500">
                  Loading reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-gray-500">No reports yet this term</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Reports are generated weekly by teachers
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <Link
                      key={report.id}
                      href={`/montree/parent/report/${report.id}`}
                      className="block p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">
                            Week {report.week_number}, {report.year}
                          </div>
                          {report.parent_summary && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {report.parent_summary}
                            </p>
                          )}
                        </div>
                        <span className="text-emerald-500">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-3xl mb-1">🎯</div>
                <div className="text-2xl font-bold text-emerald-600">{stats?.works_this_week ?? '--'}</div>
                <div className="text-xs text-gray-500">Works This Week</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-3xl mb-1">⭐</div>
                <div className="text-2xl font-bold text-amber-500">{stats?.total_mastered ?? '--'}</div>
                <div className="text-xs text-gray-500">Mastered Skills</div>
              </div>
            </div>

            {/* Photo Gallery Preview */}
            {photos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span>📸</span> Photos
                  </h3>
                  <Link
                    href="/montree/parent/photos"
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {photo.thumbnail_url ? (
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xl">📷</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones Preview */}
            {milestones.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span>⭐</span> Recent Milestones
                  </h3>
                  <Link
                    href="/montree/parent/milestones"
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    View all →
                  </Link>
                </div>
                <div className="space-y-2">
                  {milestones.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                      <span className="text-lg">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                        <p className="text-xs text-gray-500">{new Date(m.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Games */}
            <Link
              href="/montree/dashboard/games"
              className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">🎮</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">Practice Games</h3>
                  <p className="text-white/80 text-sm">Fun activities to practice at home</p>
                </div>
                <span className="text-white text-xl">→</span>
              </div>
            </Link>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>🕐</span> Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-xl">
                        {activity.area === 'practical_life' ? '🧹' :
                         activity.area === 'sensorial' ? '👁️' :
                         activity.area === 'mathematics' ? '🔢' :
                         activity.area === 'language' ? '📚' : '🌍'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{activity.work_name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'completed' || activity.status === 'mastered'
                          ? 'bg-emerald-100 text-emerald-700'
                          : activity.status === 'practicing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {activity.status === 'completed' || activity.status === 'mastered' ? '✓ Mastered' : 
                         activity.status === 'practicing' ? 'Practicing' : 'Started'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No Child Selected */
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-5xl mb-4">👆</div>
            <p className="text-gray-600">Select a child above to view their progress</p>
          </div>
        )}
      </main>
    </div>
  );
}
