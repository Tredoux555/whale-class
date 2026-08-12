// app/cms/office/enrollments/page.tsx
// ============================================================================
// THE OFFICE — the queue, and the school's Montree connection, read-only.
// ============================================================================
// CMS's first school_admin room. Everything a family typed arrives here and
// waits for one word. The page answers three questions in this order, because
// that is the order the office asks them:
//
//   1. what is waiting on me?          → the queue, submitted first
//   2. is this school connected?       → the link panel, READ-ONLY, always
//   3. what did we already decide?     → the decided list, for looking things up
//
// 🚨 THE LINK PANEL IS DELIBERATELY NOT A SETTING. Connecting a CMS school to a
// Montree school means naming a `montree_schools.id` — a record this office
// cannot see and has no business browsing (a CMS school_admin is not a Montree
// admin). Building a picker would mean building cross-product admin lookup, and
// handing one product's staff a list of another product's tenants. So the link
// is established by an operator running two UPDATE statements (documented at the
// bottom of migration 332) and this panel reports the RESULT. Do not "finish"
// it into a form.

import Link from 'next/link';
import { Card, SunkPanel } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { StatTile } from '@/components/cms/StatTile';
import { ArrowRightIcon, CheckIcon, MessageIcon, UsersIcon } from '@/components/cms/icons';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  loadOfficeEnrollments,
  loadSchoolLinkStatus,
  type OfficeEnrollmentSummary,
  type SchoolLinkStatus,
} from '@/lib/cms/db/queries';
import { demoOfficeEnrollments } from '@/lib/cms/demo/seed';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';

export const dynamic = 'force-dynamic';

const STATUS_KEY: Record<string, TranslationKey> = {
  submitted: 'office.status.submitted',
  in_review: 'office.status.in_review',
  accepted: 'office.status.accepted',
  declined: 'office.status.declined',
  waitlisted: 'office.status.waitlisted',
  withdrawn: 'office.status.withdrawn',
};

const STATUS_TONE: Record<string, string> = {
  submitted: 'cms-tone-accent',
  in_review: 'cms-tone-accent',
  accepted: 'cms-tone-success',
  declined: 'cms-tone-quiet',
  waitlisted: 'cms-tone-amber',
  withdrawn: 'cms-tone-quiet',
};

/** The wizard's seven steps — the denominator of "how complete is this?". */
const TOTAL_STEPS = 7;

/** A date a human reads, in the page's own locale, never a raw timestamp. */
export function formatDay(value: string | null, locale: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(d);
}

function EnrollmentRow({
  row,
  t,
  locale,
}: {
  row: OfficeEnrollmentSummary;
  t: TFunction;
  locale: string;
}) {
  const statusKey = STATUS_KEY[row.status] ?? 'office.status.submitted';
  const tone = STATUS_TONE[row.status] ?? 'cms-tone-quiet';
  const done = row.completedSteps.length;

  return (
    <Card as="li" className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir="auto" className="font-head text-[17px] leading-tight m-0">
            {row.legalName || row.preferredName}
          </h3>
          <span className={`cms-tag ${tone}`}>{t(statusKey)}</span>
          {/* The handshake, stated as a fact and never as a promise. */}
          {row.montreeChildId && row.inviteCode ? (
            <span className="cms-tag cms-tone-success">{t('office.link.childBadge')}</span>
          ) : null}
          {row.montreeChildId && !row.inviteCode ? (
            <span className="cms-tag cms-tone-amber">{t('office.link.invitePending')}</span>
          ) : null}
        </div>

        <p className="text-[12.5px] text-harbor-muted m-0 mt-1.5 leading-snug">
          {row.requestedRoomName ?? t('office.room.none')}
          {' · '}
          {t('office.steps', { done, total: TOTAL_STEPS })}
          {row.submittedAt
            ? ` · ${t('office.submittedOn', { date: formatDay(row.submittedAt, locale) })}`
            : ''}
        </p>

        <p dir="auto" className="text-[12.5px] text-harbor-muted m-0 mt-1 leading-snug">
          {t('office.family')}:{' '}
          {row.guardianNames.length > 0
            ? row.guardianNames.join(' · ')
            : t('office.family.none')}
        </p>
      </div>

      <Link
        href={`/cms/office/enrollments/${row.enrollmentId}`}
        className="cms-btn cms-btn-secondary cms-btn-sm shrink-0"
      >
        {t('office.review')}
        <ArrowRightIcon className="cms-flip" />
      </Link>
    </Card>
  );
}

function LinkPanel({ link, t }: { link: SchoolLinkStatus; t: TFunction }) {
  const connected = Boolean(link.montreeSchoolId);
  return (
    <Card className={`mb-5 border-s-[3px] ${connected ? 'border-s-harbor-success' : 'border-s-harbor-border'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-head text-[16px] m-0">{t('office.link.title')}</h2>
        <span className={`cms-tag ${connected ? 'cms-tone-success' : 'cms-tone-quiet'}`}>
          {connected ? t('office.link.connected') : t('office.link.notConnected')}
        </span>
        {connected ? (
          <span className="cms-tag cms-tone-quiet">
            {t('office.link.rooms', { linked: link.roomsLinked, total: link.roomsTotal })}
          </span>
        ) : null}
      </div>
      <SunkPanel className="mt-3.5">
        <p className="text-[12.5px] text-harbor-muted leading-relaxed m-0 max-w-[76ch]">
          {t('office.link.note')}
        </p>
      </SunkPanel>
    </Card>
  );
}

/** Demo mode: the seeded queue, and a school that IS connected — otherwise the
 *  most interesting screen in phase 7 renders as an apology. */
function demoView(): { rows: OfficeEnrollmentSummary[]; link: SchoolLinkStatus } {
  return {
    rows: demoOfficeEnrollments,
    link: { montreeSchoolId: 'demo-montree-school', roomsTotal: 3, roomsLinked: 2 },
  };
}

export default async function OfficeEnrollmentsPage() {
  const { t, locale } = await getServerT();
  const live = isCmsLive();

  let view = demoView();
  if (live) {
    const session = await getCmsSession();
    if (session?.schoolId) {
      const [rows, link] = await Promise.all([
        loadOfficeEnrollments(session),
        loadSchoolLinkStatus(session.schoolId),
      ]);
      view = { rows, link };
    } else {
      view = { rows: [], link: { montreeSchoolId: null, roomsTotal: 0, roomsLinked: 0 } };
    }
  }

  const waiting = view.rows.filter((r) => r.status === 'submitted' || r.status === 'in_review');
  const decided = view.rows.filter((r) => !waiting.includes(r));
  const acceptedCount = view.rows.filter((r) => r.status === 'accepted').length;
  const connectedCount = view.rows.filter((r) => r.montreeChildId && r.inviteCode).length;

  return (
    <>
      <PageHeader
        title={t('office.enrollments.title')}
        subtitle={t('office.enrollments.subtitle')}
      />

      {live ? null : (
        <Card className="mb-5 border-s-[3px] border-s-harbor-amber">
          <p className="text-[13px] text-harbor-muted leading-relaxed m-0">
            {t('office.result.demo')}
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatTile
          value={waiting.length}
          label={t('office.stat.waiting')}
          tone="accent"
          icon={<UsersIcon />}
        />
        <StatTile
          value={acceptedCount}
          label={t('office.stat.accepted')}
          tone="success"
          icon={<CheckIcon />}
        />
        <StatTile
          value={connectedCount}
          label={t('office.stat.connected')}
          tone="amber"
          icon={<MessageIcon />}
        />
      </div>

      <LinkPanel link={view.link} t={t} />

      {view.rows.length === 0 ? (
        <Card className="text-center py-10">
          <h2 className="font-head text-[18px] m-0">{t('office.enrollments.empty.title')}</h2>
          <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-0 leading-relaxed max-w-[54ch] mx-auto">
            {t('office.enrollments.empty.body')}
          </p>
        </Card>
      ) : null}

      {waiting.length > 0 ? (
        <section className="mb-6">
          <h2 className="cms-label mb-2.5">{t('office.enrollments.waiting')}</h2>
          <ul className="grid gap-3 list-none p-0 m-0">
            {waiting.map((row) => (
              <EnrollmentRow key={row.enrollmentId} row={row} t={t} locale={locale} />
            ))}
          </ul>
        </section>
      ) : null}

      {decided.length > 0 ? (
        <section>
          <h2 className="cms-label mb-2.5">{t('office.enrollments.decided')}</h2>
          <ul className="grid gap-3 list-none p-0 m-0">
            {decided.map((row) => (
              <EnrollmentRow key={row.enrollmentId} row={row} t={t} locale={locale} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
