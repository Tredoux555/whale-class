import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// GET /api/mission/wins - Get all wins
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: wins, error } = await supabase
      .from('mission_wins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching wins:', error);
      return NextResponse.json({ wins: [] });
    }
    
    return NextResponse.json({ wins: wins || [] });
    
  } catch (error) {
    console.error('Error in wins GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wins' },
      { status: 500 }
    );
  }
}

// POST /api/mission/wins - Add a new win
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { win_text, project } = body;
    
    if (!win_text) {
      return NextResponse.json(
        { error: 'win_text is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    const { data: win, error } = await supabase
      .from('mission_wins')
      .insert({
        win_text,
        project: project || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating win:', error);
      return NextResponse.json(
        { error: 'Failed to log win: ' + error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      win,
      message: `🏆 Win logged: ${win_text}`,
    });
    
  } catch (error) {
    console.error('Error in wins POST:', error);
    return NextResponse.json(
      { error: 'Failed to log win' },
      { status: 500 }
    );
  }
}
