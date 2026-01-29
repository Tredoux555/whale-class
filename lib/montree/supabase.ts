// lib/montree/supabase.ts
// Supabase client for Montree API routes
// Session 116: Created for parent portal APIs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase client for API routes
 * Uses service role key for full database access
 */
export function getSupabase() {
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
