// /api/montree/parent/auth/logout/route.ts
// Parent logout - clear session
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('parent_session')?.value;

    if (sessionToken) {
      const supabase = await createServerClient();
      
      // Delete session from database
      await supabase
        .from('parent_sessions')
        .delete()
        .eq('token', sessionToken);
    }

    // Clear the session cookie
    cookieStore.delete('parent_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true }); // Still succeed even if DB fails
  }
}
