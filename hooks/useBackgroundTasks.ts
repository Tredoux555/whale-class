// hooks/useBackgroundTasks.ts
// React hook for consuming the background task store via useSyncExternalStore
'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  getTasksSnapshot,
  getRunningTasks,
  dismissTask,
  abortTask,
  type BackgroundTask,
} from '@/lib/montree/background-task-store';

/** Subscribe to ALL background tasks (running + completed + failed). Stable array ref via cached snapshot. */
export function useBackgroundTasks(): {
  tasks: BackgroundTask[];
  runningCount: number;
  hasActiveTasks: boolean;
  dismiss: (taskId: string) => void;
  abort: (taskId: string) => void;
} {
  const tasks = useSyncExternalStore(subscribe, getTasksSnapshot, getTasksSnapshot);

  const runningCount = tasks.filter(t => t.status === 'running').length;
  const hasActiveTasks = tasks.length > 0;

  const dismiss = useCallback((taskId: string) => dismissTask(taskId), []);
  const abort = useCallback((taskId: string) => abortTask(taskId), []);

  return { tasks, runningCount, hasActiveTasks, dismiss, abort };
}
