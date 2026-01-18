// components/montree/reports/ReportCard.tsx
// Card component for displaying a single report in list view
// Phase 3 - Session 54

'use client';

import React from 'react';
import type { MontreeWeeklyReport } from '@/lib/montree/reports/types';
import { 
  formatWeekRange, 
  getStatusColor, 
  getStatusText,
  getAreaColor,
  getAreaDisplayName 
} from '@/lib/montree/reports/types';

interface ReportCardProps {
  report: MontreeWeeklyReport;
  childName: string;
  onClick?: () => void;
}

export default function ReportCard({ report, childName, onClick }: ReportCardProps) {
  const content = report.content;
  const weekRange = formatWeekRange(report.week_start, report.week_end);
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Child avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {childName.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{childName}</h3>
            <p className="text-sm text-gray-500">{weekRange}</p>
          </div>
        </div>
        
        {/* Status badge */}
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
          {getStatusText(report.status)}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span>📷</span>
          <span>{content.total_photos || 0} photos</span>
        </span>
        <span className="flex items-center gap-1">
          <span>📝</span>
          <span>{content.total_activities || 0} activities</span>
        </span>
        <span className={`px-2 py-0.5 rounded text-xs ${report.report_type === 'parent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          {report.report_type === 'parent' ? '👨‍👩‍👧 Parent' : '👩‍🏫 Teacher'}
        </span>
      </div>

      {/* Areas explored */}
      {content.areas_explored && content.areas_explored.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {content.areas_explored.map(area => (
            <span 
              key={area}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAreaColor(area)}`}
            >
              {getAreaDisplayName(area)}
            </span>
          ))}
        </div>
      )}

      {/* Summary preview */}
      {content.summary && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {content.summary}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {report.generated_at 
            ? `Generated ${new Date(report.generated_at).toLocaleDateString()}`
            : 'Not generated yet'
          }
        </span>
        <span className="text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </button>
  );
}
