// lib/supabase-client.ts
// Consolidated Supabase client for all API routes and server-side code
// Session 152: Merged from lib/montree/supabase.ts, lib/supabase.ts, lib/supabase/server.ts
// Singleton pattern with retry logic for Cloudflare timeouts

import { createClient as createSupabaseClientJS } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createSupabaseClientJS> | null = null;

/**
 * Hard per-attempt timeout on every Supabase fetch.
 *
 * 🚨 ROOT-CAUSE FIX (Session 137): Node's global fetch (undici) has NO
 * overall response timeout. A socket that connects but then goes silent —
 * which is exactly what happens when a pooled keep-alive connection between
 * Railway and Supabase goes stale — hangs FOREVER. The old wrapper only
 * retried when a connect attempt *threw*; a connected-but-silent socket
 * never throws, so it hung until something upstream killed it. This was the
 * true cause of the principal-agent (Astra) pre-flight "timeouts": the first
 * few queries in a request succeed on a warm socket, then a later query
 * reuses a socket the server already half-closed and stalls indefinitely.
 *
 * 12s is a generous backstop — it never trips a legitimate query (those are
 * sub-second) but guarantees a zombie socket dies and the retry fires on a
 * fresh connection.
 */
const PER_ATTEMPT_TIMEOUT_MS = 12_000;

/**
 * Combine the caller's AbortSignal (if any) with our timeout signal so we
 * never clobber Supabase's own abort handling. Uses AbortSignal.any when
 * available (Node 20.3+), with a manual fallback for older runtimes.
 */
function combineSignals(
  caller: AbortSignal | null | undefined,
  timeout: AbortSignal
): AbortSignal {
  if (!caller) return timeout;
  const anyFn = (AbortSignal as unknown as {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  if (typeof anyFn === 'function') return anyFn([caller, timeout]);
  // Manual fallback: a controller that aborts when either source aborts.
  const controller = new AbortController();
  const onAbort = (src: AbortSignal) => () => controller.abort(src.reason);
  if (caller.aborted) controller.abort(caller.reason);
  else caller.addEventListener('abort', onAbort(caller), { once: true });
  if (timeout.aborted) controller.abort(timeout.reason);
  else timeout.addEventListener('abort', onAbort(timeout), { once: true });
  return controller.signal;
}

/**
 * Fetch wrapper with a hard per-attempt timeout + automatic retry on
 * connection timeouts. Supabase connections through Cloudflare/undici
 * sometimes drop or stall — a retry after a brief backoff almost always
 * succeeds on a fresh socket.
 */
const fetchWithRetry: typeof fetch = async (input, init) => {
  const MAX_RETRIES = 2;
  const callerSignal = init?.signal ?? null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Fresh timeout per attempt so a stalled socket can't outlive the budget.
    const timeoutSignal = AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS);
    const signal = combineSignals(callerSignal, timeoutSignal);
    try {
      return await fetch(input, { ...init, signal });
    } catch (err: unknown) {
      const error = err as { cause?: { code?: string }; name?: string; message?: string };
      // If the CALLER aborted (their own signal), never retry — that's intentional.
      if (callerSignal?.aborted) throw err;
      const isRetryable =
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error?.name === 'TimeoutError' ||   // our AbortSignal.timeout fired
        error?.name === 'AbortError' ||      // combined-signal abort (our timeout)
        error?.message?.includes('fetch failed') ||
        error?.message?.includes('CONNECT_TIMEOUT');
      if (attempt < MAX_RETRIES && isRetryable) {
        // Exponential backoff with jitter: 50-100ms, 100-200ms.
        const baseDelay = 50 * Math.pow(2, attempt);
        const delay = baseDelay + Math.random() * baseDelay;
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
 * Get public URL for a file in a Supabase storage bucket.
 * Uses direct URL construction — no client instantiation needed.
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
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
  PHOTO_BANK: 'photo-bank',
} as const;
