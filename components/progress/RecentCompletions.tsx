'use client';

import React from 'react';

interface WorkCompletion {
  work_id: string;
  status: string;
  current_level: number;
  max_level: number;
  started_at: string | null;
  completed_at: string | null;
  curriculum_roadmap: {
    id: string;
    name: string;
    area_id: string;
  };
}

interface Props {
  completions: WorkCompletion[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

export default function RecentCompletions({ completions }: Props) {
  if (completions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        No recent activity
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border divide-y">
      {completions.map((completion) => (
        <div key={completion.work_id} className="p-3 flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
            ${completion.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}
          `}>
            {completion.status === 'completed' ? '✓' : `${completion.current_level}`}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {completion.curriculum_roadmap.name}
            </p>
            <p className="text-xs text-gray-500">
              {completion.status === 'completed' 
                ? `Completed all ${completion.max_level} levels`
                : `Level ${completion.current_level} of ${completion.max_level}`
              }
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            {formatDate(completion.completed_at || completion.started_at)}
          </div>
        </div>
      ))}
    </div>
  );
}


