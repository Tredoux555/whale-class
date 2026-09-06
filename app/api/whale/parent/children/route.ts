// app/api/whale/parent/children/route.ts
// Get all children for the authenticated parent

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get children linked to this parent.
    // 🐛 BUG FIX (Jun 13, 2026): the alias was written SQL-style
    // (`photo_url as avatar_url`), which is NOT valid PostgREST select syntax —
    // PostgREST aliases are `alias:column`. The old string made the whole
    // select invalid. The consumer (lib/hooks/useParentChildren.ts) reads
    // `avatar_url`, so the response shape is unchanged by this fix.
    const { data: children, error } = await supabase
      .from('children')
      .select(`
        id,
        name,
        date_of_birth,
        avatar_url:photo_url,
        created_at
      `)
      .eq('parent_id', user.id)
      .order('name');

    if (error) throw error;

    // Add age calculation. date_of_birth is the only field this touches, so it
    // is the only one that needs naming.
    const childrenWithAge = (children || []).map((child: Record<string, unknown>) => ({
      ...child,
      age: typeof child.date_of_birth === 'string'
        ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
    }));

    return NextResponse.json({ children: childrenWithAge || [] });

  } catch (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

