// components/montree/BackgroundTaskBanner.tsx
// Persistent banner at bottom of screen showing background task progress.
// Non-blocking — teachers see status while continuing to work.
// Follows PhotoInsightPopup toast pattern: fixed bottom, pointer-events-none container.
'use client';

import { useState } from 'react';
import { useBackgroundTasks } from '@/hooks/useBackgroundTasks';
import { useI18n } from '@/lib/montree/i18n';
import type { BackgroundTask } from '@/lib/montree/background-task-store';

// ============================================================
// TASK CARD (individual task row)
// ============================================================

function TaskCard({ task, onDismiss, onAbort }: {
  task: BackgroundTask;
  onDismiss: (id: string) => void;
  onAbort: (id: string) => void;
}) {
  const { t } = useI18n();
  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  // Background colors per status
  const bgClass = isRunning
    ? 'bg-amber-50 border-amber-200'
    : isCompleted
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-red-50 border-red-200';

  // Status icon
  const icon = isRunning
    ? null // spinner rendered separately
    : isCompleted
      ? '✓'
      : '✕';

  const iconColor = isCompleted ? 'text-emerald-600' : 'text-red-500';

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${bgClass} shadow-sm pointer-events-auto`}>
      {/* Status indicator */}
      {isRunning ? (
        <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full flex-shrink-0" />
      ) : (
        <span className={`text-sm font-bold flex-shrink-0 ${iconColor}`}>{icon}</span>
      )}

      {/* Label + result/error message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {isCompleted && task.resultMessage ? task.resultMessage : task.label}
        </p>
        {isFailed && task.errorMessage && (
          <p className="text-xs text-red-600 truncate mt-0.5">{task.errorMessage}</p>
        )}
        {/* Progress bar for running tasks with known progress */}
        {isRunning && task.progress !== null && (
          <div className="mt-1 bg-white rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(task.progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Child name badge */}
      {task.childName && (
        <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:inline">
          {task.childName}
        </span>
      )}

      {/* Action button: abort (running) or dismiss (completed/failed) */}
      {isRunning ? (
        <button
          onClick={() => onAbort(task.id)}
          className="text-gray-400 hover:text-red-500 text-xs flex-shrink-0 transition-colors"
          title={t('bgTask.cancel')}
        >
          ✕
        </button>
      ) : (
        <button
          onClick={() => onDismiss(task.id)}
          className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0 transition-colors"
          title={t('bgTask.dismiss')}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ============================================================
// MAIN BANNER
// ============================================================

export default function BackgroundTaskBanner() {
  const { tasks, runningCount, hasActiveTasks, dismiss, abort } = useBackgroundTasks();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  // Nothing to show
  if (!hasActiveTasks) return null;

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
      <div className="max-w-lg mx-auto px-3 pb-3">
        {/* Collapsed: just show summary pill */}
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="pointer-events-auto w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            {runningCount > 0 && (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full" />
                <span>{runningCount} {t('bgTask.processing')}</span>
              </>
            )}
            {completedCount > 0 && (
              <span className="text-emerald-600">✓ {completedCount}</span>
            )}
            {failedCount > 0 && (
              <span className="text-red-500">✕ {failedCount}</span>
            )}
            <span className="text-gray-400 text-xs">▲</span>
          </button>
        ) : (
          /* Expanded: show all task cards */
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg overflow-hidden pointer-events-auto">
            {/* Header bar */}
            <button
              onClick={() => setCollapsed(true)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                {runningCount > 0 && (
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full" />
                )}
                <span>
                  {runningCount > 0
                    ? `${runningCount} ${t('bgTask.processing')}`
                    : t('bgTask.allDone')
                  }
                </span>
              </div>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {/* Task list */}
            <div className="px-2 pb-2 space-y-1.5 max-h-48 overflow-y-auto">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDismiss={dismiss}
                  onAbort={abort}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
