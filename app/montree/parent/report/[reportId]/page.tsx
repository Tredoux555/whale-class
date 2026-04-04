// /montree/parent/report/[reportId]/page.tsx
// Parent Report — Mobile-first linear scroll with big photos
// Sonnet narrative intro → scrollable photo cards with descriptions
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
  narrative: {
    summary?: string;
    generated_at?: string;
    model?: string;
  } | null;
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

// --- Area Config ---

const AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string; gradient: string }> = {
  practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
  sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6', gradient: 'from-purple-500 to-violet-500' },
  mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
  math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
  language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e', gradient: 'from-green-500 to-emerald-500' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

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

  // Build linear work list (all works with photos first, then without)
  const allWorks: WorkItem[] = useMemo(() => {
    if (!report) return [];
    if (report.areas_explored && report.areas_explored.length > 0) {
      return report.areas_explored.flatMap(ag => ag.works);
    }
    return report.works_completed || [];
  }, [report]);

  // Works with photos (these are the "cards" parents scroll through)
  const photoWorks = useMemo(() => allWorks.filter(w => w.photo_url), [allWorks]);

  // Stats
  const masteredCount = allWorks.filter(w => w.status === 'mastered' || w.status === 'completed').length;
  const practicingCount = allWorks.filter(w => w.status === 'practicing').length;
  const presentedCount = allWorks.filter(w => w.status === 'presented').length;

  // Photos for lightbox
  const lightboxPhotos = useMemo(() => {
    return photoWorks.map(w => ({
      url: w.photo_url!,
      caption: w.photo_caption || undefined,
      date: w.completed_at,
    }));
  }, [photoWorks]);

  // Helpers
  const childName = report?.child?.nickname || report?.child?.name || '';
  const firstName = childName.split(' ')[0];

  const formatWeekDisplay = () => {
    if (!report) return '';
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return locale === 'zh'
        ? `${report.report_year}年 第${report.week_number}周`
        : `Week ${report.week_number}, ${report.report_year}`;
    }
    return '';
  };

  const getAreaConfig = (area: string) =>
    AREA_CONFIG[normalizeArea(area)] || AREA_CONFIG['cultural'];

  const getAreaLabel = (area: string) => {
    const conf = getAreaConfig(area);
    return locale === 'zh' ? conf.labelZh : conf.label;
  };

  // Status display
  const getStatusInfo = (status: string) => {
    const isZh = locale === 'zh';
    switch (status) {
      case 'mastered':
      case 'completed':
        return { label: isZh ? '已掌握' : 'Mastered', icon: '⭐', color: 'text-emerald-700', bg: 'bg-emerald-50' };
      case 'practicing':
        return { label: isZh ? '练习中' : 'Practicing', icon: '🔄', color: 'text-blue-700', bg: 'bg-blue-50' };
      case 'presented':
        return { label: isZh ? '已展示' : 'Introduced', icon: '🌱', color: 'text-amber-700', bg: 'bg-amber-50' };
      default:
        return { label: isZh ? '已记录' : 'Documented', icon: '📸', color: 'text-purple-700', bg: 'bg-purple-50' };
    }
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto p-6">
          <div className="animate-pulse space-y-6 mt-12">
            <div className="h-8 bg-gray-100 rounded-lg w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-4/6" />
            </div>
            <div className="h-64 bg-gray-100 rounded-xl" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !report) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error || t('parentReport.notFound')}</p>
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline">
            ← {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-white">

      {/* ═══ Sticky Header ═══ */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/montree/parent/dashboard" className="text-emerald-600 text-sm flex items-center gap-1 font-medium">
            ← {locale === 'zh' ? '返回' : 'Back'}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto">

        {/* ═══ Hero Section ═══ */}
        <div className="px-5 pt-8 pb-6">
          {/* Child initial + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {firstName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {locale === 'zh' ? `${firstName}的一周` : `${firstName}'s Week`}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{formatWeekDisplay()}</p>
            </div>
          </div>

          {/* Quick stats row */}
          {allWorks.length > 0 && (
            <div className="flex gap-3 mb-6">
              {masteredCount > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>⭐</span> {masteredCount} {locale === 'zh' ? '掌握' : 'mastered'}
                </div>
              )}
              {practicingCount > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>🔄</span> {practicingCount} {locale === 'zh' ? '练习' : 'practicing'}
                </div>
              )}
              {presentedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>🌱</span> {presentedCount} {locale === 'zh' ? '新展示' : 'new'}
                </div>
              )}
            </div>
          )}

          {/* ═══ AI Narrative Summary ═══ */}
          {report.narrative?.summary ? (
            <div className="border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl px-5 py-4 mb-2">
              <p className="text-gray-800 text-[15px] leading-relaxed">
                {report.narrative.summary}
              </p>
            </div>
          ) : report.parent_summary ? (
            <div className="border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl px-5 py-4 mb-2">
              <p className="text-gray-800 text-[15px] leading-relaxed">
                {report.parent_summary}
              </p>
            </div>
          ) : null}
        </div>

        {/* ═══ Divider ═══ */}
        {photoWorks.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              {locale === 'zh'
                ? `本周照片记录 · ${photoWorks.length}项`
                : `This Week's Moments · ${photoWorks.length} activities`}
            </p>
          </div>
        )}

        {/* ═══ Photo Cards — Linear Scroll ═══ */}
        <div className="space-y-0">
          {photoWorks.map((work, index) => {
            const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
            const areaConf = getAreaConfig(work.area);
            const statusInfo = getStatusInfo(work.status);

            return (
              <div key={`${work.work_name}-${index}`} className="border-b border-gray-100">
                {/* Big photo — full width */}
                <button
                  onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                  className="w-full block"
                >
                  <img
                    src={work.photo_url!}
                    alt={displayName}
                    className="w-full aspect-[4/3] object-cover"
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                </button>

                {/* Work info — below photo */}
                <div className="px-5 py-4 space-y-3">
                  {/* Area badge + Work name + Status */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: areaConf.color }}
                    >
                      {areaConf.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{getAreaLabel(work.area)}</span>
                        <span className="text-gray-300">·</span>
                        <span className={`text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parent description — what the work is and why it matters */}
                  {work.parent_description && (
                    <p className="text-gray-700 text-[15px] leading-relaxed">
                      {work.parent_description}
                    </p>
                  )}

                  {/* Why it matters — developmental insight */}
                  {work.why_it_matters && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        {locale === 'zh' ? '为什么重要' : 'Why this matters'}
                      </p>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {work.why_it_matters}
                      </p>
                    </div>
                  )}

                  {/* Teacher's note */}
                  {work.photo_caption && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-blue-600 mb-1">
                        {locale === 'zh' ? '老师的观察' : "Teacher's Note"}
                      </p>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        {work.photo_caption}
                      </p>
                    </div>
                  )}

                  {/* Fallback if no descriptions at all */}
                  {!work.parent_description && !work.why_it_matters && !work.photo_caption && (
                    <p className="text-gray-400 text-sm">
                      {locale === 'zh'
                        ? `${firstName}在${getAreaLabel(work.area)}方面进行了学习。`
                        : `${firstName} explored this ${getAreaLabel(work.area).toLowerCase()} activity.`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Extra Photos (not matched to works) ═══ */}
        {report.all_photos && report.all_photos.length > 0 && (() => {
          const usedUrls = new Set(photoWorks.map(w => w.photo_url));
          const extraPhotos = report.all_photos.filter(p => !usedUrls.has(p.url));
          if (extraPhotos.length === 0) return null;
          return (
            <div className="px-5 py-6 border-t border-gray-100">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                {locale === 'zh' ? '更多瞬间' : 'More Moments'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {extraPhotos.map((photo, i) => (
                  <button
                    key={photo.id || i}
                    onClick={() => {
                      // Find index in lightbox photos — add these at the end
                      setLightboxIndex(photoWorks.length + i);
                      setLightboxOpen(true);
                    }}
                    className="aspect-square rounded-xl overflow-hidden"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.work_name || 'Activity'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ Try This at Home ═══ */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="px-5 py-6 border-t border-gray-100">
            <h2 className="font-bold text-gray-800 text-sm mb-3">
              {locale === 'zh' ? '💡 在家可以这样做' : '💡 Try This at Home'}
            </h2>
            <div className="space-y-2">
              {report.recommendations.map((item, i) => (
                <p key={i} className="text-gray-600 text-sm leading-relaxed pl-4 relative">
                  <span className="absolute left-0 text-emerald-400">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Closing ═══ */}
        {report.closing && (
          <div className="px-5 py-6 border-t border-gray-100 text-center">
            <p className="text-gray-600 leading-relaxed">{report.closing}</p>
          </div>
        )}

        {/* ═══ No Activities ═══ */}
        {allWorks.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400">
              {locale === 'zh' ? '本周暂无活动记录' : 'No activities recorded this week'}
            </p>
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div className="text-center text-xs text-gray-300 py-8 border-t border-gray-50">
          {new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
          {' · Montree'}
        </div>
      </main>

      {/* ═══ Photo Lightbox ═══ */}
      {(() => {
        // Combine work photos + extra photos for full lightbox navigation
        const extraPhotos = (report.all_photos || [])
          .filter(p => !new Set(photoWorks.map(w => w.photo_url)).has(p.url));
        const allLightboxPhotos = [
          ...lightboxPhotos,
          ...extraPhotos.map(p => ({
            url: p.url,
            caption: p.caption || undefined,
            date: p.captured_at,
          })),
        ];
        const safeIndex = Math.min(lightboxIndex, Math.max(allLightboxPhotos.length - 1, 0));
        const currentPhoto = allLightboxPhotos[safeIndex];
        return (
          <PhotoLightbox
            isOpen={lightboxOpen && allLightboxPhotos.length > 0}
            onClose={() => setLightboxOpen(false)}
            src={currentPhoto?.url || ''}
            alt={currentPhoto?.caption || 'Activity photo'}
            photos={allLightboxPhotos}
            currentIndex={safeIndex}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        );
      })()}
    </div>
  );
}
