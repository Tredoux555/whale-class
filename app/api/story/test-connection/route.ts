import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('story_users').select('username').limit(1);
    
    if (error) throw error;
    
    return NextResponse.json({ status: 'connected', database: 'supabase' });
  } catch (error) {
    console.error('[Test Connection] Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
