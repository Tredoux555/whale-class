// /api/montree/parent/auth/access-code/route.ts
// POST: Validate parent access code and create session
// GET: Check if session is valid

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { code } = await request.json();
    
    if (!code || code.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please enter a valid access code' 
      }, { status: 400 });
    }
    
    // Look up the access code
    const { data: accessCode, error: codeError } = await supabase
      .from('montree_parent_access_codes')
      .select(`
        id, code, child_id, expires_at, used_count,
        child:montree_children!child_id (id, name, classroom_id)
      `)
      .eq('code', code.toUpperCase())
      .single();
    
    if (codeError || !accessCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid access code. Please check and try again.' 
      }, { status: 401 });
    }
    
    // Check if code is expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json({ 
        success: false, 
        error: 'This access code has expired. Please contact your teacher for a new code.' 
      }, { status: 401 });
    }
    
    // Update used count
    await supabase
      .from('montree_parent_access_codes')
      .update({ 
        used_count: (accessCode.used_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', accessCode.id);
    
    // Create session
    const sessionData = {
      child_id: accessCode.child_id,
      code_id: accessCode.id,
      created_at: new Date().toISOString(),
    };
    
    const sessionToken = btoa(JSON.stringify(sessionData));
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('montree_parent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    
    return NextResponse.json({
      success: true,
      redirect: '/montree/parent/dashboard',
      child: {
        id: accessCode.child?.id,
        name: accessCode.child?.name,
      }
    });
    
  } catch (error) {
    console.error('Parent auth error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ 
        success: false, 
        authenticated: false 
      });
    }
    
    // Validate session
    try {
      const session = JSON.parse(atob(sessionCookie.value));
      
      if (!session.child_id) {
        return NextResponse.json({ 
          success: false, 
          authenticated: false 
        });
      }
      
      return NextResponse.json({
        success: true,
        authenticated: true,
        child_id: session.child_id,
      });
    } catch {
      return NextResponse.json({ 
        success: false, 
        authenticated: false 
      });
    }
    
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Session check failed' 
    }, { status: 500 });
  }
}
