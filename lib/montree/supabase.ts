// lib/montree/supabase.ts
// Supabase client for Montree API routes
// Session 116: Created for parent portal APIs
// Session 125: Fixed to read env vars at runtime, not build time
// Includes retry logic for transient connection timeouts

import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Fetch wrapper with automatic retry on connection timeouts.
 * Supabase connections through Cloudflare sometimes drop — a retry
 * after a brief backoff almost always succeeds.
 */
const fetchWithRetry: typeof fetch = async (input, init) => {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: any) {
      const isTimeout = err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                        err?.message?.includes('fetch failed') ||
                        err?.message?.includes('CONNECT_TIMEOUT');
      if (attempt < MAX_RETRIES && isTimeout) {
        const delay = 1000 * (attempt + 1); // 1s, 2s backoff
        console.warn(`[Supabase] Connection timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  // TypeScript requires a return, though we'll never reach here
  throw new Error('Exhausted retries');
};

/**
 * Get Supabase client for API routes
 * Uses service role key for full database access
 * Includes retry logic for connection timeouts
 * Env vars are read at runtime to avoid build-time errors
 */
export function getSupabase() {
  // Read env vars at runtime, not module import time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: fetchWithRetry,
      },
    });
  }

  return supabaseInstance;
}

// Alias for consistency with other files
export const createSupabaseAdmin = getSupabase;
