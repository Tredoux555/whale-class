// /montree/dashboard/student/[id]/page.tsx
// Student work capture page
// Quick: Select work → Take photo → Save → Done
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

interface Work {
  id: string;
  name: string;
  area: string;
  photo_url?: string;
  created_at: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', emoji: '🧹', color: 'bg-orange-600' },
  { id: 'sensorial', name: 'Sensorial', emoji: '👁️', color: 'bg-pink-600' },
  { id: 'language', name: 'Language', emoji: '📖', color: 'bg-blue-600' },
  { id: 'math', name: 'Math', emoji: '🔢', color: 'bg-green-600' },
  { id: 'science', name: 'Science', emoji: '🌿', color: 'bg-purple-600' },
];

export default function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [recentWorks, setRecentWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWork, setShowAddWork] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/montree/students/${id}`)
      .then(r => r.json())
      .then(data => {
        setStudent(data.student);
        setRecentWorks(data.recentWorks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">Student not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-4 border-b border-gray-800">
        <Link href="/montree/dashboard" className="text-gray-400 hover:text-white">
          ←
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
            <span className="text-white font-bold">{student.name.charAt(0)}</span>
          </div>
          <h1 className="text-xl font-bold text-white">{student.name}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Quick Add Work Button */}
        {!showAddWork && (
          <button
            onClick={() => setShowAddWork(true)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl mb-6 transition-colors active:scale-98"
          >
            + Record Work
          </button>
        )}

        {/* Add Work Flow */}
        {showAddWork && (
          <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">What did {student.name} work on?</h3>
              <button 
                onClick={() => { setShowAddWork(false); setSelectedArea(null); }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Area Selection */}
            {!selectedArea && (
              <div className="grid grid-cols-2 gap-2">
                {AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`${area.color} p-4 rounded-xl text-left transition-all active:scale-95`}
                  >
                    <div className="text-2xl mb-1">{area.emoji}</div>
                    <div className="text-white font-medium">{area.name}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Work Selection (after area is chosen) */}
            {selectedArea && (
              <div>
                <button
                  onClick={() => setSelectedArea(null)}
                  className="text-emerald-400 text-sm mb-3"
                >
                  ← Back to areas
                </button>
                <Link
                  href={`/montree/dashboard/student/${id}/add-work?area=${selectedArea}`}
                  className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-center rounded-xl"
                >
                  Select Work & Add Photo →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Recent Works */}
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3">This Week</h3>
          {recentWorks.length > 0 ? (
            <div className="space-y-2">
              {recentWorks.map(work => (
                <div key={work.id} className="bg-gray-900 rounded-xl p-3 flex items-center gap-3">
                  {work.photo_url ? (
                    <img src={work.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600">
                      📷
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{work.name}</div>
                    <div className="text-gray-500 text-xs">{work.area}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No work recorded this week yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
