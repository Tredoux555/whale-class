import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { assignmentId, status, notes } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId required' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Handle status update
    if (status) {
      const validStatuses = ['not_started', 'presented', 'practicing', 'mastered'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      
      updateData.progress_status = status;

      // Add timestamp for specific status
      if (status === 'presented') {
        updateData.presented_at = new Date().toISOString();
      } else if (status === 'practicing') {
        updateData.practicing_at = new Date().toISOString();
      } else if (status === 'mastered') {
        updateData.mastered_at = new Date().toISOString();
      }
    }

    // Handle notes update
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('weekly_assignments')
      .update(updateData)
      .eq('id', assignmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}
