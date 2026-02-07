// lib/supabase-client.ts
// Consolidated Supabase client for all API routes and server-side code
// Session 152: Merged from lib/montree/supabase.ts, lib/supabase.ts, lib/supabase/server.ts
// Singleton pattern with retry logic for Cloudflare timeouts

import { createClient as createSupabaseClientJS } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createSupabaseClientJS> | null = null;

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
    } catch (err: unknown) {
      const error = err as { cause?: { code?: string }; message?: string };
      const isTimeout = error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                        error?.message?.includes('fetch failed') ||
                        error?.message?.includes('CONNECT_TIMEOUT');
      if (attempt < MAX_RETRIES && isTimeout) {
        const delay = 1000 * (attempt + 1);
        console.warn(`[Supabase] Connection timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exhausted retries');
};

/**
 * Get Supabase client for API routes (service role — bypasses RLS)
 * Uses singleton pattern with retry logic for connection timeouts
 * Env vars read at runtime to avoid build-time errors
 */
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClientJS(supabaseUrl, supabaseServiceRoleKey, {
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

// Aliases for backward compatibility
export const createSupabaseAdmin = getSupabase;
export const createAdminClient = getSupabase;
export const createServerClient = getSupabase;

/**
 * Client-side Supabase client (uses anon key — for browser components)
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createSupabaseClientJS(supabaseUrl, supabaseAnonKey);
}

export const createBrowserClient = createSupabaseClient;

/**
 * Get the Supabase project URL
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return url;
}

/**
 * Get public URL for a file in a Supabase storage bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  const supabase = createSupabaseClientJS(supabaseUrl, supabaseAnonKey);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Storage constants
export const STORAGE_BUCKET = 'videos';
export const METADATA_FILE = 'data/videos.json';
export const CIRCLE_PLANS_FILE = 'data/circle-plans.json';

export const STORAGE_BUCKETS = {
  VIDEOS: 'videos',
  PHOTOS: 'child-photos',
  REPORTS: 'parent-reports',
  MATERIALS: 'activity-materials',
} as const;
