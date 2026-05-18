// lib/montree/appointments/agora/debug-logger.ts
//
// Lightweight in-memory ring-buffer logger for the Agora video call
// surface. Captures key events (connection state changes, network quality
// transitions, reconnection attempts, errors) so the user — or me on a
// future debugging session — can dump a clean timeline instead of digging
// through thousands of lines of raw SDK debug output.
//
// USAGE:
//   import { agoraLog, getAgoraLogs, clearAgoraLogs, copyAgoraLogs } from '...';
//   agoraLog('info', 'join.success', { uid, channel });
//   agoraLog('warn', 'reconnect.start', { reason });
//   agoraLog('error', 'token.refresh.failed', { error: err.message });
//
// The buffer is in-memory + ring-capped at 500 entries. It also mirrors
// to console.log for live DevTools observation. Optionally flushes to a
// Supabase telemetry table for centralized analysis later.
//
// 🚨 NEVER log PII (parent names, child names, message content). Log only
// IDs, event types, and small numeric payloads. The point is debugging
// connection mechanics, not surveillance.

'use client';

export type AgoraLogLevel = 'info' | 'warn' | 'error';

export interface AgoraLogEntry {
  ts: number;             // Date.now()
  level: AgoraLogLevel;
  event: string;          // dot-separated event name, e.g. 'reconnect.start'
  data?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
const buffer: AgoraLogEntry[] = [];

export function agoraLog(level: AgoraLogLevel, event: string, data?: Record<string, unknown>) {
  const entry: AgoraLogEntry = { ts: Date.now(), level, event, data };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }
  // Mirror to console with a recognisable prefix so it's easy to grep.
  const tag = `[Agora-Debug ${level.toUpperCase()}] ${event}`;
  if (level === 'error') {
    console.error(tag, data || '');
  } else if (level === 'warn') {
    console.warn(tag, data || '');
  } else {
    console.log(tag, data || '');
  }
}

/** Snapshot the current buffer. Does not clear. */
export function getAgoraLogs(): AgoraLogEntry[] {
  return [...buffer];
}

/** Reset the buffer (call after a successful copy / between sessions). */
export function clearAgoraLogs(): void {
  buffer.length = 0;
}

/**
 * Copy the buffer to the clipboard as pretty-printed JSON. Returns true
 * on success. Falls back to a textarea selectExec for older browsers.
 */
export async function copyAgoraLogs(): Promise<boolean> {
  const payload = JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      entryCount: buffer.length,
      entries: buffer.map((e) => ({
        ts: e.ts,
        iso: new Date(e.ts).toISOString(),
        level: e.level,
        event: e.event,
        data: e.data || null,
      })),
    },
    null,
    2,
  );
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return true;
    }
  } catch {
    /* fall through to manual */
  }
  // Fallback: hidden textarea + execCommand.
  try {
    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
