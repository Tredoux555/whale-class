'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

// --- Types ---

interface Child {
  id: string;
  name: string;
  nickname: string | null;
  date_of_birth?: string | null;
  photo_url?: string | null;
}

interface WeeklyReport {
  id: string;
  week_number: number | null;
  report_year: number | null;
  week_start: string | null;
  week_end: string | null;
  parent_summary: string | null;
  created_at: string;
}

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

interface FullReport {
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
  narrative: { summary?: string; generated_at?: string; model?: string } | null;
  created_at: string;
  child: { name: string; nickname: string | null };
  works_completed: WorkItem[];
  all_photos?: { id: string; url: string; caption: string | null; work_name: string | null; captured_at: string }[];
}

// --- Area Config ---

const AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string }> = {
  practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899' },
  sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6' },
  mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
  math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
  language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b' },
  cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e' },
};

function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [latestReport, setLatestReport] = useState<FullReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- Auth & Init ---
  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) { router.push('/montree/parent'); return; }

    try {
      const session = JSON.parse(sessionStr);
      if (session.expires < Date.now()) {
        localStorage.removeItem('montree_parent_session');
        localStorage.removeItem('montree_selected_child');
        router.push('/montree/parent');
        return;
      }

      if (session.childId && session.childName) {
        const directChild: Child = { id: session.childId, name: session.childName, nickname: session.childName };
        setChildren([directChild]);
        setSelectedChild(directChild);
        loadReports(session.childId);
        setLoading(false);
      } else if (session.parentId) {
        loadChildren(session.parentId);
      } else {
        localStorage.removeItem('montree_parent_session');
        router.push('/montree/parent');
      }
    } catch {
      router.push('/montree/parent');
    }
  }, [router]);

  // --- Data Loading ---
  const loadChildren = async (parentId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/children?parentId=${parentId}`);
      if (!res.ok) { toast.error(t('parent.dashboard.failedToLoadChildren')); setLoading(false); return; }
      const data = await res.json();
      if (data.children) {
        setChildren(data.children);
        if (data.children.length === 1) {
          const child = data.children[0];
          setSelectedChild(child);
          localStorage.setItem('montree_selected_child', JSON.stringify({ id: child.id, name: child.nickname || child.name }));
          loadReports(child.id);
        }
      }
    } catch (err) {
      console.error('Failed to load children:', err);
      toast.error(t('parent.dashboard.failedToLoadChildren'));
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/reports?childId=${childId}&locale=${locale}`);
      if (!res.ok) { toast.error(t('parent.dashboard.failedToLoadReports')); return; }
      const data = await res.json();
      if (data.reports && data.reports.length > 0) {
        setReports(data.reports);
        // Auto-load the latest report
        loadFullReport(data.reports[0].id);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error(t('parent.dashboard.failedToLoadReports'));
    }
  };

  const loadFullReport = useCallback(async (reportId: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}?locale=${locale}`);
      const data = await res.json();
      if (res.ok && data.report) {
        if (!data.report.child) data.report.child = { name: 'Child', nickname: null };
        setLatestReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load full report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [locale]);

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    setLatestReport(null);
    setPastReportsOpen(false);
    localStorage.setItem('montree_selected_child', JSON.stringify({ id: child.id, name: child.nickname || child.name }));
    loadReports(child.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_parent_session');
    localStorage.removeItem('montree_selected_child');
    router.push('/montree/parent');
  };

  // --- Report Data ---
  const allWorks: WorkItem[] = useMemo(() => {
    if (!latestReport) return [];
    if (latestReport.areas_explored && latestReport.areas_explored.length > 0) {
      return latestReport.areas_explored.flatMap(ag => ag.works);
    }
    return latestReport.works_completed || [];
  }, [latestReport]);

  const photoWorks = useMemo(() => allWorks.filter(w => w.photo_url), [allWorks]);

  const masteredCount = allWorks.filter(w => w.status === 'mastered' || w.status === 'completed').length;
  const practicingCount = allWorks.filter(w => w.status === 'practicing').length;
  const presentedCount = allWorks.filter(w => w.status === 'presented').length;

  const lightboxPhotos = useMemo(() => {
    return photoWorks.map(w => ({ url: w.photo_url!, caption: w.photo_caption || undefined, date: w.completed_at }));
  }, [photoWorks]);

  // Past reports = all except the first (latest)
  const pastReports = reports.slice(1);

  // --- Helpers ---
  const childName = selectedChild?.nickname || selectedChild?.name || '';
  const firstName = childName.split(' ')[0];

  const getAreaConfig = (area: string) => AREA_CONFIG[normalizeArea(area)] || AREA_CONFIG['cultural'];
  const getAreaLabel = (area: string) => {
    const conf = getAreaConfig(area);
    const labels: Record<string, string> = { en: conf.label, zh: conf.labelZh };
    return labels[locale || 'en'] || conf.label;
  };

  const STATUS_LABELS: Record<string, Record<string, string>> = {
    mastered: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    completed: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    practicing: { en: 'Practicing', zh: '练习中', es: 'Practicando' },
    presented: { en: 'Introduced', zh: '已展示', es: 'Presentado' },
    default: { en: 'Documented', zh: '已记录', es: 'Documentado' },
  };
  const STATUS_META: Record<string, { icon: string; color: string; bg: string }> = {
    mastered: { icon: '⭐', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    completed: { icon: '⭐', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    practicing: { icon: '🔄', color: 'text-blue-700', bg: 'bg-blue-50' },
    presented: { icon: '🌱', color: 'text-amber-700', bg: 'bg-amber-50' },
    default: { icon: '📸', color: 'text-purple-700', bg: 'bg-purple-50' },
  };
  const getStatusInfo = (status: string) => {
    const key = STATUS_LABELS[status] ? status : 'default';
    const label = STATUS_LABELS[key][locale || 'en'] || STATUS_LABELS[key]['en'];
    const meta = STATUS_META[key] || STATUS_META['default'];
    return { label, ...meta };
  };

  const formatWeekRange = (report: WeeklyReport | FullReport) => {
    const dateLocale = getIntlLocale(locale);
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return t('parentDashboard.weekLabel', { week: report.week_number, year: report.report_year });
    }
    const created = new Date(report.created_at);
    return created.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
  };

  const formatWeekShort = (report: WeeklyReport) => {
    const dateLocale = getIntlLocale(locale);
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return t('parentDashboard.weekOnly', { week: report.week_number });
    }
    return new Date(report.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />

      {/* ═══ Sticky Header ═══ */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌳</span>
            <span className="font-semibold text-gray-800 text-sm">Montree</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
            >
              {t('parent.dashboard.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">

        {/* ═══ Multi-child Selector ═══ */}
        {children.length > 1 && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-2 overflow-x-auto">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleSelectChild(child)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedChild?.id === child.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {child.name.charAt(0)}
                  </span>
                  {child.nickname || child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedChild ? (
          <>
            {/* ═══ Child Hero ═══ */}
            <div className="px-5 pt-8 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-200">
                  {selectedChild.photo_url ? (
                    <img src={selectedChild.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    firstName.charAt(0)
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {firstName}
                  </h1>
                  {latestReport && (
                    <p className="text-gray-400 text-sm mt-1">
                      {formatWeekRange(latestReport)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Latest Report Inline ═══ */}
            {loadingReport ? (
              <div className="px-5 py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-48 bg-gray-100 rounded-xl mt-6" />
                </div>
              </div>
            ) : latestReport ? (
              <>
                {/* Quick stats pills */}
                {allWorks.length > 0 && (
                  <div className="px-5 pb-4">
                    <div className="flex gap-2 flex-wrap">
                      {masteredCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          ⭐ {masteredCount} {t('parentDashboard.mastered')}
                        </span>
                      )}
                      {practicingCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          🔄 {practicingCount} {t('parentDashboard.practicing')}
                        </span>
                      )}
                      {presentedCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          🌱 {presentedCount} {t('parentDashboard.new')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Narrative */}
                {(latestReport.narrative?.summary || latestReport.parent_summary) && (
                  <div className="px-5 pb-6">
                    <div className="border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl px-5 py-4">
                      <p className="text-gray-800 text-[15px] leading-relaxed">
                        {latestReport.narrative?.summary || latestReport.parent_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Photo divider */}
                {photoWorks.length > 0 && (
                  <div className="px-5 pb-3">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                      {t('parentDashboard.thisWeekMoments', { count: photoWorks.length })}
                    </p>
                  </div>
                )}

                {/* Photo cards */}
                <div className="space-y-0">
                  {photoWorks.map((work, index) => {
                    const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
                    const areaConf = getAreaConfig(work.area);
                    const statusInfo = getStatusInfo(work.status);

                    return (
                      <div key={`${work.work_name}-${index}`} className="border-b border-gray-100">
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
                        <div className="px-5 py-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: areaConf.color }}
                            >
                              {areaConf.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{displayName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{getAreaLabel(work.area)}</span>
                                <span className="text-gray-300">·</span>
                                <span className={`text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          {work.parent_description && (
                            <p className="text-gray-700 text-[15px] leading-relaxed">{work.parent_description}</p>
                          )}
                          {work.why_it_matters && (
                            <div className="bg-gray-50 rounded-xl px-4 py-3">
                              <p className="text-xs font-semibold text-gray-500 mb-1">
                                {t('parentDashboard.whyItMatters')}
                              </p>
                              <p className="text-gray-700 text-sm leading-relaxed">{work.why_it_matters}</p>
                            </div>
                          )}
                          {work.photo_caption && (
                            <div className="bg-blue-50 rounded-xl px-4 py-3">
                              <p className="text-xs font-semibold text-blue-600 mb-1">
                                {t('parentDashboard.teachersNote')}
                              </p>
                              <p className="text-blue-800 text-sm leading-relaxed">{work.photo_caption}</p>
                            </div>
                          )}
                          {!work.parent_description && !work.why_it_matters && !work.photo_caption && (
                            <p className="text-gray-400 text-sm">
                              {t('parentDashboard.exploredActivity', { name: firstName, area: getAreaLabel(work.area).toLowerCase() })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Extra photos */}
                {latestReport.all_photos && latestReport.all_photos.length > 0 && (() => {
                  const usedUrls = new Set(photoWorks.map(w => w.photo_url));
                  const extraPhotos = latestReport.all_photos!.filter(p => !usedUrls.has(p.url));
                  if (extraPhotos.length === 0) return null;
                  return (
                    <div className="px-5 py-6 border-t border-gray-100">
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                        {t('parentDashboard.moreMoments')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {extraPhotos.map((photo, i) => (
                          <button
                            key={photo.id || i}
                            onClick={() => { setLightboxIndex(photoWorks.length + i); setLightboxOpen(true); }}
                            className="aspect-square rounded-xl overflow-hidden"
                          >
                            <img src={photo.url} alt={photo.caption || 'Activity'} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Try this at home */}
                {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                  <div className="px-5 py-6 border-t border-gray-100">
                    <h2 className="font-bold text-gray-800 text-sm mb-3">
                      {t('parentDashboard.tryThisAtHome')}
                    </h2>
                    <div className="space-y-2">
                      {latestReport.recommendations.map((item, i) => (
                        <p key={i} className="text-gray-600 text-sm leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-emerald-400">•</span>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing */}
                {latestReport.closing && (
                  <div className="px-5 py-6 border-t border-gray-100 text-center">
                    <p className="text-gray-600 leading-relaxed">{latestReport.closing}</p>
                  </div>
                )}

                {/* No activities */}
                {allWorks.length === 0 && !latestReport.narrative?.summary && !latestReport.parent_summary && (
                  <div className="px-5 py-16 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-gray-400">
                      {t('parentDashboard.noActivitiesThisWeek')}
                    </p>
                  </div>
                )}
              </>
            ) : reports.length === 0 ? (
              /* No reports at all */
              <div className="px-5 py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌱</span>
                </div>
                <p className="text-gray-500 font-medium">
                  {t('parentDashboard.firstReportOnWay')}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {t('parentDashboard.checkBackSoon')}
                </p>
              </div>
            ) : null}

            {/* ═══ Past Reports — Collapsed ═══ */}
            {pastReports.length > 0 && (
              <div className="px-5 py-6 border-t border-gray-100">
                <button
                  onClick={() => setPastReportsOpen(!pastReportsOpen)}
                  className="w-full flex items-center justify-between py-2 group"
                >
                  <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">
                    {t('parentDashboard.pastReports', { count: pastReports.length })}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${pastReportsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {pastReportsOpen && (
                  <div className="mt-2 space-y-2">
                    {pastReports.map(report => (
                      <Link
                        key={report.id}
                        href={`/montree/parent/report/${report.id}`}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors group"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors">
                            {formatWeekShort(report)}
                          </span>
                          {report.parent_summary && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{report.parent_summary}</p>
                          )}
                        </div>
                        <span className="text-gray-300 group-hover:text-emerald-500 transition-colors">→</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ Footer ═══ */}
            <div className="text-center text-xs text-gray-300 py-8">
              Montree
            </div>
          </>
        ) : (
          /* No Child Selected (multi-child only) */
          <div className="px-5 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👆</span>
            </div>
            <p className="text-gray-500">{t('parent.dashboard.selectChild')}</p>
          </div>
        )}
      </main>

      {/* ═══ Photo Lightbox ═══ */}
      {latestReport && (() => {
        const extraPhotos = (latestReport.all_photos || [])
          .filter(p => !new Set(photoWorks.map(w => w.photo_url)).has(p.url));
        const allLightboxPhotos = [
          ...lightboxPhotos,
          ...extraPhotos.map(p => ({ url: p.url, caption: p.caption || undefined, date: p.captured_at })),
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
