import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the user from the auth session
    const supabase = createClient();
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has teacher role (using service role key, bypasses RLS)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id)
      .eq('role_name', 'teacher')
      .maybeSingle();

    if (roleError) {
      console.error('Error checking teacher role:', roleError);
      return NextResponse.json(
        { error: 'Failed to check role', details: roleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isTeacher: !!roleData,
      role: roleData?.role_name || null,
    });
  } catch (error) {
    console.error('Check teacher role error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

