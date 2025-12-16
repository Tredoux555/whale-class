import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    const { data: watches, error } = await supabase
      .from('child_video_watches')
      .select(`
        id,
        watch_percentage,
        is_complete,
        created_at,
        children!inner(name),
        curriculum_roadmap!inner(work_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const formattedWatches = watches?.map(w => ({
      id: w.id,
      child_name: (w.children as any)?.name || 'Unknown',
      work_name: (w.curriculum_roadmap as any)?.work_name || 'Unknown',
      watch_percentage: w.watch_percentage || 0,
      is_complete: w.is_complete,
      created_at: w.created_at,
    })) || [];

    return NextResponse.json({
      success: true,
      watches: formattedWatches,
    });

  } catch (error: any) {
    console.error('Error fetching recent watches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recent watches' },
      { status: 500 }
    );
  }
}

