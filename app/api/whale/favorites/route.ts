// app/api/whale/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

// GET - Get all favorited activities for current user
export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd get userId from session
    // For now, we'll use a default "admin" user
    const userId = 'admin';

    const supabase = createSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('activity_favorites')
      .select(`
        *,
        activity:activities(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// POST - Add activity to favorites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityId } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: 'activityId is required' },
        { status: 400 }
      );
    }

    const userId = 'admin';
    const supabase = createSupabaseAdmin();

    // Check if already favorited
    const { data: existing } = await supabase
      .from('activity_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Activity already favorited',
        data: existing
      });
    }

    // Add to favorites
    const { data, error } = await supabase
      .from('activity_favorites')
      .insert({
        user_id: userId,
        activity_id: activityId
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// DELETE - Remove activity from favorites
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    if (!activityId) {
      return NextResponse.json(
        { error: 'activityId is required' },
        { status: 400 }
      );
    }

    const userId = 'admin';
    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('activity_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('activity_id', activityId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Favorite removed'
    });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
