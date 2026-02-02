import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId');

  if (!parentId) {
    return NextResponse.json({ error: 'Parent ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Get children linked to this parent
    console.log('Fetching links for parentId:', parentId);
    const { data: links, error: linkError } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', parentId);

    if (linkError) {
      console.error('Link query failed:', linkError);
      return NextResponse.json({
        error: 'Failed to load parent-child links',
        debug: linkError?.message,
        code: linkError?.code
      }, { status: 500 });
    }
    console.log('Found links:', links);

    if (!links || links.length === 0) {
      return NextResponse.json({ children: [] });
    }

    const childIds = links.map(l => l.child_id);

    // Get child details
    console.log('Fetching children for IDs:', childIds);
    const { data: children, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .in('id', childIds)
      .order('name');

    if (childError) {
      console.error('Children query failed:', childError);
      return NextResponse.json({
        error: 'Failed to load child details',
        debug: childError?.message,
        code: childError?.code
      }, { status: 500 });
    }
    console.log('Found children:', children);

    return NextResponse.json({ children: children || [] });
  } catch (error: any) {
    console.error('Get children error:', error);
    return NextResponse.json({
      error: 'Failed to load children',
      debug: error?.message || String(error),
      code: error?.code
    }, { status: 500 });
  }
}
