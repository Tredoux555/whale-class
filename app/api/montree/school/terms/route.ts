// app/api/montree/school/terms/route.ts
// Calendar Plan §7b — academic term boundaries for a school.
//
// GET   — any authenticated school member; returns the school's terms,
//         optionally including which is "current" for a given anchor date.
// POST  — principal only; create a term.
// PATCH — principal only; update one.
// DELETE — principal only; remove one.
//
// Super-admin can also write — they implicitly act for the school they're
// scoped to via the standard cookie. Cross-pollination is enforced on every
// query: rows are always filtered (and inserted) with the caller's school_id.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

interface TermRow {
  id: string;
  school_id: string;
  name: string;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

function asDateOnly(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? input : null;
}

function isPrincipal(role: string | undefined): boolean {
  return role === 'principal' || role === 'super_admin';
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: 'No school in session' }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_school_terms')
    .select('id, school_id, name, start_date, end_date, created_at, updated_at')
    .eq('school_id', auth.schoolId)
    .order('start_date', { ascending: true });

  // Graceful degradation — the table may not be migrated yet on a deploy
  // that's ahead of the Supabase run. Empty list, no crash, no scary UI.
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { terms: [], current: null, migration_pending: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[SchoolTerms] GET error:', error);
    return NextResponse.json({ error: 'Failed to load terms' }, { status: 500 });
  }

  const terms = (data || []) as TermRow[];

  // Convenience — which term (if any) covers a given anchor date (default: today
  // in UTC; the calendar layer supplies a school-time anchor when it cares).
  const anchorParam = req.nextUrl.searchParams.get('anchor');
  const anchor = anchorParam && /^\d{4}-\d{2}-\d{2}$/.test(anchorParam)
    ? anchorParam
    : new Date().toISOString().slice(0, 10);
  const current = terms.find(t => t.start_date <= anchor && anchor <= t.end_date) || null;

  return NextResponse.json(
    { terms, current },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: 'No school in session' }, { status: 400 });
  if (!isPrincipal(auth.role)) {
    return NextResponse.json({ error: 'Only the principal can manage terms' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const start = asDateOnly(body.start_date);
  const end = asDateOnly(body.end_date);
  if (!name) return NextResponse.json({ error: 'Term name is required' }, { status: 400 });
  if (!start || !end) return NextResponse.json({ error: 'start_date and end_date are required (YYYY-MM-DD)' }, { status: 400 });
  if (end < start) return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_school_terms')
    .insert({ school_id: auth.schoolId, name, start_date: start, end_date: end })
    .select('id, school_id, name, start_date, end_date, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Terms table not yet migrated', migration_pending: true }, { status: 503 });
    }
    console.error('[SchoolTerms] POST error:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
  }
  return NextResponse.json({ term: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: 'No school in session' }, { status: 400 });
  if (!isPrincipal(auth.role)) {
    return NextResponse.json({ error: 'Only the principal can manage terms' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 80);
  if (body.start_date !== undefined) {
    const s = asDateOnly(body.start_date);
    if (!s) return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 });
    updates.start_date = s;
  }
  if (body.end_date !== undefined) {
    const e = asDateOnly(body.end_date);
    if (!e) return NextResponse.json({ error: 'end_date must be YYYY-MM-DD' }, { status: 400 });
    updates.end_date = e;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const supabase = getSupabase();
  // Belt-and-braces — both id AND school_id in the filter so a stray id can
  // never mutate another school's term.
  const { data, error } = await supabase
    .from('montree_school_terms')
    .update(updates)
    .eq('id', id)
    .eq('school_id', auth.schoolId)
    .select('id, school_id, name, start_date, end_date, created_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[SchoolTerms] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Term not found' }, { status: 404 });
  // Validate range AFTER applying — covers partial updates that would invert.
  const row = data as TermRow;
  if (row.end_date < row.start_date) {
    // Roll the update back conceptually by failing loudly — the CHECK
    // constraint would have caught a Postgres-side violation if both were
    // updated; this catches the partial-update case.
    return NextResponse.json({ error: 'Resulting end_date is before start_date' }, { status: 400 });
  }
  return NextResponse.json({ term: row });
}

export async function DELETE(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: 'No school in session' }, { status: 400 });
  if (!isPrincipal(auth.role)) {
    return NextResponse.json({ error: 'Only the principal can manage terms' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_school_terms')
    .delete()
    .eq('id', id)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[SchoolTerms] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
