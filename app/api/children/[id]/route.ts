import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  try {
    const { data: child, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    return NextResponse.json({ child });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
