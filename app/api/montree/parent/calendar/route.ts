// app/api/montree/parent/calendar/route.ts
//
// Phase 6 — combined birthday + holiday feed for a parent. Computes the
// next 30 days of:
//   - Birthdays of the parent's own child(ren) AND, if the parent's
//     classroom-mates exist, the classmates' birthdays (first name only
//     for privacy — no surname, no other PII).
//   - School holidays / closures from montree_schools.calendar_overrides.
//
// Birthdays are calculated from montree_children.date_of_birth — no new
// table needed. We project this year's anniversary of the DOB and
// include it if it falls within the next 30 days.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const maxDuration = 30;

interface CalendarEntry {
  kind: 'birthday_own' | 'birthday_classmate' | 'holiday';
  date: string; // YYYY-MM-DD
  label: string;
  is_closed?: boolean;
}

export async function GET() {
  const supabase = getSupabase();

  const session = await verifyParentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve school + child list. Mirror the events resolver shape but
  // skip the full helper here — we need fewer fields and want to allow
  // invite-only sessions to see the calendar.
  let schoolId: string | undefined;
  const childIds: string[] = [];
  if (session.parentId) {
    const { data: parent } = await supabase
      .from('montree_parents')
      .select('id, school_id, is_active')
      .eq('id', session.parentId)
      .maybeSingle();
    if (!parent || !parent.is_active) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 401 });
    }
    schoolId = parent.school_id;
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', parent.id);
    for (const l of (links || []) as Array<{ child_id: string }>) {
      childIds.push(l.child_id);
    }
  } else if (session.childId) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, montree_classrooms!inner(school_id)')
      .eq('id', session.childId)
      .maybeSingle();
    const childRow = child as unknown as
      | { id: string; montree_classrooms: { school_id: string } | null }
      | null;
    if (!childRow || !childRow.montree_classrooms) {
      return NextResponse.json({ error: 'Child not found' }, { status: 401 });
    }
    schoolId = childRow.montree_classrooms.school_id;
    childIds.push(childRow.id);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!schoolId) {
    return NextResponse.json({ error: 'School not resolved' }, { status: 401 });
  }

  const flagOn = await isFeatureEnabled(supabase, schoolId, 'school_calendar');
  if (!flagOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const entries: CalendarEntry[] = [];

  const now = new Date();
  const horizonDays = 30;
  const horizonMs = horizonDays * 24 * 60 * 60 * 1000;
  const horizonEnd = new Date(now.getTime() + horizonMs);

  // ── Birthdays ──────────────────────────────────────────────────────
  // Own child(ren): full first name. Classmates: first name only.
  if (childIds.length > 0) {
    // Fetch own children + their classrooms.
    const { data: ownChildren } = await supabase
      .from('montree_children')
      .select('id, name, nickname, date_of_birth, classroom_id')
      .in('id', childIds)
      .eq('is_active', true);

    type ChildRow = { id: string; name: string; nickname: string | null; date_of_birth: string | null; classroom_id: string | null };
    const own = (ownChildren || []) as ChildRow[];

    for (const c of own) {
      const upcoming = upcomingAnniversary(c.date_of_birth, now, horizonEnd);
      if (upcoming) {
        entries.push({
          kind: 'birthday_own',
          date: upcoming.date,
          label: `${c.nickname || c.name}'s birthday`,
        });
      }
    }

    // Classmates — fetch other children in the same classroom(s).
    const classroomIds = Array.from(
      new Set(own.map((c) => c.classroom_id).filter((id): id is string => !!id))
    );
    if (classroomIds.length > 0) {
      const { data: classmates } = await supabase
        .from('montree_children')
        .select('id, name, nickname, date_of_birth, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('is_active', true);
      const classmateRows = (classmates || []) as ChildRow[];
      for (const c of classmateRows) {
        if (childIds.includes(c.id)) continue; // already handled as own
        const upcoming = upcomingAnniversary(c.date_of_birth, now, horizonEnd);
        if (upcoming) {
          // Privacy: classmates show first name only.
          const display = (c.nickname || c.name || '').split(/\s+/)[0] || 'Classmate';
          entries.push({
            kind: 'birthday_classmate',
            date: upcoming.date,
            label: `${display}'s birthday`,
          });
        }
      }
    }
  }

  // ── Holidays from calendar_overrides ───────────────────────────────
  const { data: school } = await supabase
    .from('montree_schools')
    .select('calendar_overrides')
    .eq('id', schoolId)
    .maybeSingle();
  type Holiday = { date: string; label: string; is_closed?: boolean };
  const overrides = ((school as { calendar_overrides: Holiday[] | null } | null)?.calendar_overrides ||
    []) as Holiday[];
  for (const h of overrides) {
    if (!h?.date || !h?.label) continue;
    const hd = parseDateOnly(h.date);
    if (!hd) continue;
    if (hd >= now && hd <= horizonEnd) {
      entries.push({
        kind: 'holiday',
        date: h.date,
        label: h.label,
        is_closed: h.is_closed === true,
      });
    }
  }

  // Sort by date ascending, then kind for stability.
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  return NextResponse.json({ entries });
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Given a date-of-birth (YYYY-MM-DD), produce this-year's birthday
 * anniversary as a Date. If that date already passed this year, return
 * the next year's anniversary. Returns null if the anniversary doesn't
 * fall within [now, horizonEnd].
 */
function upcomingAnniversary(
  dobIso: string | null,
  now: Date,
  horizonEnd: Date
): { date: string } | null {
  if (!dobIso) return null;
  const dob = parseDateOnly(dobIso);
  if (!dob) return null;

  const thisYear = new Date(Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
  let candidate = thisYear;
  if (thisYear < now) {
    candidate = new Date(Date.UTC(now.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
  }
  if (candidate < now || candidate > horizonEnd) return null;
  return { date: toIsoDateOnly(candidate) };
}

function parseDateOnly(s: string): Date | null {
  // Accept YYYY-MM-DD. Treat as UTC midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const date = new Date(Date.UTC(y, mo, d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toIsoDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
