// /api/montree/feedback/route.ts
// Submit and retrieve feedback from teachers, principals, parents

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST - Submit feedback (open to all authenticated users)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const {
      school_id,
      user_type,
      user_id,
      user_name,
      page_url,
      feedback_type,
      message
    } = body;

    // Validate required fields
    if (!feedback_type || !message) {
      return NextResponse.json(
        { error: 'feedback_type and message are required' },
        { status: 400 }
      );
    }

    // Validate feedback_type
    const validTypes = ['bug', 'idea', 'help', 'praise', 'other'];
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json(
        { error: 'Invalid feedback_type' },
        { status: 400 }
      );
    }

    // Validate user_type if provided
    const validUserTypes = ['teacher', 'principal', 'parent', 'admin'];
    if (user_type && !validUserTypes.includes(user_type)) {
      return NextResponse.json(
        { error: 'Invalid user_type' },
        { status: 400 }
      );
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('montree_feedback')
      .insert({
        school_id: school_id || null,
        user_type: user_type || 'teacher',
        user_id: user_id || null,
        user_name: user_name || null,
        page_url: page_url || null,
        feedback_type,
        message: message.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback_id: data.id
    });

  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Retrieve feedback (super admin only)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    // Verify super admin password (accepts env var OR fallback, matching login page)
    const superAdminPassword = req.headers.get('x-super-admin-password');
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const fallbackPassword = '870602';

    const isValid = superAdminPassword === expectedPassword ||
                    superAdminPassword === fallbackPassword;

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const feedbackType = searchParams.get('type');
    const schoolId = searchParams.get('school_id');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build query
    let query = supabase
      .from('montree_feedback')
      .select(`
        *,
        school:montree_schools(id, name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType);
    }
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Feedback fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('montree_feedback')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      feedback: data,
      total: totalCount,
      limit,
      offset
    });

  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Mark feedback as read (super admin only)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Verify super admin password (accepts env var OR fallback, matching login page)
    const superAdminPassword = req.headers.get('x-super-admin-password');
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const fallbackPassword = '870602';

    const isValid = superAdminPassword === expectedPassword ||
                    superAdminPassword === fallbackPassword;

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feedback_id, is_read } = await req.json();

    if (!feedback_id) {
      return NextResponse.json({ error: 'feedback_id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('montree_feedback')
      .update({
        is_read: is_read !== false,
        read_at: is_read !== false ? new Date().toISOString() : null
      })
      .eq('id', feedback_id);

    if (error) {
      console.error('Feedback update error:', error);
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Feedback PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
