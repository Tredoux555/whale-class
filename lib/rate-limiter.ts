// lib/rate-limiter.ts
// Database-backed rate limiting for auth endpoints
// Survives Railway container restarts (unlike in-memory approaches)
// Uses montree_rate_limit_logs table (created in migration 122)

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Check if a request is within rate limits.
 * Counts attempts in the given window and blocks if exceeded.
 *
 * @param supabase - Supabase client instance
 * @param ip - Client IP address
 * @param endpoint - API route path (e.g., '/api/montree/parent/login')
 * @param maxAttempts - Maximum attempts allowed in window
 * @param windowMinutes - Time window in minutes
 * @returns { allowed, retryAfterSeconds }
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  endpoint: string,
  maxAttempts: number,
  windowMinutes: number,
  // audit-fix (Jun 2026): callers guarding credentials can opt into failing
  // CLOSED — if the rate-limit table is unreachable we deny rather than letting
  // brute-force run unmetered. Default stays 'open' so nothing else changes.
  failMode: 'open' | 'closed' = 'open'
): Promise<RateLimitResult> {
  const onFailure = (): RateLimitResult =>
    failMode === 'closed'
      ? { allowed: false, retryAfterSeconds: 60 }
      : { allowed: true };

  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    // Count recent attempts from this IP for this endpoint
    const { count, error: countError } = await supabase
      .from('montree_rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('key', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart);

    if (countError) {
      console.error(`[RateLimit] Count query failed (fail-${failMode}):`, countError);
      return onFailure();
    }

    if ((count || 0) >= maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: windowMinutes * 60,
      };
    }

    // Log this attempt (fire-and-forget — never fail the auth request)
    await supabase
      .from('montree_rate_limit_logs')
      .insert({ key: ip, endpoint, created_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error('[RateLimit] Insert failed:', error);
      });

    return { allowed: true };
  } catch (e) {
    console.error(`[RateLimit] Unexpected error (fail-${failMode}):`, e);
    return onFailure();
  }
}
