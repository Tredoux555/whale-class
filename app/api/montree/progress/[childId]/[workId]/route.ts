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
    const { action, status, currentLevel, notes } = await req.json();
    
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
        progress = await updateWorkProgress(
          childId, 
          workId, 
          status, 
          currentLevel, 
          notes
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error updating work progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

