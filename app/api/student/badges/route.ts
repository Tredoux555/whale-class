import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: badges, error } = await supabase
      .from('child_badges')
      .select('*')
      .eq('child_id', childId)
      .order('earned_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: badges || [] });
  } catch (error: any) {
    console.error('Badges fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

