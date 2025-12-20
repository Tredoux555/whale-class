'use client';

import React from 'react';
import { useStudentDetail } from '@/lib/hooks/useStudentDetail';

interface Props {
  studentId: string;
  onClose: () => void;
  onAssignWork: () => void;
}

export default function StudentDetailModal({ studentId, onClose, onAssignWork }: Props) {
  const { data, loading, error } = useStudentDetail(studentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data?.student && (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                    {data.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{data.student.name}</h2>
                    {data.student.age !== null && (
                      <p className="text-indigo-200 text-sm">{data.student.age} years old</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>Failed to load student details</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{data.stats.totalCompleted}</div>
                  <div className="text-xs text-green-700">Completed</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{data.stats.totalInProgress}</div>
                  <div className="text-xs text-yellow-700">In Progress</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{data.stats.overallPercentage}%</div>
                  <div className="text-xs text-indigo-700">Overall</div>
                </div>
              </div>

              {/* Area Progress */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Progress by Area</h3>
                <div className="space-y-2">
                  {data.areaProgress.map((area) => (
                    <div key={area.id} className="flex items-center gap-3">
                      <span className="text-lg">{area.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{area.name}</span>
                          <span style={{ color: area.color }}>{area.percentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${area.percentage}%`, backgroundColor: area.color }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In Progress */}
              {data.inProgressWorks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Currently Working On</h3>
                  <div className="space-y-2">
                    {data.inProgressWorks.map((work) => (
                      <div key={work.work_id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                        <span>{work.areaIcon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{work.workName}</p>
                          <p className="text-xs text-gray-500">Level {work.current_level}/{work.max_level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Completions */}
              {data.recentCompletions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Recent Completions</h3>
                  <div className="space-y-2">
                    {data.recentCompletions.slice(0, 5).map((work) => (
                      <div key={work.work_id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <span>{work.areaIcon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{work.workName}</p>
                          <p className="text-xs text-gray-500">
                            {work.completed_at && new Date(work.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-green-500">✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
          <button
            onClick={onAssignWork}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Assign Work
          </button>
        </div>
      </div>
    </div>
  );
}


