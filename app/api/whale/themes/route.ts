// app/api/whale/themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

// GET - Get all activities with a specific theme, or get all themes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get('theme');
    const listThemes = searchParams.get('list') === 'true';

    const supabase = createSupabaseAdmin();

    if (listThemes) {
      // Get all unique themes
      const { data, error } = await supabase
        .from('activity_themes')
        .select('theme_name')
        .order('theme_name');

      if (error) throw error;

      // Get unique theme names with count
      const themeMap = new Map<string, number>();
      data?.forEach(item => {
        const count = themeMap.get(item.theme_name) || 0;
        themeMap.set(item.theme_name, count + 1);
      });

      const themes = Array.from(themeMap.entries()).map(([name, count]) => ({
        name,
        count
      }));

      return NextResponse.json({
        success: true,
        data: themes
      });
    }

    if (theme) {
      // Get activities with this theme
      const { data, error } = await supabase
        .from('activity_themes')
        .select(`
          *,
          activity:activities(*)
        `)
        .eq('theme_name', theme);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data || []
      });
    }

    // Get all themes with activities
    const { data, error } = await supabase
      .from('activity_themes')
      .select(`
        *,
        activity:activities(*)
      `)
      .order('theme_name');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('Error fetching themes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

// POST - Add theme to activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityId, themeName } = body;

    if (!activityId || !themeName) {
      return NextResponse.json(
        { error: 'activityId and themeName are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Check if this theme already exists for this activity
    const { data: existing } = await supabase
      .from('activity_themes')
      .select('id')
      .eq('activity_id', activityId)
      .eq('theme_name', themeName.trim())
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Theme already added to activity',
        data: existing
      });
    }

    // Add theme
    const { data, error } = await supabase
      .from('activity_themes')
      .insert({
        activity_id: activityId,
        theme_name: themeName.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error adding theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add theme' },
      { status: 500 }
    );
  }
}

// DELETE - Remove theme from activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');
    const themeName = searchParams.get('themeName');

    if (!activityId || !themeName) {
      return NextResponse.json(
        { error: 'activityId and themeName are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('activity_themes')
      .delete()
      .eq('activity_id', activityId)
      .eq('theme_name', themeName);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Theme removed'
    });
  } catch (error: any) {
    console.error('Error removing theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove theme' },
      { status: 500 }
    );
  }
}
