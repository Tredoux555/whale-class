'use client';

// components/montree/voice-notes/WeeklyAdminCard.tsx
// Dashboard card for generating weekly admin narratives + plan tables
// Shows note count, generates on click, displays copy-paste ready output

import { useState, useCallback, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  classroomId: string;
}

interface AdminOutput {
  narratives_text: string;
  plans_text: string;
  children_count: number;
  total_notes_count: number;
  week_start: string;
  week_end: string;
}

export default function WeeklyAdminCard({ classroomId }: Props) {
  const { t, locale } = useI18n();

  const [noteCount, setNoteCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<AdminOutput | null>(null);
  const [showNarratives, setShowNarratives] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Get current week's Monday
  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const weekStart = getWeekStart();

  // Load note count + existing output
  useEffect(() => {
    if (!classroomId) return;

    const load = async () => {
      try {
        // Fetch note count
        const notesRes = await montreeApi(
          `/api/montree/voice-notes?classroom_id=${classroomId}&week_start=${weekStart}`
        );
        const notesData = await notesRes.json();
        if (notesData.success) {
          setNoteCount(notesData.count || 0);
        }

        // Check for existing output
        const outputRes = await montreeApi(
          `/api/montree/voice-notes/weekly-admin?classroom_id=${classroomId}&week_start=${weekStart}`
        );
        const outputData = await outputRes.json();
        if (outputData.success && outputData.output) {
          setOutput({
            narratives_text: outputData.output.narratives_text,
            plans_text: outputData.output.plans_text,
            children_count: outputData.output.children_count,
            total_notes_count: outputData.output.total_notes_count,
            week_start: outputData.output.week_start,
            week_end: outputData.output.week_end,
          });
        }
      } catch {
        // Silent fail
      }
    };

    load();
  }, [classroomId, weekStart]);

  // Generate weekly admin
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await montreeApi('/api/montree/voice-notes/weekly-admin', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start: weekStart,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('weeklyAdmin.generateError'));
        return;
      }

      if (data.success) {
        setOutput({
          narratives_text: data.narratives_text,
          plans_text: data.plans_text,
          children_count: data.children_count,
          total_notes_count: data.total_notes_count,
          week_start: data.week_start,
          week_end: data.week_end,
        });
      }
    } catch {
      setError(t('weeklyAdmin.generateError'));
    } finally {
      setGenerating(false);
    }
  }, [classroomId, weekStart, locale, t]);

  // Copy to clipboard
  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
      }
    },
    []
  );

  // Format week range for display
  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const month = s.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en', { month: 'short' });
    return `${month} ${s.getDate()}-${e.getDate()}`;
  };

  if (noteCount === 0 && !output) {
    return null; // Don't show card if no notes and no output
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {t('weeklyAdmin.title')}
            </h3>
            <p className="text-xs text-gray-500">
              {output
                ? formatWeekRange(output.week_start, output.week_end)
                : t('weeklyAdmin.thisWeek')}
              {' · '}
              {noteCount} {t('weeklyAdmin.notes')}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || noteCount === 0}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${generating ? 'bg-gray-200 text-gray-500 cursor-wait' : ''}
            ${noteCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
            ${!generating && noteCount > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95' : ''}
          `}
        >
          {generating ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⏳</span>
              {t('weeklyAdmin.generating')}
            </span>
          ) : output ? (
            t('weeklyAdmin.regenerate')
          ) : (
            t('weeklyAdmin.generate')
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-3">{error}</div>
      )}

      {/* Generated Output */}
      {output && (
        <div className="space-y-2">
          {/* Narratives section */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowNarratives(!showNarratives)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                📝 {t('weeklyAdmin.narratives')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(output.narratives_text, 'narratives');
                  }}
                  className="px-2 py-0.5 rounded bg-white border text-xs text-gray-600 hover:bg-gray-50"
                >
                  {copied === 'narratives' ? '✓' : t('weeklyAdmin.copy')}
                </button>
                <span className="text-gray-400">{showNarratives ? '▲' : '▼'}</span>
              </div>
            </button>
            {showNarratives && (
              <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto bg-white">
                {output.narratives_text}
              </div>
            )}
          </div>

          {/* Plans section */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPlans(!showPlans)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                📊 {t('weeklyAdmin.weeklyPlans')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(output.plans_text, 'plans');
                  }}
                  className="px-2 py-0.5 rounded bg-white border text-xs text-gray-600 hover:bg-gray-50"
                >
                  {copied === 'plans' ? '✓' : t('weeklyAdmin.copy')}
                </button>
                <span className="text-gray-400">{showPlans ? '▲' : '▼'}</span>
              </div>
            </button>
            {showPlans && (
              <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto bg-white font-mono text-xs">
                {output.plans_text}
              </div>
            )}
          </div>

          {/* Copy All */}
          <button
            onClick={() =>
              handleCopy(
                `${output.narratives_text}\n\n---\n\n${output.plans_text}`,
                'all'
              )
            }
            className="w-full py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            {copied === 'all'
              ? `✓ ${t('weeklyAdmin.copied')}`
              : `📋 ${t('weeklyAdmin.copyAll')}`}
          </button>
        </div>
      )}
    </div>
  );
}
