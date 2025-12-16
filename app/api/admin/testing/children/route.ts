import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    const { data: children, error } = await supabase
      .from('children')
      .select('id, name')
      .eq('active_status', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      children: children || [],
    });

  } catch (error: any) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

