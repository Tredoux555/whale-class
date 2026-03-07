'use client';

// components/montree/child/ChildWeeklyAdmin.tsx
// Per-child weekly admin with per-area breakdowns for government docs
// Replaces GuruWeeklySummary — always renders (shows generate button even with no data)
// Sections: Plan Row, Per-Area Details, Full Summary, This/Next/OneLiner, Advice

import { useState, useCallback } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

// ---- Types ----

interface AreaDetail {
  work: string;
  this_week: string;
  next_week: string;
}

interface Props {
  childId: string;
  childName: string;
  // From child settings (passed by parent page):
  planRow: Record<string, string> | null;
  areaDetails: Record<string, AreaDetail> | null;
  fullSummary: string | null;
  thisWeek: string | null;
  nextWeek: string | null;
  oneLiner: string | null;
  advice: string | null;
  updatedAt: string | null;
  onGenerated?: () => void;
}
// ---- Area Config ----

const AREA_CONFIG: Record<string, { label: string; labelZh: string; color: string; icon: string }> = {
  practical_life: { label: 'Practical', labelZh: '日常', color: '#10B981', icon: '🧹' },
  sensorial: { label: 'Sensorial', labelZh: '感官', color: '#F59E0B', icon: '👁️' },
  mathematics: { label: 'Math', labelZh: '数学', color: '#6366F1', icon: '🔢' },
  language: { label: 'Language', labelZh: '语言', color: '#EC4899', icon: '📚' },
  cultural: { label: 'Culture', labelZh: '科文', color: '#8B5CF6', icon: '🌍' },
};

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// ---- Copy Helper ----

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
        copied
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-white/80 text-violet-600 hover:bg-violet-50 border border-violet-200'
      }`}
      title={`Copy ${label}`}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}
// ---- Main Component ----

export default function ChildWeeklyAdmin({
  childId,
  childName,
  planRow: initialPlanRow,
  areaDetails: initialAreaDetails,
  fullSummary: initialFullSummary,
  thisWeek: initialThisWeek,
  nextWeek: initialNextWeek,
  oneLiner: initialOneLiner,
  advice: initialAdvice,
  updatedAt: initialUpdatedAt,
  onGenerated,
}: Props) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh';

  // Local state (overrides props on generate)
  const [planRow, setPlanRow] = useState(initialPlanRow);
  const [areaDetails, setAreaDetails] = useState(initialAreaDetails);
  const [fullSummary, setFullSummary] = useState(initialFullSummary);
  const [thisWeek, setThisWeek] = useState(initialThisWeek);
  const [nextWeek, setNextWeek] = useState(initialNextWeek);
  const [oneLiner, setOneLiner] = useState(initialOneLiner);
  const [advice, setAdvice] = useState(initialAdvice);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);

  const hasData = planRow || areaDetails || fullSummary || thisWeek;

  // ---- Generate ----

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await montreeApi(`/api/montree/children/${childId}/weekly-admin`, {
        method: 'POST',
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('childAdmin.generateError'));
        return;
      }
      if (data.success) {
        setPlanRow(data.plan_row);
        setAreaDetails(data.area_details);
        setFullSummary(data.full_summary);
        setThisWeek(data.this_week);
        setNextWeek(data.next_week);
        setOneLiner(data.one_liner);
        setAdvice(data.advice);
        setUpdatedAt(new Date().toISOString());
        onGenerated?.();
      }
    } catch {
      setError(t('childAdmin.generateError'));
    } finally {
      setGenerating(false);
    }
  }, [childId, locale, t, onGenerated]);
  // ---- Copy Plan Row as table line ----

  const copyPlanRow = useCallback(() => {
    if (!planRow) return '';
    const cols = AREAS.map(a => planRow[a] || '-');
    return `${childName} | ${cols.join(' | ')} | ${planRow.notes || ''}`;
  }, [planRow, childName]);

  // ---- Format time ----

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch { return ''; }
  };

  // ---- Render ----

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-semibold text-violet-800 text-sm">
            {t('childAdmin.title')}
          </span>
          {updatedAt && (
            <span className="text-xs text-violet-400">
              {formatDate(updatedAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            generating
              ? 'bg-gray-200 text-gray-500 cursor-wait'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
          }`}
        >
          {generating ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⏳</span>
              {t('childAdmin.generating')}
            </span>
          ) : hasData ? t('childAdmin.regenerate') : t('childAdmin.generate')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-3">{error}</div>
      )}
      {/* No data prompt */}
      {!hasData && !generating && (
        <p className="text-sm text-violet-500 italic">
          {t('childAdmin.noData')}
        </p>
      )}

      {/* ---- Section A: Plan Row ---- */}
      {planRow && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-700 uppercase">
              {t('childAdmin.planRow')}
            </span>
            <CopyBtn text={copyPlanRow()} label="Plan Row" />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {AREAS.map(area => {
              const cfg = AREA_CONFIG[area];
              const work = planRow[area] || '-';
              return (
                <div
                  key={area}
                  className="bg-white rounded-lg p-2 text-center border"
                  style={{ borderColor: cfg.color + '40' }}
                >
                  <div className="text-xs font-medium" style={{ color: cfg.color }}>
                    {isZh ? cfg.labelZh : cfg.label}
                  </div>
                  <div className="text-xs text-gray-700 mt-0.5 line-clamp-2">
                    {work}
                  </div>
                </div>
              );
            })}
          </div>
          {planRow.notes && (
            <div className="mt-1.5 text-xs text-gray-600 italic bg-white/60 rounded px-2 py-1">
              {planRow.notes}
            </div>
          )}
        </div>
      )}
      {/* ---- Section B: Per-Area Details ---- */}
      {areaDetails && (
        <div className="mb-3 space-y-1">
          <span className="text-xs font-semibold text-violet-700 uppercase">
            {t('childAdmin.areaDetails')}
          </span>
          {AREAS.map(area => {
            const cfg = AREA_CONFIG[area];
            const detail = areaDetails[area];
            if (!detail) return null;
            const isExpanded = expandedArea === area;
            return (
              <div key={area} className="border rounded-lg overflow-hidden" style={{ borderColor: cfg.color + '30' }}>
                <button
                  onClick={() => setExpandedArea(isExpanded ? null : area)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {(isZh ? cfg.labelZh : cfg.label).charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {isZh ? cfg.labelZh : cfg.label}: {detail.work}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CopyBtn
                      text={`${isZh ? cfg.labelZh : cfg.label}: ${detail.this_week}\n${t('childAdmin.nextWeek')}: ${detail.next_week}`}
                      label={cfg.label}
                    />
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 bg-white">
                    <div>
                      <div className="text-xs font-semibold text-violet-600 mb-0.5">{t('childAdmin.thisWeek').toUpperCase()}</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{detail.this_week}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-600 mb-0.5">{t('childAdmin.nextWeek').toUpperCase()}</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{detail.next_week}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* ---- Section C: Full Summary (for Chinese doc) ---- */}
      {fullSummary && (
        <div className="mb-3 border border-violet-100 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowFullSummary(!showFullSummary)}
            className="w-full flex items-center justify-between p-2.5 bg-violet-50/50 hover:bg-violet-50 transition-colors"
          >
            <span className="text-sm font-medium text-violet-700">
              📝 {t('childAdmin.fullSummary')}
            </span>
            <div className="flex items-center gap-1">
              <CopyBtn text={fullSummary} label="Full Summary" />
              <span className="text-gray-400 text-xs">{showFullSummary ? '▲' : '▼'}</span>
            </div>
          </button>
          {showFullSummary && (
            <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-white">
              {fullSummary}
            </div>
          )}
        </div>
      )}

      {/* ---- Section D: This Week / Next Week / One-Liner ---- */}
      {(thisWeek || nextWeek || oneLiner) && (
        <div className="mb-3 space-y-2">
          {thisWeek && (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-violet-600 mb-0.5">{t('childAdmin.thisWeek').toUpperCase()}</div>
                <p className="text-gray-700 text-sm leading-relaxed">{thisWeek}</p>
              </div>
              <CopyBtn text={thisWeek} label="This Week" />
            </div>
          )}
          {nextWeek && (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-indigo-600 mb-0.5">{t('childAdmin.nextWeek').toUpperCase()}</div>
                <p className="text-gray-700 text-sm leading-relaxed">{nextWeek}</p>
              </div>
              <CopyBtn text={nextWeek} label="Next Week" />
            </div>
          )}
          {oneLiner && (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-purple-600 mb-0.5">{t('childAdmin.oneLiner').toUpperCase()}</div>
                <p className="text-gray-800 text-sm font-medium">{oneLiner}</p>
              </div>
              <CopyBtn text={oneLiner} label="One-Liner" />
            </div>
          )}
        </div>
      )}
      {/* ---- Section E: Guru Advice (expandable) ---- */}
      {advice && (
        <div className="pt-3 border-t border-violet-200/50">
          <button
            onClick={() => setShowAdvice(!showAdvice)}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors w-full text-left"
          >
            <span>{showAdvice ? '▼' : '▶'}</span>
            <span>{t('childAdmin.advice')}</span>
            {!showAdvice && (
              <span className="text-violet-400 font-normal ml-1 truncate flex-1">
                — {advice.slice(0, 60)}...
              </span>
            )}
          </button>
          {showAdvice && (
            <div className="mt-2 bg-white/60 rounded-xl p-3 border border-violet-100">
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {advice}
              </div>
              <div className="mt-2 flex justify-end">
                <CopyBtn text={advice} label="Advice" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}