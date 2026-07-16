// /montree/dashboard/[childId]/weekly-review/page.tsx
// Weekly Review: Two-tab system for teacher review + parent report
// Teacher tab: group discussion review with "Update Shelf" action
// Parent tab: polished narrative with "Send Report" action
// Both tabs support AI refinement via teacher feedback chat
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast, Toaster } from 'sonner';
import UpgradeCard, { extractUpgradeFromResponse } from '@/components/montree/UpgradeCard';

type Tab = 'teacher' | 'parent';
type Status = 'idle' | 'generating' | 'ready' | 'refining' | 'applying' | 'sending';

interface FocusWorkSummary {
  area: string;
  work_name: string;
  status: string;
}

export default function WeeklyReviewPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('teacher');

  // Report state (separate for each tab)
  const [teacherReport, setTeacherReport] = useState('');
  const [parentReport, setParentReport] = useState('');
  const [teacherStatus, setTeacherStatus] = useState<Status>('idle');
  const [parentStatus, setParentStatus] = useState<Status>('idle');

  // Child info
  const [childName, setChildName] = useState('');
  const [weekRange, setWeekRange] = useState('');
  const [focusWorks, setFocusWorks] = useState<FocusWorkSummary[]>([]);

  // Feedback chat
  const [feedback, setFeedback] = useState('');
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  // Shelf update results
  const [shelfResult, setShelfResult] = useState<{
    applied: Array<{ area: string; work_name: string }>;
    skipped: Array<{ area: string; reason: string }>;
  } | null>(null);

  // Send results
  const [sendResult, setSendResult] = useState<{ sent: number; parent_count: number } | null>(null);

  // AbortController for cleanup
  const abortRef = useRef<AbortController | null>(null);

  // 402 + requires_upgrade → render UpgradeCard at top instead of error toast.
  const [upgrade, setUpgrade] = useState<{ feature: string; upgradeUrl: string } | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const currentReport = activeTab === 'teacher' ? teacherReport : parentReport;
  const currentStatus = activeTab === 'teacher' ? teacherStatus : parentStatus;
  const setCurrentReport = activeTab === 'teacher' ? setTeacherReport : setParentReport;
  const setCurrentStatus = activeTab === 'teacher' ? setTeacherStatus : setParentStatus;

  // ── Generate report ──
  const generateReport = useCallback(async (type: Tab) => {
    const setStatus = type === 'teacher' ? setTeacherStatus : setParentStatus;
    const setReport = type === 'teacher' ? setTeacherReport : setParentReport;

    setStatus('generating');
    setReport('');
    setShelfResult(null);
    setSendResult(null);
    setUpgrade(null);

    try {
      abortRef.current = new AbortController();
      const res = await montreeApi(`/api/montree/weekly-review/${childId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, locale }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) {
          setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl });
          setStatus('idle');
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate');
      }

      const data = await res.json();
      setReport(data.report);
      setChildName(data.child_name || '');
      setWeekRange(`${data.week_start || ''} – ${data.week_end || ''}`);
      setFocusWorks(data.focus_works || []);
      setStatus('ready');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Generate error:', err);
      toast.error(t('weeklyReview.generateFailed' as any) || 'Failed to generate report');
      setStatus('idle');
    }
  }, [childId, locale, t]);

  // ── Refine report via feedback ──
  const refineReport = useCallback(async () => {
    if (!feedback.trim() || !currentReport) return;

    const setStatus = activeTab === 'teacher' ? setTeacherStatus : setParentStatus;
    const setReport = activeTab === 'teacher' ? setTeacherReport : setParentReport;

    setStatus('refining');
    setUpgrade(null);
    try {
      abortRef.current = new AbortController();
      const res = await montreeApi(`/api/montree/weekly-review/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          feedback: feedback.trim(),
          current_report: currentReport,
          locale,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) {
          setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl });
          setStatus('ready');
          return;
        }
      }

      if (!res.ok) throw new Error('Refinement failed');

      const data = await res.json();
      setReport(data.report);
      setFeedback('');
      setStatus('ready');
      toast.success(t('weeklyReview.refined' as any) || 'Report updated');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Refine error:', err);
      toast.error(t('weeklyReview.refineFailed' as any) || 'Failed to refine');
      setStatus('ready');
    }
  }, [feedback, currentReport, activeTab, childId, locale, t]);

  // ── Apply shelf updates ──
  const applyShelf = useCallback(async () => {
    if (!teacherReport) return;
    setTeacherStatus('applying');
    setShelfResult(null);

    try {
      const res = await montreeApi(`/api/montree/weekly-review/${childId}/apply-shelf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: teacherReport }),
      });

      if (!res.ok) throw new Error('Apply failed');

      const data = await res.json();
      setShelfResult({ applied: data.applied, skipped: data.skipped });
      setTeacherStatus('ready');
      toast.success(
        (t('weeklyReview.shelfUpdated' as any) || '{count} works updated on shelf')
          .replace('{count}', String(data.total_applied))
      );
    } catch (err) {
      console.error('Apply shelf error:', err);
      toast.error(t('weeklyReview.shelfFailed' as any) || 'Failed to update shelf');
      setTeacherStatus('ready');
    }
  }, [teacherReport, childId, t]);

  // ── Send parent report ──
  const sendReport = useCallback(async () => {
    if (!parentReport) return;
    setParentStatus('sending');
    setSendResult(null);

    try {
      const res = await montreeApi(`/api/montree/weekly-review/${childId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_text: parentReport, locale }),
      });

      if (!res.ok) throw new Error('Send failed');

      const data = await res.json();
      setSendResult({ sent: data.sent, parent_count: data.parent_count });
      setParentStatus('ready');

      if (data.sent > 0) {
        toast.success(
          (t('weeklyReview.reportSent' as any) || 'Report sent to {count} parent(s)')
            .replace('{count}', String(data.sent))
        );
      } else if (data.parent_count === 0) {
        toast.info(t('weeklyReview.noParentsLinked' as any) || 'No parents linked — report saved');
      } else {
        toast.warning(t('weeklyReview.sendFailed' as any) || 'Email sending failed — report saved');
      }
    } catch (err) {
      console.error('Send report error:', err);
      toast.error(t('weeklyReview.sendError' as any) || 'Failed to send report');
      setParentStatus('ready');
    }
  }, [parentReport, childId, locale, t]);

  // ── Area badge color ──
  const areaColor = (area: string) => {
    const colors: Record<string, string> = {
      practical_life: 'bg-rose-400',
      sensorial: 'bg-amber-400',
      mathematics: 'bg-blue-400',
      language: 'bg-emerald-400',
      cultural: 'bg-violet-400',
    };
    return colors[area] || 'bg-white/30';
  };

  const areaLabel = (area: string) => {
    const labels: Record<string, string> = { practical_life: 'P', sensorial: 'S', mathematics: 'M', language: 'L', cultural: 'C' };
    return labels[area] || '?';
  };

  // ── Render ──
  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-2xl mb-4">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/montree/dashboard/${childId}`}
            className="text-white/40 hover:text-white/70 text-xl"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>
              {t('weeklyReview.title' as any) || 'Weekly Review'}
              {childName && ` — ${childName}`}
            </h1>
            {weekRange && (
              <p className="text-xs text-white/40">{weekRange}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'teacher'
                ? 'bg-[#34d399]/10 text-[#34d399] border-b-2 border-[#34d399]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t('weeklyReview.teacherTab' as any) || 'Teacher Review'}
          </button>
          <button
            onClick={() => setActiveTab('parent')}
            className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'parent'
                ? 'bg-[#34d399]/10 text-[#34d399] border-b-2 border-[#34d399]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t('weeklyReview.parentTab' as any) || 'Parent Report'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Tier-gate upgrade prompt — replaces the toast.error red banner so a
            free-tier school sees a clear "set up billing" CTA instead. */}
        {upgrade && (
          <UpgradeCard feature={upgrade.feature} upgradeUrl={upgrade.upgradeUrl} />
        )}

        {/* Generate button (when idle) */}
        {currentStatus === 'idle' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">{activeTab === 'teacher' ? '📋' : '💌'}</div>
            <p className="text-white/55 mb-6 text-sm">
              {activeTab === 'teacher'
                ? (t('weeklyReview.teacherDescription' as any) || 'Generate a structured review for your team discussion. The AI will analyze this week\'s progress, explain work connections, and suggest next steps.')
                : (t('weeklyReview.parentDescription' as any) || 'Generate a warm, professional update for parents. Explains what their child did, why it matters, and what\'s coming next.')
              }
            </p>
            <button
              onClick={() => generateReport(activeTab)}
              className="px-6 py-3 rounded-xl text-white font-medium text-sm bg-[#1D6B48] hover:bg-[#236B4C]"
            >
              {t('weeklyReview.generate' as any) || 'Generate Review'}
            </button>
          </div>
        )}

        {/* Loading */}
        {currentStatus === 'generating' && (
          <div className="text-center py-12">
            <div className="animate-spin text-3xl mb-4">🌀</div>
            <p className="text-white/55 text-sm">
              {t('weeklyReview.generating' as any) || 'Analyzing this week\'s data...'}
            </p>
          </div>
        )}

        {/* Report content (ready, refining, applying, sending) */}
        {(currentStatus === 'ready' || currentStatus === 'refining' || currentStatus === 'applying' || currentStatus === 'sending') && currentReport && (
          <>
            {/* Focus works summary badges */}
            {focusWorks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {focusWorks.map(fw => (
                  <span
                    key={fw.area}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-[rgba(52,211,153,0.15)] text-xs"
                  >
                    <span className={`w-4 h-4 rounded-full ${areaColor(fw.area)} text-white text-[9px] font-bold flex items-center justify-center`}>
                      {areaLabel(fw.area)}
                    </span>
                    <span className="text-white/70 truncate max-w-[120px]">{fw.work_name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      fw.status === 'mastered' ? 'bg-emerald-400' :
                      fw.status === 'practicing' ? 'bg-amber-400' :
                      fw.status === 'presented' ? 'bg-blue-400' : 'bg-white/30'
                    }`} />
                  </span>
                ))}
              </div>
            )}

            {/* Report text */}
            <div className="bg-white/[0.06] rounded-2xl border border-[rgba(52,211,153,0.15)] p-5">
              <div className="prose prose-sm prose-invert max-w-none text-white/80 leading-relaxed whitespace-pre-wrap">
                {currentReport}
              </div>
            </div>

            {/* Shelf update results */}
            {shelfResult && (
              <div className="rounded-xl p-4 border border-[rgba(52,211,153,0.2)]" style={{ background: 'rgba(52,211,153,0.08)' }}>
                <p className="text-sm font-medium text-emerald-200 mb-2">
                  {t('weeklyReview.shelfUpdatedTitle' as any) || 'Shelf Updated'}
                </p>
                {shelfResult.applied.map(a => (
                  <p key={a.area} className="text-xs text-emerald-300">
                    ✅ {a.area.replace('_', ' ')}: {a.work_name}
                  </p>
                ))}
                {shelfResult.skipped.map((s, i) => (
                  <p key={i} className="text-xs text-amber-300">
                    ⚠️ {s.area}: {s.reason}
                  </p>
                ))}
              </div>
            )}

            {/* Send results */}
            {sendResult && (
              <div className="rounded-xl p-4 border border-blue-500/20" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <p className="text-sm font-medium text-blue-200">
                  {sendResult.sent > 0
                    ? `✅ ${(t('weeklyReview.sentTo' as any) || 'Sent to {count} parent(s)').replace('{count}', String(sendResult.sent))}`
                    : sendResult.parent_count === 0
                      ? (t('weeklyReview.noParentsLinked' as any) || 'No parents linked yet — report saved to records')
                      : (t('weeklyReview.emailFailed' as any) || 'Email failed — report saved to records')
                  }
                </p>
              </div>
            )}

            {/* Feedback input */}
            <div className="bg-white/[0.06] rounded-2xl border border-[rgba(52,211,153,0.15)] p-4">
              <label className="text-xs font-medium text-white/50 mb-2 block">
                {activeTab === 'teacher'
                  ? (t('weeklyReview.teacherFeedbackLabel' as any) || 'Adjust the plan — tell the AI what to change:')
                  : (t('weeklyReview.parentFeedbackLabel' as any) || 'Refine the report — tell the AI what to adjust:')
                }
              </label>
              <textarea
                ref={feedbackRef}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder={activeTab === 'teacher'
                  ? (t('weeklyReview.teacherFeedbackPlaceholder' as any) || 'e.g. "Switch math to golden beads — she\'s ready" or "Add a note about her concentration improving"')
                  : (t('weeklyReview.parentFeedbackPlaceholder' as any) || 'e.g. "Make the tone warmer" or "Mention the pouring activity specifically"')
                }
                className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-xl text-sm text-white/90 placeholder-white/40 resize-none focus:outline-none focus:border-[#34d399]"
                rows={2}
                maxLength={2000}
                disabled={currentStatus === 'refining'}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={refineReport}
                  disabled={!feedback.trim() || currentStatus === 'refining'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    feedback.trim() && currentStatus !== 'refining'
                      ? 'bg-[#1D6B48] text-white hover:bg-[#236B4C]'
                      : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
                  }`}
                >
                  {currentStatus === 'refining'
                    ? (t('weeklyReview.refining' as any) || 'Updating...')
                    : (t('weeklyReview.refine' as any) || 'Update Report')
                  }
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {/* Regenerate */}
              <button
                onClick={() => generateReport(activeTab)}
                disabled={currentStatus === 'refining' || currentStatus === 'applying' || currentStatus === 'sending'}
                className="flex-1 py-3 rounded-xl border border-[rgba(52,211,153,0.2)] text-white/70 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-50"
              >
                {t('weeklyReview.regenerate' as any) || 'Regenerate'}
              </button>

              {/* Primary action */}
              {activeTab === 'teacher' ? (
                <button
                  onClick={applyShelf}
                  disabled={currentStatus === 'applying' || currentStatus === 'refining'}
                  className="flex-1 py-3 rounded-xl bg-[#1D6B48] text-white text-sm font-medium hover:bg-[#236B4C] disabled:opacity-50"
                >
                  {currentStatus === 'applying'
                    ? (t('weeklyReview.updatingShelf' as any) || 'Updating Shelf...')
                    : (t('weeklyReview.updateShelf' as any) || 'Update Shelf')
                  }
                </button>
              ) : (
                <button
                  onClick={sendReport}
                  disabled={currentStatus === 'sending' || currentStatus === 'refining'}
                  className="flex-1 py-3 rounded-xl bg-[#1D6B48] text-white text-sm font-medium hover:bg-[#236B4C] disabled:opacity-50"
                >
                  {currentStatus === 'sending'
                    ? (t('weeklyReview.sendingReport' as any) || 'Sending...')
                    : (t('weeklyReview.sendReport' as any) || 'Send Report')
                  }
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
