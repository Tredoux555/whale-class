// /api/montree/progress/update/route.ts
// Update work progress status for a child in Montree

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { child_id, work_key, work_name, status, notes } = body;
    
    if (!child_id || (!work_key && !work_name)) {
      return NextResponse.json({ error: 'child_id and work_key/work_name required' }, { status: 400 });
    }
    
    // Status: 0=not started, 1=presented, 2=practicing, 3=mastered
    const statusValue = typeof status === 'number' ? status : parseInt(status) || 0;
    
    // Find existing progress record
    let query = supabase
      .from('montree_child_progress')
      .select('id')
      .eq('child_id', child_id);
    
    if (work_key) {
      query = query.eq('work_key', work_key);
    } else {
      query = query.ilike('work_name', work_name);
    }
    
    const { data: existing } = await query.single();
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('montree_child_progress')
        .update({ 
          status: statusValue,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
    } else {
      // Insert new progress record
      const { error } = await supabase
        .from('montree_child_progress')
        .insert({
          child_id,
          work_key: work_key || null,
          work_name: work_name,
          status: statusValue,
          notes: notes || null
        });
      
      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, status: statusValue });
    
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
