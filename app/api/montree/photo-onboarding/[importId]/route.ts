// app/api/montree/photo-onboarding/[importId]/route.ts
//
// The polling + review endpoint: the import row, every proposed change, and
// the CURRENT name of each matched child so the UI can render a real diff
// ("Emily Chen → Emily Chen (birthday added)") rather than a bare id.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import type { RosterImportEntryRow } from '@/lib/montree/photo-onboarding/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    const { data: row, error } = await supabase
      .from('montree_roster_imports')
      .select('*')
      .eq('id', importId)
      .maybeSingle();

    if (error) {
      console.error('[PhotoOnboarding] Import fetch error:', error.message);
      return NextResponse.json({ success: false, error: 'Failed to load import' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }
    if (row.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { data: entryRows } = await supabase
      .from('montree_roster_import_entries')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: true });

    const entries = (entryRows || []) as RosterImportEntryRow[];

    // Current roster names for every matched child, so the review screen can
    // show what the record looks like TODAY next to what the list proposes.
    const matchedIds = Array.from(
      new Set(entries.map((e) => e.matched_child_id).filter((id): id is string => !!id))
    );

    const children: Record<string, { id: string; name: string }> = {};
    if (matchedIds.length > 0) {
      const { data: childRows } = await supabase
        .from('montree_children')
        .select('id, name')
        .in('id', matchedIds);
      for (const c of (childRows || []) as Array<{ id: string; name: string }>) {
        children[c.id] = { id: c.id, name: c.name };
      }
    }

    // A review screen that serves a cached snapshot would show stale proposals
    // seconds after extraction finished.
    const response = NextResponse.json({ success: true, import: row, entries, children });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[PhotoOnboarding] Import GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
