import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';


export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // SECURITY: Authenticate parent via session cookie
    const session = await verifyParentSession();
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

      const response = NextResponse.json({ children: [child] });
      response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
      return response;
    }

    // For standard login, this endpoint should not be used
    // The frontend should track authenticated children from the login response
    const response = NextResponse.json({ children: [] });
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;
  } catch (error: unknown) {
    console.error('Get children error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
