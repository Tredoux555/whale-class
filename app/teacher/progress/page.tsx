'use client';

import { useState, useEffect } from 'react';
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
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500' },
  { id: 'math', name: 'Mathematics', icon: '🔢', color: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500' },
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
const STATUS_COLORS = [
  'bg-gray-100 text-gray-500 border-gray-200',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-green-100 text-green-700 border-green-300',
];

export default function TeacherProgressPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('practical_life');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch children on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch works when child or area changes
  useEffect(() => {
    if (selectedChild) {
      fetchWorks();
    }
  }, [selectedChild, selectedArea]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/teacher/classroom');
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
      const res = await fetch(
        `/api/teacher/progress?childId=${selectedChild.id}&area=${selectedArea}`
      );
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
        body: JSON.stringify({
          childId: selectedChild.id,
          workId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        // Update local state
        setWorks(prev =>
          prev.map(w =>
            w.id === workId ? { ...w, status: newStatus } : w
          )
        );
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setUpdating(null);
    }
  };

  const cycleStatus = (work: Work) => {
    const newStatus = (work.status + 1) % 4;
    updateProgress(work.id, newStatus);
  };

  // Group works by category
  const worksByCategory = works.reduce((acc, work) => {
    const cat = work.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            📊 Progress Tracking
          </h1>
          {selectedChild && (
            <button
              onClick={() => setSelectedChild(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to children
            </button>
          )}
        </div>
      </div>

      {/* Child Selection */}
      {!selectedChild ? (
        <div className="max-w-7xl mx-auto p-4">
          <p className="text-gray-600 mb-4">Select a child to track progress:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-center"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">
                  {child.photo_url ? (
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    child.name.charAt(0)
                  )}
                </div>
                <h3 className="font-medium text-gray-900">{child.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Age {child.age.toFixed(1)}</p>
                <div className="flex justify-center gap-1 mt-2">
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                    {child.progress.presented}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {child.progress.practicing}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    {child.progress.mastered}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {children.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No children in your classroom yet.</p>
              <Link href="/admin/children" className="text-emerald-600 hover:text-emerald-700 mt-2 inline-block">
                Add children →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Child Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">
                {selectedChild.photo_url ? (
                  <img
                    src={selectedChild.photo_url}
                    alt={selectedChild.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedChild.name.charAt(0)
                )}
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{selectedChild.name}</h2>
                <p className="text-sm text-gray-500">Age {selectedChild.age.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Area Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
            <div className="max-w-7xl mx-auto flex gap-1 py-2">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedArea === area.id
                      ? `${area.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {area.icon} {area.name}
                </button>
              ))}
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <div className="max-w-7xl mx-auto flex items-center gap-4 text-xs">
              <span className="text-gray-500">Tap to cycle:</span>
              {STATUS_LABELS.map((label, i) => (
                <span key={i} className={`px-2 py-1 rounded ${STATUS_COLORS[i]}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Works Grid */}
          <div className="max-w-7xl mx-auto p-4">
            {worksLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : Object.keys(worksByCategory).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No works found for this area.
              </div>
            ) : (
              Object.entries(worksByCategory).map(([category, categoryWorks]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categoryWorks.map((work) => (
                      <button
                        key={work.id}
                        onClick={() => cycleStatus(work)}
                        disabled={updating === work.id}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${STATUS_COLORS[work.status]} ${
                          updating === work.id ? 'opacity-50' : 'hover:shadow-md active:scale-95'
                        }`}
                      >
                        <div className="font-medium text-sm">{work.name}</div>
                        {work.subcategory && (
                          <div className="text-xs opacity-70 mt-1">{work.subcategory}</div>
                        )}
                        <div className="text-xs mt-2 font-medium">
                          {STATUS_LABELS[work.status]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
