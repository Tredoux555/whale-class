// /api/montree/parent/reports/route.ts
// Get weekly reports for a parent's child
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
  }

  try {
    // SECURITY: Authenticate parent via session cookie
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Get weekly reports for this child
    // Accept: status='sent' (new way) OR generated_at is set (old way - indicates report was sent)
    const { data: reports, error } = await supabase
      .from('montree_weekly_reports')
      .select('id, status, created_at, week_start, week_end, content, generated_at, sent_at')
      .eq('child_id', childId)
      .or('status.eq.sent,generated_at.not.is.null')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Reports query error:', error);
      return NextResponse.json({
        error: 'Failed to load reports'
      }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error('Get reports error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
