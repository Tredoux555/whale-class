// /api/montree/parent/announcements/route.ts
// Fetch classroom announcements for parents

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { cookies } from 'next/headers';

// Helper function to extract authenticated session data from cookie
async function getAuthenticatedSession(): Promise<{ childId: string; inviteId?: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    if (!session.child_id) {
      return null;
    }

    return {
      childId: session.child_id,
      inviteId: session.invite_id,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // SECURITY: Authenticate parent via session cookie
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get child's classroom
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get announcements for the classroom
    const { data: announcements, error } = await supabase
      .from('montree_announcements')
      .select('id, title, content, priority, created_at, created_by')
      .eq('classroom_id', child.classroom_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet - return empty array
      console.log('Announcements query error (table may not exist):', error.message);
      return NextResponse.json({
        success: true,
        announcements: []
      });
    }

    return NextResponse.json({
      success: true,
      announcements: announcements || []
    });

  } catch (error) {
    console.error('Announcements API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
