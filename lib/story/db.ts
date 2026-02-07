// Re-export from story-db for backwards compatibility
import { getSupabase } from '@/lib/supabase-client';

// Compatibility layer - simulates pg query interface using Supabase
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  // This is a simplified compatibility layer
  // For complex queries, use Supabase directly
  console.warn('[lib/story/db] Using compatibility query - consider migrating to Supabase client');
  
  const supabase = getSupabase();
  
  // Try to extract table name from simple SELECT queries
  const selectMatch = text.match(/FROM\s+(\w+)/i);
  if (selectMatch) {
    const tableName = selectMatch[1];
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return { rows: (data || []) as T[] };
  }
  
  throw new Error('Complex queries not supported in compatibility mode');
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(tableName).select('*').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export const db = { query, queryOne, tableExists };
