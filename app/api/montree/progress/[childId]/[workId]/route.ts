// app/api/montree/progress/[childId]/[workId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWorkProgress, updateWorkProgress, startWork, completeWork, resetWork } from '@/lib/montree/db';

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
        break;
      case 'complete':
        progress = await completeWork(childId, workId, currentLevel || 1);
        break;
      case 'reset':
        progress = await resetWork(childId, workId);
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

