import { getSupabase } from '@/lib/supabase-client';

// Compatibility layer for old pg-style queries
export const db = {
  query: async (text: string, params?: unknown[]) => {
    console.warn('[lib/db] Using pg compatibility layer - consider using Supabase client directly');
    
    const supabase = getSupabase();
    
    // Handle simple SELECT queries
    const selectMatch = text.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[2];
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // Handle INSERT with RETURNING
    const insertMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
    if (insertMatch) {
      console.warn('INSERT queries not fully supported in compatibility mode');
      return { rows: [], rowCount: 0 };
    }
    
    // Handle UPDATE
    const updateMatch = text.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) {
      console.warn('UPDATE queries not fully supported in compatibility mode');
      return { rows: [], rowCount: 0 };
    }
    
    throw new Error(`Query not supported in compatibility mode: ${text.substring(0, 50)}...`);
  },
};

export default null; // No pool export needed for Supabase
