// Debug endpoint to check Supabase connection
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Check if we can query the database
    const { data: children, error: childError } = await supabase
      .from('montree_children')
      .select('id, name')
      .limit(3);

    const { data: links, error: linkError } = await supabase
      .from('montree_parent_children')
      .select('*')
      .limit(3);

    // Check column existence
    const { data: colCheck, error: colError } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .limit(1);

    return NextResponse.json({
      supabase_url: supabaseUrl?.substring(0, 40) + '...',
      children_query: {
        success: !childError,
        count: children?.length,
        error: childError?.message
      },
      links_query: {
        success: !linkError,
        count: links?.length,
        data: links,
        error: linkError?.message
      },
      nickname_column: {
        success: !colError,
        error: colError?.message
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack?.substring(0, 500)
    }, { status: 500 });
  }
}
