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
    const { child_id, work_key, work_name, status, area, notes } = body;
    
    if (!child_id || (!work_key && !work_name)) {
      return NextResponse.json({ error: 'child_id and work_key/work_name required' }, { status: 400 });
    }
    
    // Normalize status to string format
    let statusStr = status;
    if (typeof status === 'number') {
      statusStr = ['not_started', 'presented', 'practicing', 'mastered'][status] || 'not_started';
    }
    
    // Find existing progress record by work_name
    const workNameToFind = work_name || work_key;
    const { data: existing } = await supabase
      .from('montree_child_progress')
      .select('id')
      .eq('child_id', child_id)
      .ilike('work_name', workNameToFind)
      .single();
    
    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing record
      const updateData: any = { 
        status: statusStr,
        updated_at: now
      };
      if (notes) updateData.notes = notes;
      if (statusStr === 'mastered') updateData.mastered_at = now;
      
      const { error } = await supabase
        .from('montree_child_progress')
        .update(updateData)
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
          work_name: workNameToFind,
          area: area || null,
          status: statusStr,
          notes: notes || null,
          presented_at: now,
          mastered_at: statusStr === 'mastered' ? now : null
        });
      
      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, status: statusStr });
    
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
