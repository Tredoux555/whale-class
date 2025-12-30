import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { assignmentId, status } = await request.json();

    if (!assignmentId || !status) {
      return NextResponse.json(
        { error: 'assignmentId and status required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['not_started', 'presented', 'practicing', 'mastered'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update the assignment with timestamp
    const updateData: Record<string, any> = {
      progress_status: status,
      updated_at: new Date().toISOString(),
    };

    // Add timestamp for specific status
    if (status === 'presented') {
      updateData.presented_at = new Date().toISOString();
    } else if (status === 'practicing') {
      updateData.practicing_at = new Date().toISOString();
    } else if (status === 'mastered') {
      updateData.mastered_at = new Date().toISOString();
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
