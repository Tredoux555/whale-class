'use client';

// components/montree/child/GuruWeeklySummary.tsx
// Displays the Guru's weekly admin on the child's week view.
// 4 items: This Week, Next Week, One-Liner (factual), Advice (expandable)
// Data comes from montree_children.settings (guru_weekly_*)

import { useState } from 'react';

interface GuruWeeklySummaryProps {
  summary: string | null;
  thisWeek: string | null;
  nextWeek: string | null;
  oneLiner: string | null;
  advice: string | null;
  updatedAt: string | null;
  childName: string;
  childId: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
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

export default function GuruWeeklySummary({
  summary,
  thisWeek,
  nextWeek,
  oneLiner,
  advice,
  updatedAt,
  childName,
  childId,
}: GuruWeeklySummaryProps) {
  const [copyAllDone, setCopyAllDone] = useState(false);
  const [adviceExpanded, setAdviceExpanded] = useState(false);

  // Show nothing if we have no data at all
  if (!summary && !thisWeek && !nextWeek && !oneLiner && !advice) return null;

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
    } catch {
      return '';
    }
  };

  // Copy all 3 copy-paste items formatted for pasting (advice excluded — it's for the profile)
  const handleCopyAll = async () => {
    const parts = [];
    if (thisWeek) parts.push(`This Week: ${thisWeek}`);
    if (nextWeek) parts.push(`Next Week: ${nextWeek}`);
    if (oneLiner) parts.push(`${oneLiner}`);
    const text = parts.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyAllDone(true);
      setTimeout(() => setCopyAllDone(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyAllDone(true);
      setTimeout(() => setCopyAllDone(false), 2000);
    }
  };

  // If we have the new fields, show the enhanced view
  const hasNewFormat = thisWeek || nextWeek || oneLiner || advice;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-semibold text-violet-800 text-sm">
            Weekly Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-xs text-violet-400">
              {formatDate(updatedAt)}
            </span>
          )}
          <a
            href={`/montree/dashboard/guru?child=${childId}`}
            className="text-xs text-violet-500 hover:text-violet-700 underline"
          >
            Ask Guru
          </a>
        </div>
      </div>

      {hasNewFormat ? (
        <>
          {/* This Week */}
          {thisWeek && (
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-violet-600 mb-0.5">THIS WEEK</div>
                <p className="text-gray-700 text-sm leading-relaxed">{thisWeek}</p>
              </div>
              <CopyButton text={thisWeek} label="This Week" />
            </div>
          )}

          {/* Next Week */}
          {nextWeek && (
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-indigo-600 mb-0.5">NEXT WEEK</div>
                <p className="text-gray-700 text-sm leading-relaxed">{nextWeek}</p>
              </div>
              <CopyButton text={nextWeek} label="Next Week" />
            </div>
          )}

          {/* One-Liner — factual only */}
          {oneLiner && (
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1">
                <div className="text-xs font-semibold text-purple-600 mb-0.5">ONE-LINER</div>
                <p className="text-gray-800 text-sm font-medium">{oneLiner}</p>
              </div>
              <CopyButton text={oneLiner} label="One-Liner" />
            </div>
          )}

          {/* Copy All button */}
          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copyAllDone
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-white text-violet-600 border border-violet-200 hover:bg-violet-50 hover:border-violet-300'
            }`}
          >
            {copyAllDone ? (
              <><span>✓</span> All copied!</>
            ) : (
              <><span>📋</span> Copy all 3</>
            )}
          </button>

          {/* Guru Advice — expandable deep insight */}
          {advice && (
            <div className="mt-3 pt-3 border-t border-violet-200/50">
              <button
                onClick={() => setAdviceExpanded(!adviceExpanded)}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors w-full text-left"
              >
                <span>{adviceExpanded ? '▼' : '▶'}</span>
                <span>Guru Advice</span>
                {!adviceExpanded && (
                  <span className="text-violet-400 font-normal ml-1 truncate flex-1">
                    — {advice.slice(0, 60)}...
                  </span>
                )}
              </button>
              {adviceExpanded && (
                <div className="mt-2 bg-white/60 rounded-xl p-3 border border-violet-100">
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {advice}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <CopyButton text={advice || ''} label="Advice" />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Legacy single-summary view */}
          <p className="text-gray-700 text-sm leading-relaxed mb-3">{summary}</p>
          <CopyButton text={summary || ''} label="Summary" />
        </>
      )}
    </div>
  );
}
