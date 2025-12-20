'use client';

import React, { useState } from 'react';
import { useWeeklyReport } from '@/lib/hooks/useWeeklyReport';

interface Props {
  childId: string;
}

export default function WeeklyReportCard({ childId }: Props) {
  const { report, loading, error } = useWeeklyReport(childId);
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Report</h3>
        <p className="text-gray-500 text-center py-4">Unable to load report</p>
      </div>
    );
  }

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxDayValue = Math.max(...Object.values(report.completionsByDay), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">📊 Weekly Report</h3>
        <span className="text-xs text-gray-500">
          {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{report.summary.worksCompleted}</div>
          <div className="text-xs text-gray-500">Works</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{report.summary.videosWatched}</div>
          <div className="text-xs text-gray-500">Videos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{report.summary.totalWatchMinutes}</div>
          <div className="text-xs text-gray-500">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{report.summary.activeDays}</div>
          <div className="text-xs text-gray-500">Active Days</div>
        </div>
      </div>

      {/* Activity by Day Chart */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Activity by Day</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {dayOrder.map((day) => {
            const value = report.completionsByDay[day] || 0;
            const height = value > 0 ? Math.max((value / maxDayValue) * 100, 10) : 5;
            
            return (
              <div key={day} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${value > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                  style={{ height: `${height}%` }}
                  title={`${day}: ${value} completions`}
                />
                <span className="text-xs text-gray-400 mt-1">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Area */}
      {Object.keys(report.completionsByArea).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">By Area</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.completionsByArea).map(([area, data]) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: `${data.color}20`, color: data.color }}
              >
                {data.icon} {data.count} {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        {showDetails ? 'Hide details' : 'Show completed works'}
        <svg
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Details List */}
      {showDetails && report.completedWorks.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-2 max-h-48 overflow-y-auto">
          {report.completedWorks.map((work, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span>{work.areaIcon}</span>
              <span className="text-gray-700">{work.name}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(work.completedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {showDetails && report.completedWorks.length === 0 && (
        <p className="mt-4 pt-4 border-t text-sm text-gray-500 text-center">
          No works completed this week
        </p>
      )}
    </div>
  );
}


