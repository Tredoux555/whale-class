import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { childName, parentName, parentEmail, message } = await request.json();

    if (!childName || !parentName || !parentEmail) {
      return NextResponse.json(
        { error: 'Child name, parent name, and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Find child by name
    const { data: children } = await supabase
      .from('children')
      .select('id, name')
      .ilike('name', `%${childName}%`)
      .limit(1);

    if (!children || children.length === 0) {
      return NextResponse.json(
        { error: 'Student not found. Please check the name and try again.' },
        { status: 404 }
      );
    }

    const child = children[0];

    // Create reset request
    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        child_id: child.id,
        child_name: child.name,
        parent_name: parentName,
        parent_email: parentEmail,
        request_message: message || `Password reset requested by ${parentName}`,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error creating reset request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create reset request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted. Admin will contact you soon.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

