// app/cms/teacher/documents/[doc]/page.tsx
// ============================================================================
// ONE DOCUMENT, PRINT-READY. Phase 5.
// ============================================================================
// This is the bottom of the hourglass, and it is deliberately thin: it resolves
// a room, builds a `DocumentSource` out of rows, calls a PURE generator, and
// hands the model to a view. It contains no business logic at all — the sorting,
// the grouping, the "who may collect" filter and the severity ordering all
// happen in `lib/cms/engine/doc-generator`, once, where they are testable.
//
// SERVER COMPONENT. The only client JavaScript that reaches the browser is the
// Print button. Twenty-four children cost one render, not twenty-four.
//
// 🚨 THE ROOM COMES FROM THE SESSION. `?room=` is a REQUEST — `resolveTeacherRoom`
// re-derives the rooms this membership actually teaches and returns null for
// anything else, which renders the "no room" card rather than somebody else's
// register. A multi-room teacher gets a picker in the screen toolbar.
//
// 🚨 THE LAYOUT RENDERS THIS BARE. `app/cms/layout.tsx` returns no AppShell for
// `/cms/teacher/documents/<doc>`, because a sticky header and a footer would
// print. The route is still gated — the role check is in middleware.ts.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/cms/Card';
import { DocumentBody } from '@/components/cms/documents/DocumentBody';
import { PrintFrame } from '@/components/cms/documents/PrintFrame';
import { documentBySlug } from '@/components/cms/documents/catalogue';
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
import { defaultOptions, generate, type DocumentSource } from '@/lib/cms/engine/doc-generator';
import type { Locale } from '@/lib/cms/i18n/config';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

/** Today in the SCHOOL's zone, never the server's — a register is cut on the
 *  day the room is living in. `en-CA` because it formats as YYYY-MM-DD. */
function schoolToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
  }
}

/** "Tuesday 11 August 2026", in the reader's own language — including on paper. */
function formatDate(isoDate: string, locale: Locale, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone,
    }).format(new Date(`${isoDate}T12:00:00Z`));
  } catch {
    return isoDate;
  }
}

export default async function TeacherDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ doc: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const [{ doc: slug }, query, { t, locale }] = await Promise.all([
    params,
    searchParams,
    getServerT(),
  ]);

  const entry = documentBySlug(slug);
  // An unknown slug is a 404, not a blank sheet. `/documents/allergyposter`
  // must never quietly render something that looks official.
  if (!entry) notFound();

  const generatedAt = new Date().toISOString();

  // ── demo mode ───────────────────────────────────────────────────────────
  if (!isCmsLive()) {
    const source: DocumentSource = {
      school: demoSchool,
      classGroup: demoClassGroup,
      date: DEMO_DATE,
      children: demoChildren,
      allergies: demoAllergies,
      dietary: demoDietary,
      medical: demoMedical,
    };
    const model = generate(entry.kind, source, defaultOptions(locale, generatedAt));
    return (
      <PrintFrame
        meta={model.meta}
        title={t(entry.titleKey)}
        dateLabel={formatDate(DEMO_DATE, locale, demoSchool.timezone)}
        slug={entry.slug}
        t={t}
      >
        <DocumentBody doc={model} t={t} />
      </PrintFrame>
    );
  }

  // ── live ────────────────────────────────────────────────────────────────
  const session = await getCmsSession();
  const room = session ? await resolveTeacherRoom(session, query.room) : null;

  if (!session || !room) {
    return (
      <div className="min-h-screen bg-harbor-canvas py-10 px-6">
        <Card className="max-w-[46rem] mx-auto text-center py-10">
          <h1 className="font-head text-[20px] m-0">{t('teacher.roster.noRoom.title')}</h1>
          <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-4 leading-relaxed max-w-[54ch] mx-auto">
            {t('teacher.roster.noRoom.body')}
          </p>
          <Link href="/cms/teacher/documents" className="cms-btn cms-btn-secondary cms-btn-sm">
            {t('teacher.documents.back')}
          </Link>
        </Card>
      </div>
    );
  }

  const [data, allRooms] = await Promise.all([
    loadRoster(session, room),
    loadTeacherRooms(session),
  ]);

  if (!data) notFound();

  const onDate = schoolToday(data.school.timezone);
  const source: DocumentSource = {
    school: data.school,
    classGroup: data.room.classGroup,
    date: onDate,
    children: data.children,
    allergies: data.allergies,
    dietary: data.dietary,
    medical: data.medical,
  };

  const model = generate(entry.kind, source, {
    ...defaultOptions(locale, generatedAt),
    // Sensitive sheets carry who printed them. Not a watermark — a footer line,
    // because a teacher holding a page of phone numbers should be able to see
    // whose copy it is without turning it over.
    printedByName: session.displayName || null,
  });

  return (
    <PrintFrame
      meta={model.meta}
      title={t(entry.titleKey)}
      dateLabel={formatDate(onDate, locale, data.school.timezone)}
      rooms={allRooms.map((r) => ({ id: String(r.classGroup.id), name: r.classGroup.name }))}
      activeRoomId={String(room.classGroup.id)}
      slug={entry.slug}
      t={t}
    >
      <DocumentBody doc={model} t={t} />
    </PrintFrame>
  );
}
