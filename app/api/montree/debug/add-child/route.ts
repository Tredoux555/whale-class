// /api/montree/debug/add-child/route.ts
// Simple test endpoint for adding a child - no progress handling
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || '945c846d-fb33-4370-8a95-a29b7767af54';
    const name = searchParams.get('name') || 'Test Child';
    const age = parseFloat(searchParams.get('age') || '3.5');

    // Step 1: Check what columns exist in montree_children
    const { data: sample, error: sampleErr } = await supabase
      .from('montree_children')
      .select('*')
      .limit(1);

    const columns = sample?.[0] ? Object.keys(sample[0]) : [];

    // Step 2: Try to insert
    const insertData: any = {
      classroom_id: classroomId,
      name: name,
      age: age,
    };

    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .insert(insertData)
      .select()
      .single();

    if (childError) {
      return NextResponse.json({
        success: false,
        error: childError.message,
        errorDetails: childError,
        attemptedInsert: insertData,
        existingColumns: columns,
      });
    }

    return NextResponse.json({
      success: true,
      child,
      existingColumns: columns,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
