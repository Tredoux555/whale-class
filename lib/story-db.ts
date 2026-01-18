// Shared Supabase client for story routes
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

export function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const { jwtVerify } = await import('jose');
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

export async function verifyUserToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const { jwtVerify } = await import('jose');
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload.username as string;
  } catch {
    return null;
  }
}

// Extract session token from auth header (first 50 chars, matches login_logs format)
export function getSessionToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return token.substring(0, 50);
}

// Get login_log_id for a session token
export async function getLoginLogId(sessionToken: string | null): Promise<number | null> {
  if (!sessionToken) return null;
  
  try {
    const supabase = getSupabase();
    const { data: loginLog } = await supabase
      .from('story_login_logs')
      .select('id')
      .eq('session_token', sessionToken)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();
    
    return loginLog?.id || null;
  } catch {
    return null;
  }
}

// Helper to get session info for message history inserts
export async function getSessionInfo(authHeader: string | null): Promise<{
  sessionToken: string | null;
  loginLogId: number | null;
}> {
  const sessionToken = getSessionToken(authHeader);
  const loginLogId = await getLoginLogId(sessionToken);
  return { sessionToken, loginLogId };
}
