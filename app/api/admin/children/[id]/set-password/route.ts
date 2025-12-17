import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();

    if (!password || password.length < 1) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const supabase = await createServerClient();
    
    // Update child password
    const { data, error } = await supabase
      .from('children')
      .update({ login_password: hashedPassword })
      .eq('id', id)
      .select('id, name')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      data: { id: data.id, name: data.name },
    });
  } catch (error: any) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set password' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    
    // Remove password
    const { data, error } = await supabase
      .from('children')
      .update({ login_password: null })
      .eq('id', id)
      .select('id, name')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Password removed successfully',
      data: { id: data.id, name: data.name },
    });
  } catch (error: any) {
    console.error('Remove password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove password' },
      { status: 500 }
    );
  }
}

