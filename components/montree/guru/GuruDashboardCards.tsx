// components/montree/guru/GuruDashboardCards.tsx
// Consolidated dashboard guru cards — replaces 4 separate components
// (EndOfDayNudge, GuruSuggestionCard, WeeklyReview, GuruDailyBriefing)
// Single API call to /api/montree/guru/dashboard-summary
'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruDashboardCardsProps {
  childId: string;
  childName: string;
}

interface DashboardData {
  endOfDay: { nudge: string | null };
  suggestion: { text: string | null; type: string };
  weeklyReview: { available: boolean; review: string | null };
}

export default function GuruDashboardCards({ childId, childName }: GuruDashboardCardsProps) {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedNudge, setDismissedNudge] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);

  // Daily plan state (on-demand, not auto-fired)
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    // Check if suggestion already dismissed this week
    const dismissKey = `guru_suggestion_dismissed_${childId}`;
    const dismissedWeek = localStorage.getItem(dismissKey);
    const currentWeek = getISOWeek();
    if (dismissedWeek === currentWeek) {
      setDismissedSuggestion(true);
    }

    fetch(`/api/montree/guru/dashboard-summary?child_id=${childId}`)
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [childId]);

  const fetchDailyPlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/montree/guru/daily-plan?child_id=${childId}`);
      const result = await res.json();
      if (result.success) {
        setPlan(result.plan);
        setPlanExpanded(true);
      } else {
        setPlanError(result.error || t('guru.couldNotGeneratePlan'));
      }
    } catch {
      setPlanError(t('guru.failedConnect'));
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDismissSuggestion = () => {
    setDismissedSuggestion(true);
    localStorage.setItem(`guru_suggestion_dismissed_${childId}`, getISOWeek());
  };

  // Simple markdown bold renderer
  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#0D3330]">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Simple markdown renderer for daily plan
  const renderPlan = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-[#0D3330] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-[#0D3330] mt-3 mb-1">{line.replace('### ', '')}</h3>;
      if (line.startsWith('#### ')) return <h4 key={i} className="text-base font-semibold text-[#164340] mt-2 mb-1">{line.replace('#### ', '')}</h4>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-[#0D3330] mt-1">{line.replace(/\*\*/g, '')}</p>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm">{renderInlineBold(line.slice(2))}</li>;
      if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm list-decimal">{renderInlineBold(line.replace(/^\d+\.\s/, ''))}</li>;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-[#0D3330]/80 text-sm">{renderInlineBold(line)}</p>;
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* TODAY'S PLAN — on-demand, not auto-fired */}
      <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl shadow-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-[#0D3330] to-[#164340] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <h3 className="text-white font-bold text-lg">{t('guru.todayPlan')}</h3>
                <p className="text-white/70 text-xs">{t('guru.montessoriGuideFor').replace('{name}', childName)}</p>
              </div>
            </div>
            {!plan && !planLoading && (
              <button onClick={fetchDailyPlan} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors">
                {t('guru.generatePlan')}
              </button>
            )}
            {plan && (
              <button onClick={() => setPlanExpanded(!planExpanded)} className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
                {planExpanded ? t('guru.collapse') : t('guru.expand')}
              </button>
            )}
          </div>
        </div>
        {planLoading && (
          <div className="px-5 py-8 text-center">
            <div className="animate-pulse text-3xl mb-3">🌱</div>
            <p className="text-[#0D3330]/60 text-sm">{t('guru.preparingPlan').replace('{name}', childName)}</p>
          </div>
        )}
        {planError && (
          <div className="px-5 py-4">
            <p className="text-red-600 text-sm">{planError}</p>
            <button onClick={fetchDailyPlan} className="text-[#0D3330] underline text-sm mt-1">{t('common.tryAgain')}</button>
          </div>
        )}
        {plan && planExpanded && <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">{renderPlan(plan)}</div>}
        {plan && !planExpanded && <div className="px-5 py-3"><p className="text-[#0D3330]/60 text-sm">✅ {t('guru.planReadyExpand')}</p></div>}
      </div>

      {/* END-OF-DAY NUDGE — from summary, dismissible */}
      {data?.endOfDay.nudge && !dismissedNudge && (
        <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl p-4 relative`}>
          <button
            onClick={() => setDismissedNudge(true)}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
            aria-label="Dismiss"
          >✕</button>
          <div className="flex items-start gap-3 pr-6">
            <span className="text-xl flex-shrink-0">🌅</span>
            <div>
              <h4 className={`text-sm font-semibold ${HOME_THEME.headingText} mb-1`}>{childName} {t('guru.day')}</h4>
              <p className={`text-sm leading-relaxed ${HOME_THEME.textPrimary}`}>{data.endOfDay.nudge}</p>
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTION — from summary, dismissible */}
      {data?.suggestion.text && !dismissedSuggestion && (
        <div className={`${HOME_THEME.cardBg} border border-amber-200 rounded-2xl p-4 relative`}>
          <button
            onClick={handleDismissSuggestion}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
            aria-label="Dismiss"
          >✕</button>
          <div className="flex items-start gap-3 pr-6">
            <span className="text-xl flex-shrink-0">{data.suggestion.type === 'inactive' ? '💤' : '🌱'}</span>
            <div>
              <h4 className={`text-sm font-semibold ${HOME_THEME.headingText} mb-1`}>
                {data.suggestion.type === 'inactive' ? t('guru.missing').replace('{name}', childName) : t('guru.gentleNudgeAbout').replace('{name}', childName)}
              </h4>
              <p className={`text-sm leading-relaxed ${HOME_THEME.textPrimary}`}>{data.suggestion.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REVIEW — from summary, collapsible */}
      {data?.weeklyReview.available && data.weeklyReview.review && (
        <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl overflow-hidden`}>
          <button
            onClick={() => setWeeklyExpanded(!weeklyExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F5E6D3]/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className={`text-sm font-semibold ${HOME_THEME.headingText}`}>{childName} {t('guru.weekInReview')}</span>
            </div>
            <span className={`text-sm ${HOME_THEME.subtleText} transition-transform ${weeklyExpanded ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {weeklyExpanded && (
            <div className={`px-4 pb-4 border-t ${HOME_THEME.border}`}>
              <div className="pt-3">
                {data.weeklyReview.review.split('\n\n').map((p, i) => (
                  <p key={i} className={`text-sm ${HOME_THEME.headingText}/80 leading-relaxed ${i > 0 ? 'mt-3' : ''}`}>{p}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getISOWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
