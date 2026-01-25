// app/api/whale/progress/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProgressSummaryByArea } from '@/lib/db/progress';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 });

    const summary = await getProgressSummaryByArea(childId);
    return NextResponse.json({ data: summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch progress summary' }, { status: 500 });
  }
}
