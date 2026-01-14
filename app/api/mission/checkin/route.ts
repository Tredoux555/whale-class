import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// POST /api/mission/checkin - Create a new session check-in (Mission Bridge)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { energy_level, project, first_action, mission_connection } = body;
    
    // Validate required fields
    if (!energy_level || !project || !first_action || !mission_connection) {
      return NextResponse.json(
        { error: 'Missing required fields: energy_level, project, first_action, mission_connection' },
        { status: 400 }
      );
    }
    
    // Validate energy level
    if (!['high', 'medium', 'low'].includes(energy_level)) {
      return NextResponse.json(
        { error: 'energy_level must be: high, medium, or low' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Create the session
    const { data: session, error } = await supabase
      .from('mission_sessions')
      .insert({
        energy_level,
        project,
        first_action,
        mission_connection,
        session_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session: ' + error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      session,
      message: `Session started! Focus: ${project.toUpperCase()} | Energy: ${energy_level.toUpperCase()}`,
    });
    
  } catch (error) {
    console.error('Error in checkin:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    );
  }
}
