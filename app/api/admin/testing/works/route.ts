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

    const { data: works, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, work_name')
      .order('sequence_order');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      works: works || [],
    });

  } catch (error: any) {
    console.error('Error fetching works:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch works' },
      { status: 500 }
    );
  }
}

