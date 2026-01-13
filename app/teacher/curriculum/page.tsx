'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
  video_url?: string;
  video_channel?: string;
  video_search_term?: string;
}

function getVideoSearchUrl(work: Work): string {
  const searchTerm = work.video_search_term || `Montessori ${work.name} presentation`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500' },
  { id: 'math', name: 'Math', icon: '🔢', gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500' },
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
      toast.error('Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const filteredCurriculum = curriculum.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentArea = AREAS.find(a => a.id === selectedArea);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentArea?.gradient || 'from-blue-500 to-indigo-500'} text-white`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/teacher/dashboard" 
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <span>📋</span>
                  <span>Curriculum Overview</span>
                </h1>
                <p className="text-white/80 text-sm mt-1">Tap any work to see details and videos</p>
              </div>
            </div>
            <div className="hidden sm:flex gap-3">
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
                <div className="text-lg font-bold">342</div>
                <div className="text-xs text-white/80">Works</div>
              </div>
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
                <div className="text-lg font-bold">5</div>
                <div className="text-xs text-white/80">Areas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Area Tabs */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-3 overflow-x-auto scrollbar-hide">
            {AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                  selectedArea === area.id
                    ? `bg-gradient-to-r ${area.gradient} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{area.icon}</span>
                <span className="text-sm">{area.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search works..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
              <span className="text-3xl animate-bounce">{currentArea?.icon}</span>
            </div>
            <p className="text-gray-600">Loading curriculum...</p>
          </div>
        ) : filteredCurriculum.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-gray-600">
              {searchTerm ? `No works matching "${searchTerm}"` : 'No works found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCurriculum.map((work, index) => (
              <button
                key={work.id}
                onClick={() => setSelectedWork(work)}
                className="w-full bg-white rounded-xl border-2 border-gray-100 p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${currentArea?.bg} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {work.name}
                    </h3>
                    {work.chinese_name && (
                      <p className="text-sm text-gray-500 truncate">{work.chinese_name}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentArea?.icon}</span>
            <span className="font-medium text-gray-900">{currentArea?.name}</span>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-white text-sm font-bold ${currentArea?.bg}`}>
            {filteredCurriculum.length} works
          </div>
        </div>
      </div>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${currentArea?.gradient || 'from-blue-500 to-indigo-500'} text-white p-6 rounded-t-2xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedWork.name}</h2>
                  {selectedWork.chinese_name && (
                    <p className="text-white/80 mt-1">{selectedWork.chinese_name}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedWork(null)}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedWork.age_range && (
                <span className="inline-block mt-3 text-sm bg-white/20 px-3 py-1 rounded-full">
                  👶 Age: {selectedWork.age_range}
                </span>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Video Search Link */}
              <a
                href={getVideoSearchUrl(selectedWork)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl hover:border-red-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                  ▶
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-700">Find Video on YouTube</p>
                  <p className="text-sm text-red-600 truncate">
                    {selectedWork.video_search_term || `Montessori ${selectedWork.name}`}
                  </p>
                </div>
                <svg className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* Materials */}
              {selectedWork.materials && selectedWork.materials.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <span>🧰</span> Materials
                  </h3>
                  <ul className="space-y-2">
                    {selectedWork.materials.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-amber-900">
                        <span className="text-amber-500">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct Aims */}
              {selectedWork.direct_aims && selectedWork.direct_aims.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span>🎯</span> Direct Aims
                  </h3>
                  <ul className="space-y-2">
                    {selectedWork.direct_aims.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-blue-900">
                        <span className="text-blue-500">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Indirect Aims */}
              {selectedWork.indirect_aims && selectedWork.indirect_aims.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <span>🌱</span> Indirect Aims
                  </h3>
                  <ul className="space-y-2">
                    {selectedWork.indirect_aims.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-green-900">
                        <span className="text-green-500">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Control of Error */}
              {selectedWork.control_of_error && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                    <span>✓</span> Control of Error
                  </h3>
                  <p className="text-purple-900">{selectedWork.control_of_error}</p>
                </div>
              )}

              {/* Empty State */}
              {!selectedWork.materials?.length && 
               !selectedWork.direct_aims?.length && 
               !selectedWork.indirect_aims?.length && 
               !selectedWork.control_of_error && (
                <div className="text-center py-6 text-gray-400">
                  <span className="text-4xl mb-2 block">📝</span>
                  <p className="text-sm">Additional details can be added by admin.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4">
              <button
                onClick={() => setSelectedWork(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
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
