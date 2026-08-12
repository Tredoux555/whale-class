// app/cms/teacher/roster/page.tsx
// ============================================================================
// WHERE A TEACHER PUTS THEIR CLASS IN. Phase 4.
// ============================================================================
// The hourglass was built top-down: a family enters the record, the classroom
// reads it. That is still the default and still the better path. But it assumes
// a family account exists, and a real Montessori room on day one has a teacher,
// a printed list, and twenty children who start on Monday.
//
// So this page is the OTHER door. Paste the list, check the preview, confirm —
// and every document in phase 5 has something to print. The authority rule is
// deliberately narrow and is stated on the page itself: a teacher owns a record
// they created, and hands it back the moment a family connects.
//
// SERVER COMPONENT. It resolves the session, the room (from `?room=`, validated
// against the session's own assignments — never trusted from the URL), and the
// rows, then hands plain data to ONE client island. Demo mode renders the seed
// read-only with a banner, exactly like every other CMS page.

import { Card } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { RosterEditor } from '@/components/cms/teacher/RosterEditor';
import type { RosterChildRow, RosterRoomOption } from '@/components/cms/teacher/roster-shapes';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  hasKnownDob,
  loadRoster,
  loadTeacherRooms,
  resolveTeacherRoom,
} from '@/lib/cms/db/queries';
import {
  DEMO_DATE,
  demoAllergies,
  demoChildren,
  demoClassGroup,
  demoDietary,
} from '@/lib/cms/demo/seed';
import { ageOn, surnameOf } from '@/lib/cms/engine/doc-generator';
import type { Allergy, Child, DietaryRequirement } from '@/lib/cms/engine/types';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

/** Severe first — the same order the poster and the roster chips use. */
const SEVERITY_ORDER = { severe: 0, moderate: 1, mild: 2 } as const;

/**
 * Engine records → the flat rows the client island renders.
 *
 * Kept here rather than in the client so the branded ids, the Set of
 * family-owned ids and the sorting all stay on the server: the island receives
 * strings and arrays, and re-derives nothing it was not told.
 */
function toRows(
  children: Child[],
  allergies: Allergy[],
  dietary: DietaryRequirement[],
  familyOwned: Set<string>,
  onDate: string
): RosterChildRow[] {
  return children.map((child) => {
    const childAllergies = allergies
      .filter((a) => a.childId === child.id)
      .sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
    const childDietary = dietary.filter((d) => d.childId === child.id);
    const known = hasKnownDob(child.dateOfBirth);
    const age = known ? ageOn(child.dateOfBirth, onDate) : null;
    const collectors = new Set(child.authorisedCollectors.map(String));

    return {
      id: String(child.id),
      preferredName: child.preferredName,
      surname: surnameOf(child),
      dateOfBirth: known ? child.dateOfBirth : null,
      ageYears: age ? age.years : null,
      allergyChips: childAllergies.map((a) => ({ label: a.allergen, severity: a.severity })),
      carriesEpipen: childAllergies.some((a) => a.carriesEpipen),
      dietaryChips: childDietary.map((d) => d.label),
      contactCount: child.guardians.length,
      staffNote: child.staffNote,
      familyOwned: familyOwned.has(String(child.id)),
      values: {
        preferredName: child.preferredName,
        legalName: child.legalName,
        dateOfBirth: known ? child.dateOfBirth : '',
        homeLanguage: child.homeLanguage,
        staffNote: child.staffNote ?? '',
        allergies: childAllergies.map((a) => ({
          allergen: a.allergen,
          severity: a.severity,
          reaction: a.reaction,
          responsePlan: a.responsePlan,
          carriesEpipen: a.carriesEpipen,
        })),
        dietary: childDietary.map((d) => ({
          label: d.label,
          reason: d.reason,
          excludedFoods: d.excludedFoods,
          notes: d.notes ?? '',
        })),
        contacts: child.guardians.map((g) => ({
          fullName: g.fullName,
          relationship: g.relationship,
          phone: g.phone ?? '',
          email: g.email ?? '',
          canCollect: collectors.has(String(g.id)),
          note: '',
        })),
      },
    };
  });
}

export default async function TeacherRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { t } = await getServerT();
  const params = await searchParams;

  // ── demo mode ───────────────────────────────────────────────────────────
  // The seed, read-only, with the banner saying so. Demo mode is a feature, not
  // a fallback: the founder walks the whole surface on a laptop with no env.
  if (!isCmsLive()) {
    const rooms: RosterRoomOption[] = [
      { id: String(demoClassGroup.id), name: demoClassGroup.name, assigned: true },
    ];
    const rows = toRows(demoChildren, demoAllergies, demoDietary, new Set(), DEMO_DATE);
    return (
      <>
        <PageHeader
          title={t('teacher.roster.title')}
          subtitle={t('teacher.roster.subtitle', { room: demoClassGroup.name })}
        />
        <p className="cms-card-sunk px-4 py-3 text-[12.5px] text-harbor-muted m-0 mb-5 leading-relaxed">
          {t('teacher.roster.demoBanner')}
        </p>
        <RosterEditor
          rooms={rooms}
          activeRoomId={rooms[0].id}
          readOnly
          rows={rows}
        />
      </>
    );
  }

  // ── live ────────────────────────────────────────────────────────────────
  const session = await getCmsSession();
  const room = session ? await resolveTeacherRoom(session, params.room) : null;

  if (!session || !room) {
    // A teacher with no room assignment, or a `?room=` they do not teach.
    // Showing somebody else's roster would be worse than showing none.
    return (
      <>
        <PageHeader title={t('teacher.roster.title')} />
        <Card className="text-center py-10">
          <h2 className="font-head text-[18px] m-0">{t('teacher.roster.noRoom.title')}</h2>
          <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-0 leading-relaxed max-w-[54ch] mx-auto">
            {t('teacher.roster.noRoom.body')}
          </p>
        </Card>
      </>
    );
  }

  const [data, allRooms] = await Promise.all([
    loadRoster(session, room),
    loadTeacherRooms(session),
  ]);

  const rooms: RosterRoomOption[] = allRooms.map((r) => ({
    id: String(r.classGroup.id),
    name: r.classGroup.name,
    assigned: r.assigned,
  }));

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: data?.school.timezone ?? 'UTC',
  }).format(new Date());

  const rows = data
    ? toRows(data.children, data.allergies, data.dietary, data.familyOwned, today)
    : [];

  return (
    <>
      <PageHeader
        eyebrow={t('teacher.roster.count', { count: rows.length })}
        title={t('teacher.roster.title')}
        subtitle={t('teacher.roster.subtitle', { room: room.classGroup.name })}
      />
      <RosterEditor
        rooms={rooms}
        activeRoomId={String(room.classGroup.id)}
        rows={rows}
      />
    </>
  );
}
