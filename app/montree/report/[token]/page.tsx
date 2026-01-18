// app/montree/report/[token]/page.tsx
// Public Parent View Page - Magic Link Access
// Phase 6 - Session 57
// NO AUTHENTICATION - Accessed via secure token in URL

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { 
  ParentViewReport, 
  ParentViewChild 
} from '@/lib/montree/reports/token-types';

// ============================================
// TYPES
// ============================================

type LoadingState = 'loading' | 'success' | 'error';
type ErrorReason = 'expired' | 'revoked' | 'not_found' | 'invalid' | 'unknown';

interface ErrorInfo {
  reason: ErrorReason;
  message: string;
}

// ============================================
// AREA COLORS (Montessori)
// ============================================

const areaColors: Record<string, { bg: string; text: string; name: string }> = {
  practical_life: { bg: 'bg-green-100', text: 'text-green-700', name: 'Practical Life' },
  sensorial: { bg: 'bg-pink-100', text: 'text-pink-700', name: 'Sensorial' },
  language: { bg: 'bg-blue-100', text: 'text-blue-700', name: 'Language' },
  mathematics: { bg: 'bg-red-100', text: 'text-red-700', name: 'Mathematics' },
  cultural: { bg: 'bg-yellow-100', text: 'text-yellow-700', name: 'Cultural' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ParentReportViewPage() {
  const params = useParams();
  const token = params.token as string;

  // State
  const [state, setState] = useState<LoadingState>('loading');
  const [report, setReport] = useState<ParentViewReport | null>(null);
  const [child, setChild] = useState<ParentViewChild | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<ErrorInfo | null>(null);

  // ============================================
  // FETCH REPORT
  // ============================================

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/montree/parent/view/${token}`);
        const data = await response.json();

        if (!data.success || !data.valid) {
          setError({
            reason: data.reason || 'unknown',
            message: data.error || 'Unable to load report',
          });
          setState('error');
          return;
        }

        setReport(data.report);
        setChild(data.child);
        setMediaUrls(data.media_urls || {});
        setState('success');
      } catch (err) {
        console.error('Fetch error:', err);
        setError({
          reason: 'unknown',
          message: 'Unable to connect. Please check your internet and try again.',
        });
        setState('error');
      }
    }

    if (token) {
      fetchReport();
    }
  }, [token]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (state === 'error' || !report || !child) {
    return <ErrorView error={error} />;
  }

  // ============================================
  // SUCCESS - RENDER REPORT
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* School Logo Placeholder */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {report.school_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {report.school_name}
              </h1>
              <p className="text-sm text-gray-500">Weekly Learning Report</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Child Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Child Photo or Initials */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {child.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{child.name}</h2>
              <p className="text-gray-500">
                {formatWeekRange(report.week_start, report.week_end)}
              </p>
            </div>
          </div>

          {/* Areas Explored Pills */}
          {report.areas_explored.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {report.areas_explored.map((area) => {
                const colors = areaColors[area] || { bg: 'bg-gray-100', text: 'text-gray-700', name: area };
                return (
                  <span
                    key={area}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                  >
                    {colors.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📝</span> Weekly Summary
          </h3>
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </div>

        {/* Learning Highlights */}
        {report.highlights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 px-2">
              <span>✨</span> Learning Highlights
            </h3>
            
            {report.highlights.map((highlight, index) => (
              <HighlightCard
                key={highlight.media_id}
                highlight={highlight}
                imageUrl={highlight.storage_path ? mediaUrls[highlight.storage_path] : null}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Parent Message */}
        {report.parent_message && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <span>💝</span> A Note for You
            </h3>
            <p className="text-blue-900 leading-relaxed italic">
              "{report.parent_message}"
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>Generated with care by {report.school_name}</p>
          {report.generated_with_ai && (
            <p className="mt-1 text-xs">✨ Enhanced with AI</p>
          )}
        </footer>
      </main>
    </div>
  );
}

// ============================================
// HIGHLIGHT CARD COMPONENT
// ============================================

function HighlightCard({ 
  highlight, 
  imageUrl,
  index 
}: { 
  highlight: ParentViewReport['highlights'][0];
  imageUrl: string | null;
  index: number;
}) {
  const areaInfo = highlight.area ? areaColors[highlight.area] : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Image */}
      {imageUrl && (
        <div className="relative aspect-[4/3] bg-gray-100">
          <img
            src={imageUrl}
            alt={`Learning moment ${index + 1}`}
            className="w-full h-full object-cover"
          />
          {/* Area badge overlay */}
          {areaInfo && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${areaInfo.bg} ${areaInfo.text} shadow-sm`}>
              {areaInfo.name}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Work Name */}
        {highlight.work_name && (
          <h4 className="font-semibold text-gray-800">{highlight.work_name}</h4>
        )}

        {/* Observation */}
        <p className="text-gray-700">{highlight.observation}</p>

        {/* Developmental Note */}
        {highlight.developmental_note && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Why it matters: </span>
              {highlight.developmental_note}
            </p>
          </div>
        )}

        {/* Home Extension */}
        {highlight.home_extension && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-sm text-amber-800">
              <span className="font-medium">💡 Try at home: </span>
              {highlight.home_extension}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ERROR VIEW COMPONENT
// ============================================

function ErrorView({ error }: { error: ErrorInfo | null }) {
  const errorConfig = {
    expired: {
      emoji: '⏰',
      title: 'Link Expired',
      message: 'This report link has expired. Please ask your teacher for a new link.',
    },
    revoked: {
      emoji: '🔒',
      title: 'Link Disabled',
      message: 'This link has been disabled. Please contact your teacher for access.',
    },
    not_found: {
      emoji: '🔍',
      title: 'Not Found',
      message: 'This report could not be found. The link may be incorrect.',
    },
    invalid: {
      emoji: '❌',
      title: 'Invalid Link',
      message: 'This link appears to be invalid. Please check the URL.',
    },
    unknown: {
      emoji: '😕',
      title: 'Something Went Wrong',
      message: error?.message || 'Unable to load the report. Please try again later.',
    },
  };

  const config = error?.reason ? errorConfig[error.reason] : errorConfig.unknown;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{config.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{config.title}</h1>
        <p className="text-gray-600 mb-6">{config.message}</p>
        <div className="text-sm text-gray-400">
          If you continue having issues, please contact your school.
        </div>
      </div>
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', options);
  
  const year = endDate.getFullYear();
  
  return `${startStr} - ${endStr}, ${year}`;
}
