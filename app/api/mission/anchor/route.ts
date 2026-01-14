import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// POST /api/mission/anchor - Complete session anchor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, session_anchor } = body;
    
    if (!session_anchor) {
      return NextResponse.json(
        { error: 'session_anchor is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // If session_id provided, update that specific session
    // Otherwise, update the most recent session from today
    if (session_id) {
      const { data: session, error } = await supabase
        .from('mission_sessions')
        .update({
          session_anchor,
          anchor_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session_id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating session:', error);
        return NextResponse.json(
          { error: 'Failed to complete anchor: ' + error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        session,
        message: '⚓ Session anchor complete!',
      });
    }
    
    // Find today's most recent session without an anchor
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySession, error: findError } = await supabase
      .from('mission_sessions')
      .select('*')
      .eq('session_date', today)
      .is('session_anchor', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (findError || !todaySession) {
      // No open session found, create a quick entry
      const { data: newSession, error: createError } = await supabase
        .from('mission_sessions')
        .insert({
          energy_level: 'medium',
          project: 'whale',
          first_action: 'Quick session',
          mission_connection: 'Every action counts',
          session_anchor,
          anchor_completed_at: new Date().toISOString(),
          session_date: today,
        })
        .select()
        .single();
      
      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create session: ' + createError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        session: newSession,
        message: '⚓ Quick session logged with anchor!',
      });
    }
    
    // Update the found session
    const { data: session, error: updateError } = await supabase
      .from('mission_sessions')
      .update({
        session_anchor,
        anchor_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', todaySession.id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to complete anchor: ' + updateError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      session,
      message: '⚓ Session anchor complete!',
    });
    
  } catch (error) {
    console.error('Error in anchor:', error);
    return NextResponse.json(
      { error: 'Failed to complete anchor' },
      { status: 500 }
    );
  }
}
