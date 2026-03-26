// /montree/parent/report/[reportId]/page.tsx
// Parent Report — Gallery-style UI with area filtering, photo grid, descriptions
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

// --- Types ---

interface WorkItem {
  work_name: string;
  chineseName?: string | null;
  area: string;
  status: string;
  completed_at: string;
  photo_url: string | null;
  photo_caption: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
}

interface AreaGroup {
  area_key: string;
  area_name: string;
  works: WorkItem[];
}

interface ReportData {
  id: string;
  week_number: number | null;
  report_year: number | null;
  week_start: string | null;
  week_end: string | null;
  parent_summary: string | null;
  highlights: string[] | null;
  areas_of_growth: string[] | null;
  recommendations: string[] | null;
  closing: string | null;
  areas_explored: AreaGroup[] | null;
  created_at: string;
  child: {
    name: string;
    nickname: string | null;
  };
  works_completed: WorkItem[];
  all_photos?: {
    id: string;
    url: string;
    caption: string | null;
    work_name: string | null;
    captured_at: string;
  }[];
}

// --- Area Config (parent-friendly names + colors matching Gallery) ---

const AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string; bg: string; text: string; border: string; lightBg: string }> = {
  practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', lightBg: 'bg-pink-500' },
  sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', lightBg: 'bg-purple-500' },
  mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', lightBg: 'bg-blue-500' },
  math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', lightBg: 'bg-blue-500' },
  language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', lightBg: 'bg-amber-500' },
  cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', lightBg: 'bg-green-500' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Normalize area key (handle 'math' → 'mathematics' etc.)
function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

// --- Component ---

export default function ParentReportPage() {
  const router = useRouter();
  const params = useParams();
  const { t, locale } = useI18n();
  const reportId = params.reportId as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  // Gallery-style view state
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}?locale=${locale}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load report');
        return;
      }
      if (data.report && !data.report.child) {
        data.report.child = { name: 'Child', nickname: null };
      }
      setReport(data.report);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(t('common.connectionError') || 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [reportId, locale, t]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }
    loadReport();
  }, [reportId, router, loadReport]);

  // Build all works from report — merge areas_explored and works_completed
  const allWorks: WorkItem[] = useMemo(() => {
    if (!report) return [];
    // Prefer areas_explored (pre-grouped from API) flattened
    if (report.areas_explored && report.areas_explored.length > 0) {
      return report.areas_explored.flatMap(ag => ag.works);
    }
    return report.works_completed || [];
  }, [report]);

  // Works grouped by area for counts
  const worksByArea = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    for (const area of AREA_ORDER) map[area] = [];
    for (const work of allWorks) {
      const area = normalizeArea(work.area || 'other');
      if (!map[area]) map[area] = [];
      map[area].push(work);
    }
    return map;
  }, [allWorks]);

  // Filtered works based on selected area
  const filteredWorks = useMemo(() => {
    if (selectedArea) return allWorks.filter(w => normalizeArea(w.area) === selectedArea);
    return allWorks;
  }, [allWorks, selectedArea]);

  // Timeline grouping (group by completed_at date)
  const timelineGroups = useMemo(() => {
    const byDate = new Map<string, WorkItem[]>();
    for (const work of filteredWorks) {
      const dateKey = work.completed_at
        ? new Date(work.completed_at).toISOString().split('T')[0]
        : new Date(report?.created_at || '').toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(work);
    }
    // Sort dates newest first
    return Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredWorks, report?.created_at]);

  // Photos array for lightbox navigation
  const lightboxPhotos = useMemo(() => {
    return filteredWorks
      .filter(w => w.photo_url)
      .map(w => ({
        url: w.photo_url!,
        caption: w.photo_caption || undefined,
        date: w.completed_at,
      }));
  }, [filteredWorks]);

  // Clamp lightbox index
  useEffect(() => {
    if (lightboxOpen && lightboxPhotos.length > 0 && lightboxIndex >= lightboxPhotos.length) {
      setLightboxIndex(lightboxPhotos.length - 1);
    } else if (lightboxOpen && lightboxPhotos.length === 0) {
      setLightboxOpen(false);
    }
  }, [lightboxPhotos.length, lightboxOpen, lightboxIndex]);

  // Helpers
  const childName = report?.child?.nickname || report?.child?.name || '';

  const formatWeekDisplay = () => {
    if (!report) return '';
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return locale === 'zh'
        ? `${report.report_year}年 第${report.week_number}周`
        : `Week ${report.week_number}, ${report.report_year}`;
    }
    return new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const getAreaConfig = (area: string) =>
    AREA_CONFIG[normalizeArea(area)] || AREA_CONFIG['cultural'];

  const getAreaLabel = (area: string) => {
    const conf = getAreaConfig(area);
    return locale === 'zh' ? conf.labelZh : conf.label;
  };

  const downloadPhoto = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const openLightbox = (work: WorkItem) => {
    if (!work.photo_url) return;
    const idx = lightboxPhotos.findIndex(p => p.url === work.photo_url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  // Stats
  const masteredCount = allWorks.filter(w => w.status === 'mastered' || w.status === 'completed').length;
  const practicingCount = allWorks.filter(w => w.status === 'practicing').length;
  const presentedCount = allWorks.filter(w => w.status === 'presented').length;

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-3xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-3 mt-20">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error || t('parentReport.notFound')}</p>
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline">
            ← {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: Work Card (Gallery-style) ──
  const renderWorkCard = (work: WorkItem, index: number) => {
    const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
    const areaConf = getAreaConfig(work.area);
    const isExpanded = expandedCard === `${work.work_name}-${index}`;
    const cardKey = `${work.work_name}-${index}`;

    return (
      <div
        key={cardKey}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Photo */}
        {work.photo_url ? (
          <div className="relative group">
            <button
              onClick={() => openLightbox(work)}
              className="w-full"
            >
              <img
                src={work.photo_url}
                alt={displayName}
                className="w-full aspect-[4/3] object-cover"
              />
            </button>

            {/* Date overlay */}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-xs font-medium backdrop-blur-sm">
              {formatDate(work.completed_at || report.created_at)}
            </div>

            {/* Download button */}
            <button
              onClick={(e) => { e.stopPropagation(); downloadPhoto(work.photo_url!, work.work_name); }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-xs backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ⬇
            </button>
          </div>
        ) : (
          // No photo — show a gentle placeholder with area color
          <div
            className="w-full aspect-[4/3] flex items-center justify-center"
            style={{ backgroundColor: `${areaConf.color}10` }}
          >
            <div className="text-center">
              <span className="text-4xl">{areaConf.emoji}</span>
              <p className="text-xs mt-1 font-medium" style={{ color: areaConf.color }}>
                {getAreaLabel(work.area)}
              </p>
            </div>
          </div>
        )}

        {/* Work info */}
        <div className="p-3 space-y-2">
          {/* Area badge + Work name */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: areaConf.color }}
            >
              {areaConf.emoji.length <= 2 ? areaConf.emoji : areaConf.label.charAt(0)}
            </div>
            <span className="font-semibold text-gray-800 text-sm truncate flex-1">
              {displayName}
            </span>
            <StatusBadge status={work.status} locale={locale} />
          </div>

          {/* Parent description — the curated explanation */}
          {work.parent_description && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {work.parent_description}
            </p>
          )}

          {/* Why It Matters — expandable insight */}
          {work.why_it_matters && (
            <button
              onClick={() => setExpandedCard(isExpanded ? null : cardKey)}
              className="w-full text-left"
            >
              <div className={`bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 transition-all ${isExpanded ? '' : 'cursor-pointer hover:bg-emerald-100/50'}`}>
                <p className="text-[11px] font-semibold text-emerald-700 mb-0.5 flex items-center gap-1">
                  💡 {locale === 'zh' ? '为什么重要' : 'Why this matters'}
                  {!isExpanded && <span className="text-emerald-400 text-[10px]">▼</span>}
                </p>
                {isExpanded && (
                  <p className="text-xs text-emerald-800 leading-relaxed mt-1">{work.why_it_matters}</p>
                )}
              </div>
            </button>
          )}

          {/* Teacher's note (photo caption from audit) */}
          {work.photo_caption && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <p className="text-[11px] font-semibold text-blue-700 mb-0.5">
                📝 {locale === 'zh' ? '老师的观察' : "Teacher's Note"}
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">{work.photo_caption}</p>
            </div>
          )}

          {/* Fallback description when no parent_description exists */}
          {!work.parent_description && !work.why_it_matters && !work.photo_caption && (
            <p className="text-gray-400 text-xs">
              {locale === 'zh'
                ? `您的孩子在${getAreaLabel(work.area)}方面进行了学习。`
                : `Your child explored this ${getAreaLabel(work.area).toLowerCase()} activity.`}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline text-sm flex items-center gap-1">
            ← {t('common.backToDashboard')}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4 pb-8">

        {/* ══════════════════════════════════════════════
            REPORT HEADER — child name, week, summary
            ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {childName.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">
                  {locale === 'zh' ? `${childName}的学习报告` : `${childName}'s Learning Report`}
                </h1>
                <p className="text-emerald-100 text-sm">{formatWeekDisplay()}</p>
              </div>
            </div>

            {/* Quick stats */}
            {allWorks.length > 0 && (
              <div className="flex gap-3 mt-4">
                {masteredCount > 0 && (
                  <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                    <p className="text-lg font-bold">⭐ {masteredCount}</p>
                    <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已掌握' : 'Mastered'}</p>
                  </div>
                )}
                {practicingCount > 0 && (
                  <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                    <p className="text-lg font-bold">🔄 {practicingCount}</p>
                    <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '练习中' : 'Practicing'}</p>
                  </div>
                )}
                {presentedCount > 0 && (
                  <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                    <p className="text-lg font-bold">🌱 {presentedCount}</p>
                    <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已展示' : 'Introduced'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inspiring summary / greeting */}
          {report.parent_summary && (
            <div className="px-5 py-4 border-l-4 border-emerald-400 bg-emerald-50 mx-4 mt-4 mb-2 rounded-r-xl">
              <p className="text-gray-700 leading-relaxed text-[15px]">{report.parent_summary}</p>
            </div>
          )}

          {/* Highlights */}
          {report.highlights && report.highlights.length > 0 && (
            <div className="px-5 py-3 pb-4">
              {report.highlights.map((item, i) => {
                const text = typeof item === 'string' ? item : `${(item as any).work} (${(item as any).status})`;
                return (
                  <p key={i} className="text-gray-600 text-sm leading-relaxed mb-1">
                    ⭐ {text}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            VIEW CONTROLS — Grid/Timeline + Area Filters
            (Gallery-style)
            ══════════════════════════════════════════════ */}
        {allWorks.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => { setViewMode('grid'); setSelectedArea(null); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {locale === 'zh' ? '全部' : 'All Activities'}
                </button>
                <button
                  onClick={() => { setViewMode('timeline'); setSelectedArea(null); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'timeline' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {locale === 'zh' ? '时间线' : 'Timeline'}
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {filteredWorks.length} {locale === 'zh' ? '项活动' : filteredWorks.length === 1 ? 'activity' : 'activities'}
              </span>
            </div>

            {/* Area filter chips — Gallery-style */}
            {viewMode === 'grid' && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  onClick={() => setSelectedArea(null)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors border-2 flex-shrink-0 ${
                    !selectedArea ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                  }`}
                >
                  {locale === 'zh' ? '全部' : 'All'}
                </button>
                {AREA_ORDER.map(area => {
                  const config = AREA_CONFIG[area];
                  const count = worksByArea[area]?.length || 0;
                  if (count === 0) return null;
                  const isActive = selectedArea === area;
                  return (
                    <button
                      key={area}
                      onClick={() => setSelectedArea(isActive ? null : area)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1.5 border-2 flex-shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.emoji}
                      </div>
                      <span>{locale === 'zh' ? config.labelZh : config.label}</span>
                      <span className="text-xs opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            WORK CARDS — Gallery-style photo grid
            ══════════════════════════════════════════════ */}
        {filteredWorks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">
              {selectedArea
                ? (locale === 'zh' ? '此领域暂无活动记录' : 'No activities in this area yet')
                : (locale === 'zh' ? '本周暂无活动记录' : 'No activities recorded this week')}
            </p>
          </div>
        ) : viewMode === 'timeline' ? (
          // Timeline view — grouped by date (like Gallery timeline)
          <div className="space-y-6">
            {timelineGroups.map(([dateKey, dateWorks]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-gray-800 text-sm">
                    {new Date(dateKey + 'T12:00:00').toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">
                    {dateWorks.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dateWorks.map((work, i) => renderWorkCard(work, i))}
                </div>
              </div>
            ))}
          </div>
        ) : selectedArea ? (
          // Single area view
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredWorks.map((work, i) => renderWorkCard(work, i))}
          </div>
        ) : (
          // Default grid view — grouped by area (like Gallery)
          <div className="space-y-6">
            {AREA_ORDER.map(area => {
              const areaWorks = worksByArea[area] || [];
              if (areaWorks.length === 0) return null;
              const config = AREA_CONFIG[area];
              return (
                <div key={area}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{locale === 'zh' ? config.labelZh : config.label}</p>
                      <p className="text-xs text-gray-500">
                        {areaWorks.length} {locale === 'zh' ? '项活动' : areaWorks.length === 1 ? 'activity' : 'activities'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {areaWorks.map((work, i) => renderWorkCard(work, i))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            EXTRA PHOTOS (not matched to works)
            ══════════════════════════════════════════════ */}
        {!selectedArea && report.all_photos && report.all_photos.length > 0 && (() => {
          const inlinePhotoUrls = new Set(allWorks.filter(w => w.photo_url).map(w => w.photo_url!));
          const extraPhotos = report.all_photos.filter(p => !inlinePhotoUrls.has(p.url));
          if (extraPhotos.length === 0) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">📸</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{locale === 'zh' ? '更多瞬间' : 'More Moments'}</p>
                  <p className="text-xs text-gray-500">{extraPhotos.length} {locale === 'zh' ? '张照片' : 'photos'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {extraPhotos.map((photo, i) => (
                  <button
                    key={photo.id || i}
                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                    className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm cursor-zoom-in relative group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.work_name || 'Activity photo'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-medium backdrop-blur-sm">
                      {formatDate(photo.captured_at)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════
            RECOMMENDATIONS — Try This at Home
            ══════════════════════════════════════════════ */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
              💡 {locale === 'zh' ? '在家可以这样做' : 'Try This at Home'}
            </h2>
            <div className="space-y-2">
              {report.recommendations.map((item, i) => (
                <p key={i} className="text-amber-900 text-sm leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CLOSING — Inspiring sign-off
            ══════════════════════════════════════════════ */}
        {report.closing && (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-gray-600 leading-relaxed">{report.closing} 🌿</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          {new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {' · Montree'}
        </div>
      </main>

      {/* Photo Lightbox with navigation */}
      {(() => {
        const safeIndex = Math.min(lightboxIndex, Math.max(lightboxPhotos.length - 1, 0));
        const currentPhoto = lightboxPhotos[safeIndex];
        return (
          <PhotoLightbox
            isOpen={lightboxOpen && lightboxPhotos.length > 0}
            onClose={() => setLightboxOpen(false)}
            src={currentPhoto?.url || ''}
            alt={currentPhoto?.caption || 'Activity photo'}
            photos={lightboxPhotos}
            currentIndex={safeIndex}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        );
      })()}
    </div>
  );
}

// --- Status Badge ---

function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const isZh = locale === 'zh';
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', label: isZh ? '🌱 已展示' : '🌱 Introduced' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: isZh ? '🔄 练习中' : '🔄 Practicing' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    documented: { bg: 'bg-purple-100', text: 'text-purple-700', label: isZh ? '📸 已记录' : '📸 Documented' },
  };

  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: '○ Started' };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
