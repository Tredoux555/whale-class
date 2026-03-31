// lib/montree/background-task-store.ts
// Global background task manager — module-level singleton (survives React re-renders + navigation)
//
// Tracks all long-running operations (voice notes, video uploads, report generation, doc generation)
// so teachers can navigate freely while work happens in the background.
//
// Architecture follows the proven PhotoInsightStore pattern:
// - Module-level Map (not React state) — survives navigation
// - Listener pattern for useSyncExternalStore compatibility
// - Composite keys per task type
// - AbortController tracking for cleanup
//
// Usage:
//   import { addTask, completeTask, failTask, subscribe, getTasks } from '@/lib/montree/background-task-store';
//   const taskId = addTask({ type: 'voice_note', label: 'Recording note...', childId: 'abc' });
//   // ... do async work ...
//   completeTask(taskId, { message: '✓ Sandpaper Letters — practicing' });

// ============================================================
// TYPES
// ============================================================

export type TaskType =
  | 'voice_note'       // Whisper transcription + extraction
  | 'video_upload'     // Video file upload to storage
  | 'report_generate'  // Batch report generation
  | 'doc_generate'     // Weekly admin doc generation
  | 'pulse_generate'   // Pulse report generation
  | 'generic';         // Catch-all for future operations

export type TaskStatus = 'running' | 'completed' | 'failed';

export interface BackgroundTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  /** Short label shown in the banner: "Transcribing note..." */
  label: string;
  /** Optional child ID for context */
  childId?: string;
  /** Optional child name for display */
  childName?: string;
  /** When the task was created */
  startTime: number;
  /** When the task completed/failed (null if still running) */
  endTime: number | null;
  /** Progress 0-1 for multi-step operations (null if indeterminate) */
  progress: number | null;
  /** Result message on completion: "✓ Sandpaper Letters — practicing (auto-applied)" */
  resultMessage: string | null;
  /** Error message on failure */
  errorMessage: string | null;
  /** Callback to execute on tap (e.g., navigate to child, open transcript for editing) */
  onTap?: (() => void) | null;
  /** Callback for transcript delivery — fires when voice note transcript is ready */
  onTranscript?: ((text: string) => void) | null;
  /** Callback when extraction completes — fires when voice note is fully processed */
  onComplete?: (() => void) | null;
}

type Listener = () => void;

// ============================================================
// STORE (module-level singleton)
// ============================================================

const tasks = new Map<string, BackgroundTask>();
const listeners = new Set<Listener>();
const abortControllers = new Map<string, AbortController>();

let version = 0;
let nextId = 1;

// Auto-dismiss timers for completed/failed tasks
const dismissTimers = new Map<string, NodeJS.Timeout>();

// How long completed tasks stay visible before auto-dismissing (ms)
const COMPLETED_DISMISS_MS = 6000;
const FAILED_DISMISS_MS = 10000;

function notify(): void {
  version++;
  for (const listener of listeners) {
    listener();
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Subscribe to store changes. Returns unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot for useSyncExternalStore — returns new array on each mutation */
let cachedTaskArray: { version: number; tasks: BackgroundTask[] } = { version: -1, tasks: [] };

export function getTasksSnapshot(): BackgroundTask[] {
  if (cachedTaskArray.version !== version) {
    cachedTaskArray = { version, tasks: Array.from(tasks.values()) };
  }
  return cachedTaskArray.tasks;
}

/** Get all running tasks (for banner count) */
export function getRunningTasks(): BackgroundTask[] {
  return Array.from(tasks.values()).filter(t => t.status === 'running');
}

/** Get a specific task by ID */
export function getTask(taskId: string): BackgroundTask | undefined {
  return tasks.get(taskId);
}

/**
 * Add a new background task. Returns the task ID.
 * The AbortController is stored internally — use abortTask() to cancel.
 */
export function addTask(opts: {
  type: TaskType;
  label: string;
  childId?: string;
  childName?: string;
  onTap?: (() => void) | null;
  onTranscript?: ((text: string) => void) | null;
  onComplete?: (() => void) | null;
}): string {
  const id = `task_${nextId++}_${Date.now()}`;
  const controller = new AbortController();
  abortControllers.set(id, controller);

  const task: BackgroundTask = {
    id,
    type: opts.type,
    status: 'running',
    label: opts.label,
    childId: opts.childId,
    childName: opts.childName,
    startTime: Date.now(),
    endTime: null,
    progress: null,
    resultMessage: null,
    errorMessage: null,
    onTap: opts.onTap ?? null,
    onTranscript: opts.onTranscript ?? null,
    onComplete: opts.onComplete ?? null,
  };

  tasks.set(id, task);
  notify();
  return id;
}

/** Get the AbortController signal for a task (pass to fetch calls) */
export function getTaskSignal(taskId: string): AbortSignal | undefined {
  return abortControllers.get(taskId)?.signal;
}

/** Update task label (e.g., "Transcribing..." → "Extracting...") */
export function updateTaskLabel(taskId: string, label: string): void {
  const task = tasks.get(taskId);
  if (!task || task.status !== 'running') return;
  tasks.set(taskId, { ...task, label });
  notify();
}

/** Update task progress (0-1) */
export function updateTaskProgress(taskId: string, progress: number): void {
  const task = tasks.get(taskId);
  if (!task || task.status !== 'running') return;
  tasks.set(taskId, { ...task, progress: Math.max(0, Math.min(1, progress)) });
  notify();
}

/** Mark task as completed. Auto-dismisses after COMPLETED_DISMISS_MS. */
export function completeTask(taskId: string, opts?: { message?: string }): void {
  const task = tasks.get(taskId);
  if (!task) return;

  tasks.set(taskId, {
    ...task,
    status: 'completed',
    endTime: Date.now(),
    progress: 1,
    resultMessage: opts?.message ?? null,
  });

  // Clean up abort controller
  abortControllers.delete(taskId);

  // Fire onComplete callback
  try { task.onComplete?.(); } catch (e) { console.error('[bg-task] onComplete error:', e); }

  // Auto-dismiss after delay — set timer BEFORE notify() so dismissTask() can clear it
  const timer = setTimeout(() => {
    tasks.delete(taskId);
    dismissTimers.delete(taskId);
    notify();
  }, COMPLETED_DISMISS_MS);
  dismissTimers.set(taskId, timer);

  notify();
}

/** Mark task as failed. Auto-dismisses after FAILED_DISMISS_MS. */
export function failTask(taskId: string, errorMessage: string): void {
  const task = tasks.get(taskId);
  if (!task) return;

  tasks.set(taskId, {
    ...task,
    status: 'failed',
    endTime: Date.now(),
    errorMessage,
  });

  abortControllers.delete(taskId);

  // Auto-dismiss after delay — set timer BEFORE notify() so dismissTask() can clear it
  const timer = setTimeout(() => {
    tasks.delete(taskId);
    dismissTimers.delete(taskId);
    notify();
  }, FAILED_DISMISS_MS);
  dismissTimers.set(taskId, timer);

  notify();
}

/** Abort a running task */
export function abortTask(taskId: string): void {
  const controller = abortControllers.get(taskId);
  if (controller) {
    controller.abort();
    abortControllers.delete(taskId);
  }
  tasks.delete(taskId);
  const timer = dismissTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(taskId);
  }
  notify();
}

/** Dismiss a completed/failed task immediately (user taps X) */
export function dismissTask(taskId: string): void {
  tasks.delete(taskId);
  const timer = dismissTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(taskId);
  }
  abortControllers.delete(taskId);
  notify();
}

/** Fire the onTranscript callback for a voice note task */
export function deliverTranscript(taskId: string, text: string): void {
  const task = tasks.get(taskId);
  if (!task) return;
  try { task.onTranscript?.(text); } catch (e) { console.error('[bg-task] onTranscript error:', e); }
}

/** Clear all tasks (for testing or session reset) */
export function clearAllTasks(): void {
  for (const controller of abortControllers.values()) {
    controller.abort();
  }
  for (const timer of dismissTimers.values()) {
    clearTimeout(timer);
  }
  tasks.clear();
  abortControllers.clear();
  dismissTimers.clear();
  notify();
}
