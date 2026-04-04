// /montree/dashboard/weekly-wrap/page.tsx
// Weekly Wrap review page — teacher previews all reports before sending to parents
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';

const TeacherReportView = dynamic(
  () => import('@/components/montree/reports/TeacherReportView'),
  { ssr: false }
);

interface ReportResult {
  child_id: string;
  child_name: string;
  teacher_report: Record<string, unknown> | null;
  parent_narrative: string | null;
  photo_count: number;
  flags_count: number;
  report_id: string | null;
}

export default function WeeklyWrapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  const weekStart = searchParams.get('week') || '';
  const weekEnd = searchParams.get('week_end') || '';
  const weekNumber = parseInt(searchParams.get('wn') || '0');
  const reportYear = parseInt(searchParams.get('yr') || '0');

  const [session, setSession] = useState<{ classroom: { id: string; name: string }; school: { id: string } } | null>(null);
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load session
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);
  }, [router]);

  // Load reports for this week
  const loadReports = useCallback(async () => {
    if (!session || !weekNumber || !reportYear) return;
    setLoading(true);
    setError('');

    try {
      const res = await montreeApi(
        `/api/montree/reports/weekly-wrap/review?classroom_id=${session.classroom.id}&week_number=${weekNumber}&report_year=${reportYear}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load reports');
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      console.error('Load reports error:', err);
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [session, weekNumber, reportYear]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Sort: flags first, then alphabetical
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      if (a.flags_count !== b.flags_count) return b.flags_count - a.flags_count;
      return a.child_name.localeCompare(b.child_name);
    });
  }, [reports]);

  const flaggedReports = sortedReports.filter(r => r.flags_count > 0);
  const onTrackReports = sortedReports.filter(r => r.flags_count === 0);

  // Stats
  const totalPhotos = reports.reduce((s, r) => s + r.photo_count, 0);
  const totalFlags = reports.reduce((s, r) => s + r.flags_count, 0);

  // Format week display
  const weekDisplay = weekStart
    ? (() => {
        const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
        const start = new Date(weekStart);
        const end = weekEnd ? new Date(weekEnd) : start;
        const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
        return `${fmt(start)} – ${fmt(end)}`;
      })()
    : `Week ${weekNumber}, ${reportYear}`;

  // Send all to parents
  const handleSendAll = async () => {
    if (!session || sending) return;
    if (!confirm(locale === 'zh'
      ? `确定要向所有家长发送 ${reports.length} 份报告吗？`
      : `Send ${reports.length} reports to all parents?`
    )) return;

    setSending(true);
    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom.id,
          week_number: weekNumber,
          report_year: reportYear,
          locale,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Send failed');
      }

      const data = await res.json();
      setSent(true);
      alert(locale === 'zh'
        ? `已发送 ${data.published} 份报告，${data.emails_sent} 封邮件`
        : `Published ${data.published} reports, sent ${data.emails_sent} emails`
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to send reports');
    } finally {
      setSending(false);
    }
  };

  // Render child card
  const renderChildCard = (r: ReportResult) => {
    const firstName = r.child_name.split(' ')[0];
    const isExpanded = expandedChild === r.child_id;

    return (
      <div
        key={r.child_id}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all"
      >
        {/* Header — always visible */}
        <button
          onClick={() => setExpandedChild(isExpanded ? null : r.child_id)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {firstName.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{r.child_name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>📸 {r.photo_count}</span>
              {r.flags_count > 0 && (
                <span className="text-amber-600 font-medium">
                  {r.flags_count} {r.flags_count === 1 ? 'flag' : 'flags'}
                </span>
              )}
            </div>
          </div>

          {/* Parent narrative preview */}
          {r.parent_narrative && !isExpanded && (
            <p className="text-xs text-gray-400 truncate max-w-[200px] hidden sm:block">
              {r.parent_narrative.substring(0, 80)}...
            </p>
          )}

          {/* Expand arrow */}
          <span className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {/* Tabs: Teacher Report | Parent Preview */}
            <div className="flex gap-4 py-3 border-b border-gray-100 mb-3">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Teacher Report
              </span>
            </div>

            {/* Teacher Report */}
            {r.teacher_report ? (
              <TeacherReportView
                report={r.teacher_report as any}
                childName={r.child_name}
              />
            ) : (
              <p className="text-sm text-gray-400 italic py-4">
                No teacher report generated yet.
              </p>
            )}

            {/* Parent narrative preview */}
            {r.parent_narrative && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Parent Report Preview
                </p>
                <div className="border-l-4 border-emerald-300 pl-3 bg-emerald-50/30 py-2 rounded-r-lg">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{r.parent_narrative}"
                  </p>
                </div>
                {r.report_id && (
                  <a
                    href={`/montree/parent/report/${r.report_id}?teacher_preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-emerald-600 font-medium hover:underline"
                  >
                    Open full parent report →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/montree/dashboard"
              className="text-emerald-600 text-sm font-medium hover:underline"
            >
              ← {locale === 'zh' ? '返回' : 'Back'}
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {locale === 'zh' ? '周报回顾' : 'Weekly Wrap'}
              </h1>
              <p className="text-xs text-gray-400">{weekDisplay}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{reports.length} {locale === 'zh' ? '学生' : 'children'}</span>
            <span>📸 {totalPhotos}</span>
            {totalFlags > 0 && (
              <span className="text-amber-600 font-medium">{totalFlags} flags</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Needs Attention section */}
        {flaggedReports.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">
              {locale === 'zh' ? '需要关注' : 'Needs Attention'} ({flaggedReports.length})
            </h2>
            <div className="space-y-2">
              {flaggedReports.map(renderChildCard)}
            </div>
          </section>
        )}

        {/* On Track section */}
        {onTrackReports.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">
              {locale === 'zh' ? '正常发展' : 'On Track'} ({onTrackReports.length})
            </h2>
            <div className="space-y-2">
              {onTrackReports.map(renderChildCard)}
            </div>
          </section>
        )}

        {reports.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400">
              {locale === 'zh' ? '没有找到报告' : 'No reports found for this week'}
            </p>
          </div>
        )}
      </main>

      {/* Sticky bottom bar — Send All */}
      {reports.length > 0 && !sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {locale === 'zh'
                ? `${reports.length} 份家长报告准备就绪`
                : `${reports.length} parent reports ready to send`}
            </p>
            <button
              onClick={handleSendAll}
              disabled={sending}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {sending
                ? (locale === 'zh' ? '发送中...' : 'Sending...')
                : (locale === 'zh' ? `发送给所有家长` : `Send All to Parents`)}
            </button>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-emerald-600 p-4 z-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white font-semibold">
              ✅ {locale === 'zh' ? '所有报告已发送！' : 'All reports sent to parents!'}
            </p>
            <Link
              href="/montree/dashboard"
              className="text-emerald-100 text-sm underline mt-1 inline-block"
            >
              {locale === 'zh' ? '返回仪表板' : 'Back to Dashboard'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
