// API: Get single student details
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const studentId = params.id;

    // Get student
    const { data: student, error } = await supabase
      .from('children')
      .select('id, name, display_order, date_of_birth, active_status, school_id')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // TODO: Get current work, recent history, etc.
    // For now, return basic student data

    return NextResponse.json({
      student: {
        ...student,
        current_work: null, // Will be wired later
        history: []
      }
    });

  } catch (error) {
    console.error('Failed to fetch student:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
