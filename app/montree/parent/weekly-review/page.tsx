// /montree/parent/weekly-review/page.tsx
// Parent-friendly weekly report view
// Shows warm, supportive AI-generated summary for parents
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
  classroom_name?: string;
}

interface WeeklyAnalysis {
  id: string;
  week_start: string;
  week_end: string;
  parent_summary: string;
  area_distribution: Record<string, number>;
  concentration_score: number;
  recommended_works: Array<{
    work_name: string;
    area: string;
    reason: string;
    home_activity?: string;
  }>;
  active_sensitive_periods: string[];
  created_at: string;
}

interface HomeActivity {
  title: string;
  description: string;
  materials?: string;
  area: string;
  icon: string;
}

export default function ParentWeeklyReviewPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ParentWeeklyReviewContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-3xl">📊</span>
        </div>
        <p className="text-gray-600 font-medium">Loading report...</p>
      </div>
    </div>
  );
}

function ParentWeeklyReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [child, setChild] = useState<Child | null>(null);
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null);
  const [homeActivities, setHomeActivities] = useState<HomeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Week navigation
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const weekParam = searchParams.get('week');
      const testChild = searchParams.get('test');
      
      // Build URL
      let url = '/api/montree/parent/weekly-review';
      const params = new URLSearchParams();
      if (weekParam) params.set('week', weekParam);
      if (testChild) params.set('test', testChild);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) {
        if (data.error === 'Not authenticated') {
          router.push('/montree/parent');
          return;
        }
        setError(data.error || 'Failed to load report');
        return;
      }

      setChild(data.child);
      setAnalysis(data.analysis);
      setHomeActivities(data.homeActivities || []);
      setAvailableWeeks(data.availableWeeks || []);
      setSelectedWeek(data.analysis?.week_start || '');
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToWeek = (week: string) => {
    const testChild = searchParams.get('test');
    const params = new URLSearchParams();
    params.set('week', week);
    if (testChild) params.set('test', testChild);
    router.push(`/montree/parent/weekly-review?${params.toString()}`);
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const getAreaIcon = (area: string): string => {
    const icons: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      math: '🔢',
      language: '📚',
      cultural: '🌍',
    };
    return icons[area?.toLowerCase()] || '📋';
  };

  const getAreaName = (area: string): string => {
    const names: Record<string, string> = {
      practical_life: 'Practical Life',
      sensorial: 'Sensorial',
      mathematics: 'Mathematics',
      math: 'Math',
      language: 'Language',
      cultural: 'Cultural',
    };
    return names[area?.toLowerCase()] || area || 'Other';
  };

  const getSensitivePeriodInfo = (period: string): { name: string; icon: string; description: string } => {
    const info: Record<string, { name: string; icon: string; description: string }> = {
      order: { 
        name: 'Order', 
        icon: '📦', 
        description: 'Your child loves routines and putting things in their place!' 
      },
      language: { 
        name: 'Language', 
        icon: '💬', 
        description: 'This is a great time for reading together and learning new words!' 
      },
      movement: { 
        name: 'Movement', 
        icon: '🏃', 
        description: 'Your child is developing fine and gross motor skills through active work.' 
      },
      sensory: { 
        name: 'Sensory', 
        icon: '🎨', 
        description: 'Exploring textures, colors, sounds, and smells helps build understanding.' 
      },
      small_objects: { 
        name: 'Small Objects', 
        icon: '🔍', 
        description: 'Fascination with tiny things shows growing focus and attention to detail.' 
      },
      social: { 
        name: 'Social', 
        icon: '👫', 
        description: 'Learning to work with others and make friends is blossoming!' 
      },
      writing: { 
        name: 'Writing', 
        icon: '✏️', 
        description: 'Your child is ready to express ideas through marks and letters.' 
      },
      reading: { 
        name: 'Reading', 
        icon: '📖', 
        description: 'Connecting sounds to letters opens up a whole new world!' 
      },
      math: { 
        name: 'Math', 
        icon: '🔢', 
        description: 'Numbers, patterns, and quantities are becoming meaningful.' 
      },
    };
    return info[period] || { name: period, icon: '⭐', description: 'A special time for learning!' };
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!child || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Report Yet</h2>
          <p className="text-gray-500 mb-4">
            Your child&apos;s weekly report will appear here once the teacher generates it.
          </p>
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/montree/parent/dashboard" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <span>←</span>
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">Weekly Report</h1>
              <p className="text-xs text-gray-500">{child.name}</p>
            </div>
            <div className="w-16" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Week Selector */}
        {availableWeeks.length > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const currentIndex = availableWeeks.indexOf(selectedWeek);
                if (currentIndex < availableWeeks.length - 1) {
                  navigateToWeek(availableWeeks[currentIndex + 1]);
                }
              }}
              disabled={availableWeeks.indexOf(selectedWeek) >= availableWeeks.length - 1}
              className="p-2 rounded-full bg-white shadow-sm border border-gray-200 disabled:opacity-30"
            >
              ◀
            </button>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
              <span className="font-medium text-gray-900">
                {formatWeekRange(analysis.week_start, analysis.week_end)}
              </span>
            </div>
            <button
              onClick={() => {
                const currentIndex = availableWeeks.indexOf(selectedWeek);
                if (currentIndex > 0) {
                  navigateToWeek(availableWeeks[currentIndex - 1]);
                }
              }}
              disabled={availableWeeks.indexOf(selectedWeek) <= 0}
              className="p-2 rounded-full bg-white shadow-sm border border-gray-200 disabled:opacity-30"
            >
              ▶
            </button>
          </div>
        )}

        {/* Hero Card - Child Photo + Greeting */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">👧</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{child.name}&apos;s Week</h2>
              <p className="text-emerald-100">{child.classroom_name || 'My Classroom'}</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-lg leading-relaxed">
              {analysis.parent_summary || `${child.name} had a wonderful week of exploration and learning!`}
            </p>
          </div>
        </div>

        {/* Concentration Score */}
        {analysis.concentration_score && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🎯</span>
              <h3 className="font-bold text-gray-900">Focus & Concentration</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    analysis.concentration_score >= 80 ? 'bg-emerald-500' :
                    analysis.concentration_score >= 60 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${analysis.concentration_score}%` }}
                />
              </div>
              <span className="font-bold text-gray-900 min-w-[3rem] text-right">
                {analysis.concentration_score}%
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {analysis.concentration_score >= 80 
                ? '🌟 Excellent focus this week! Your child showed deep engagement.'
                : analysis.concentration_score >= 60
                ? '👍 Good concentration. Continuing to build those focus skills!'
                : '🌱 Building focus takes time. Every week brings growth!'}
            </p>
          </div>
        )}

        {/* Active Sensitive Periods */}
        {analysis.active_sensitive_periods && analysis.active_sensitive_periods.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✨</span>
              <div>
                <h3 className="font-bold text-gray-900">Special Learning Windows</h3>
                <p className="text-sm text-gray-500">What your child is naturally drawn to</p>
              </div>
            </div>
            <div className="space-y-3">
              {analysis.active_sensitive_periods.map((period) => {
                const info = getSensitivePeriodInfo(period);
                return (
                  <div key={period} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{info.name}</p>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Area Balance */}
        {analysis.area_distribution && Object.keys(analysis.area_distribution).length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="font-bold text-gray-900">Learning Areas This Week</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(analysis.area_distribution)
                .sort(([,a], [,b]) => b - a)
                .map(([area, count]) => (
                <div key={area} className="flex items-center gap-3">
                  <span className="text-xl w-8">{getAreaIcon(area)}</span>
                  <span className="flex-1 text-gray-700">{getAreaName(area)}</span>
                  <span className="text-sm font-medium text-gray-500">
                    {count} {count === 1 ? 'work' : 'works'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Home Activities */}
        {homeActivities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏠</span>
              <div>
                <h3 className="font-bold text-gray-900">Activities to Try at Home</h3>
                <p className="text-sm text-gray-500">Simple ways to extend the learning</p>
              </div>
            </div>
            <div className="space-y-4">
              {homeActivities.map((activity, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      {activity.materials && (
                        <p className="text-xs text-blue-600 mt-2">
                          <strong>You&apos;ll need:</strong> {activity.materials}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Works */}
        {analysis.recommended_works && analysis.recommended_works.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-bold text-gray-900">Coming Up Next</h3>
                <p className="text-sm text-gray-500">What we&apos;re planning for {child.name}</p>
              </div>
            </div>
            <div className="space-y-3">
              {analysis.recommended_works.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-xl">{getAreaIcon(rec.area)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{rec.work_name}</p>
                    <p className="text-sm text-gray-600">{rec.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">
            Report generated {new Date(analysis.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
          <Link 
            href="/montree/parent/dashboard" 
            className="inline-block mt-3 text-emerald-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

      </main>
    </div>
  );
}
