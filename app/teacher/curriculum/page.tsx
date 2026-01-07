'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, X, Search, Eye, EyeOff } from 'lucide-react';

interface Work {
  id: string;
  name: string;
  chinese_name: string | null;
  area_id: string;
  sequence: number;
  is_active: boolean;
  materials_on_shelf: boolean;
  custom_notes: string | null;
  is_custom: boolean;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500' },
];

// Beijing International School ID
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

export default function TeacherCurriculumPage() {
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [selectedArea, setSelectedArea] = useState('practical_life');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchCurriculum();
  }, [selectedArea, showInactive]);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const activeParam = showInactive ? 'false' : 'true';
      const res = await fetch(
        `/api/school/${SCHOOL_ID}/curriculum?area=${selectedArea}&active=${activeParam}`
      );
      const data = await res.json();
      setCurriculum(data.curriculum || []);
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWork = async (workId: string, updates: Partial<Work>) => {
    setUpdating(workId);
    try {
      const res = await fetch(`/api/school/${SCHOOL_ID}/curriculum`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, updates })
      });
      
      if (res.ok) {
        setCurriculum(prev => 
          prev.map(w => w.id === workId ? { ...w, ...updates } : w)
        );
      }
    } catch (error) {
      console.error('Failed to update work:', error);
    } finally {
      setUpdating(null);
    }
  };

  const toggleMaterialsOnShelf = (work: Work) => {
    updateWork(work.id, { materials_on_shelf: !work.materials_on_shelf });
  };

  const toggleActive = (work: Work) => {
    updateWork(work.id, { is_active: !work.is_active });
  };

  const filteredCurriculum = curriculum.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.chinese_name && w.chinese_name.includes(searchTerm))
  );

  const currentArea = AREAS.find(a => a.id === selectedArea);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/teacher" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">My Curriculum</h1>
              <p className="text-sm text-gray-500">Toggle materials on your shelf</p>
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

      {/* Search & Filters */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search works..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              showInactive ? 'bg-gray-100' : ''
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'All' : 'Active'}
          </button>
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredCurriculum.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No works found</div>
        ) : (
          <div className="space-y-2">
            {filteredCurriculum.map((work, index) => (
              <div
                key={work.id}
                className={`bg-white rounded-lg border p-4 ${!work.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{index + 1}.</span>
                      <h3 className="font-medium truncate">{work.name}</h3>
                      {work.is_custom && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    {work.chinese_name && (
                      <p className="text-sm text-gray-500 mt-1">{work.chinese_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMaterialsOnShelf(work)}
                      disabled={updating === work.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        work.materials_on_shelf
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {work.materials_on_shelf ? (
                        <><Check className="w-4 h-4" /> On Shelf</>
                      ) : (
                        <><X className="w-4 h-4" /> Not Available</>
                      )}
                    </button>

                    <button
                      onClick={() => toggleActive(work)}
                      disabled={updating === work.id}
                      className={`p-2 rounded-lg ${
                        work.is_active ? 'text-gray-400 hover:bg-gray-100' : 'text-red-500 bg-red-50'
                      }`}
                    >
                      {work.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-3">
        <div className="max-w-4xl mx-auto px-4 flex justify-between text-sm">
          <span className="text-gray-500">{currentArea?.icon} {currentArea?.name}</span>
          <span className="font-medium">
            {curriculum.filter(w => w.materials_on_shelf).length} / {curriculum.length} on shelf
          </span>
        </div>
      </div>
    </div>
  );
}
