'use client';

import { useState, useEffect, useRef } from 'react';
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
}

interface Work {
  id: string;
  name: string;
  area: string;
  category: string;
  subcategory: string | null;
  sequence_order: number;
  status: number;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  { id: 'math', name: 'Mathematics', icon: '🔢', gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500' },
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
const STATUS_COLORS = [
  'bg-gray-100 text-gray-600 border-gray-200',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-green-100 text-green-700 border-green-400',
];
const STATUS_GRADIENTS = [
  'from-gray-50 to-gray-100',
  'from-yellow-50 to-amber-100',
  'from-blue-50 to-indigo-100',
  'from-green-50 to-emerald-100',
];

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

export default function TeacherProgressPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('practical_life');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedWorkIndex, setSelectedWorkIndex] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const flatWorks = Object.values(
    works.reduce((acc, work) => {
      const cat = work.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(work);
      return acc;
    }, {} as Record<string, Work[]>)
  ).flat();

  const selectedWork = selectedWorkIndex !== null ? flatWorks[selectedWorkIndex] : null;
  const currentArea = AREAS.find(a => a.id === selectedArea);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      window.location.href = '/teacher';
      return;
    }
    setTeacherName(name);
    fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
    fetchChildren(name);
  }, []);

  useEffect(() => {
    if (selectedChild && teacherName) fetchWorks();
  }, [selectedChild, selectedArea, teacherName]);

  const fetchChildren = async (name?: string) => {
    try {
      const url = name ? `/api/teacher/classroom?teacher=${encodeURIComponent(name)}` : '/api/teacher/classroom';
      const res = await fetch(url);
      const data = await res.json();
      setChildren(data.children || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorks = async () => {
    if (!selectedChild) return;
    setWorksLoading(true);
    try {
      const teacherParam = teacherName ? `&teacher=${encodeURIComponent(teacherName)}` : '';
      const res = await fetch(`/api/teacher/progress?childId=${selectedChild.id}&area=${selectedArea}${teacherParam}`);
      const data = await res.json();
      setWorks(data.works || []);
    } catch (error) {
      console.error('Failed to fetch works:', error);
    } finally {
      setWorksLoading(false);
    }
  };

  const updateProgress = async (workId: string, newStatus: number) => {
    if (!selectedChild || updating) return;
    setUpdating(workId);
    try {
      const res = await fetch('/api/teacher/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: selectedChild.id, workId, status: newStatus }),
      });
      if (res.ok) {
        setWorks(prev => prev.map(w => w.id === workId ? { ...w, status: newStatus } : w));
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setUpdating(null);
    }
  };

  const cycleStatus = (work: Work) => updateProgress(work.id, (work.status + 1) % 4);
  const openWorkDetail = (i: number) => { setSelectedWorkIndex(i); setSwipeDirection(null); };
  const closeWorkDetail = () => { setSelectedWorkIndex(null); setSwipeDirection(null); };

  const goToNextWork = () => {
    if (selectedWorkIndex !== null && selectedWorkIndex < flatWorks.length - 1) {
      setSwipeDirection('left');
      setTimeout(() => { setSelectedWorkIndex(selectedWorkIndex + 1); setSwipeDirection(null); }, 150);
    }
  };

  const goToPrevWork = () => {
    if (selectedWorkIndex !== null && selectedWorkIndex > 0) {
      setSwipeDirection('right');
      setTimeout(() => { setSelectedWorkIndex(selectedWorkIndex - 1); setSwipeDirection(null); }, 150);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) diff > 0 ? goToNextWork() : goToPrevWork();
  };

  const worksByCategory = works.reduce((acc, work) => {
    const cat = work.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  const getAvatarGradient = (i: number) => AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">📊</span>
          </div>
          <p className="text-gray-600 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${selectedChild ? (currentArea?.gradient || 'from-emerald-600 to-teal-600') : 'from-emerald-600 to-teal-600'} text-white`}>
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedChild ? (
                <button
                  onClick={() => setSelectedChild(null)}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-3xl">📊</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">
                  {selectedChild ? selectedChild.name : 'Progress Tracking'}
                </h1>
                <p className="text-white/80 text-sm">
                  {selectedChild ? `Age ${selectedChild.age?.toFixed(1) || '?'}` : `${children.length} students`}
                </p>
              </div>
            </div>
            {selectedChild && (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
                <span className="text-xs">🟡 {selectedChild.progress?.presented || 0}</span>
                <span className="text-xs">🔵 {selectedChild.progress?.practicing || 0}</span>
                <span className="text-xs">🟢 {selectedChild.progress?.mastered || 0}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Child Selection View */}
      {!selectedChild ? (
        <div className="max-w-6xl mx-auto p-4">
          <p className="text-gray-600 mb-4 font-medium">Select a child to track progress:</p>
          
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👶</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No students yet</h2>
              <p className="text-gray-600 mb-6">Contact your administrator to assign students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {children.map((child, index) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className={`bg-gradient-to-br ${getAvatarGradient(index)} p-4`}>
                    <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {child.photo_url ? (
                        <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        child.name.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="font-bold text-gray-900 truncate">{child.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Age {child.age?.toFixed(1) || '?'}</p>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        {child.progress?.presented || 0}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {child.progress?.practicing || 0}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {child.progress?.mastered || 0}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Area Tabs */}
          <div className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-1 py-3 overflow-x-auto">
                {AREAS.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedArea === area.id
                        ? `bg-gradient-to-r ${area.gradient} text-white shadow-lg`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{area.icon}</span>
                    <span className="hidden sm:inline">{area.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white/50 px-4 py-2 border-b">
            <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-500">
              <span>Tap work to open • Swipe to navigate</span>
              <div className="flex gap-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Presented</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Practicing</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Mastered</span>
              </div>
            </div>
          </div>

          {/* Works Grid */}
          <div className="max-w-6xl mx-auto p-4">
            {worksLoading ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg mb-3">
                  <span className="text-2xl animate-bounce">{currentArea?.icon}</span>
                </div>
                <p className="text-gray-500">Loading works...</p>
              </div>
            ) : Object.keys(worksByCategory).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <span className="text-4xl mb-3 block">📋</span>
                <p className="text-gray-500">No works found for this area.</p>
              </div>
            ) : (
              Object.entries(worksByCategory).map(([category, categoryWorks]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${currentArea?.bg}`} />
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {categoryWorks.map((work) => {
                      const globalIndex = flatWorks.findIndex(w => w.id === work.id);
                      return (
                        <button
                          key={work.id}
                          onClick={() => openWorkDetail(globalIndex)}
                          className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${STATUS_COLORS[work.status]}`}
                        >
                          <div className="font-medium text-sm leading-tight">{work.name}</div>
                          {work.subcategory && (
                            <div className="text-xs opacity-70 mt-1 truncate">{work.subcategory}</div>
                          )}
                          <div className="text-xs mt-2 font-bold">{STATUS_LABELS[work.status]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeWorkDetail}>
          <div 
            className={`bg-gradient-to-b ${STATUS_GRADIENTS[selectedWork.status]} rounded-3xl max-w-md w-full shadow-2xl transform transition-all duration-150 ${
              swipeDirection === 'left' ? '-translate-x-full opacity-0' : 
              swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{selectedWork.category}</span>
                <button onClick={closeWorkDetail} className="w-8 h-8 bg-gray-200/50 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedWork.name}</h2>
              {selectedWork.subcategory && <p className="text-sm text-gray-600 mt-1">{selectedWork.subcategory}</p>}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold border-2 ${STATUS_COLORS[selectedWork.status]}`}>
                  {STATUS_LABELS[selectedWork.status]}
                </div>
              </div>

              <button
                onClick={() => cycleStatus(selectedWork)}
                disabled={updating === selectedWork.id}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                  updating === selectedWork.id 
                    ? 'bg-gray-200 text-gray-400' 
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm'
                }`}
              >
                {updating === selectedWork.id ? 'Updating...' : '↻ Change Status'}
              </button>

              {(selectedWork.presented_date || selectedWork.practicing_date || selectedWork.mastered_date) && (
                <div className="mt-6 space-y-2 text-sm bg-white/50 rounded-xl p-4">
                  {selectedWork.presented_date && (
                    <div className="flex justify-between">
                      <span className="text-yellow-700 font-medium">🟡 Presented:</span>
                      <span className="text-gray-600">{new Date(selectedWork.presented_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedWork.practicing_date && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">🔵 Practicing:</span>
                      <span className="text-gray-600">{new Date(selectedWork.practicing_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedWork.mastered_date && (
                    <div className="flex justify-between">
                      <span className="text-green-700 font-medium">🟢 Mastered:</span>
                      <span className="text-gray-600">{new Date(selectedWork.mastered_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between bg-white/50 rounded-xl p-2">
                <button
                  onClick={goToPrevWork}
                  disabled={selectedWorkIndex === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWorkIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500 font-medium">{selectedWorkIndex! + 1} / {flatWorks.length}</span>
                <button
                  onClick={goToNextWork}
                  disabled={selectedWorkIndex === flatWorks.length - 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWorkIndex === flatWorks.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
