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

    // SECURITY: Authenticate parent via session cookie
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For invite-based access, only return the invited child
    if (session.inviteId && session.childId) {
      const { data: child, error: childError } = await supabase
        .from('montree_children')
        .select('id, name, nickname')
        .eq('id', session.childId)
        .single();

      if (childError || !child) {
        return NextResponse.json({
          error: 'Failed to load child'
        }, { status: 500 });
      }

      return NextResponse.json({ children: [child] });
    }

    // For standard login, this endpoint should not be used
    // The frontend should track authenticated children from the login response
    return NextResponse.json({ children: [] });
  } catch (error: unknown) {
    console.error('Get children error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
