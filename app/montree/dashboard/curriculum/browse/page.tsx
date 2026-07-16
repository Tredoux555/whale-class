'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG, AREA_ORDER } from '@/lib/montree/types';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';

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

// Age range keys — resolved at render time via i18n
const AGE_KEYS: Record<string, string> = {
  all: 'curriculum.allAges',
  primary_year1: 'curriculum.year1',
  primary_year2: 'curriculum.year2',
  primary_year3: 'curriculum.year3',
};

// Difficulty badges for recommended view
function getDifficultyBadge(work: CurriculumWork, masteredIds: Set<string>, allWorksMap: Record<string, string>, t: any): { label: string; color: string } {
  const prereqsMet = work.prerequisites.every(p => masteredIds.has(p));
  const hasNoPrereqs = work.prerequisites.length === 0;
  if (hasNoPrereqs) return { label: t('curriculum.startHere' as any), color: 'bg-emerald-100 text-emerald-700' };
  if (prereqsMet) return { label: t('curriculum.buildingOn' as any), color: 'bg-amber-100 text-amber-700' };
  return { label: t('curriculum.advanced' as any), color: 'bg-violet-100 text-violet-700' };
}

export default function CurriculumBrowsePage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const areaName = (key: string) => t(`area.${key}` as any) || AREA_CONFIG[key]?.name || key;
  const [isParent, setIsParent] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>(AREA_ORDER[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showRecommended, setShowRecommended] = useState(false);
  const [childProgress, setChildProgress] = useState<Array<{ work_name: string; status: string }>>([]);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(0);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    const parent = isHomeschoolParent(sess);
    setIsParent(parent);

    // For home parents, default to recommended view and fetch child progress
    if (parent && sess.classroom?.id) {
      setShowRecommended(true);
      // Fetch first child's progress for recommendations
      fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`)
        .then(r => { if (!r.ok) throw new Error(`Children fetch: ${r.status}`); return r.json(); })
        .then(data => {
          const kids = data.children || [];
          if (kids.length > 0) {
            const firstChild = kids[0];
            setChildName(firstChild.name?.split(' ')[0] || '');
            setChildAge(firstChild.age || 4);
            // Fetch progress
            fetch(`/api/montree/progress?child_id=${firstChild.id}`)
              .then(r => { if (!r.ok) throw new Error(`Progress fetch: ${r.status}`); return r.json(); })
              .then(pData => {
                if (pData.progress) {
                  setChildProgress(pData.progress);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    // Auto-expand first category
    const firstArea = AREA_DATA[AREA_ORDER[0]];
    if (firstArea?.categories?.[0]) {
      setExpandedCategory(firstArea.categories[0].id);
    }
  }, [router]);

  // Get data for selected area
  const areaData = AREA_DATA[selectedArea];
  const areaConfig = AREA_CONFIG[selectedArea];

  // Build sets for recommended filtering
  const masteredWorkNames = useMemo(() => new Set(
    childProgress.filter(p => p.status === 'mastered').map(p => p.work_name)
  ), [childProgress]);

  const inProgressWorkNames = useMemo(() => new Set(
    childProgress.filter(p => p.status !== 'mastered').map(p => p.work_name)
  ), [childProgress]);

  // Filter works based on search, age, and recommended mode
  const filteredCategories = useMemo(() => {
    if (!areaData?.categories) return [];

    return areaData.categories
      .map(category => {
        let filteredWorks = category.works.filter(work => {
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

        // Recommended filter: exclude mastered, sort by prerequisites met
        if (showRecommended && childProgress.length > 0) {
          filteredWorks = filteredWorks.filter(work => !masteredWorkNames.has(work.name));
          // Also filter by child's age range
          if (childAge > 0) {
            const ageRange = childAge <= 3 ? 'primary_year1' : childAge <= 4 ? 'primary_year2' : 'primary_year3';
            filteredWorks = filteredWorks.filter(work =>
              work.ageRange === ageRange || work.ageRange === 'primary_year1'
            );
          }
          // Sort: in-progress first, then prerequisites met, then others
          filteredWorks.sort((a, b) => {
            const aInProgress = inProgressWorkNames.has(a.name) ? 0 : 1;
            const bInProgress = inProgressWorkNames.has(b.name) ? 0 : 1;
            if (aInProgress !== bInProgress) return aInProgress - bInProgress;
            const aPrereqsMet = a.prerequisites.every(p => masteredWorkNames.has(p)) ? 0 : 1;
            const bPrereqsMet = b.prerequisites.every(p => masteredWorkNames.has(p)) ? 0 : 1;
            return aPrereqsMet - bPrereqsMet;
          });
        }

        return { ...category, works: filteredWorks };
      })
      .filter(category => category.works.length > 0);
  }, [areaData, searchQuery, ageFilter, showRecommended, childProgress, masteredWorkNames, inProgressWorkNames, childAge]);

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
    <div className={`min-h-screen ${isParent ? HOME_THEME.pageBg : 'bg-[#0a1a0f]'}`}>
      {/* Header */}
      <div className={`border-b sticky top-0 z-20 ${isParent ? 'bg-[#0D3330] border-[#0D3330]' : 'bg-[rgba(7,18,12,0.9)] border-[rgba(52,211,153,0.15)]'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className={`p-1 ${isParent ? 'text-white/60 hover:text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className={`text-lg font-bold ${isParent ? 'text-white' : 'text-white/95'}`}>
                {t('curriculum.browseTitle' as any)}
              </h1>
              <p className={`text-xs ${isParent ? 'text-white/60' : 'text-white/50'}`}>
                {totalWorks} {t('curriculum.worksAcrossAreas' as any)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Area Tabs — horizontal scroll */}
      <div className={`border-b sticky top-[57px] z-10 ${isParent ? 'bg-[#FFFDF8] border-[#0D3330]/10' : 'bg-[rgba(7,18,12,0.75)] border-[rgba(52,211,153,0.1)]'}`}>
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
                      : isParent ? 'text-slate-600 hover:bg-slate-100' : 'text-white/60 hover:bg-white/10'
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
                  {areaName(areaId)}
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
            <svg className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isParent ? 'text-slate-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('curriculum.searchAreaWorks' as any)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                isParent ? 'border-[#0D3330]/15 focus:ring-[#0D3330]/30 bg-[#FFFDF8]' : 'border-[rgba(52,211,153,0.15)] focus:ring-emerald-500/40 bg-white/[0.06] text-white/90 placeholder:text-white/40'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isParent ? 'text-slate-400 hover:text-slate-600' : 'text-white/40 hover:text-white/70'}`}
              >
                ✕
              </button>
            )}
          </div>
          {/* Age filter */}
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
              isParent ? 'border-[#0D3330]/15 bg-[#FFFDF8] focus:ring-[#0D3330]/30' : 'border-[rgba(52,211,153,0.15)] bg-white/[0.06] text-white/90 focus:ring-emerald-500/40'
            }`}
          >
            {Object.entries(AGE_KEYS).map(([val, key]) => (
              <option key={val} value={val}>{t(key as any)}</option>
            ))}
          </select>
        </div>
        {/* Recommended toggle — home parents only */}
        {isParent && (
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              showRecommended
                ? 'bg-[#0D3330] text-white'
                : 'bg-[#F5E6D3] text-[#0D3330] hover:bg-[#EDD5C0]'
            }`}
          >
            <span>{showRecommended ? '⭐' : '☆'}</span>
            {showRecommended
              ? `${t('curriculum.recommendedFor' as any)} ${childName || t('curriculum.yourChild' as any)}`
              : t('curriculum.showAllWorks' as any)
            }
          </button>
        )}

        {/* Results count */}
        <p className={`text-xs mt-1.5 pl-1 ${isParent ? 'text-slate-500' : 'text-white/50'}`}>
          {filteredWorkCount === areaWorkCount
            ? `${areaWorkCount} ${t('curriculum.worksInArea' as any)} ${areaName(selectedArea)}`
            : `${filteredWorkCount} ${t('curriculum.worksOfTotal' as any)} ${areaWorkCount} ${t('curriculum.works' as any)}`
          }
          {showRecommended && isParent && ` ${t('curriculum.excludingMastered' as any)}`}
        </p>
      </div>

      {/* Categories + Works */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {filteredCategories.length === 0 ? (
          <div className={`text-center py-12 ${isParent ? 'text-slate-400' : 'text-white/40'}`}>
            <p className="text-lg">{t('curriculum.noWorksFound' as any)}</p>
            <p className="text-sm mt-1">{t('curriculum.tryAdjusting' as any)}</p>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className="mb-4">
              {/* Category header */}
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                  isParent ? 'bg-[#FFFDF8] border-[#0D3330]/10 hover:bg-[#F5E6D3]/30' : 'bg-white/[0.06] border-[rgba(52,211,153,0.15)] hover:bg-white/[0.1]'
                }`}
              >
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: areaConfig?.color }}
                />
                <div className="flex-1 text-left">
                  <h3 className={`text-sm font-semibold ${isParent ? 'text-slate-800' : 'text-white/90'}`}>{category.name}</h3>
                  <p className={`text-xs ${isParent ? 'text-slate-500' : 'text-white/50'}`}>{category.works.length} {t('curriculum.works' as any)}</p>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${isParent ? 'text-slate-400' : 'text-white/40'} ${
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
                      difficultyBadge={showRecommended && isParent ? getDifficultyBadge(work, masteredWorkNames, allWorksMap, t) : undefined}
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
  difficultyBadge?: { label: string; color: string };
}

function WorkCard({ work, index, isExpanded, onToggle, areaColor, allWorksMap, isParent, difficultyBadge }: WorkCardProps) {
  const { t, locale } = useI18n();
  const ageLabel = t((AGE_KEYS[work.ageRange] || 'curriculum.allAges') as any) || work.ageRange;

  return (
    <div className={`rounded-lg border overflow-hidden ${isParent ? 'bg-[#FFFDF8] border-[#0D3330]/10' : 'bg-white/[0.06] border-[rgba(52,211,153,0.15)]'}`}>
      {/* Collapsed view */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isParent ? 'hover:bg-[#F5E6D3]/20' : 'hover:bg-white/[0.1]'}`}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: areaColor }}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${isParent ? 'text-slate-800' : 'text-white/90'}`}>{locale === 'zh' && work.chineseName ? work.chineseName : work.name}</h4>
          <p className={`text-xs truncate ${isParent ? 'text-slate-500' : 'text-white/50'}`}>{work.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {difficultyBadge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${difficultyBadge.color}`}>
              {difficultyBadge.label}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isParent ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-white/60'}`}>
            {ageLabel.includes('(') ? ageLabel.split(' (')[0] : ageLabel}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isParent ? 'text-slate-400' : 'text-white/40'} ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded view */}
      {isExpanded && (
        <div className={`border-t px-4 py-3 space-y-4 ${isParent ? 'border-slate-100' : 'border-white/10'}`}>
          {/* Description */}
          <p className={`text-sm ${isParent ? 'text-slate-600' : 'text-white/70'}`}>{work.description}</p>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Age Range */}
            <InfoBlock
              label={t('curriculum.ageRange' as any)}
              icon="🎂"
              value={ageLabel}
              isParent={isParent}
            />
            {/* Levels */}
            <InfoBlock
              label={t('curriculum.levels' as any)}
              icon="📊"
              value={`${work.levels.length} ${work.levels.length === 1 ? t('curriculum.progressionLevel' as any) : t('curriculum.progressionLevelsPlural' as any)}`}
              isParent={isParent}
            />
          </div>

          {/* Materials */}
          <Section title={isParent ? t('curriculum.materialsYouNeed' as any) : t('curriculum.materials' as any)} icon="🧰" isParent={isParent}>
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
            <Section title={isParent ? t('curriculum.whatChildLearns' as any) : t('curriculum.directAims' as any)} icon="🎯" isParent={isParent}>
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
            <Section title={isParent ? t('curriculum.hiddenBenefits' as any) : t('curriculum.indirectAims' as any)} icon="✨" isParent={isParent}>
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
            <Section title={t('curriculum.prerequisites' as any)} icon="🔗" isParent={isParent}>
              <div className="flex flex-wrap gap-1.5">
                {work.prerequisites.map((preReqId, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full border ${isParent ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/10 text-white/70 border-[rgba(52,211,153,0.15)]'}`}>
                    {allWorksMap[preReqId] || preReqId}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Control of Error */}
          {work.controlOfError && (
            <Section title={isParent ? t('curriculum.howTheySelfCorrect' as any) : t('curriculum.controlOfError' as any)} icon="🔍" isParent={isParent}>
              <p className={`text-xs ${isParent ? 'text-slate-600' : 'text-white/70'}`}>{work.controlOfError}</p>
            </Section>
          )}

          {/* Levels / Progression */}
          <Section title={t('curriculum.progressionLevels' as any)} icon="📈" isParent={isParent}>
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
                    <p className={`text-xs font-medium ${isParent ? 'text-slate-700' : 'text-white/80'}`}>{level.name}</p>
                    <p className={`text-xs ${isParent ? 'text-slate-500' : 'text-white/50'}`}>{level.description}</p>
                    {level.videoSearchTerms && level.videoSearchTerms.length > 0 && (
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(level.videoSearchTerms[0])}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 mt-0.5"
                      >
                        <span>▶</span> {t('curriculum.watchDemo' as any)}
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

function InfoBlock({ label, icon, value, isParent }: { label: string; icon: string; value: string; isParent?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${isParent ? 'bg-slate-50' : 'bg-white/[0.04] border border-[rgba(52,211,153,0.12)]'}`}>
      <p className={`text-[10px] uppercase tracking-wider ${isParent ? 'text-slate-500' : 'text-white/50'}`}>{icon} {label}</p>
      <p className={`text-sm font-medium mt-0.5 ${isParent ? 'text-slate-700' : 'text-white/80'}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children, isParent }: { title: string; icon: string; children: React.ReactNode; isParent?: boolean }) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isParent ? 'text-slate-500' : 'text-white/50'}`}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
