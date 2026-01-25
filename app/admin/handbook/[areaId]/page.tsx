// app/admin/handbook/[areaId]/page.tsx
// Dynamic area page v2 - Deep audit improvements
// Features: Gateway badges, prerequisites, sensitive periods, age filter, sequence numbers, "what's next"
// UPDATED: Now handles full object data from API joins

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface PrerequisiteWork {
  id: string;
  name: string;
  slug: string;
  is_required: boolean;
}

interface UnlockedWork {
  id: string;
  name: string;
  slug: string;
}

interface SensitivePeriod {
  id: string;
  name: string;
  slug: string;
  relevance_score: number;
}

interface RelatedGame {
  id: string;
  name: string;
  slug: string;
  game_type: string;
  description: string;
  component_path: string;
  thumbnail_url: string | null;
  relationship_type: string;
}

interface Work {
  id: string;
  name: string;
  slug: string;
  curriculum_area: string;
  sub_area: string;
  age_min: number;
  age_max: number;
  age_typical: number;
  sequence_order: number;
  is_gateway: boolean;
  direct_aims: string[];
  indirect_aims: string[];
  readiness_indicators: string[];
  materials_needed: string[];
  parent_explanation_simple: string;
  parent_explanation_detailed: string;
  // New object-based fields from API joins
  sensitive_periods: SensitivePeriod[];
  prerequisites: PrerequisiteWork[];
  unlocks: UnlockedWork[];
  related_games: RelatedGame[];
}

const AREA_INFO: Record<string, { 
  name: string; 
  icon: string; 
  gradient: string;
  philosophy: string;
  subAreaOrder: string[];
}> = {
  practical_life: { 
    name: 'Practical Life', 
    icon: '🧹', 
    gradient: 'from-amber-500 to-yellow-500',
    philosophy: 'Foundation for all learning. Builds concentration, coordination, independence, and order.',
    subAreaOrder: ['preliminary_exercises', 'transfer', 'care_of_self', 'care_of_environment', 'grace_and_courtesy', 'food_preparation']
  },
  sensorial: { 
    name: 'Sensorial', 
    icon: '👁️', 
    gradient: 'from-pink-500 to-rose-500',
    philosophy: 'Refines the senses and prepares the mathematical mind through isolation of qualities.',
    subAreaOrder: ['visual_dimension', 'visual_color', 'visual_form', 'tactile', 'auditory', 'olfactory', 'gustatory', 'stereognostic']
  },
  language: { 
    name: 'Language', 
    icon: '📖', 
    gradient: 'from-blue-500 to-cyan-500',
    philosophy: 'Writing before reading. Sound awareness → composition → decoding.',
    subAreaOrder: ['oral_language', 'sound_awareness', 'writing_preparation', 'composition', 'reading_pink', 'reading_blue', 'reading_green', 'grammar']
  },
  mathematics: { 
    name: 'Mathematics', 
    icon: '🔢', 
    gradient: 'from-green-500 to-emerald-500',
    philosophy: 'Concrete to abstract. Handle quantities before symbols.',
    subAreaOrder: ['numeration', 'decimal_system', 'teens_tens', 'linear_counting', 'memorization', 'abstraction', 'fractions', 'geometry']
  },
  cultural: { 
    name: 'Cultural', 
    icon: '🌍', 
    gradient: 'from-purple-500 to-violet-500',
    philosophy: 'The whole before the parts. Giving children a cosmic perspective.',
    subAreaOrder: ['geography', 'botany', 'zoology', 'physical_science', 'history_time']
  },
  art_music: { 
    name: 'Art & Music', 
    icon: '🎨', 
    gradient: 'from-red-500 to-orange-500',
    philosophy: 'Creative expression and aesthetic appreciation.',
    subAreaOrder: ['art', 'music', 'movement']
  },
};

const SENSITIVE_PERIOD_COLORS: Record<string, string> = {
  order: 'bg-amber-500',
  movement: 'bg-blue-500',
  small_objects: 'bg-pink-500',
  refinement_of_senses: 'bg-purple-500',
  language: 'bg-cyan-500',
  social: 'bg-green-500',
  mathematics: 'bg-emerald-500',
  writing: 'bg-indigo-500',
  reading: 'bg-violet-500',
  music: 'bg-rose-500',
  spatial: 'bg-orange-500',
};

export default function AreaPage() {
  const params = useParams();
  const areaId = params.areaId as string;
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<number | null>(null);
  const [showGatewayOnly, setShowGatewayOnly] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const area = AREA_INFO[areaId] || { 
    name: areaId, 
    icon: '📁', 
    gradient: 'from-slate-500 to-slate-600',
    philosophy: '',
    subAreaOrder: []
  };

  useEffect(() => {
    fetch('/api/brain/works')
      .then(res => res.json())
      .then(data => {
        const allData = data.data || [];
        const filtered = allData.filter((w: Work) => w.curriculum_area === areaId);
        filtered.sort((a: Work, b: Work) => (a.sequence_order || 0) - (b.sequence_order || 0));
        setWorks(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [areaId]);

  // Filter works
  const filteredWorks = works.filter(w => {
    if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (ageFilter && (w.age_min > ageFilter || w.age_max < ageFilter)) return false;
    if (showGatewayOnly && !w.is_gateway) return false;
    return true;
  });

  // Group works by sub_area (in Montessori order)
  const groupedWorks = filteredWorks.reduce((acc, work) => {
    const subArea = work.sub_area || 'general';
    if (!acc[subArea]) acc[subArea] = [];
    acc[subArea].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  // Sort groups by Montessori order
  const sortedGroups = Object.entries(groupedWorks).sort(([a], [b]) => {
    const orderA = area.subAreaOrder.indexOf(a);
    const orderB = area.subAreaOrder.indexOf(b);
    if (orderA === -1 && orderB === -1) return a.localeCompare(b);
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });

  const gatewayCount = works.filter(w => w.is_gateway).length;

  const toggleGroup = (subArea: string) => {
    setCollapsedGroups(prev => ({ ...prev, [subArea]: !prev[subArea] }));
  };

  const formatSubArea = (subArea: string) => {
    return subArea.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading works...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin/handbook" className="text-slate-400 hover:text-white transition-colors">
            ← Handbook
          </Link>
          <span className="text-slate-500 text-sm">{filteredWorks.length} of {works.length} works</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Hero */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-16 h-16 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-3xl shadow-lg`}>
            {area.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{area.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{area.philosophy}</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 mb-6 text-sm">
          <span className="text-slate-400">
            <strong className="text-white">{works.length}</strong> works
          </span>
          <span className="text-slate-400">
            <strong className="text-amber-400">{gatewayCount}</strong> gateway works
          </span>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 mb-6 space-y-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search works..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 text-sm"
          />
          
          {/* Filter Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Age Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Age:</span>
              <div className="flex gap-1">
                {[null, 2.5, 3, 3.5, 4, 4.5, 5, 5.5].map((age) => (
                  <button
                    key={age ?? 'all'}
                    onClick={() => setAgeFilter(age)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      ageFilter === age 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {age ?? 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gateway Filter */}
            <button
              onClick={() => setShowGatewayOnly(!showGatewayOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showGatewayOnly 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <span>🌟</span>
              Gateway Only
            </button>
          </div>
        </div>
        
        {/* Works by Sub-Area */}
        <div className="space-y-4">
          {sortedGroups.map(([subArea, subWorks]) => (
            <div key={subArea} className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
              {/* Sub-Area Header (Collapsible) */}
              <button
                onClick={() => toggleGroup(subArea)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{collapsedGroups[subArea] ? '▶' : '▼'}</span>
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    {formatSubArea(subArea)}
                  </h2>
                </div>
                <span className="text-slate-500 text-sm">{subWorks.length} works</span>
              </button>

              {/* Works List */}
              {!collapsedGroups[subArea] && (
                <div className="border-t border-slate-700">
                  {subWorks.map((work, index) => (
                    <button
                      key={work.id}
                      onClick={() => setSelectedWork(work)}
                      className="w-full px-4 py-3 hover:bg-slate-800/50 transition-colors text-left border-b border-slate-700/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {/* Sequence Number */}
                        <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                          {work.sequence_order || index + 1}
                        </span>
                        
                        {/* Work Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{work.name}</h3>
                            
                            {/* Gateway Badge */}
                            {work.is_gateway && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                                🌟 Gateway
                              </span>
                            )}

                            {/* Prerequisite count badge */}
                            {work.prerequisites?.length > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded text-xs">
                                {work.prerequisites.length} prereq
                              </span>
                            )}
                          </div>
                          
                          {/* First Direct Aim Preview */}
                          {work.direct_aims?.length > 0 && (
                            <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{work.direct_aims[0]}</p>
                          )}
                        </div>
                        
                        {/* Age Badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                            {work.age_typical ? `~${work.age_typical}y` : `${work.age_min}-${work.age_max}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {sortedGroups.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No works found matching your filters
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedWork && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={() => setSelectedWork(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                {area.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-white">{selectedWork.name}</h3>
                  {selectedWork.is_gateway && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                      🌟 Gateway
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                    Ages {selectedWork.age_min}-{selectedWork.age_max}
                  </span>
                  {selectedWork.age_typical && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      Typical intro: ~{selectedWork.age_typical}y
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400 capitalize">
                    {formatSubArea(selectedWork.sub_area || '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Sensitive Periods - Now uses object data */}
            {selectedWork.sensitive_periods?.length > 0 && (
              <div className="mb-4 p-3 bg-slate-700/30 rounded-xl">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active During Sensitive Periods</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.sensitive_periods.map((period) => (
                    <span 
                      key={period.id} 
                      className={`px-2 py-1 rounded-lg text-xs text-white ${SENSITIVE_PERIOD_COLORS[period.slug] || 'bg-slate-600'}`}
                    >
                      {period.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Description */}
            {selectedWork.parent_explanation_simple && (
              <p className="text-slate-300 mb-5 leading-relaxed">{selectedWork.parent_explanation_simple}</p>
            )}

            {/* Prerequisites - Now uses object data with names */}
            {selectedWork.prerequisites?.length > 0 && (
              <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2 text-sm">
                  <span>⬅️</span> Prerequisites (do these first)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.prerequisites.map((prereq) => (
                    <span 
                      key={prereq.id} 
                      className={`px-2 py-1 rounded text-xs ${
                        prereq.is_required 
                          ? 'bg-amber-500/30 text-amber-200' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {prereq.name}
                      {prereq.is_required && <span className="ml-1 opacity-60">*</span>}
                    </span>
                  ))}
                </div>
                <p className="text-amber-500/50 text-xs mt-2">* = required</p>
              </div>
            )}
            
            {/* Direct Aims */}
            {selectedWork.direct_aims?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">🎯</span> Direct Aims
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.direct_aims.map((aim, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Indirect Aims */}
            {selectedWork.indirect_aims?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">✨</span> Indirect Aims (prepares for later)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.indirect_aims.map((aim, i) => (
                    <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* What This Unlocks - Now uses object data with names */}
            {selectedWork.unlocks?.length > 0 && (
              <div className="mb-5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2 text-sm">
                  <span>➡️</span> Unlocks (what comes next)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.unlocks.map((unlock) => (
                    <span key={unlock.id} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                      {unlock.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Digital Games */}
            {selectedWork.related_games?.length > 0 && (
              <div className="mb-5 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <h4 className="font-semibold text-indigo-400 mb-2 flex items-center gap-2 text-sm">
                  <span>🎮</span> Digital Games
                </h4>
                <div className="space-y-2">
                  {selectedWork.related_games.map((game) => (
                    <Link
                      key={game.id}
                      href={`/games/${game.slug}`}
                      className="flex items-center gap-3 p-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center text-xl">
                        🎮
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-indigo-200 font-medium text-sm group-hover:text-indigo-100 truncate">
                          {game.name}
                        </p>
                        <p className="text-indigo-400/60 text-xs capitalize">
                          {game.relationship_type} • {game.game_type.replace('_', ' ')}
                        </p>
                      </div>
                      <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Materials */}
            {selectedWork.materials_needed?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">📦</span> Materials
                </h4>
                <ul className="space-y-1">
                  {selectedWork.materials_needed.map((m, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Readiness Indicators */}
            {selectedWork.readiness_indicators?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">✅</span> Ready When Child...
                </h4>
                <ul className="space-y-1">
                  {selectedWork.readiness_indicators.map((r, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="text-green-500">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Explanation */}
            {selectedWork.parent_explanation_detailed && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">📝</span> For Parents
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">{selectedWork.parent_explanation_detailed}</p>
              </div>
            )}
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedWork(null)} 
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
