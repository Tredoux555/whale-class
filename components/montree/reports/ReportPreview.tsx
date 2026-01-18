// components/montree/reports/ReportPreview.tsx
// Preview component showing how report will look to parents
// Phase 3 - Session 54

'use client';

import React from 'react';
import type { MontreeWeeklyReport } from '@/lib/montree/reports/types';
import { 
  formatWeekRange,
  getAreaColor,
  getAreaDisplayName
} from '@/lib/montree/reports/types';

interface ReportPreviewProps {
  report: MontreeWeeklyReport;
  childName: string;
  thumbnailUrls: Record<string, string>;
}

export default function ReportPreview({
  report,
  childName,
  thumbnailUrls,
}: ReportPreviewProps) {
  const content = report.content;
  const weekRange = formatWeekRange(report.week_start, report.week_end);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {childName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{childName}'s Week</h1>
            <p className="text-blue-100">{weekRange}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📝 Weekly Summary</h2>
        <p className="text-gray-600 leading-relaxed">{content.summary}</p>
      </div>

      {/* Areas explored */}
      {content.areas_explored.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm text-gray-500 mb-2">Areas explored this week:</p>
          <div className="flex flex-wrap gap-2">
            {content.areas_explored.map(area => (
              <span 
                key={area}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getAreaColor(area)}`}
              >
                {getAreaDisplayName(area)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🌟 Activity Highlights</h2>
        
        <div className="space-y-6">
          {content.highlights.map((highlight, index) => (
            <div key={highlight.media_id} className="flex gap-4">
              {/* Image */}
              <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                {thumbnailUrls[highlight.storage_path || ''] ? (
                  <img
                    src={thumbnailUrls[highlight.storage_path || '']}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    📷
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                {highlight.work_name && (
                  <h3 className="font-medium text-gray-800 mb-1">{highlight.work_name}</h3>
                )}
                <p className="text-gray-600 text-sm mb-2">{highlight.observation}</p>
                <p className="text-gray-500 text-sm italic">{highlight.developmental_note}</p>
                {highlight.home_extension && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">🏠 Try at home:</span> {highlight.home_extension}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {content.highlights.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No activities recorded this week
            </p>
          )}
        </div>
      </div>

      {/* Closing message */}
      {content.parent_message && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-100">
          <p className="text-gray-700 text-center italic">
            "{content.parent_message}"
          </p>
          <p className="text-sm text-gray-500 text-center mt-2">
            — {report.generated_by || 'Teacher'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-50 text-center">
        <p className="text-xs text-gray-400">
          🐋 Whale Class • Montree Education
        </p>
      </div>
    </div>
  );
}
