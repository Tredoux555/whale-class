// app/api/montree/focus-works/route.ts
// API for managing focus works (one work per area per child)
// GET: Get current focus works for a child
// POST: Set focus work for an area
// DELETE: Remove focus work for an area
// Session 126: Fixed to read env vars at runtime

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// ============================================
// GET: Get focus works for a child
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get all focus works for this child
    const { data: focusWorks, error } = await supabase
      .from('montree_child_focus_works')
      .select('*')
      .eq('child_id', childId);

    if (error) {
      console.error('Error fetching focus works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Convert to area -> work mapping
    const focusByArea: Record<string, any> = {};
    for (const fw of focusWorks || []) {
      focusByArea[fw.area] = {
        id: fw.work_id,
        name: fw.work_name,
        set_at: fw.set_at,
        set_by: fw.set_by,
      };
    }

    return NextResponse.json({
      success: true,
      focus_works: focusByArea,
      raw: focusWorks,
    });

  } catch (error) {
    console.error('Focus works GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Set focus work for an area
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, classroom_id, area, work_id, work_name, set_by } = body;

    if (!child_id || !area || !work_name) {
      return NextResponse.json(
        { success: false, error: 'child_id, area, and work_name are required' },
        { status: 400 }
      );
    }

    // Validate area
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (!validAreas.includes(area)) {
      return NextResponse.json(
        { success: false, error: `Invalid area. Must be one of: ${validAreas.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Upsert focus work (insert or update if exists)
    const { data, error } = await supabase
      .from('montree_child_focus_works')
      .upsert({
        child_id,
        classroom_id,
        area,
        work_id,
        work_name,
        set_at: new Date().toISOString(),
        set_by: set_by || 'teacher',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'child_id,area',
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting focus work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      focus_work: data,
    });

  } catch (error) {
    console.error('Focus works POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Remove focus work for an area
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const area = searchParams.get('area');

    if (!childId || !area) {
      return NextResponse.json(
        { success: false, error: 'child_id and area are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_child_focus_works')
      .delete()
      .eq('child_id', childId)
      .eq('area', area);

    if (error) {
      console.error('Error deleting focus work:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Focus work for ${area} removed`,
    });

  } catch (error) {
    console.error('Focus works DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
