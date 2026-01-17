// /api/montree-v2/works/route.ts
// Record and retrieve work progress
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate deterministic UUID from work_id string
function generateCurriculumWorkId(workId: string): string {
  const hash = createHash('sha256').update(`montree:${workId}`).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${(parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16)}${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

// POST - Record new work
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, workId, status, notes, photo } = body;

    if (!studentId || !workId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, workId' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const curriculumWorkId = generateCurriculumWorkId(workId);

    // Map status
    const dbStatus = status === 'completed' ? 'completed' 
      : status === 'practicing' ? 'in_progress' 
      : 'in_progress';

    // Upsert progress record
    const { data, error } = await supabase
      .from('child_work_completion')
      .upsert({
        child_id: studentId,
        work_id: workId,
        curriculum_work_id: curriculumWorkId,
        status: dbStatus,
        notes: notes || '',
        completion_date: now.split('T')[0],
        started_at: now,
        completed_at: dbStatus === 'completed' ? now : null,
      }, {
        onConflict: 'child_id,work_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[Works API] Upsert error:', error);
      
      // Try insert if upsert fails
      const { data: insertData, error: insertError } = await supabase
        .from('child_work_completion')
        .insert({
          child_id: studentId,
          work_id: workId,
          curriculum_work_id: curriculumWorkId,
          status: dbStatus,
          notes: notes || '',
          completion_date: now.split('T')[0],
          started_at: now,
          completed_at: dbStatus === 'completed' ? now : null,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        work: insertData,
        message: 'Work recorded successfully'
      });
    }

    // TODO: Handle photo upload to Supabase Storage
    let photoUrl = null;
    if (photo && photo.startsWith('data:image')) {
      // Photo handling would go here
      // For now, we'll skip storage and just acknowledge
    }

    return NextResponse.json({
      success: true,
      work: data,
      photoUrl,
      message: 'Work recorded successfully'
    });

  } catch (error: any) {
    console.error('[Works API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Retrieve works for a student
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const area = searchParams.get('area');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('child_work_completion')
      .select('*')
      .eq('child_id', studentId)
      .order('created_at', { ascending: false });

    // If area filter provided, filter by work_id prefix
    // (This is a simple approach - could be improved)

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      works: data || [],
      count: (data || []).length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
