// /api/montree/students/route.ts
// DEPRECATED - Redirect to /api/montree/children
// This endpoint exists only for backward compatibility
// All new code should use /api/montree/children directly

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/students - Returns children from montree_children (standalone)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get all children from montree_children (standalone, no legacy connection)
    const { data: children, error } = await supabase
      .from('montree_children')
      .select('*, classroom:montree_classrooms(id, name, school_id)')
      .order('name');
    
    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform to match old API format for backward compatibility
    // name_chinese is stored in settings JSON since column may not exist
    const students = (children || []).map(child => ({
      id: child.id,
      name: child.name,
      name_chinese: child.name_chinese || child.settings?.name_chinese || null,
      date_of_birth: child.date_of_birth,
      age: child.age,
      progress: {
        completed: 0,
        in_progress: 0,
        percentage: 0,
      },
    }));
    
    return NextResponse.json({
      students,
      count: students.length,
    });
    
  } catch (error) {
    console.error('Students API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
