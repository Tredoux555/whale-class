// /api/classroom/children/route.ts
// Returns children for admin classroom view

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get all children (they're all Whale Class for now)
    const { data: children, error } = await supabase
      .from('children')
      .select('*')
      .eq('active_status', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching children:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return with school info for compatibility
    return NextResponse.json({
      school: {
        id: 'beijing-international',
        name: 'Beijing International School',
        slug: 'beijing-international'
      },
      children: children || []
    });
    
  } catch (error) {
    console.error('Classroom children API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
