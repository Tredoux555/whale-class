'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, X } from 'lucide-react';

interface Work {
  id: string;
  name: string;
  chinese_name?: string;
  area_id: string;
  sequence: number;
  age_range?: string;
  materials?: string[];
  direct_aims?: string[];
  indirect_aims?: string[];
  control_of_error?: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500' },
];

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

export default function TeacherCurriculumPage() {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [selectedArea, setSelectedArea] = useState('practical_life');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
      return;
    }
  }, [router]);

  useEffect(() => {
    fetchCurriculum();
  }, [selectedArea]);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/${SCHOOL_ID}/curriculum?area=${selectedArea}`);
      const data = await res.json();
      setCurriculum(data.curriculum || []);
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCurriculum = curriculum.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentArea = AREAS.find(a => a.id === selectedArea);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/teacher/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">📋 Curriculum Overview</h1>
              <p className="text-sm text-gray-500">Tap any work to see details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Area Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 p-2 max-w-4xl mx-auto">
          {AREAS.map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                selectedArea === area.id
                  ? `${area.color} text-white`
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span>{area.icon}</span>
              <span className="text-sm font-medium">{area.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search works..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredCurriculum.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? `No works matching "${searchTerm}"` : 'No works found'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCurriculum.map((work, index) => (
              <button
                key={work.id}
                onClick={() => setSelectedWork(work)}
                className="w-full bg-white rounded-lg border p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-8">{index + 1}.</span>
                  <div className="flex-1">
                    <h3 className="font-medium">{work.name}</h3>
                    {work.chinese_name && (
                      <p className="text-sm text-gray-500">{work.chinese_name}</p>
                    )}
                  </div>
                  <span className="text-gray-300">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-3">
        <div className="max-w-4xl mx-auto px-4 flex justify-between text-sm">
          <span className="text-gray-500">{currentArea?.icon} {currentArea?.name}</span>
          <span className="font-medium">{filteredCurriculum.length} works</span>
        </div>
      </div>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`${currentArea?.color || 'bg-blue-500'} text-white p-4 rounded-t-2xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedWork.name}</h2>
                  {selectedWork.chinese_name && (
                    <p className="text-white/80">{selectedWork.chinese_name}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedWork(null)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {selectedWork.age_range && (
                <p className="mt-2 text-sm bg-white/20 inline-block px-2 py-1 rounded">
                  Age: {selectedWork.age_range}
                </p>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Materials */}
              {selectedWork.materials && selectedWork.materials.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🧰 Materials</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {selectedWork.materials.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct Aims */}
              {selectedWork.direct_aims && selectedWork.direct_aims.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🎯 Direct Aims</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {selectedWork.direct_aims.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Indirect Aims */}
              {selectedWork.indirect_aims && selectedWork.indirect_aims.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">🌱 Indirect Aims</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {selectedWork.indirect_aims.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Control of Error */}
              {selectedWork.control_of_error && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">✓ Control of Error</h3>
                  <p className="text-gray-600">{selectedWork.control_of_error}</p>
                </div>
              )}

              {/* Empty State */}
              {!selectedWork.materials?.length && 
               !selectedWork.direct_aims?.length && 
               !selectedWork.indirect_aims?.length && 
               !selectedWork.control_of_error && (
                <div className="text-center py-8 text-gray-400">
                  <p>No additional details available for this work.</p>
                  <p className="text-sm mt-1">Details can be added by admin.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4">
              <button
                onClick={() => setSelectedWork(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
