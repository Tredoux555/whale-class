'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';

// Import curriculum data directly (static JSON — no API needed)
import languageData from '@/lib/curriculum/data/language.json';
import mathData from '@/lib/curriculum/data/math.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

// Types for the JSON data
interface WorkLevel {
  level: number;
  name: string;
  description: string;
  videoSearchTerms?: string[];
}

interface CurriculumWork {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  prerequisites: string[];
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName?: string;
  levels: WorkLevel[];
}

interface CurriculumCategory {
  id: string;
  name: string;
  description: string;
  sequence: number;
  works: CurriculumWork[];
}

interface CurriculumAreaData {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sequence: number;
  categories: CurriculumCategory[];
}

// Map area IDs to imported data
const AREA_DATA: Record<string, CurriculumAreaData> = {
  practical_life: practicalLifeData as CurriculumAreaData,
  sensorial: sensorialData as CurriculumAreaData,
  mathematics: mathData as CurriculumAreaData,
  language: languageData as CurriculumAreaData,
  cultural: culturalData as CurriculumAreaData,
};

// Age range labels
const AGE_LABELS: Record<string, string> = {
  all: 'All Ages',
  primary_year1: 'Year 1 (2.5-4)',
  primary_year2: 'Year 2 (4-5)',
  primary_year3: 'Year 3 (5-6)',
};

export default function CurriculumBrowsePage() {
  const router = useRouter();
  const [isParent, setIsParent] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>(AREA_ORDER[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setIsParent(isHomeschoolParent(sess));
    // Auto-expand first category
    const firstArea = AREA_DATA[AREA_ORDER[0]];
    if (firstArea?.categories?.[0]) {
      setExpandedCategory(firstArea.categories[0].id);
    }
  }, [router]);

  // Get data for selected area
  const areaData = AREA_DATA[selectedArea];
  const areaConfig = AREA_CONFIG[selectedArea];

  // Filter works based on search and age
  const filteredCategories = useMemo(() => {
    if (!areaData?.categories) return [];

    return areaData.categories
      .map(category => {
        const filteredWorks = category.works.filter(work => {
          // Age filter
          if (ageFilter !== 'all' && work.ageRange !== ageFilter) return false;
          // Search filter
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
              work.name.toLowerCase().includes(q) ||
              work.description.toLowerCase().includes(q) ||
              work.materials.some(m => m.toLowerCase().includes(q))
            );
          }
          return true;
        });
        return { ...category, works: filteredWorks };
      })
      .filter(category => category.works.length > 0);
  }, [areaData, searchQuery, ageFilter]);

  // Count total works across all areas
  const totalWorks = useMemo(() => {
    let count = 0;
    for (const area of Object.values(AREA_DATA)) {
      for (const cat of area.categories) {
        count += cat.works.length;
      }
    }
    return count;
  }, []);

  // Count works for current area
  const areaWorkCount = useMemo(() => {
    if (!areaData?.categories) return 0;
    return areaData.categories.reduce((sum, cat) => sum + cat.works.length, 0);
  }, [areaData]);

  // Count filtered works
  const filteredWorkCount = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => sum + cat.works.length, 0);
  }, [filteredCategories]);

  // Resolve prerequisite names
  const allWorksMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const area of Object.values(AREA_DATA)) {
      for (const cat of area.categories) {
        for (const work of cat.works) {
          map[work.id] = work.name;
        }
      }
    }
    return map;
  }, []);

  function handleAreaChange(area: string) {
    setSelectedArea(area);
    setExpandedWork(null);
    setSearchQuery('');
    // Auto-expand first category
    const data = AREA_DATA[area];
    if (data?.categories?.[0]) {
      setExpandedCategory(data.categories[0].id);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-500 hover:text-slate-700 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-900">
                {isParent ? 'Montessori Curriculum Guide' : 'Curriculum Browser'}
              </h1>
              <p className="text-xs text-slate-500">
                {totalWorks} works across 5 areas
                {isParent && ' — your guide to Montessori at home'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Area Tabs — horizontal scroll */}
      <div className="bg-white border-b border-slate-100 sticky top-[57px] z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-1 scrollbar-hide">
            {AREA_ORDER.map(areaId => {
              const cfg = AREA_CONFIG[areaId];
              const isActive = selectedArea === areaId;
              return (
                <button
                  key={areaId}
                  onClick={() => handleAreaChange(areaId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  style={isActive ? { backgroundColor: cfg.color } : undefined}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-white/30 text-white' : ''
                  }`}
                    style={!isActive ? { backgroundColor: cfg.color + '20', color: cfg.color } : undefined}
                  >
                    {cfg.icon}
                  </span>
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${areaConfig?.name || ''} works...`}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          {/* Age filter */}
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.entries(AGE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        {/* Results count */}
        <p className="text-xs text-slate-500 mt-1.5 pl-1">
          {filteredWorkCount === areaWorkCount
            ? `${areaWorkCount} works in ${areaConfig?.name}`
            : `${filteredWorkCount} of ${areaWorkCount} works`
          }
        </p>
      </div>

      {/* Categories + Works */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No works found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className="mb-4">
              {/* Category header */}
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: areaConfig?.color }}
                />
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-slate-800">{category.name}</h3>
                  <p className="text-xs text-slate-500">{category.works.length} works</p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedCategory === category.id ? 'rotate-180' : ''
                  }`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Works list */}
              {expandedCategory === category.id && (
                <div className="mt-1 space-y-1 pl-2">
                  {category.works.map((work, idx) => (
                    <WorkCard
                      key={work.id}
                      work={work}
                      index={idx}
                      isExpanded={expandedWork === work.id}
                      onToggle={() => setExpandedWork(expandedWork === work.id ? null : work.id)}
                      areaColor={areaConfig?.color || '#666'}
                      allWorksMap={allWorksMap}
                      isParent={isParent}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// Work Card Component
// ============================================
interface WorkCardProps {
  work: CurriculumWork;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  areaColor: string;
  allWorksMap: Record<string, string>;
  isParent: boolean;
}

function WorkCard({ work, index, isExpanded, onToggle, areaColor, allWorksMap, isParent }: WorkCardProps) {
  const ageLabel = AGE_LABELS[work.ageRange] || work.ageRange;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Collapsed view */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: areaColor }}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-800 truncate">{work.name}</h4>
          <p className="text-xs text-slate-500 truncate">{work.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {ageLabel.includes('(') ? ageLabel.split(' (')[0] : ageLabel}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded view */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-4">
          {/* Description */}
          <p className="text-sm text-slate-600">{work.description}</p>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Age Range */}
            <InfoBlock
              label="Age Range"
              icon="🎂"
              value={ageLabel}
            />
            {/* Levels */}
            <InfoBlock
              label="Levels"
              icon="📊"
              value={`${work.levels.length} progression ${work.levels.length === 1 ? 'level' : 'levels'}`}
            />
          </div>

          {/* Materials */}
          <Section title={isParent ? "Materials You'll Need" : "Materials"} icon="🧰">
            <div className="flex flex-wrap gap-1.5">
              {work.materials.map((material, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {material}
                </span>
              ))}
            </div>
          </Section>

          {/* Direct Aims */}
          {work.directAims && work.directAims.length > 0 && (
            <Section title={isParent ? "What Your Child Learns" : "Direct Aims"} icon="🎯">
              <div className="flex flex-wrap gap-1.5">
                {work.directAims.map((aim, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {aim}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Indirect Aims */}
          {work.indirectAims && work.indirectAims.length > 0 && (
            <Section title={isParent ? "Hidden Benefits" : "Indirect Aims"} icon="✨">
              <div className="flex flex-wrap gap-1.5">
                {work.indirectAims.map((aim, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {aim}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Prerequisites */}
          {work.prerequisites && work.prerequisites.length > 0 && (
            <Section title="Prerequisites" icon="🔗">
              <div className="flex flex-wrap gap-1.5">
                {work.prerequisites.map((preReqId, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {allWorksMap[preReqId] || preReqId}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Control of Error */}
          {work.controlOfError && (
            <Section title={isParent ? "How They Self-Correct" : "Control of Error"} icon="🔍">
              <p className="text-xs text-slate-600">{work.controlOfError}</p>
            </Section>
          )}

          {/* Levels / Progression */}
          <Section title="Progression Levels" icon="📈">
            <div className="space-y-2">
              {work.levels.map((level) => (
                <div key={level.level} className="flex gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: areaColor }}
                  >
                    {level.level}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{level.name}</p>
                    <p className="text-xs text-slate-500">{level.description}</p>
                    {level.videoSearchTerms && level.videoSearchTerms.length > 0 && (
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(level.videoSearchTerms[0])}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 mt-0.5"
                      >
                        <span>▶</span> Watch demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ============================================
// Reusable UI components
// ============================================

function InfoBlock({ label, icon, value }: { label: string; icon: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{icon} {label}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
