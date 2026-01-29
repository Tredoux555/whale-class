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
    const { data: links, error: linkError } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', parentId);

    if (linkError) throw linkError;

    if (!links || links.length === 0) {
      return NextResponse.json({ children: [] });
    }

    const childIds = links.map(l => l.child_id);

    // Get child details
    const { data: children, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname, date_of_birth, photo_url')
      .in('id', childIds)
      .order('name');

    if (childError) throw childError;

    return NextResponse.json({ children: children || [] });
  } catch (error: any) {
    console.error('Get children error:', error);
    return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
  }
}
