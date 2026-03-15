// /montree/admin/guru/page.tsx
// Principal Guru — search any student, generate reports, print action plans
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n/context';

interface Student {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  classroom_id: string;
  classroom_name: string;
  classroom_icon: string;
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

type ReportMode = 'principal' | 'parent' | 'home_plan';

// Escape HTML entities to prevent XSS in print output
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function GuruPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);

  // Auth
  const [schoolName, setSchoolName] = useState('');

  // Search
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Selected student
  const [selected, setSelected] = useState<Student | null>(null);

  // Guru
  const [guruLoading, setGuruLoading] = useState(false);
  const [guruResponse, setGuruResponse] = useState<GuruResponse | null>(null);
  const [reportMode, setReportMode] = useState<ReportMode | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ question: string; response: GuruResponse }[]>([]);
  const [copied, setCopied] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) { router.push('/montree/principal/login'); return; }
    const s = JSON.parse(schoolData);
    setSchoolName(s.name || '');
    fetchStudents();
  }, []);

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const s = schoolData ? JSON.parse(schoolData) : null;
    const p = principalData ? JSON.parse(principalData) : null;
    return { 'Content-Type': 'application/json', 'x-school-id': s?.id || '', 'x-principal-id': p?.id || '' };
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/montree/admin/students/search', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllStudents(data.students || []);
      }
    } catch { /* silent */ }
    finally { setLoadingStudents(false); }
  };

  // Filter students by search — show classroom to disambiguate same names
  const filteredStudents = searchQuery.trim()
    ? allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const selectStudent = (student: Student) => {
    setSelected(student);
    setSearchQuery('');
    setShowDropdown(false);
    setGuruResponse(null);
    setReportMode(null);
    setConversationHistory([]);
    setFollowUp('');
  };

  const clearStudent = () => {
    setSelected(null);
    setGuruResponse(null);
    setReportMode(null);
    setConversationHistory([]);
    setFollowUp('');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const askGuru = async (question: string, mode?: ReportMode) => {
    if (!selected || !question.trim()) return;
    setGuruLoading(true);
    setGuruResponse(null);
    setLastQuestion(question);
    if (mode) setReportMode(mode);

    try {
      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          child_id: selected.id,
          question,
          classroom_id: selected.classroom_id,
          role: 'principal',
        }),
      });
      const data = await res.json();
      setGuruResponse(data);
      if (data.success) {
        setConversationHistory(prev => [...prev, { question, response: data }]);
      }
    } catch {
      const errResp: GuruResponse = { success: false, error: t('admin.guru.failedToRespond') };
      setGuruResponse(errResp);
    } finally {
      setGuruLoading(false);
    }
  };

  const generateReport = (mode: ReportMode) => {
    if (!selected) return;
    const name = selected.name;

    const prompts: Record<ReportMode, string> = {
      principal: `Give me a comprehensive progress report for ${name}. Include: what works they've mastered and are currently practicing across all 5 Montessori areas, any behavioral observations, developmental strengths, areas that need attention, and specific recommendations. This is for my records as principal.`,
      parent: `Give me a simple, warm parent-friendly summary for ${name}'s parents. Focus on achievements and positive progress first, then gently mention areas of growth. Use plain language — no Montessori jargon. Include 2-3 specific things the parents can celebrate with their child. Keep it encouraging and concise.`,
      home_plan: `Create a home action plan for ${name}'s parents. Based on what ${name} is currently working on in school, give 4-5 specific activities the parents can do at home to reinforce their child's learning. Include: the activity name, materials needed (common household items only), how to do it, and which Montessori area it supports. Make it practical and fun — parents should be excited to try these.`,
    };

    askGuru(prompts[mode], mode);
  };

  const askFollowUp = () => {
    if (!followUp.trim()) return;
    askGuru(followUp);
    setFollowUp('');
  };

  const formatForPrint = (): string => {
    if (!guruResponse?.success || !selected) return '';
    const lines: string[] = [];
    const date = new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (reportMode === 'home_plan') {
      lines.push(`${t('admin.guru.printHomeActionPlan')} ${selected.name.toUpperCase()}`);
      lines.push(`${selected.classroom_icon} ${selected.classroom_name} · ${schoolName}`);
      lines.push(`${t('admin.guru.printPrepared')}: ${date}`);
      lines.push('─'.repeat(50));
    } else if (reportMode === 'parent') {
      lines.push(`${t('admin.guru.printProgressUpdate')} — ${selected.name.toUpperCase()}`);
      lines.push(`${selected.classroom_icon} ${selected.classroom_name} · ${schoolName}`);
      lines.push(`${t('admin.guru.printDate')}: ${date}`);
      lines.push('─'.repeat(50));
    } else {
      lines.push(`${t('admin.guru.printPrincipalReport')} — ${selected.name.toUpperCase()}`);
      lines.push(`${selected.classroom_icon} ${selected.classroom_name} · ${schoolName}`);
      lines.push(`${t('admin.guru.printDate')}: ${date}`);
      lines.push('─'.repeat(50));
    }

    lines.push('');

    if (guruResponse.insight) {
      lines.push(t('admin.guru.printOverview'));
      lines.push(guruResponse.insight);
      lines.push('');
    }

    if (guruResponse.action_plan?.length) {
      lines.push(reportMode === 'home_plan' ? t('admin.guru.printActivitiesForHome') : t('admin.guru.printRecommendations'));
      guruResponse.action_plan.forEach((a, i) => {
        lines.push(`${i + 1}. ${a.action}`);
        if (a.details) lines.push(`   ${a.details}`);
      });
      lines.push('');
    }

    if (guruResponse.timeline) {
      lines.push(t('admin.guru.printTimeline'));
      lines.push(guruResponse.timeline);
      lines.push('');
    }

    if (guruResponse.parent_talking_point) {
      lines.push(t('admin.guru.printNoteForParents'));
      lines.push(`"${guruResponse.parent_talking_point}"`);
      lines.push('');
    }

    lines.push('─'.repeat(50));
    lines.push(`Generated by Montree Guru · ${schoolName}`);

    return lines.join('\n');
  };

  const handlePrint = () => {
    const content = formatForPrint();
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error(t('admin.guru.allowPopups')); return; }

    const title = reportMode === 'home_plan'
      ? `Home Action Plan — ${selected?.name}`
      : reportMode === 'parent'
        ? `Progress Update — ${selected?.name}`
        : `Principal Report — ${selected?.name}`;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a1a; line-height: 1.6; }
      h1 { font-size: 20px; letter-spacing: 2px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 14px; margin-bottom: 2px; }
      .divider { border-top: 2px solid #0D3330; margin: 16px 0; }
      h2 { font-size: 16px; color: #0D3330; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
      p { margin: 0 0 12px 0; }
      .action-item { margin-bottom: 12px; }
      .action-num { font-weight: bold; color: #0D3330; }
      .action-detail { margin-left: 20px; color: #444; }
      .quote { font-style: italic; color: #0D3330; padding: 12px; border-left: 3px solid #4ADE80; background: #f8fffe; margin: 12px 0; }
      .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center; }
      @media print { body { margin: 20px; } }
    </style></head><body>`);

    // Title
    const modeTitle = reportMode === 'home_plan'
      ? `Home Action Plan for ${selected?.name}`
      : reportMode === 'parent'
        ? `Progress Update — ${selected?.name}`
        : `Principal Report — ${selected?.name}`;

    printWindow.document.write(`<h1>${escHtml(modeTitle)}</h1>`);
    printWindow.document.write(`<p class="subtitle">${selected?.classroom_icon || ''} ${escHtml(selected?.classroom_name || '')} · ${escHtml(schoolName)}</p>`);
    printWindow.document.write(`<p class="subtitle">${new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`);
    printWindow.document.write('<div class="divider"></div>');

    // Overview / Insight
    if (guruResponse?.insight) {
      printWindow.document.write(`<h2>${t('admin.guru.printOverviewHtml')}</h2>`);
      printWindow.document.write(`<p>${escHtml(guruResponse.insight)}</p>`);
    }

    // Root cause (only for principal report)
    if (reportMode === 'principal' && guruResponse?.root_cause && guruResponse.root_cause !== 'See insight above') {
      printWindow.document.write('<h2>Key Finding</h2>');
      printWindow.document.write(`<p>${escHtml(guruResponse.root_cause)}</p>`);
    }

    // Action plan / Activities
    if (guruResponse?.action_plan?.length) {
      printWindow.document.write(`<h2>${reportMode === 'home_plan' ? t('admin.guru.printActivitiesForHomeHtml') : t('admin.guru.printRecommendationsHtml')}</h2>`);
      guruResponse.action_plan.forEach((a, i) => {
        printWindow.document.write(`<div class="action-item"><span class="action-num">${i + 1}. ${escHtml(a.action)}</span>`);
        if (a.details) printWindow.document.write(`<p class="action-detail">${escHtml(a.details)}</p>`);
        printWindow.document.write('</div>');
      });
    }

    // Timeline
    if (guruResponse?.timeline) {
      printWindow.document.write(`<h2>${t('admin.guru.printTimelineHtml')}</h2>`);
      printWindow.document.write(`<p>${escHtml(guruResponse.timeline)}</p>`);
    }

    // Parent talking point
    if (guruResponse?.parent_talking_point) {
      printWindow.document.write(`<h2>${t('admin.guru.printNoteForParentsHtml')}</h2>`);
      printWindow.document.write(`<div class="quote">"${escHtml(guruResponse.parent_talking_point)}"</div>`);
    }

    printWindow.document.write(`<div class="footer">Generated by Montree Guru · ${escHtml(schoolName)}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const copyToClipboard = () => {
    const text = formatForPrint();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('admin.guru.copiedToClipboard'));
  };

  // Mode labels + icons
  const MODE_CONFIG: Record<ReportMode, { label: string; icon: string; desc: string }> = {
    principal: { label: t('admin.guru.modePrincipalReport'), icon: '📊', desc: t('admin.guru.modePrincipalDesc') },
    parent: { label: t('admin.guru.modeParentSummary'), icon: '💬', desc: t('admin.guru.modeParentDesc') },
    home_plan: { label: t('admin.guru.modeHomeAction'), icon: '🏠', desc: t('admin.guru.modeHomeDesc') },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🧠</div>
          <h1 className="text-2xl font-bold text-white">{t('admin.guru.title')}</h1>
          <p className="text-emerald-300 text-sm mt-1">{t('admin.guru.subtitle')}</p>
        </div>

        {/* Search Bar */}
        {!selected ? (
          <div className="relative mb-8">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔍</span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder={loadingStudents ? t('admin.guru.loadingStudents') : t('admin.guru.searchPlaceholder').replace('{count}', String(allStudents.length))}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border-2 border-emerald-500/40 rounded-2xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
                autoFocus
              />
            </div>

            {/* Dropdown results */}
            {showDropdown && searchQuery.trim() && filteredStudents.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-emerald-900/95 backdrop-blur-sm border border-emerald-600 rounded-xl overflow-hidden shadow-2xl z-50 max-h-[360px] overflow-y-auto">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onMouseDown={() => selectStudent(student)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-700/50 transition-colors text-left border-b border-emerald-700/30 last:border-0"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{student.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">{student.name}</div>
                      <div className="text-emerald-300/70 text-xs">
                        {student.classroom_icon} {student.classroom_name}
                        {student.age ? ` · ${student.age} years` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showDropdown && searchQuery.trim().length >= 2 && filteredStudents.length === 0 && !loadingStudents && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-emerald-900/95 border border-emerald-600 rounded-xl p-4 text-center z-50">
                <p className="text-white/50 text-sm">{t('admin.guru.noResults').replace('{query}', searchQuery)}</p>
              </div>
            )}
          </div>
        ) : (
          /* Selected student card */
          <div className="mb-6">
            <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 border border-emerald-500/30">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">{selected.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{selected.name}</h2>
                <p className="text-emerald-300 text-sm">{selected.classroom_icon} {selected.classroom_name}{selected.age ? ` · ${selected.age} years old` : ''}</p>
              </div>
              <button onClick={clearStudent} className="px-3 py-2 bg-white/10 rounded-lg text-white/70 text-sm hover:bg-white/20 flex-shrink-0">
                {t('admin.guru.change')}
              </button>
            </div>
          </div>
        )}

        {/* Report Mode Buttons — shown after student selected, before or after response */}
        {selected && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(Object.keys(MODE_CONFIG) as ReportMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => generateReport(mode)}
                disabled={guruLoading}
                className={`p-4 rounded-2xl text-center transition-all ${
                  reportMode === mode
                    ? 'bg-emerald-500/30 border-2 border-emerald-400 scale-[1.02]'
                    : 'bg-white/10 border-2 border-transparent hover:bg-white/15 hover:border-emerald-500/30'
                } disabled:opacity-50`}
              >
                <div className="text-2xl mb-1">{MODE_CONFIG[mode].icon}</div>
                <div className="text-white font-medium text-sm">{MODE_CONFIG[mode].label}</div>
                <div className="text-white/40 text-xs mt-0.5">{MODE_CONFIG[mode].desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {guruLoading && (
          <div className="bg-white/10 rounded-2xl p-8 text-center border border-emerald-500/30 mb-6">
            <div className="text-4xl animate-bounce mb-3">🧠</div>
            <p className="text-emerald-300">{t('admin.guru.analyzing').replace('{name}', selected?.name || '')}</p>
            <p className="text-white/30 text-xs mt-1">{t('admin.guru.reviewingProgress')}</p>
          </div>
        )}

        {/* Guru Response */}
        {guruResponse?.success && !guruLoading && (
          <div className="bg-white/10 rounded-2xl p-5 border border-emerald-500/30 mb-6 space-y-4">

            {/* Mode badge */}
            {reportMode && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{MODE_CONFIG[reportMode].icon}</span>
                <span className="text-emerald-400 text-sm font-medium">{MODE_CONFIG[reportMode].label}</span>
              </div>
            )}

            {/* Insight / Overview */}
            {guruResponse.insight && (
              <div>
                <h3 className="text-emerald-400 text-sm font-medium mb-1">💡 {t('admin.guru.overview')}</h3>
                <p className="text-white/90 text-sm leading-relaxed">{guruResponse.insight}</p>
              </div>
            )}

            {/* Root cause (principal mode only) */}
            {reportMode === 'principal' && guruResponse.root_cause && guruResponse.root_cause !== 'See insight above' && (
              <div>
                <h3 className="text-amber-400 text-sm font-medium mb-1">🔍 {t('admin.guru.keyFinding')}</h3>
                <p className="text-white/80 text-sm">{guruResponse.root_cause}</p>
              </div>
            )}

            {/* Action Plan / Activities */}
            {guruResponse.action_plan && guruResponse.action_plan.length > 0 && (
              <div>
                <h3 className="text-emerald-400 text-sm font-medium mb-2">
                  {reportMode === 'home_plan' ? `🏠 ${t('admin.guru.activitiesForHome')}` : `📋 ${t('admin.guru.recommendations')}`}
                </h3>
                <div className="space-y-3">
                  {guruResponse.action_plan.map((a, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-7 h-7 bg-emerald-500/30 rounded-full flex items-center justify-center text-emerald-300 text-xs font-bold">{a.priority}</span>
                      <div>
                        <span className="text-white font-medium">{a.action}</span>
                        {a.details && <p className="text-white/60 mt-0.5">{a.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {guruResponse.timeline && (
              <div className="bg-amber-500/10 rounded-lg p-3">
                <h3 className="text-amber-400 text-xs font-medium mb-1">⏰ {t('admin.guru.timeline')}</h3>
                <p className="text-white/80 text-sm">{guruResponse.timeline}</p>
              </div>
            )}

            {/* Parent talking point */}
            {guruResponse.parent_talking_point && (
              <div className="bg-emerald-500/10 rounded-lg p-3">
                <h3 className="text-emerald-400 text-xs font-medium mb-1">💬 {t('admin.guru.sayThisToParent')}</h3>
                <p className="text-white/90 text-sm italic">&ldquo;{guruResponse.parent_talking_point}&rdquo;</p>
              </div>
            )}

            {/* Actions: Print + Copy */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
              >
                🖨️ {t('admin.guru.print')}
              </button>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {copied ? `✓ ${t('admin.guru.copied')}` : `📋 ${t('admin.guru.copy')}`}
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {guruResponse && !guruResponse.success && !guruLoading && (
          <div className="bg-red-500/10 rounded-2xl p-5 border border-red-500/30 mb-6 text-center">
            <p className="text-red-300 text-sm">{guruResponse.error || t('admin.guru.somethingWrong')}</p>
            <button
              onClick={() => lastQuestion ? askGuru(lastQuestion, reportMode || undefined) : null}
              className="mt-3 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
            >
              {t('admin.guru.tryAgain')}
            </button>
          </div>
        )}

        {/* Follow-up question */}
        {selected && guruResponse?.success && !guruLoading && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6">
            <p className="text-white/40 text-xs mb-2">{t('admin.guru.askFollowUp').replace('{name}', selected.name)}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') askFollowUp(); }}
                placeholder={t('admin.guru.followUpPlaceholder')}
                className="flex-1 px-4 py-3 bg-black/20 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={askFollowUp}
                disabled={guruLoading || !followUp.trim()}
                className="px-5 py-3 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-emerald-600 transition-colors flex-shrink-0"
              >
                {t('admin.guru.ask')}
              </button>
            </div>

            {/* Quick follow-ups */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                t('admin.guru.followUpHome').replace('{name}', selected.name),
                t('admin.guru.followUpFocus').replace('{name}', selected.name),
                t('admin.guru.followUpConcerns').replace('{name}', selected.name),
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setFollowUp(''); askGuru(q); }}
                  disabled={guruLoading}
                  className="px-3 py-1.5 bg-white/5 rounded-lg text-white/50 text-xs hover:bg-white/10 hover:text-white/70 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Previous responses in this session (conversation history) */}
        {conversationHistory.length > 1 && (
          <div className="space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-wider">{t('admin.guru.previousSession')}</p>
            {conversationHistory.slice(0, -1).reverse().map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-emerald-400/70 text-xs mb-1 font-medium">Q: {item.question.slice(0, 100)}{item.question.length > 100 ? '...' : ''}</p>
                <p className="text-white/60 text-sm">{item.response.insight?.slice(0, 200)}{(item.response.insight?.length || 0) > 200 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
