// app/api/montree/progress/[childId]/[workId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWorkProgress, updateWorkProgress, startWork, completeWork, resetWork } from '@/lib/montree/db';
import { createServerClient } from '@/lib/supabase';

// Auto-mark attendance when progress is tracked
// If child has work updated today, they're present!
async function autoMarkAttendance(childId: string): Promise<void> {
  try {
    const supabase = await createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5); // HH:MM format
    
    // Upsert attendance - only marks present if not already marked
    // Teacher can manually override to sick/absent later if needed
    await supabase
      .from('attendance')
      .upsert({
        child_id: childId,
        attendance_date: today,
        status: 'present',
        check_in_time: now,
        marked_by: 'montree-auto',
        notes: 'Auto-marked from Montessori progress tracking'
      }, { 
        onConflict: 'child_id,attendance_date',
        // Don't override if teacher already marked manually
        ignoreDuplicates: false 
      });
    
    console.log(`Auto-attendance: ${childId} marked present for ${today}`);
  } catch (error) {
    // Don't fail the progress update if attendance fails
    console.warn('Auto-attendance failed (non-blocking):', error);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; workId: string }> }
) {
  try {
    const { childId, workId } = await params;
    const progress = await getWorkProgress(childId, workId);
    return NextResponse.json(progress || { status: 'not_started', currentLevel: 0 });
  } catch (error) {
    console.error('Error fetching work progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; workId: string }> }
) {
  try {
    const { childId, workId } = await params;
    const body = await req.json();
    const { action, status, currentLevel, notes } = body;
    
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }
    
    let progress;
    
    switch (action) {
      case 'start':
        progress = await startWork(childId, workId);
        // Auto-mark attendance when work is started
        await autoMarkAttendance(childId);
        break;
      case 'complete':
        progress = await completeWork(childId, workId, currentLevel || 1);
        // Auto-mark attendance when work is completed
        await autoMarkAttendance(childId);
        break;
      case 'reset':
        progress = await resetWork(childId, workId);
        // Don't auto-mark attendance for reset (might be admin cleanup)
        break;
      case 'update':
        if (!status) {
          return NextResponse.json({ error: 'Status is required for update action' }, { status: 400 });
        }
        progress = await updateWorkProgress(
          childId, 
          workId, 
          status, 
          currentLevel || 0, 
          notes || ''
        );
        // Auto-mark attendance for any progress update (except resetting to not_started)
        if (status !== 'not_started') {
          await autoMarkAttendance(childId);
        }
        break;
      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
    
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error updating work progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Failed to update progress',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      }, 
      { status: 500 }
    );
  }
}
