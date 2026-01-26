// /api/montree/progress/update/route.ts
// Update work progress status for a child

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, work_name, work_id, status } = body;
    
    if (!child_id || (!work_name && !work_id)) {
      return NextResponse.json({ error: 'child_id and work_name/work_id required' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Map status names to API values
    const statusMap: Record<string, string> = {
      'not_started': 'not_started',
      'presented': 'presented', 
      'practicing': 'practicing',
      'completed': 'completed',
      'mastered': 'completed',
    };
    
    const apiStatus = statusMap[status] || status;
    
    // Try to update existing progress record
    const { data: existing } = await supabase
      .from('child_work_progress')
      .select('id')
      .eq('child_id', child_id)
      .ilike('work_name', work_name || '')
      .single();
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('child_work_progress')
        .update({ 
          status: apiStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('child_work_progress')
        .insert({
          child_id,
          work_name: work_name,
          work_id: work_id || null,
          status: apiStatus,
        });
      
      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, status: apiStatus });
    
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
