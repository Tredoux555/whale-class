'use client';

import React, { useState, useEffect } from 'react';

interface Work {
  id: string;
  name: string;
  area_id: string;
  area_name: string;
  area_color: string;
  area_icon: string;
  parent_description: string | null;
  why_it_matters: string | null;
  home_connection: string | null;
}

export default function GlossaryPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const res = await fetch('/api/whale/curriculum/glossary');
        const data = await res.json();
        if (res.ok) {
          setWorks(data.works || []);
        }
      } catch (err) {
        console.error('Failed to fetch glossary:', err);
      }
      setLoading(false);
    };

    fetchWorks();
  }, []);

  // Get unique areas
  const areas = [...new Set(works.map(w => w.area_name))].sort();
  const areaColors = works.reduce((acc, w) => {
    acc[w.area_name] = { color: w.area_color, icon: w.area_icon };
    return acc;
  }, {} as Record<string, { color: string; icon: string }>);

  // Filter works
  const filteredWorks = works.filter(w => {
    if (filterArea && w.area_name !== filterArea) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(query) ||
        w.parent_description?.toLowerCase().includes(query) ||
        w.why_it_matters?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group by first letter
  const groupedByLetter = filteredWorks.reduce((acc, work) => {
    const letter = work.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  const letters = Object.keys(groupedByLetter).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">📖 Montessori Glossary</h1>
              <p className="text-sm text-slate-500">
                {works.length} works explained for parents
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search works..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>
      </header>

      {/* Area Filters */}
      <div className="bg-white border-b sticky top-[104px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterArea(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !filterArea ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({works.length})
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => setFilterArea(filterArea === area ? null : area)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  filterArea === area 
                    ? 'text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filterArea === area ? { backgroundColor: areaColors[area]?.color } : {}}
              >
                <span>{areaColors[area]?.icon}</span>
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Letter Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-indigo-100 text-sm font-medium text-gray-600 hover:text-indigo-700"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredWorks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-600">No works found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {letters.map(letter => (
              <div key={letter} id={`letter-${letter}`} className="scroll-mt-48">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-indigo-600">{letter}</span>
                  <div className="flex-1 h-px bg-indigo-200" />
                </div>

                <div className="space-y-2">
                  {groupedByLetter[letter].map(work => (
                    <div
                      key={work.id}
                      className="bg-white rounded-lg border shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedWork(expandedWork === work.id ? null : work.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: `${work.area_color}20` }}
                        >
                          {work.area_icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{work.name}</p>
                          <p className="text-xs text-gray-500">{work.area_name}</p>
                        </div>
                        <span className="text-gray-400">
                          {expandedWork === work.id ? '▲' : '▼'}
                        </span>
                      </button>

                      {expandedWork === work.id && work.parent_description && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="pt-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {work.parent_description}
                            </p>
                          </div>

                          {work.why_it_matters && (
                            <div className="mt-3 flex items-start gap-2">
                              <span className="text-lg">💡</span>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Why It Matters
                                </p>
                                <p className="text-sm text-gray-600">
                                  {work.why_it_matters}
                                </p>
                              </div>
                            </div>
                          )}

                          {work.home_connection && (
                            <div className="mt-3 flex items-start gap-2">
                              <span className="text-lg">🏠</span>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Try at Home
                                </p>
                                <p className="text-sm text-gray-600">
                                  {work.home_connection}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
