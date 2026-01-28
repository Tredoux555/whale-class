// /api/montree/children/[id]/route.ts
// Get single child by ID - inline client

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('montree_children')
      .select('id, name, age, photo_url, notes, classroom_id')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching child:', error);
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    
    return NextResponse.json({ child: data });
    
  } catch (error) {
    console.error('Child API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
