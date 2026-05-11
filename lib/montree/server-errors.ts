// lib/montree/server-errors.ts
// Lightweight error logger. Call from anywhere a real bug happens, in
// addition to console.error.
//
// Fire-and-forget: NEVER blocks the calling function, NEVER throws.
// Failures are silently logged to console (we don't want a logger that
// itself can break the request).

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase-client';

export interface LogServerErrorInput {
  origin: string;
  message: string;
  stack?: string | null;
  context?: Record<string, unknown> | null;
  severity?: 'warn' | 'error' | 'fatal';
}

/**
 * Log a server error to montree_server_errors. Fire-and-forget.
 *
 * Usage:
 *   try { ... } catch (err) {
 *     console.error('[my-route] failed:', err);
 *     logServerError({ origin: 'my-route', message: ..., stack: err.stack });
 *   }
 *
 * The supabase client is optional — if not provided, we grab the singleton.
 * Pass an existing one if you're already in a request context for efficiency.
 */
export function logServerError(input: LogServerErrorInput, supabase?: SupabaseClient): void {
  // Fire-and-forget — we never await this.
  void (async () => {
    try {
      const sb = supabase || getSupabase();
      await sb.from('montree_server_errors').insert({
        origin: input.origin.slice(0, 100),
        message: input.message.slice(0, 4000),
        stack: input.stack ? input.stack.slice(0, 8000) : null,
        context: input.context || null,
        severity: input.severity || 'error',
      });
    } catch (err) {
      console.error('[server-errors] logger itself failed (non-fatal)', err);
    }
  })();
}

/**
 * Convenience wrapper for catch blocks — extracts message + stack from
 * an unknown error value.
 */
export function logCaughtError(
  origin: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack || null : null;
  logServerError({ origin, message, stack, context });
}
