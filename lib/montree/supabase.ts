// lib/montree/supabase.ts
// Supabase client for Montree API routes
// Session 116: Created for parent portal APIs
// Session 125: Fixed to read env vars at runtime, not build time

import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase client for API routes
 * Uses service role key for full database access
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
    });
  }

  return supabaseInstance;
}

// Alias for consistency with other files
export const createSupabaseAdmin = getSupabase;
