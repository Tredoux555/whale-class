'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

interface HighlightItem {
  work: string;
  status: string;
}

interface ReportData {
  id: string;
  week_number: number | null;
  report_year: number | null;
  week_start: string | null;
  week_end: string | null;
  parent_summary: string | null;
  highlights: HighlightItem[] | string[] | null;
  areas_of_growth: string[] | null;
  recommendations: string[] | null;
  created_at: string;
  child: {
    name: string;
    nickname: string | null;
  };
  works_completed: {
    work_name: string;
    chineseName?: string | null;
    area: string;
    status: string;
    completed_at: string;
    photo_url: string | null;
    photo_caption: string | null;
    parent_description: string | null;
    why_it_matters: string | null;
  }[];
  all_photos?: {
    id: string;
    url: string;
    caption: string | null;
    work_name: string | null;
    captured_at: string;
  }[];
}

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
    if (!reportId) {
      return; // Wait until reportId is available
    }

    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}?locale=${locale}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load report');
        return;
      }

      // Null safety: ensure child data exists
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
    // Check session
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    loadReport();
  }, [reportId, router, loadReport]);

  const areaEmoji: Record<string, string> = {
    practical_life: '🧹',
    sensorial: '👁️',
    mathematics: '🔢',
    math: '🔢',
    language: '📚',
    cultural: '🌍',
    art: '🎨',
    music: '🎵',
    physical: '🏃'
  };

  // Format week display with fallback to date range
  const formatWeekDisplay = () => {
    if (!report) return '';
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    if (report.week_number && report.report_year) {
      return locale === 'zh'
        ? `${report.report_year}年 第${report.week_number}周`
        : `Week ${report.week_number}, ${report.report_year}`;
    }
    // Fallback to date range
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const formatDate = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    // Last resort: use created_at
    const created = new Date(report.created_at);
    const weekOf = t('parentReport.weekOf');
    return `${weekOf} ${created.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}`;
  };

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

  // Download a photo by fetching as blob and triggering save
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
      // Fallback: open in new tab so they can long-press/right-click to save
      window.open(url, '_blank');
    }
  };

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

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Report Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
              {childName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {locale === 'zh' ? `${childName}的${t('parentReport.weeklyReport')}` : `${childName}'s ${t('parentReport.weeklyReport')}`}
              </h1>
              <p className="text-gray-500">{formatWeekDisplay()}</p>
            </div>
          </div>
          
          {report.parent_summary && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-gray-700 leading-relaxed">{report.parent_summary}</p>
            </div>
          )}
        </div>

        {/* Highlights */}
        {report.highlights && report.highlights.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>⭐</span> {t('parentReport.highlights')}
            </h2>
            <ul className="space-y-2">
              {report.highlights.map((item, i) => {
                const text = typeof item === 'string' ? item : `${item.work} (${item.status})`;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span className="text-gray-700">{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Areas of Growth */}
        {report.areas_of_growth && report.areas_of_growth.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🌱</span> {t('parentReport.areasOfGrowth')}
            </h2>
            <ul className="space-y-2">
              {report.areas_of_growth.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Works Completed */}
        {report.works_completed && report.works_completed.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 px-2">
              <span>📋</span> {t('parentReport.worksThisWeek')} ({report.works_completed.length})
            </h2>
            {report.works_completed.map((work, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                {/* Work header */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    work.status === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                    work.status === 'practicing' ? 'bg-blue-100 text-blue-700' :
                    work.status === 'documented' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {work.status === 'mastered' ? t('parentReport.statusMastered') :
                     work.status === 'practicing' ? t('parentReport.statusPracticing') :
                     work.status === 'documented' ? t('parentReport.statusDocumented') :
                     t('parentReport.statusIntroduced')}
                  </span>
                  <h4 className="font-bold text-gray-800">{locale === 'zh' && work.chineseName ? work.chineseName : work.work_name}</h4>
                </div>

                {/* Photo — tap to zoom */}
                {work.photo_url && (
                  <div className="relative -mx-4 my-3">
                    <button
                      onClick={() => { setLightboxSrc(work.photo_url!); setLightboxOpen(true); }}
                      className="aspect-[4/3] w-full overflow-hidden rounded-lg shadow-lg relative group block cursor-zoom-in"
                    >
                      <img
                        src={work.photo_url}
                        alt={work.work_name}
                        className="w-full h-full object-cover"
                      />
                      <span
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(work.photo_url!, work.work_name); }}
                        className="absolute bottom-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
                        title={t('common.save')}
                      >
                        ⬇
                      </span>
                    </button>
                    {work.photo_caption && (
                      <p className="mt-2 px-4 text-sm text-gray-600 italic text-center">{work.photo_caption}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {work.parent_description ? (
                  <div className="space-y-2">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {work.parent_description}
                    </p>
                    {work.why_it_matters && (
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">💡 {t('parentReport.whyItMatters')}</p>
                        <p className="text-sm text-emerald-800">{work.why_it_matters}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Fallback when no description - just show area and activity label
                  <p className="text-gray-600 text-sm">
                    {areaEmoji[work.area] || '📌'}
                    {locale === 'zh'
                      ? `您的孩子在${t(`area.${work.area}`) || work.area.replace('_', ' ')}领域进行了练习。`
                      : `Your child practiced this ${t(`area.${work.area}`) || work.area.replace('_', ' ')} activity.`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Additional Photos — only show photos NOT already displayed inline with works */}
        {report.all_photos && report.all_photos.length > 0 && (() => {
          // Build set of photo URLs already shown inline with works
          const inlinePhotoUrls = new Set(
            (report.works_completed || [])
              .filter(w => w.photo_url)
              .map(w => w.photo_url!)
          );
          const extraPhotos = report.all_photos.filter(p => !inlinePhotoUrls.has(p.url));
          if (extraPhotos.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📸</span> {t('parentReport.photosThisWeek')} ({extraPhotos.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {extraPhotos.map((photo, i) => (
                  <div key={photo.id || i} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden shadow-md relative">
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.work_name || 'Activity photo'}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => downloadPhoto(photo.url, photo.caption || photo.work_name || `photo_${i + 1}`)}
                        className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm text-sm"
                        title={t('common.save')}
                      >
                        ⬇
                      </button>
                    </div>
                    {(photo.caption || photo.work_name) && (
                      <p className="mt-1 text-xs text-gray-600 text-center truncate">
                        {photo.caption || photo.work_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💡</span> {t('parentReport.recommendationsForHome')}
            </h2>
            <ul className="space-y-2">
              {report.recommendations.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          {t('parentReport.reportGenerated')} {new Date(report.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </main>

      {/* Photo Lightbox — fullscreen zoom + download */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={lightboxSrc}
      />
    </div>
  );
}
