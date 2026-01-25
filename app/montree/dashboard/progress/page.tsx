// /montree/dashboard/progress/page.tsx
// Session 89: Progress tracking with new Montree auth
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
  progress: { presented: number; practicing: number; mastered: number };
}

interface Work {
  id: string;
  name: string;
  area: string;
  category: string;
  subcategory: string | null;
  status: number;
}

interface TeacherSession {
  id: string;
  name: string;
  classroom_id: string;
  classroom_name: string;
  classroom_icon: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500' },
];

const STATUS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
const STATUS_COLORS = [
  'bg-gray-100 text-gray-600 border-gray-200',
  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-green-100 text-green-700 border-green-400',
];

export default function ProgressPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedArea, setSelectedArea] = useState('practical_life');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    const stored = localStorage.getItem('montree_teacher');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      setTeacher(JSON.parse(stored));
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  // Fetch children for this classroom
  useEffect(() => {
    if (!teacher?.classroom_id) return;
    
    fetch(`/api/montree/children?classroom_id=${teacher.classroom_id}`)
      .then(r => r.json())
      .then(data => {
        setChildren(data.children || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [teacher?.classroom_id]);

  // Fetch works when child/area selected
  useEffect(() => {
    if (!selectedChild) return;
    setWorksLoading(true);
    
    fetch(`/api/montree/progress?child_id=${selectedChild.id}&area=${selectedArea}`)
      .then(r => r.json())
      .then(data => {
        setWorks(data.works || []);
        setWorksLoading(false);
      })
      .catch(() => setWorksLoading(false));
  }, [selectedChild, selectedArea]);

  const cycleStatus = async (work: Work) => {
    if (!selectedChild || updating) return;
    
    const newStatus = (work.status + 1) % 4;
    setUpdating(work.id);
    
    try {
      const res = await fetch('/api/montree/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: selectedChild.id,
          work_id: work.id,
          status: newStatus,
        }),
      });
      
      if (res.ok) {
        setWorks(prev => prev.map(w => w.id === work.id ? { ...w, status: newStatus } : w));
        toast.success(`${work.name} → ${STATUS[newStatus]}`);
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setUpdating(null);
    }
  };

  const worksByCategory = works.reduce((acc, work) => {
    const cat = work.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  const currentArea = AREAS.find(a => a.id === selectedArea);

  if (loading || !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <span className="text-4xl animate-pulse">📊</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${currentArea?.color || 'from-emerald-500 to-teal-500'} text-white px-4 py-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedChild ? (
              <button
                onClick={() => setSelectedChild(null)}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
              >
                ←
              </button>
            ) : (
              <Link href="/montree/dashboard" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                ←
              </Link>
            )}
            <div>
              <h1 className="text-lg font-bold">
                {selectedChild ? selectedChild.name : 'Progress Tracking'}
              </h1>
              <p className="text-white/70 text-sm">
                {selectedChild ? currentArea?.name : `${children.length} students`}
              </p>
            </div>
          </div>
          {selectedChild && (
            <div className="flex gap-2 text-xs">
              <span className="bg-white/20 px-2 py-1 rounded">🟡 {selectedChild.progress?.presented || 0}</span>
              <span className="bg-white/20 px-2 py-1 rounded">🔵 {selectedChild.progress?.practicing || 0}</span>
              <span className="bg-white/20 px-2 py-1 rounded">🟢 {selectedChild.progress?.mastered || 0}</span>
            </div>
          )}
        </div>
      </header>

      {!selectedChild ? (
        /* Child Selection */
        <main className="max-w-4xl mx-auto p-4">
          <p className="text-gray-600 mb-4">Select a student:</p>
          
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <span className="text-5xl mb-4 block">👶</span>
              <p className="text-gray-500">No students in this classroom yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {children.map((child, i) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl">
                    {child.photo_url ? (
                      <img src={child.photo_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      child.name.charAt(0)
                    )}
                  </div>
                  <p className="font-medium text-gray-800 text-sm truncate">{child.name}</p>
                  <div className="flex justify-center gap-1 mt-2">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 rounded">{child.progress?.presented || 0}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">{child.progress?.practicing || 0}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded">{child.progress?.mastered || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      ) : (
        <>
          {/* Area Tabs */}
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
              {AREAS.map(area => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedArea === area.id
                      ? `bg-gradient-to-r ${area.color} text-white shadow`
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {area.icon} {area.name}
                </button>
              ))}
            </div>
          </div>

          {/* Works Grid */}
          <main className="max-w-4xl mx-auto p-4">
            {worksLoading ? (
              <div className="text-center py-16">
                <span className="text-4xl animate-bounce block">{currentArea?.icon}</span>
                <p className="text-gray-500 mt-2">Loading...</p>
              </div>
            ) : Object.keys(worksByCategory).length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <span className="text-4xl mb-4 block">📋</span>
                <p className="text-gray-500">No works found for this area</p>
              </div>
            ) : (
              Object.entries(worksByCategory).map(([category, catWorks]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {catWorks.map(work => (
                      <button
                        key={work.id}
                        onClick={() => cycleStatus(work)}
                        disabled={updating === work.id}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${STATUS_COLORS[work.status]} ${
                          updating === work.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{work.name}</div>
                        {work.subcategory && (
                          <div className="text-xs opacity-70 mt-1 truncate">{work.subcategory}</div>
                        )}
                        <div className="text-xs mt-2 font-bold">{STATUS[work.status]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </main>
        </>
      )}
    </div>
  );
}
