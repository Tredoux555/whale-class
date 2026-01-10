'use client';

// ============================================
// UNIFIED PARENT CHILD PAGE
// Shows: School Updates + Game Recommendations + Progress
// Uses unified APIs reading from teacher database
// Created: Jan 12, 2026 - Montree Unification Project
// ============================================

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TreePine, 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  Circle,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  BarChart3,
  RefreshCw,
  Camera,
  FileText,
  Gamepad2,
  School,
  ExternalLink
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface GameRecommendation {
  game_id: string;
  game_name: string;
  game_url: string;
  game_icon: string;
  reason: string;
  relevance: number;
}

interface TodayUpdate {
  work_id: string;
  work_name: string;
  area: string;
  status: number;
  status_label: string;
  status_emoji: string;
  updated_at: string;
  updated_by: string;
  notes: string | null;
}

interface WorkProgress {
  work_id: string;
  work_name: string;
  area: string;
  status: number;
  status_label: string;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
  updated_at: string | null;
  notes: string | null;
}

interface ProgressByArea {
  total: number;
  mastered: number;
  practicing: number;
  presented: number;
}

interface ProgressSummary {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  not_started: number;
  overall_percent: number;
  by_area: Record<string, ProgressByArea>;
}

interface Child {
  id: string;
  name: string;
  birth_date: string;
  date_of_birth: string;
  color: string;
  progress_summary?: ProgressSummary;
}

// Area configuration
const AREA_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  practical_life: { label: 'Practical Life', icon: '🧹', color: 'pink' },
  sensorial: { label: 'Sensorial', icon: '👁️', color: 'purple' },
  mathematics: { label: 'Mathematics', icon: '🔢', color: 'blue' },
  math: { label: 'Mathematics', icon: '🔢', color: 'blue' },
  language: { label: 'Language', icon: '📚', color: 'green' },
  cultural: { label: 'Cultural', icon: '🌍', color: 'orange' }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChildActivitiesUnified({ 
  params 
}: { 
  params: Promise<{ familyId: string; childId: string }> 
}) {
  const { familyId, childId } = use(params);
  const router = useRouter();
  
  // State
  const [child, setChild] = useState<Child | null>(null);
  const [todayData, setTodayData] = useState<{
    message: string;
    summary: { total_updates: number };
    updates: TodayUpdate[];
    game_recommendations: GameRecommendation[];
  } | null>(null);
  const [progressData, setProgressData] = useState<{
    summary: { total: number; mastered: number; practicing: number; presented: number; not_started: number };
    works: WorkProgress[];
    game_recommendations: GameRecommendation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'curriculum'>('today');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [childId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadChild(),
        loadTodayUpdates(),
        loadProgress()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChild = async () => {
    try {
      const res = await fetch(`/api/unified/children?child_id=${childId}&include_progress=true`);
      const data = await res.json();
      if (data.children?.[0]) {
        setChild(data.children[0]);
      }
    } catch (err) {
      console.error('Error loading child:', err);
    }
  };

  const loadTodayUpdates = async () => {
    try {
      const res = await fetch(`/api/unified/today?child_id=${childId}&period=today`);
      const data = await res.json();
      setTodayData(data);
    } catch (err) {
      console.error('Error loading today updates:', err);
    }
  };

  const loadProgress = async (area?: string | null) => {
    try {
      let url = `/api/unified/progress?child_id=${childId}&include_games=true`;
      if (area) url += `&area=${area}`;
      const res = await fetch(url);
      const data = await res.json();
      setProgressData(data);
    } catch (err) {
      console.error('Error loading progress:', err);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const updateProgress = async (workId: string, status: number) => {
    try {
      await fetch('/api/unified/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_id: workId,
          status,
          updated_by: 'parent'
        })
      });
      await loadProgress(selectedArea);
      await loadTodayUpdates();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[area] || { label: area, icon: '📋', color: 'gray' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading {child?.name || 'child'}'s progress...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Child not found</p>
          <button onClick={() => router.push(`/parent/home/${familyId}`)} className="text-green-600 hover:underline">
            Return to family
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/parent/home/${familyId}`)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" 
            style={{ backgroundColor: child.color || '#4F46E5' }}
          >
            {child.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">{child.name}</h1>
            <p className="text-sm text-gray-500">{getGreeting()}!</p>
          </div>
          <button onClick={refreshData} disabled={refreshing} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}/journal`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium hover:bg-pink-200 whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            Journal
          </button>
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}/report`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Report
          </button>
          <button
            onClick={() => router.push('/games')}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 whitespace-nowrap"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            All Games
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-2 border-t pt-2">
          <TabButton active={activeTab === 'today'} onClick={() => setActiveTab('today')} icon={<Sparkles className="w-4 h-4" />} label="Today" />
          <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<BarChart3 className="w-4 h-4" />} label="Progress" />
          <TabButton active={activeTab === 'curriculum'} onClick={() => setActiveTab('curriculum')} icon={<BookOpen className="w-4 h-4" />} label="Curriculum" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* ============================================ */}
        {/* TODAY TAB - School Updates + Game Recs */}
        {/* ============================================ */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            
            {/* Today at School Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <School className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Today at School</h2>
              </div>
              
              {!todayData || todayData.updates.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-gray-600">No school updates yet today</p>
                  <p className="text-sm text-gray-400 mt-1">Updates appear when teacher marks progress</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <p className="text-sm font-medium text-blue-900">
                      {todayData.message}
                    </p>
                  </div>
                  <div className="divide-y">
                    {todayData.updates.map((update) => {
                      const areaConfig = getAreaConfig(update.area);
                      return (
                        <div key={update.work_id} className="p-4 flex items-center gap-3">
                          <span className="text-2xl">{areaConfig.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{update.work_name}</h4>
                            <p className="text-sm text-gray-500">{areaConfig.label}</p>
                          </div>
                          <StatusBadge status={update.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Game Recommendations Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Recommended Games</h2>
              </div>

              {!todayData || todayData.game_recommendations.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <p className="text-gray-600">Games will be recommended as {child.name} learns Language!</p>
                  <p className="text-sm text-gray-400 mt-1">Based on Sandpaper Letters, Sound Games, and more</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {todayData.game_recommendations.map((game) => (
                    <div 
                      key={game.game_id}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl">
                            {game.game_icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{game.game_name}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{game.reason}</p>
                          </div>
                          <button
                            onClick={() => router.push(game.game_url)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Play
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => router.push('/games')}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-purple-50 shadow-sm"
              >
                <Gamepad2 className="w-5 h-5" />
                View All Games
                <ExternalLink className="w-4 h-4" />
              </button>
            </section>

            {/* Quick Progress Stats */}
            {child.progress_summary && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard 
                    value={child.progress_summary.mastered} 
                    label="Mastered" 
                    icon="⭐" 
                    color="green" 
                  />
                  <StatCard 
                    value={child.progress_summary.practicing} 
                    label="Practicing" 
                    icon="🔄" 
                    color="yellow" 
                  />
                  <StatCard 
                    value={child.progress_summary.presented} 
                    label="Presented" 
                    icon="📖" 
                    color="blue" 
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* PROGRESS TAB */}
        {/* ============================================ */}
        {activeTab === 'progress' && progressData && (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Overall Progress</h3>
                <span className="text-2xl font-bold text-green-600">
                  {progressData.summary.total > 0 
                    ? Math.round((progressData.summary.mastered / progressData.summary.total) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" 
                  style={{ 
                    width: `${progressData.summary.total > 0 
                      ? (progressData.summary.mastered / progressData.summary.total) * 100 
                      : 0}%` 
                  }} 
                />
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-green-600">{progressData.summary.mastered}</div>
                  <div className="text-xs text-gray-500">Mastered</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-600">{progressData.summary.practicing}</div>
                  <div className="text-xs text-gray-500">Practicing</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-600">{progressData.summary.presented}</div>
                  <div className="text-xs text-gray-500">Presented</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-400">{progressData.summary.not_started}</div>
                  <div className="text-xs text-gray-500">To Go</div>
                </div>
              </div>
            </div>

            {/* By Area - from child.progress_summary */}
            {child.progress_summary?.by_area && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Progress by Area</h3>
                <div className="space-y-3">
                  {Object.entries(child.progress_summary.by_area).map(([area, stats]) => {
                    const areaConfig = getAreaConfig(area);
                    const total = stats.total || 1;
                    const masteredPercent = Math.round((stats.mastered / total) * 100);
                    
                    return (
                      <div key={area} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{areaConfig.icon}</span>
                          <span className="font-medium text-gray-900">{areaConfig.label}</span>
                          <span className="ml-auto text-sm text-gray-500">
                            {stats.mastered}/{stats.total}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all" 
                            style={{ width: `${masteredPercent}%` }} 
                          />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>⭐ {stats.mastered}</span>
                          <span>🔄 {stats.practicing}</span>
                          <span>📖 {stats.presented}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Game Recommendations in Progress Tab */}
            {progressData.game_recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recommended Practice</h3>
                <div className="grid gap-3">
                  {progressData.game_recommendations.slice(0, 3).map((game) => (
                    <button
                      key={game.game_id}
                      onClick={() => router.push(game.game_url)}
                      className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow text-left w-full"
                    >
                      <span className="text-2xl">{game.game_icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{game.game_name}</h4>
                        <p className="text-sm text-gray-500">{game.reason}</p>
                      </div>
                      <Play className="w-5 h-5 text-purple-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* CURRICULUM TAB */}
        {/* ============================================ */}
        {activeTab === 'curriculum' && progressData && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Full Curriculum</h2>
            <p className="text-gray-600 text-sm mb-6">Browse all {progressData.summary.total} activities across 5 areas</p>
            
            {/* Area Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => {
                  setSelectedArea(null);
                  loadProgress(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  !selectedArea 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                All ({progressData.summary.total})
              </button>
              {Object.entries(AREA_CONFIG).filter(([key]) => 
                key !== 'math' // Avoid duplicate for math/mathematics
              ).map(([area, config]) => (
                <button
                  key={area}
                  onClick={() => {
                    setSelectedArea(area);
                    loadProgress(area);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedArea === area 
                      ? 'bg-green-600 text-white shadow-md' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              ))}
            </div>

            {/* Works List */}
            <div className="space-y-3">
              {progressData.works.map((work) => {
                const areaConfig = getAreaConfig(work.area);
                return (
                  <div 
                    key={work.work_id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedWork(expandedWork === work.work_id ? null : work.work_id)}
                      className="w-full p-4 text-left flex items-center gap-3"
                    >
                      <span className="text-2xl">{areaConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{work.work_name}</h4>
                        <p className="text-sm text-gray-500">{areaConfig.label}</p>
                      </div>
                      <StatusBadge status={work.status} />
                      {expandedWork === work.work_id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedWork === work.work_id && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="pt-4 flex flex-wrap gap-2">
                          {work.status < 3 && (
                            <>
                              {work.status === 0 && (
                                <button
                                  onClick={() => updateProgress(work.work_id, 1)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200"
                                >
                                  <Circle className="w-4 h-4" />
                                  Mark Presented
                                </button>
                              )}
                              {work.status === 1 && (
                                <button
                                  onClick={() => updateProgress(work.work_id, 2)}
                                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-200"
                                >
                                  <Circle className="w-4 h-4" />
                                  Mark Practicing
                                </button>
                              )}
                              <button
                                onClick={() => updateProgress(work.work_id, 3)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Mark Mastered
                              </button>
                            </>
                          )}
                          {work.status === 3 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              Mastered! 🎉
                            </div>
                          )}
                        </div>
                        {work.notes && (
                          <div className="mt-3 p-3 bg-white rounded-lg text-sm text-gray-600">
                            <strong>Notes:</strong> {work.notes}
                          </div>
                        )}
                        {work.updated_at && (
                          <div className="mt-2 text-xs text-gray-400">
                            Last updated: {new Date(work.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {progressData.works.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No activities found in this area
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-green-100 text-green-700' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: number }) {
  const configs = {
    0: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started' },
    1: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Presented' },
    2: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Practicing' },
    3: { bg: 'bg-green-100', text: 'text-green-700', label: 'Mastered' }
  };
  const config = configs[status as keyof typeof configs] || configs[0];
  
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function StatCard({ 
  value, 
  label, 
  icon, 
  color 
}: { 
  value: number; 
  label: string; 
  icon: string; 
  color: 'green' | 'yellow' | 'blue';
}) {
  const colors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
