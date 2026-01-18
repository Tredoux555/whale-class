// app/api/montree/children/route.ts
// Children API: Now reads from 'children' table (same as admin) for unified data
// This allows weekly planning uploads to work with Montree dashboard

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/children - List children from unified 'children' table
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Read from 'children' table - same as admin classroom
    // This ensures weekly planning uploads show up in Montree
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url, display_order')
      .order('display_order', { ascending: true })
      .order('name');
    
    if (error) {
      console.error('Fetch children error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate age and add progress placeholder
    const childrenWithAge = (children || []).map(child => {
      let age = null;
      if (child.date_of_birth) {
        const birthDate = new Date(child.date_of_birth);
        const today = new Date();
        age = ((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
      }
      return {
        ...child,
        age: age ? parseFloat(age) : null,
        progress: 0 // Will be calculated from weekly_assignments
      };
    });
    
    return NextResponse.json({ children: childrenWithAge });
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

// POST not needed - children are imported via weekly planning document
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /admin/weekly-planning to import children via document upload' },
    { status: 405 }
  );
}
