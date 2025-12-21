// app/api/montree/progress/[childId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildProgress, calculateChildOverallProgress } from '@/lib/montree/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    const url = new URL(req.url);
    const summary = url.searchParams.get('summary') === 'true';
    
    if (summary) {
      const progress = await calculateChildOverallProgress(childId);
      return NextResponse.json(progress);
    } else {
      const progress = await getChildProgress(childId);
      return NextResponse.json(progress);
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Failed to fetch progress',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      }, 
      { status: 500 }
    );
  }
}

