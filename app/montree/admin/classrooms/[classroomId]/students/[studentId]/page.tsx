// /montree/admin/classrooms/[classroomId]/students/[studentId]/page.tsx
// Student detail view for principals — progress + reports + Guru quick report
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';

interface AreaProgress {
  area: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  progressPercent: number;
  currentWork?: { name: string };
}

interface ProgressSummary {
  areas: AreaProgress[];
  overall: { completed: number; total: number; percent: number };
}

interface ProgressItem {
  work_name: string;
  area: string;
  status: string;
  updated_at: string;
}

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  generated_at: string;
  sent_at: string | null;
  content: Record<string, unknown>;
}

interface GuruResponse {
  success: boolean;
  insight?: string;
  root_cause?: string;
  action_plan?: { priority: number; action: string; details: string }[];
  timeline?: string;
  parent_talking_point?: string;
  error?: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: '#ec4899',
  sensorial: '#8b5cf6',
  mathematics: '#3b82f6',
  language: '#22c55e',
  cultural: '#f97316',
};

// Area names now come from i18n — this is a fallback only
const AREA_NAMES_FALLBACK: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export default function StudentDetailPage({ params }: { params: Promise<{ classroomId: string; studentId: string }> }) {
  const { classroomId, studentId } = use(params);
  const router = useRouter();
  const { t, locale } = useI18n();
  const areaName = (key: string) => t(`area.${key}` as any) || AREA_NAMES_FALLBACK[key] || key;

  const [student, setStudent] = useState<{ name: string; photo_url: string | null; age: number | null } | null>(null);
  const [classroomName, setClassroomName] = useState('');
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [stats, setStats] = useState<{ presented: number; practicing: number; mastered: number } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Guru state
  const [guruLoading, setGuruLoading] = useState(false);
  const [guruResponse, setGuruResponse] = useState<GuruResponse | null>(null);
  const [guruQuestion, setGuruQuestion] = useState('');
  const [showGuru, setShowGuru] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [studentId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Parallel fetches
      const [summaryRes, progressRes, reportsRes, classroomRes] = await Promise.all([
        fetch(`/api/montree/progress/summary?child_id=${studentId}`),
        fetch(`/api/montree/progress?child_id=${studentId}&include_observations=true`),
        fetch(`/api/montree/reports?child_id=${studentId}&limit=10`).catch(() => null),
        fetch(`/api/montree/admin/classrooms/${classroomId}`),
      ]);

      // Summary (area bars)
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Progress (stats + items)
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setStats(progressData.stats);
        // Get student info from the first progress item or fetch separately
      }

      // Reports
      if (reportsRes?.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData.reports || []);
      }

      // Classroom + student info
      if (classroomRes.ok) {
        const classroomData = await classroomRes.json();
        setClassroomName(classroomData.classroom?.name || '');
        const s = classroomData.students?.find((s: { id: string }) => s.id === studentId);
        if (s) setStudent({ name: s.name, photo_url: s.photo_url, age: s.age });
      }
    } catch {
      toast.error(t('admin.errors.failedToLoadStudentData'));
    } finally {
      setLoading(false);
    }
  };

  const askGuru = async (question: string) => {
    if (!question.trim()) return;
    setGuruLoading(true);
    setGuruResponse(null);
    try {
      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: studentId,
          question,
          classroom_id: classroomId,
          role: 'principal',
        }),
      });
      const data = await res.json();
      setGuruResponse(data);
    } catch {
      setGuruResponse({ success: false, error: t('admin.errors.failedToGetResponse') });
    } finally {
      setGuruLoading(false);
    }
  };

  const generateQuickReport = () => {
    setShowGuru(true);
    const q = `Give me a complete progress summary for ${student?.name || 'this child'} that I can share with their parent who is sitting with me right now. Include what they've mastered, what they're currently working on, and suggestions for home support.`;
    setGuruQuestion(q);
    askGuru(q);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('admin.messages.copiedToClipboard'));
  };

  const formatGuruForCopy = () => {
    if (!guruResponse?.success) return '';
    const parts = [];
    if (guruResponse.insight) parts.push(`Summary: ${guruResponse.insight}`);
    if (guruResponse.action_plan?.length) {
      parts.push('\nSuggestions for Home:');
      guruResponse.action_plan.forEach((a, i) => parts.push(`${i + 1}. ${a.action}: ${a.details}`));
    }
    if (guruResponse.parent_talking_point) parts.push(`\n${guruResponse.parent_talking_point}`);
    return parts.join('\n');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="text-5xl animate-bounce">📊</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/montree/admin/classrooms/${classroomId}`)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            ←
          </button>
          {/* Student avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center overflow-hidden">
            {student?.photo_url ? (
              <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold">{student?.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{student?.name || 'Student'}</h1>
            <p className="text-emerald-100 text-xs">{classroomName}{student?.age ? ` · ${student.age} years old` : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

        {/* Hero Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">⭐</div>
              <div className="text-2xl font-bold text-white">{stats.mastered}</div>
              <div className="text-emerald-300 text-xs">Mastered</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">🔄</div>
              <div className="text-2xl font-bold text-white">{stats.practicing}</div>
              <div className="text-emerald-300 text-xs">Practicing</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">📋</div>
              <div className="text-2xl font-bold text-white">{stats.presented}</div>
              <div className="text-emerald-300 text-xs">Presented</div>
            </div>
          </div>
        )}

        {/* Quick Report Button */}
        <button
          onClick={generateQuickReport}
          disabled={guruLoading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60"
        >
          {guruLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🧠</span> {t('admin.states.generatingReport')}
            </span>
          ) : (
            <span>🤖 {t('admin.actions.generateReportForParent')}</span>
          )}
        </button>

        {/* Guru Response (inline) */}
        {showGuru && (guruLoading || guruResponse) && (
          <div className="bg-white/10 rounded-2xl p-5 border border-emerald-500/30">
            {guruLoading && !guruResponse && (
              <div className="text-center py-8">
                <div className="text-4xl animate-bounce mb-3">🧠</div>
                <p className="text-emerald-300">{t('admin.messages.analyzingProgress').replace('{name}', student?.name || 'Student')}</p>
              </div>
            )}

            {guruResponse?.success && (
              <div className="space-y-4">
                {/* Insight */}
                {guruResponse.insight && (
                  <div>
                    <h3 className="text-emerald-400 text-sm font-medium mb-1">💡 {t('admin.labels.summary')}</h3>
                    <p className="text-white/90 text-sm leading-relaxed">{guruResponse.insight}</p>
                  </div>
                )}

                {/* Action Plan */}
                {guruResponse.action_plan && guruResponse.action_plan.length > 0 && (
                  <div>
                    <h3 className="text-emerald-400 text-sm font-medium mb-2">📋 {t('admin.labels.suggestionsForHome')}</h3>
                    <div className="space-y-2">
                      {guruResponse.action_plan.map((a, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 bg-emerald-500/30 rounded-full flex items-center justify-center text-emerald-300 text-xs font-bold">{a.priority}</span>
                          <div>
                            <span className="text-white font-medium">{a.action}:</span>
                            <span className="text-white/70 ml-1">{a.details}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {guruResponse.timeline && (
                  <div className="bg-amber-500/10 rounded-lg p-3">
                    <h3 className="text-amber-400 text-xs font-medium mb-1">⏰ {t('admin.labels.timeline')}</h3>
                    <p className="text-white/80 text-sm">{guruResponse.timeline}</p>
                  </div>
                )}

                {/* Parent Talking Point */}
                {guruResponse.parent_talking_point && (
                  <div className="bg-emerald-500/10 rounded-lg p-3">
                    <h3 className="text-emerald-400 text-xs font-medium mb-1">💬 {t('admin.labels.sayToParent')}</h3>
                    <p className="text-white/90 text-sm italic">&ldquo;{guruResponse.parent_talking_point}&rdquo;</p>
                  </div>
                )}

                {/* Copy + Follow-up */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => copyToClipboard(formatGuruForCopy())}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {copied ? '✓ ' + t('admin.actions.copied') : '📋 ' + t('admin.actions.copySummary')}
                  </button>
                </div>

                {/* Follow-up question */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guruQuestion}
                      onChange={e => setGuruQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && guruQuestion.trim()) askGuru(guruQuestion); }}
                      placeholder={t('admin.form.askFollowUpQuestion')}
                      className="flex-1 px-4 py-2 bg-black/20 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30"
                    />
                    <button
                      onClick={() => askGuru(guruQuestion)}
                      disabled={guruLoading || !guruQuestion.trim()}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {t('admin.actions.ask')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {guruResponse && !guruResponse.success && (
              <div className="text-center py-4">
                <p className="text-red-300 text-sm">{guruResponse.error || t('admin.errors.somethingWentWrong')}</p>
                <button onClick={generateQuickReport} className="mt-2 px-4 py-2 bg-white/10 text-white rounded-lg text-sm">{t('admin.actions.tryAgain')}</button>
              </div>
            )}
          </div>
        )}

        {/* Progress Bars */}
        {summary?.areas && summary.areas.length > 0 && (
          <div className="bg-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">{t('admin.sections.progressByArea')}</h2>
            <div className="space-y-3">
              {summary.areas.map(area => (
                <div key={area.area}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AREA_COLORS[area.area] || '#6b7280' }} />
                      <span className="text-white text-sm font-medium">{areaName(area.area)}</span>
                    </div>
                    <span className="text-emerald-300 text-xs">{area.completed}/{area.totalWorks} ({area.progressPercent}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${area.progressPercent}%`, backgroundColor: AREA_COLORS[area.area] || '#6b7280' }}
                    />
                  </div>
                  {area.currentWork && (
                    <p className="text-white/40 text-xs mt-0.5">{t('admin.labels.currently')}: {area.currentWork.name}</p>
                  )}
                </div>
              ))}

              {/* Overall */}
              {summary.overall && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-semibold text-sm">{t('admin.labels.overall')}</span>
                    <span className="text-emerald-300 text-sm font-medium">{summary.overall.percent}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${summary.overall.percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Sent to Parents */}
        <div className="bg-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">{t('admin.sections.reportsSentToParents')}</h2>
          {reports.length === 0 ? (
            <p className="text-white/50 text-sm text-center py-4">{t('admin.emptyStates.noReportsSent')}</p>
          ) : (
            <div className="space-y-2">
              {reports.map(report => {
                const weekStart = new Date(report.week_start).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
                const weekEnd = new Date(report.week_end).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
                const sentDate = report.sent_at ? new Date(report.sent_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                const isExpanded = expandedReport === report.id;
                const content = report.content as Record<string, unknown>;
                const works = (content?.works as Array<{ name: string; area: string; status: number }>) || [];

                return (
                  <div key={report.id} className="bg-black/20 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
                    >
                      <div>
                        <span className="text-white text-sm font-medium">{t('admin.labels.weekOf')} {weekStart} – {weekEnd}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sentDate && <span className="text-emerald-300/60 text-xs">{t('admin.labels.sent')} {sentDate}</span>}
                          <span className="text-white/40 text-xs">{works.length} {t('admin.labels.works')}</span>
                        </div>
                      </div>
                      <span className={`text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {isExpanded && works.length > 0 && (
                      <div className="px-4 pb-3 space-y-1">
                        {works.map((w, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs py-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS[w.area?.toLowerCase()] || '#6b7280' }} />
                            <span className="text-white/80">{w.name}</span>
                            <span className="text-white/40">
                              {w.status === 3 ? '⭐ ' + t('admin.states.mastered') : w.status === 2 ? '🔄 ' + t('admin.states.practicing') : '📋 ' + t('admin.states.presented')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Questions for Guru */}
        {!showGuru && (
          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-white/50 text-xs mb-3">{t('admin.labels.quickQuestionsForGuru')}:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                `How is ${student?.name || 'this child'} doing overall?`,
                `What should ${student?.name || 'this child'}'s focus be next?`,
                `What can parents do at home to support ${student?.name || 'this child'}?`,
                `Are there any areas where ${student?.name || 'this child'} needs extra attention?`,
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setShowGuru(true); setGuruQuestion(q); askGuru(q); }}
                  className="text-left px-3 py-2 bg-white/5 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
