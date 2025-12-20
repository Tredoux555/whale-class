'use client';

import React from 'react';

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
  onViewStudent: (studentId: string) => void;
}

export default function NeedsAttentionPanel({ students, onViewStudent }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚠️</span>
        <h3 className="text-lg font-semibold text-gray-900">Needs Attention</h3>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-gray-500 text-sm">All students are active!</p>
          <p className="text-xs text-gray-400 mt-1">Everyone has been active in the last 7 days</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            No activity in the last 7 days:
          </p>
          <div className="space-y-2">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => onViewStudent(student.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-semibold text-sm">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-amber-900">{student.name}</span>
                <svg className="w-4 h-4 text-amber-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3 text-center">
            Consider checking in with these students
          </p>
        </>
      )}
    </div>
  );
}


