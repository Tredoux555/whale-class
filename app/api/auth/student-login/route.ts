import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { childId, password } = await request.json();

    if (!childId || !password) {
      return NextResponse.json(
        { error: 'Student ID and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    
    // Find child by ID or name (case-insensitive)
    const { data: children, error: fetchError } = await supabase
      .from('children')
      .select('id, name, login_password, active_status, photo_url, avatar_emoji, parent_email, parent_name, login_streak, last_streak_date')
      .or(`id.eq.${childId},name.ilike.%${childId}%`)
      .eq('active_status', true)
      .limit(1);

    if (fetchError || !children || children.length === 0) {
      return NextResponse.json(
        { error: 'Student not found or inactive' },
        { status: 401 }
      );
    }

    const child = children[0];

    if (!child.login_password) {
      return NextResponse.json(
        { error: 'Password not set. Please contact your teacher to set up login.' },
        { status: 401 }
      );
    }

    // Verify password (hashed with bcrypt)
    const isValid = await bcrypt.compare(password, child.login_password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Update last login and check streak
    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = child.last_streak_date ? new Date(child.last_streak_date).toISOString().split('T')[0] : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = child.login_streak || 0;
    if (lastStreakDate === yesterdayStr) {
      // Continue streak
      newStreak += 1;
    } else if (lastStreakDate !== today) {
      // Reset streak
      newStreak = 1;
    }

    await supabase
      .from('children')
      .update({
        last_login_at: new Date().toISOString(),
        login_streak: newStreak,
        last_streak_date: today,
      })
      .eq('id', child.id);

    // Check for streak badge (7 days)
    if (newStreak >= 7) {
      const { data: existingBadge } = await supabase
        .from('child_badges')
        .select('id')
        .eq('child_id', child.id)
        .eq('badge_type', 'streak_7')
        .maybeSingle();

      if (!existingBadge) {
        await supabase
          .from('child_badges')
          .insert({
            child_id: child.id,
            badge_type: 'streak_7',
            badge_name: 'Weekly Streak',
            badge_icon: '🔥',
            badge_description: 'Played 7 days in a row!',
          });
      }
    }

    // Return success with child info (no sensitive data)
    return NextResponse.json({
      success: true,
      childId: child.id,
      childName: child.name,
      avatar: child.photo_url || child.avatar_emoji || '🐋',
    });
  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

