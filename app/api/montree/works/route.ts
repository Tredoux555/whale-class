// /api/montree/works/route.ts
// Save student work progress with optional photo
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map status names to database values
const STATUS_MAP: Record<string, string> = {
  'presented': 'not_started',
  'practicing': 'in_progress',
  'completed': 'completed',
};

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { studentId, workId, workName, area, status, notes, photo } = body;

    if (!studentId || !workId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, workId' },
        { status: 400 }
      );
    }

    const dbStatus = STATUS_MAP[status] || status;
    const now = new Date().toISOString();

    // 1. Upsert work progress
    const { data: progressData, error: progressError } = await supabase
      .from('child_work_completion')
      .upsert({
        child_id: studentId,
        work_id: workId,
        status: dbStatus,
        notes: notes || '',
        started_at: dbStatus !== 'not_started' ? now : null,
        completed_at: dbStatus === 'completed' ? now : null,
        updated_at: now,
      }, {
        onConflict: 'child_id,work_id'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Progress upsert error:', progressError);
      // Try insert if upsert fails
      const { data: insertData, error: insertError } = await supabase
        .from('child_work_completion')
        .insert({
          child_id: studentId,
          work_id: workId,
          status: dbStatus,
          notes: notes || '',
          started_at: dbStatus !== 'not_started' ? now : null,
          completed_at: dbStatus === 'completed' ? now : null,
          updated_at: now,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Progress insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // 2. Handle photo upload if present
    let photoUrl = null;
    if (photo && photo.startsWith('data:image')) {
      try {
        // Extract base64 data
        const base64Data = photo.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate filename
        const filename = `${studentId}/${workId}_${Date.now()}.jpg`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('work-photos')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          // Continue without photo - don't fail the whole request
        } else {
          // Get public URL
          const { data: urlData } = supabase
            .storage
            .from('work-photos')
            .getPublicUrl(filename);
          
          photoUrl = urlData.publicUrl;
        }
      } catch (photoErr) {
        console.error('Photo processing error:', photoErr);
        // Continue without photo
      }
    }

    return NextResponse.json({
      success: true,
      progress: progressData,
      photoUrl,
      message: 'Work saved successfully'
    });

  } catch (error: any) {
    console.error('Montree works API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Fetch works for a student (optional filter by area)
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
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
      .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ works: data || [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
