import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';

export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data: users } = await supabase.from('story_users').select('username');
    const { data: admins } = await supabase.from('story_admin_users').select('username');
    const { data: stories } = await supabase.from('secret_stories').select('week_start_date, story_title');
    
    return NextResponse.json({
      status: 'ok',
      users: users?.length || 0,
      admins: admins?.length || 0,
      stories: stories?.length || 0
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
