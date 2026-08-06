// app/api/montree/org/schools/route.ts
//
// GET — the organisation's schools, with the handful of numbers an org leader actually
// asks about: how many children, how many teachers, whether Montree Milestones is switched
// on there yet, and — Phase 6b — whether the school is actually being USED.
//
// Deliberately NOT here: anything about an individual child, classroom or teacher. An org
// leader who needs that detail asks the principal, who has the school view. The same line
// the Milestones reflection reports draw is drawn here. The engagement signals below are
// deliberately aggregate for the same reason: "one teacher has not opened Montree in a week"
// is a conversation to have with the principal, not a name for the director to act on.
//
// ── The engagement signals, and the definitions they borrow ───────────────────────────────
//   lastTeacherActivityAt  — max(last_login_at) across the school's active teachers.
//   idleTeacherCount       — active teachers with no login in 3+ days. EXACTLY the definition
//                            /api/montree/admin/today shows the principal (a null last_login_at
//                            counts as idle), so the director and the principal are never
//                            looking at two different numbers for the same word.
//   quietChildCount        — children with no teacher-confirmed photo in 8 days. Again the
//                            /admin/today definition ("idle_children"), same 8-day window.
//
// ── Query discipline ──────────────────────────────────────────────────────────────────────
// This route tallies in a fixed handful of BULK reads and never one-query-per-school: an
// organisation with forty schools must cost the same round trips as one with two. The three
// signals above added exactly ONE read (the media scan) — teachers and children were already
// being read, they now select two more columns each.
//
// Also returns the organisation itself, so the dashboard can render its header from one
// request instead of two.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import {
  isOrgMigrationPending, orgMigrationPending, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';
import { loadFeatureScope, schoolHasFeature } from '@/app/api/montree/evaluation/reports/_shared';
import type { SupabaseLike } from '@/lib/montree/evaluation/montree-bridge';

export const dynamic = 'force-dynamic';

interface SchoolRow {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string | null;
  owner_name: string | null;
  owner_email: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

export async function GET(request: NextRequest) {
  const opened = await verifyOrgRequest(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const supabase = getSupabase();

  const { data: schoolData, error: schoolErr } = await supabase
    .from('montree_schools')
    .select('id, name, slug, created_at, owner_name, owner_email, subscription_status, trial_ends_at')
    .eq('organization_id', ctx.organizationId)
    .order('name', { ascending: true });

  if (schoolErr) {
    if (isOrgMigrationPending(schoolErr)) return orgMigrationPending(schoolErr.message);
    console.error('[montree-org] schools list failed:', schoolErr);
    return NextResponse.json({ error: 'Could not load your schools.' }, { status: 500 });
  }

  const schools = (schoolData ?? []) as SchoolRow[];
  const ids = schools.map((s) => s.id);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * ONE_DAY_MS).toISOString();
  const eightDaysAgo = new Date(now - 8 * ONE_DAY_MS).toISOString();

  // ── The three bulk reads ────────────────────────────────────────────────────────────────
  // Every tally below is built in memory from these. No query is ever issued per school.
  // A failed read is a MISSING SIGNAL (a dash in the UI), never a failed page — an
  // organisation dashboard that 500s because a photo table was slow is worse than one that
  // quietly shows two numbers instead of five.
  type ChildRow = { id: string; school_id: string | null };
  type TeacherRow = { school_id: string | null; last_login_at: string | null; is_active: boolean | null };
  type MediaRow = { child_id: string | null; school_id: string | null };

  // 🚨 PostgREST caps a plain select at ~1000 rows and says nothing about it. A silently
  // truncated read here would not be a missing signal, it would be a WRONG one — an
  // organisation with more than a thousand confirmed photos in eight days would have most of
  // its children reported as "no recent observation". So every read below pages with .range()
  // until it is exhausted, the house pattern (see the media+junction loops in
  // lib/montree/montage-tracker/media.ts).
  //
  // The page budget is a hard stop, not a suggestion: an organisation big enough to blow
  // through it gets NO signal rather than a plausible-looking wrong one — see `truncated`.
  const PAGE = 1000;
  const MAX_PAGES = 25;

  interface PagedRead<T> { rows: T[]; truncated: boolean; failed: boolean }

  const readAllPages = async <T,>(
    label: string,
    build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<PagedRead<T>> => {
    const rows: T[] = [];
    if (!ids.length) return { rows, truncated: false, failed: false };
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE;
      const { data, error } = await build(from, from + PAGE - 1);
      if (error) {
        // A failed read is a missing signal (a dash in the UI), never a failed page.
        console.error(`[montree-org] read failed for ${label}:`, error);
        return { rows, truncated: false, failed: true };
      }
      const batch = ((data ?? []) as unknown) as T[];
      rows.push(...batch);
      if (batch.length < PAGE) return { rows, truncated: false, failed: false };
    }
    console.warn(`[montree-org] ${label} exceeded ${MAX_PAGES * PAGE} rows — signal suppressed`);
    return { rows, truncated: true, failed: false };
  };

  // 🚨 Every paged read carries .order('id') — .range() is LIMIT/OFFSET, and without a stable
  // sort Postgres may return the same row on two pages and drop another, which would make the
  // very counts this pagination exists to protect silently wrong. 'id' is the primary key on all
  // three tables, so the ordering is total and cheap.
  const [childRead, teacherRead, mediaRead] = await Promise.all([
    readAllPages<ChildRow>('montree_children', (from, to) =>
      supabase.from('montree_children').select('id, school_id').in('school_id', ids)
        .order('id', { ascending: true }).range(from, to)),
    readAllPages<TeacherRow>('montree_teachers', (from, to) =>
      supabase
        .from('montree_teachers')
        .select('id, school_id, last_login_at, is_active')
        .in('school_id', ids)
        .order('id', { ascending: true })
        .range(from, to)),
    // Teacher-confirmed photos only, and only the last 8 days — the same evidence
    // /api/montree/admin/today counts as "this child has been observed".
    readAllPages<MediaRow>('montree_media', (from, to) =>
      supabase
        .from('montree_media')
        .select('id, child_id, school_id')
        .in('school_id', ids)
        .eq('teacher_confirmed', true)
        .gte('created_at', eightDaysAgo)
        .order('id', { ascending: true })
        .range(from, to)),
  ]);

  const childRows = childRead.rows;
  const teacherRows = teacherRead.rows;
  const mediaRows = mediaRead.rows;

  // The observation signal is only honest when BOTH sides of it were read in full.
  const observationSignalOk = !mediaRead.failed && !mediaRead.truncated
    && !childRead.failed && !childRead.truncated;

  const children = new Map<string, number>();
  for (const row of childRows) {
    if (!row.school_id) continue;
    children.set(row.school_id, (children.get(row.school_id) ?? 0) + 1);
  }

  // Teacher counts stay what they always were (every row for the school) so the number on the
  // card does not move. The engagement signals are computed over ACTIVE teachers only, which
  // is what /admin/today does.
  const teachers = new Map<string, number>();
  const lastTeacherActivity = new Map<string, string>();
  const idleTeachers = new Map<string, number>();
  for (const row of teacherRows) {
    if (!row.school_id) continue;
    teachers.set(row.school_id, (teachers.get(row.school_id) ?? 0) + 1);
    if (row.is_active === false) continue;
    if (row.last_login_at) {
      const best = lastTeacherActivity.get(row.school_id);
      // ISO-8601 strings compare correctly as strings — same trick /admin/today uses.
      if (!best || row.last_login_at > best) lastTeacherActivity.set(row.school_id, row.last_login_at);
    }
    if (!row.last_login_at || row.last_login_at < threeDaysAgo) {
      idleTeachers.set(row.school_id, (idleTeachers.get(row.school_id) ?? 0) + 1);
    }
  }

  // Children observed in the window, per school. A media row with no school_id cannot be
  // attributed and is skipped — in practice school_id is populated on every capture (it is the
  // primary filter used by /api/montree/admin/snapshot and the photo-audit routes).
  const observedBySchool = new Map<string, Set<string>>();
  for (const row of mediaRows) {
    if (!row.school_id || !row.child_id) continue;
    let set = observedBySchool.get(row.school_id);
    if (!set) { set = new Set<string>(); observedBySchool.set(row.school_id, set); }
    set.add(row.child_id);
  }
  const quietChildren = new Map<string, number>();
  if (observationSignalOk) {
    for (const row of childRows) {
      if (!row.school_id) continue;
      if (observedBySchool.get(row.school_id)?.has(row.id)) continue;
      quietChildren.set(row.school_id, (quietChildren.get(row.school_id) ?? 0) + 1);
    }
  }

  // Milestones participation: is the flag on, and has anyone finished a check-in? Both are
  // best-effort — an organisation dashboard must render even on a database where migration
  // 314 was never run.
  const milestonesOn = new Set<string>();
  const completedSessions = new Map<string, number>();
  try {
    const { scope } = await loadFeatureScope(supabase as unknown as SupabaseLike);
    if (scope) {
      for (const id of ids) if (schoolHasFeature(scope, id)) milestonesOn.add(id);
    }
    if (ids.length) {
      // ⚠️ Unpaged .in() read — caps at PostgREST's ~1000-row default. Completed-session counts
      // across an organisation are well under that in practice; .order('id') at least makes the
      // truncation point STABLE if a very large organisation ever approaches it. Promote to the
      // readAllPages() pattern above if this milestone signal ever needs to be exact at scale.
      const { data: sessions } = await supabase
        .from('montree_evaluation_sessions')
        .select('school_id, status')
        .in('school_id', ids)
        .eq('status', 'completed')
        .order('id', { ascending: true });
      for (const row of (sessions ?? []) as Array<{ school_id: string }>) {
        completedSessions.set(row.school_id, (completedSessions.get(row.school_id) ?? 0) + 1);
      }
    }
  } catch (error) {
    console.error('[montree-org] milestones participation lookup failed:', error);
  }

  return NextResponse.json(
    {
      available: true,
      organization: {
        id: ctx.organizationId,
        name: ctx.organizationName,
        slug: ctx.organizationSlug,
      },
      admin: { id: ctx.adminId, name: ctx.adminName, email: ctx.adminEmail },
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name ?? 'School',
        slug: s.slug,
        createdAt: s.created_at,
        principalName: s.owner_name,
        principalEmail: s.owner_email,
        subscriptionStatus: s.subscription_status,
        trialEndsAt: s.trial_ends_at,
        childCount: children.get(s.id) ?? 0,
        teacherCount: teachers.get(s.id) ?? 0,
        milestonesEnabled: milestonesOn.has(s.id),
        milestonesCheckIns: completedSessions.get(s.id) ?? 0,
        // Engagement signals (Phase 6b). null last activity means no active teacher has ever
        // logged in — a genuinely different thing from "logged in a long time ago", and the
        // dashboard says so rather than rendering a misleading age.
        lastTeacherActivityAt: lastTeacherActivity.get(s.id) ?? null,
        idleTeacherCount: idleTeachers.get(s.id) ?? 0,
        // null (not 0) when the underlying reads could not be completed in full — the
        // dashboard then says nothing rather than claiming every child is fine.
        quietChildCount: observationSignalOk ? (quietChildren.get(s.id) ?? 0) : null,
      })),
      totals: {
        schools: schools.length,
        children: [...children.values()].reduce((a, b) => a + b, 0),
        teachers: [...teachers.values()].reduce((a, b) => a + b, 0),
        milestonesSchools: milestonesOn.size,
      },
      // Phase 6b — the org dashboard renders a "Super-admin view" banner from this. It is
      // derived from the signed token by verifyOrgRequest, never from anything the client sent.
      acting: { asSuperAdmin: ctx.actingAsSuperAdmin },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
