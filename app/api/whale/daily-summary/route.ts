// app/api/whale/daily-summary/route.ts
// Get all activity for a specific date across all children
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam || new Date().toISOString().split('T')[0];

    const supabase = createSupabaseAdmin();

    // Get all activity assignments for the date with child and activity details
    const { data: assignments, error: assignError } = await supabase
      .from('daily_activity_assignments')
      .select(`
        *,
        child:children(id, name, avatar_emoji),
        activity:activities(id, name, area)
      `)
      .eq('assigned_date', date)
      .order('created_at', { ascending: false });

    if (assignError) throw assignError;

    // Get all photos for the date (no activity join - photos link via assignment_id)
    const { data: photos, error: photoError } = await supabase
      .from('activity_photos')
      .select(`
        *,
        child:children(id, name, avatar_emoji)
      `)
      .gte('uploaded_at', `${date}T00:00:00`)
      .lt('uploaded_at', `${date}T23:59:59`)
      .order('uploaded_at', { ascending: false });

    if (photoError) throw photoError;

    // Get work completions for the date
    const { data: completions, error: compError } = await supabase
      .from('child_progress')
      .select(`
        *,
        child:children(id, name, avatar_emoji)
      `)
      .eq('date_updated', date)
      .order('updated_at', { ascending: false });

    if (compError) throw compError;

    // Calculate stats
    const uniqueChildren = new Set([
      ...(assignments || []).map(a => a.child_id),
      ...(photos || []).map(p => p.child_id),
      ...(completions || []).map(c => c.child_id),
    ]);

    const stats = {
      totalAssignments: assignments?.length || 0,
      totalPhotos: photos?.length || 0,
      totalCompletions: completions?.length || 0,
      childrenActive: uniqueChildren.size,
    };

    return NextResponse.json({
      success: true,
      date,
      stats,
      assignments: assignments || [],
      photos: photos || [],
      completions: completions || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching daily summary:', error);
    return NextResponse.json(
      { error: message || 'Failed to fetch daily summary' },
      { status: 500 }
    );
  }
}
