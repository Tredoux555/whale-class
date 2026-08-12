// app/cms/teacher/documents/page.tsx
// ============================================================================
// THE DOCUMENT SHELF. Phase 5 made it real.
// ============================================================================
// Phase 3 shipped this as a grid of six disabled buttons. Every generator behind
// them now exists, so the cards do two new things:
//
//   1. THEY COUNT. Each card says what is actually in the room right now —
//      "3 allergies · 1 EpiPen", "5 collectors · 1 with nobody to collect".
//      A teacher should know what will come out of the printer BEFORE walking
//      to it, and the "1 with nobody to collect" line is the kind of thing a
//      manager wants to see on a Monday morning, not discover at 3pm.
//   2. THEY REFUSE TO PRINT NOTHING. A card whose document has no data goes
//      quiet and points at the Roster instead ("Add allergies in Roster first").
//      An empty allergy poster is worse than no allergy poster: it is a sheet
//      of paper that says a room has no allergies.
//
// The counts come from ONE pure function (`countDocumentData`) over the same
// `DocumentSource` the generators take, so a card can never disagree with the
// document it opens.

import Link from 'next/link';
import { Card } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { DocumentIcon } from '@/components/cms/icons';
import { DOCUMENTS, chipsFor, hasData } from '@/components/cms/documents/catalogue';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadRoster, loadTeacherRooms, resolveTeacherRoom } from '@/lib/cms/db/queries';
import {
  DEMO_DATE,
  demoAllergies,
  demoChildren,
  demoClassGroup,
  demoDietary,
  demoMedical,
  demoSchool,
} from '@/lib/cms/demo/seed';
import { countDocumentData, type DocumentSource } from '@/lib/cms/engine/doc-generator';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

export default async function TeacherDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const [{ t }, query] = await Promise.all([getServerT(), searchParams]);

  // ── the source switch, same shape as every other CMS page ───────────────
  let source: DocumentSource = {
    school: demoSchool,
    classGroup: demoClassGroup,
    date: DEMO_DATE,
    children: demoChildren,
    allergies: demoAllergies,
    dietary: demoDietary,
    medical: demoMedical,
  };
  let rooms: { id: string; name: string }[] = [
    { id: String(demoClassGroup.id), name: demoClassGroup.name },
  ];
  let activeRoomId = rooms[0].id;
  let hasRoom = true;

  if (isCmsLive()) {
    const session = await getCmsSession();
    const room = session ? await resolveTeacherRoom(session, query.room) : null;
    const data = session && room ? await loadRoster(session, room) : null;
    const allRooms = session ? await loadTeacherRooms(session) : [];

    if (!data || !room) {
      hasRoom = false;
      rooms = [];
    } else {
      source = {
        school: data.school,
        classGroup: data.room.classGroup,
        date: new Intl.DateTimeFormat('en-CA', {
          timeZone: data.school.timezone,
        }).format(new Date()),
        children: data.children,
        allergies: data.allergies,
        dietary: data.dietary,
        medical: data.medical,
      };
      rooms = allRooms.map((r) => ({
        id: String(r.classGroup.id),
        name: r.classGroup.name,
      }));
      activeRoomId = String(room.classGroup.id);
    }
  }

  const counts = countDocumentData(source);
  const roomQuery = rooms.length > 1 ? `?room=${encodeURIComponent(activeRoomId)}` : '';

  if (!hasRoom) {
    return (
      <>
        <PageHeader title={t('teacher.documents.title')} />
        <Card className="text-center py-10">
          <h2 className="font-head text-[18px] m-0">{t('teacher.roster.noRoom.title')}</h2>
          <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-0 leading-relaxed max-w-[54ch] mx-auto">
            {t('teacher.roster.noRoom.body')}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('teacher.documents.count.children', { count: counts.children })}
        title={t('teacher.documents.title')}
        subtitle={t('teacher.documents.subtitle')}
        actions={
          <Link href="/cms/teacher/roster" className="cms-btn cms-btn-secondary cms-btn-md">
            {t('teacher.documents.goToRoster')}
          </Link>
        }
      />

      {rooms.length > 1 ? (
        <nav
          aria-label={t('teacher.documents.room')}
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          <span className="cms-label !mb-0">{t('teacher.documents.room')}</span>
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/cms/teacher/documents?room=${encodeURIComponent(room.id)}`}
              className={`cms-btn cms-btn-chip ${
                room.id === activeRoomId
                  ? 'cms-btn-primary cms-btn-soft'
                  : 'cms-btn-ghost cms-btn-outline'
              }`}
            >
              {room.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
        {DOCUMENTS.map((doc) => {
          const ready = hasData(doc.kind, counts);
          const chips = chipsFor(doc.kind, counts).filter((c) => c.count > 0);
          return (
            <Card key={doc.kind} as="li" className="flex flex-col">
              <span
                className={`cms-card-sunk grid place-items-center w-10 h-10 mb-3.5 ${
                  ready ? 'text-harbor-accent-deep' : 'text-harbor-muted'
                }`}
              >
                <span className="block w-5 h-5">
                  <DocumentIcon />
                </span>
              </span>
              <h2 className="font-head text-[17px] m-0">{t(doc.titleKey)}</h2>
              <p className="text-[13px] text-harbor-muted mt-1.5 mb-3.5 leading-relaxed">
                {t(doc.descKey)}
              </p>

              {ready ? (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {chips.map((chip) => (
                    <span key={chip.key} className="cms-tag cms-tone-quiet">
                      {t(chip.key, { count: chip.count })}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="cms-card-sunk px-3 py-2.5 m-0 mb-4 text-[12px] text-harbor-muted leading-snug">
                  {t('teacher.documents.needData', { what: t(doc.needsKey) })}
                </p>
              )}

              <div className="mt-auto flex items-center gap-2.5">
                {ready ? (
                  <Link
                    href={`/cms/teacher/documents/${doc.slug}${roomQuery}`}
                    className="cms-btn cms-btn-primary cms-btn-soft cms-btn-sm"
                  >
                    {t('teacher.documents.open')}
                  </Link>
                ) : (
                  <Link
                    href="/cms/teacher/roster"
                    className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-sm"
                  >
                    {t('teacher.documents.goToRoster')}
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </ul>
    </>
  );
}
