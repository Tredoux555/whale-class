// app/api/montree/synonyms/learn/route.ts
// Learning endpoint - saves teacher corrections as synonyms

import { NextRequest, NextResponse } from 'next/server';
import { learnFromCorrection } from '@/lib/montree/fuzzy-matcher';

export async function POST(request: NextRequest) {
  try {
    const { raw_text, work_id, school_id } = await request.json();
    
    if (!raw_text || !work_id) {
      return NextResponse.json({ error: 'raw_text and work_id required' }, { status: 400 });
    }
    
    const success = await learnFromCorrection(raw_text, work_id, school_id);
    
    return NextResponse.json({ 
      success,
      message: success ? 'Learned for future imports' : 'Failed to save'
    });
    
  } catch (error) {
    console.error('Learn error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
