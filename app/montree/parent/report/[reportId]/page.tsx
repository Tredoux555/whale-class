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

// --- Area Config ---

const AREA_CONFIG: Record<string, { emoji: string; bg: string; text: string; border: string }> = {
  practical_life: { emoji: '🧹', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  sensorial: { emoji: '👁️', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  mathematics: { emoji: '🔢', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  math: { emoji: '🔢', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  language: { emoji: '📚', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  cultural: { emoji: '🌍', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// --- Component ---

export default function ParentReportPage() {
  const router = useRouter();
  const params = useParams();
  const { t, locale } = useI18n();
  const reportId = params.reportId as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  // Group works by area — use areas_explored from API if available, else build locally
  const groupedByArea: AreaGroup[] = useMemo(() => {
    if (!report) return [];

    // If the API returned pre-grouped areas, use them
    if (report.areas_explored && report.areas_explored.length > 0) {
      return report.areas_explored;
    }

    // Fallback: group works_completed by area
    const grouped: Record<string, WorkItem[]> = {};
    for (const w of report.works_completed || []) {
      const area = w.area || 'other';
      if (!grouped[area]) grouped[area] = [];
      grouped[area].push(w);
    }

    const result: AreaGroup[] = [];
    // Add in AREA_ORDER first
    for (const area of AREA_ORDER) {
      if (grouped[area] && grouped[area].length > 0) {
        const conf = AREA_CONFIG[area];
        result.push({
          area_key: area,
          area_name: t(`area.${area}` as any) || (conf ? area.replace('_', ' ') : area),
          works: grouped[area],
        });
      }
    }
    // Then any other areas
    for (const [area, works] of Object.entries(grouped)) {
      if (!AREA_ORDER.includes(area) && works.length > 0) {
        result.push({
          area_key: area,
          area_name: t(`area.${area}` as any) || area.replace('_', ' '),
          works,
        });
      }
    }
    return result;
  }, [report, t]);

  // Format week display
  const formatWeekDisplay = () => {
    if (!report) return '';
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    if (report.week_number && report.report_year) {
      return locale === 'zh'
        ? `${report.report_year}年 第${report.week_number}周`
        : `Week ${report.week_number}, ${report.report_year}`;
    }
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const formatDate = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
    const created = new Date(report.created_at);
    return `${t('parentReport.weekOf')} ${created.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}`;
  };

  // Download helper
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

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-600">{t('parentReport.loading')}</p>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
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

  const childName = report.child?.nickname || report.child?.name || '';
  const totalWorks = report.works_completed?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline text-sm flex items-center gap-1">
            ← {t('common.backToDashboard')}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5">

        {/* ── Report Header ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                {childName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {locale === 'zh' ? `${childName}的${t('parentReport.weeklyReport')}` : `${childName}'s ${t('parentReport.weeklyReport')}`}
                </h1>
                <p className="text-emerald-100 text-sm">{formatWeekDisplay()}</p>
              </div>
            </div>
          </div>

          {/* Greeting */}
          {report.parent_summary && (
            <div className="px-5 py-4 border-l-4 border-emerald-400 bg-emerald-50 mx-4 mt-4 mb-2 rounded-r-xl">
              <p className="text-gray-700 leading-relaxed text-[15px]">{report.parent_summary}</p>
            </div>
          )}

          {/* Highlights */}
          {report.highlights && report.highlights.length > 0 && (
            <div className="px-5 py-3">
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

        {/* ── Works by Area ── */}
        {groupedByArea.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 px-1">
              📋 {t('parentReport.worksThisWeek')} ({totalWorks})
            </h2>

            {groupedByArea.map((areaGroup) => {
              const conf = AREA_CONFIG[areaGroup.area_key] || { emoji: '📌', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

              return (
                <div key={areaGroup.area_key} className="space-y-3">
                  {/* Area Header */}
                  <div className={`${conf.bg} ${conf.text} ${conf.border} border rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-2`}>
                    <span>{conf.emoji}</span>
                    <span>{areaGroup.area_name}</span>
                  </div>

                  {/* Work Cards — Option B: photo on top, text below */}
                  {areaGroup.works.map((work, i) => (
                    <WorkCard
                      key={`${areaGroup.area_key}-${work.work_name}-${i}`}
                      work={work}
                      locale={locale}
                      t={t}
                      onPhotoTap={(url) => { setLightboxSrc(url); setLightboxOpen(true); }}
                      onDownload={downloadPhoto}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── No works fallback ── */}
        {groupedByArea.length === 0 && totalWorks === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-400">{t('reports.noProgressThisWeek' as any) || 'No activities recorded this week.'}</p>
          </div>
        )}

        {/* ── Extra Photos (not matched to works) ── */}
        {report.all_photos && report.all_photos.length > 0 && (() => {
          const inlinePhotoUrls = new Set(
            (report.works_completed || [])
              .filter(w => w.photo_url)
              .map(w => w.photo_url!)
          );
          const extraPhotos = report.all_photos.filter(p => !inlinePhotoUrls.has(p.url));
          if (extraPhotos.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                📸 {t('parentReport.morePhotos')} ({extraPhotos.length})
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {extraPhotos.map((photo, i) => (
                  <button
                    key={photo.id || i}
                    onClick={() => { setLightboxSrc(photo.url); setLightboxOpen(true); }}
                    className="aspect-square rounded-lg overflow-hidden shadow-sm cursor-zoom-in"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.work_name || 'Activity photo'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Recommendations ── */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              💡 {t('parentReport.recommendationsForHome')}
            </h2>
            <ul className="space-y-2">
              {report.recommendations.map((item, i) => (
                <li key={i} className="text-amber-900 text-sm leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Closing ── */}
        {report.closing && (
          <div className="text-center py-3">
            <p className="text-gray-600 leading-relaxed">{report.closing} 🌿</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center text-xs text-gray-400 py-4">
          {t('parentReport.reportGenerated')} {new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {' · Montree'}
        </div>
      </main>

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={lightboxSrc}
      />
    </div>
  );
}

// --- Work Card (Option B) ---

function WorkCard({
  work,
  locale,
  t,
  onPhotoTap,
  onDownload,
}: {
  work: WorkItem;
  locale: string;
  t: (key: any, fallback?: string) => string;
  onPhotoTap: (url: string) => void;
  onDownload: (url: string, name: string) => void;
}) {
  const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Photo — compact, not hero-sized */}
      {work.photo_url && (
        <div className="relative">
          <button
            onClick={() => onPhotoTap(work.photo_url!)}
            className="w-full h-48 overflow-hidden block cursor-zoom-in"
          >
            <img
              src={work.photo_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(work.photo_url!, work.work_name); }}
            className="absolute bottom-2 right-2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-xs backdrop-blur-sm transition-colors"
            title={t('common.save')}
          >
            ⬇
          </button>
          {work.photo_caption && (
            <p className="px-4 py-1.5 text-xs text-gray-500 italic text-center bg-gray-50">{work.photo_caption}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Status + Name */}
        <div className="flex items-center gap-2">
          <StatusBadge status={work.status} locale={locale} />
          <h4 className="font-bold text-gray-800 text-[15px]">{displayName}</h4>
        </div>

        {/* Description */}
        {work.parent_description ? (
          <p className="text-gray-600 text-sm leading-relaxed">{work.parent_description}</p>
        ) : (
          <p className="text-gray-400 text-sm">
            {locale === 'zh'
              ? `您的孩子在${t(`area.${work.area}` as any) || work.area.replace('_', ' ')}领域进行了练习。`
              : `Your child practiced this ${work.area.replace('_', ' ')} activity.`}
          </p>
        )}

        {/* Why It Matters */}
        {work.why_it_matters && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-semibold text-emerald-700 mb-0.5">💡 {t('parentReport.whyItMatters')}</p>
            <p className="text-xs text-emerald-800 leading-relaxed">{work.why_it_matters}</p>
          </div>
        )}
      </div>
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
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
