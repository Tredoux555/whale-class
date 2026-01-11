import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    // Set cookie for server-side API routes
    const cookieStore = await cookies();
    cookieStore.set('teacherName', name, {
      httpOnly: false, // Allow client-side access too
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({ success: true, teacher: name });
  } catch (error) {
    console.error('Teacher login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
