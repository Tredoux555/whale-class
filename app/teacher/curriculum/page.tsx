'use client';

import { useState, useEffect } from 'react';

interface Work {
  id: string;
  name: string;
  area: string;
  category: string;
  subcategory: string | null;
  sequence_order: number;
  age_range: string | null;
  description: string | null;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500', lightColor: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500', lightColor: 'bg-purple-50' },
  { id: 'math', name: 'Mathematics', icon: '🔢', color: 'bg-blue-500', lightColor: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500', lightColor: 'bg-green-50' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500', lightColor: 'bg-orange-50' },
];

export default function TeacherCurriculumPage() {
  const [selectedArea, setSelectedArea] = useState<string>('practical_life');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorks();
  }, [selectedArea]);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/curriculum-works?area=${selectedArea}`);
      const data = await res.json();
      setWorks(data.works || []);
    } catch (error) {
      console.error('Failed to fetch works:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group works by category
  const worksByCategory = works
    .filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, work) => {
      const cat = work.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(work);
      return acc;
    }, {} as Record<string, Work[]>);

  const currentArea = AREAS.find(a => a.id === selectedArea);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            📚 Montessori Curriculum
          </h1>
          
          {/* Area Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
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
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search works..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading curriculum...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(worksByCategory).map(([category, categoryWorks]) => (
              <div key={category} className={`${currentArea?.lightColor} rounded-xl p-4`}>
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${currentArea?.color}`}></span>
                  {category}
                  <span className="text-sm font-normal text-gray-500">
                    ({categoryWorks.length} works)
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryWorks
                    .sort((a, b) => a.sequence_order - b.sequence_order)
                    .map((work, index) => (
                      <button
                        key={work.id}
                        onClick={() => setSelectedWork(work)}
                        className="bg-white rounded-lg p-3 text-left shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 font-mono mt-0.5">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {work.name}
                            </h3>
                            {work.subcategory && (
                              <p className="text-xs text-gray-500 truncate">
                                {work.subcategory}
                              </p>
                            )}
                            {work.age_range && (
                              <p className="text-xs text-gray-400 mt-1">
                                Ages {work.age_range}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}

            {Object.keys(worksByCategory).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? (
                  <p>No works matching "{searchTerm}"</p>
                ) : (
                  <p>No works found for this area.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWork(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${currentArea?.color} text-white p-4 rounded-t-xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-80">{selectedWork.category}</p>
                  <h2 className="text-xl font-bold mt-1">{selectedWork.name}</h2>
                </div>
                <button 
                  onClick={() => setSelectedWork(null)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {selectedWork.subcategory && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Subcategory</h3>
                  <p className="text-gray-900">{selectedWork.subcategory}</p>
                </div>
              )}
              
              {selectedWork.age_range && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Age Range</h3>
                  <p className="text-gray-900">{selectedWork.age_range} years</p>
                </div>
              )}
              
              {selectedWork.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-gray-900">{selectedWork.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Sequence Order</h3>
                <p className="text-gray-900">#{selectedWork.sequence_order} in progression</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
