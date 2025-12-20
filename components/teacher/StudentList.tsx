'use client';

import React, { useState } from 'react';

interface Student {
  id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  stats: {
    completed: number;
    inProgress: number;
  };
  lastActivity: string | null;
}

interface Props {
  students: Student[];
  onViewStudent: (studentId: string) => void;
  onAssignWork: (studentId: string) => void;
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return 'No activity';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return date.toLocaleDateString();
}

export default function StudentList({ students, onViewStudent, onAssignWork }: Props) {
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'activity'>('name');

  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'progress') return b.stats.completed - a.stats.completed;
    if (sortBy === 'activity') {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    }
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Students</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'progress' | 'activity')}
          className="text-sm border rounded-md px-2 py-1"
        >
          <option value="name">Sort by Name</option>
          <option value="progress">Sort by Progress</option>
          <option value="activity">Sort by Activity</option>
        </select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedStudents.map((student) => (
          <div
            key={student.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
              {student.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{student.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {student.age !== null && <span>{student.age} years</span>}
                <span>•</span>
                <span>{formatLastActivity(student.lastActivity)}</span>
              </div>
            </div>
            
            <div className="text-right mr-2">
              <div className="text-sm font-medium text-green-600">
                {student.stats.completed} ✓
              </div>
              {student.stats.inProgress > 0 && (
                <div className="text-xs text-yellow-600">
                  {student.stats.inProgress} in progress
                </div>
              )}
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={() => onViewStudent(student.id)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="View details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={() => onAssignWork(student.id)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Assign work"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


