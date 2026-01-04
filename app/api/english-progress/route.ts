// app/api/english-progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// GET - Fetch all children with their English progress
export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    
    // Get all children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name, age_group, photo_url')
      .order('name');
    
    if (childrenError) throw childrenError;
    
    // Get all English progress records
    const { data: progressData, error: progressError } = await supabase
      .from('english_progress')
      .select('*');
    
    // If table doesn't exist yet, return children with default progress
    if (progressError && progressError.code === '42P01') {
      // Table doesn't exist - return children with defaults
      const childrenWithDefaults = (children || []).map(child => ({
        ...child,
        english_progress: {
          current_stage: 'oral',
          stage_progress: 0,
          skills_completed: [],
          notes: null
        }
      }));
      return NextResponse.json({ children: childrenWithDefaults, tableExists: false });
    }
    
    if (progressError) throw progressError;
    
    // Merge children with their progress
    const childrenWithProgress = (children || []).map(child => {
      const progress = (progressData || []).find(p => p.child_id === child.id);
      return {
        ...child,
        english_progress: progress ? {
          id: progress.id,
          current_stage: progress.current_stage,
          stage_progress: progress.stage_progress,
          skills_completed: progress.skills_completed || [],
          notes: progress.notes
        } : {
          current_stage: 'oral',
          stage_progress: 0,
          skills_completed: [],
          notes: null
        }
      };
    });
    
    return NextResponse.json({ children: childrenWithProgress, tableExists: true });
  } catch (error) {
    console.error('Error fetching English progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST - Save/update a child's English progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, current_stage, stage_progress, skills_completed, notes } = body;
    
    if (!child_id) {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    
    const supabase = createSupabaseAdmin();
    
    // Check if progress record exists
    const { data: existing } = await supabase
      .from('english_progress')
      .select('id')
      .eq('child_id', child_id)
      .single();
    
    let result;
    
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('english_progress')
        .update({
          current_stage,
          stage_progress,
          skills_completed,
          notes
        })
        .eq('child_id', child_id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('english_progress')
        .insert({
          child_id,
          current_stage,
          stage_progress,
          skills_completed,
          notes
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving English progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
