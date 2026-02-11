import { jwtVerify } from 'jose';
import { getSupabase } from '@/lib/supabase-client';

// Shared helpers for Story admin routes — extracted from send-message/send-audio/send-image/send-video

export function getStoryJWTSecret(): Uint8Array {
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

export function getSessionToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  return token.substring(0, 50);
}

export async function verifyStoryAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, getStoryJWTSecret());
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAdminLoginLogId(supabase: any, sessionToken: string | null): Promise<number | null> {
  if (!sessionToken) return null;
  try {
    const { data } = await supabase
      .from('story_admin_login_logs')
      .select('id')
      .eq('session_token', sessionToken)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();
    return data?.id || null;
  } catch {
    return null;
  }
}
