// lib/rate-limiter.ts
// Database-backed rate limiting for auth endpoints
// Survives Railway container restarts (unlike in-memory approaches)
// Uses montree_rate_limit_logs table (created in migration 122)

import { SupabaseClient } from '@supabase/supabase-js';

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
  windowMinutes: number
): Promise<RateLimitResult> {
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
      // If rate limit check fails, allow the request (fail open)
      console.error('[RateLimit] Count query failed:', countError);
      return { allowed: true };
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
    // If anything goes wrong, fail open (allow the request)
    console.error('[RateLimit] Unexpected error:', e);
    return { allowed: true };
  }
}
