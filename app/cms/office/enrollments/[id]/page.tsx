// app/cms/office/enrollments/[id]/page.tsx
// ============================================================================
// ONE APPLICATION, READ-ONLY — and the decision.
// ============================================================================
// Everything the family typed, laid out in the order they were asked for it, so
// the office reads the application rather than a database. There is no edit
// control anywhere on this page and that is deliberate: an office that can
// quietly rewrite what a parent wrote destroys the only thing an application is
// good for. If a family got something wrong, they fix it — or, once submitted,
// the office rings them and the correction has a name on it.
//
// The one WRITE on the page is the decision, and it lives in its own client
// component (`DecisionPanel`) so this page stays a server component with zero
// client JavaScript for the reading half.
//
// TENANCY: `loadOfficeEnrollment` re-proves the row belongs to the session's
// school before returning a field of it. An id in the URL is a request.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/cms/Avatar';
import { Card, SunkPanel } from '@/components/cms/Card';
import { Chip } from '@/components/cms/Chip';
import { PageHeader } from '@/components/cms/PageHeader';
import { DecisionPanel } from '@/components/cms/office/DecisionPanel';
import { ArrowRightIcon } from '@/components/cms/icons';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  loadOfficeEnrollment,
  loadSchoolLinkStatus,
  UNKNOWN_DOB,
  type OfficeEnrollmentDetail,
} from '@/lib/cms/db/queries';
import { montreeParentEntryUrl } from '@/lib/cms/montree-junction';
import { demoOfficeDetail } from '@/lib/cms/demo/seed';
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

const RELATIONSHIP_KEY: Record<string, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="cms-label mb-1">{label}</span>
      <p dir="auto" className="text-[13.5px] leading-relaxed m-0">
        {value || '—'}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4">
      <h2 className="font-head text-[16px] m-0 mb-3.5">{title}</h2>
      {children}
    </Card>
  );
}

function fmt(value: string | null, locale: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(d);
}

function Body({
  view,
  t,
  locale,
}: {
  view: OfficeEnrollmentDetail;
  t: TFunction;
  locale: string;
}) {
  // The roster sentinel, honoured here as everywhere: an unknown birthday says
  // so rather than printing 1900.
  const dob =
    view.dateOfBirth && view.dateOfBirth !== UNKNOWN_DOB
      ? fmt(view.dateOfBirth, locale)
      : t('office.dobUnknown');

  return (
    <>
      <Section title={t('office.section.child')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('office.field.legalName')} value={view.legalName} />
          <Field label={t('office.field.preferredName')} value={view.preferredName} />
          <Field label={t('office.field.dob')} value={dob} />
          <Field label={t('office.field.homeLanguage')} value={view.homeLanguage} />
          <Field label={t('office.field.room')} value={view.requestedRoomName} />
          <Field
            label={t('office.field.startDate')}
            value={fmt(view.requestedStartDate, locale)}
          />
        </div>
      </Section>

      {view.profile ? (
        <Section title={t('office.section.about')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('office.field.likes')} value={view.profile.likes.join(', ')} />
            <Field label={t('office.field.dislikes')} value={view.profile.dislikes.join(', ')} />
            <Field label={t('office.field.interests')} value={view.profile.interests.join(', ')} />
          </div>
          {view.profile.parentNotes ? (
            <SunkPanel className="mt-4">
              <span className="cms-label mb-1.5">{t('office.field.parentNotes')}</span>
              <p dir="auto" className="text-[13px] leading-relaxed m-0">
                {view.profile.parentNotes}
              </p>
            </SunkPanel>
          ) : null}
        </Section>
      ) : null}

      <Section title={t('office.section.medical')}>
        {view.allergies.length === 0 && !view.medical ? (
          <p className="text-[13px] text-harbor-muted m-0">{t('office.empty')}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {view.allergies.map((a) => (
                <Chip
                  key={a.id}
                  category="allergy"
                  detail={t(`teacher.today.severity.${a.severity}` as TranslationKey)}
                >
                  {a.allergen}
                </Chip>
              ))}
            </div>
            {view.medical ? (
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <Field
                  label={t('office.field.conditions')}
                  value={view.medical.conditions.join(', ')}
                />
                <Field
                  label={t('office.field.medications')}
                  value={view.medical.medications.map((m) => m.name).join(', ')}
                />
                <Field label={t('office.field.doctor')} value={view.medical.doctorName} />
                <Field
                  label={t('office.field.emergencyNote')}
                  value={view.medical.emergencyNote}
                />
              </div>
            ) : null}
          </>
        )}
      </Section>

      <Section title={t('office.section.dietary')}>
        {view.dietary.length === 0 ? (
          <p className="text-[13px] text-harbor-muted m-0">{t('office.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {view.dietary.map((d) => (
              <Chip key={d.id} category="dietary" detail={d.excludedFoods.join(', ') || undefined}>
                {d.label}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('office.section.contacts')}>
        {view.guardians.length === 0 ? (
          <p className="text-[13px] text-harbor-muted m-0">{t('office.family.none')}</p>
        ) : (
          <ul className="grid gap-2.5 list-none p-0 m-0">
            {view.guardians.map((g) => {
              const canCollect = view.authorisedCollectorIds.includes(String(g.id));
              return (
                <li key={g.id} className="cms-card-sunk flex flex-wrap items-center gap-3 p-3">
                  <Avatar name={g.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block text-[13.5px] leading-tight">
                      {g.fullName}
                    </span>
                    <span className="block text-[12px] text-harbor-muted mt-0.5">
                      {t(RELATIONSHIP_KEY[g.relationship] ?? 'relationship.guardian')}
                      {g.phone ? ` · ${g.phone}` : ''}
                      {g.email ? ` · ${g.email}` : ''}
                    </span>
                  </span>
                  <span
                    className={`cms-tag ${canCollect ? 'cms-tone-success' : 'cms-tone-danger'}`}
                  >
                    {canCollect
                      ? t('office.field.canCollect')
                      : t('office.field.cannotCollect')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {view.previousSchools.length > 0 ? (
        <Section title={t('office.section.previous')}>
          <ul className="grid gap-2.5 list-none p-0 m-0">
            {view.previousSchools.map((p, i) => (
              <li key={`${p.name}-${i}`} className="cms-card-sunk p-3">
                <span dir="auto" className="block text-[13.5px]">
                  {p.name}
                </span>
                <span className="block text-[12px] text-harbor-muted mt-1">
                  {[fmt(p.from, locale), fmt(p.to, locale)].filter(Boolean).join(' — ')}
                  {p.reason ? ` · ${t('office.field.reason')}: ${p.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {view.consents.length > 0 ? (
        <Section title={t('office.section.consents')}>
          <ul className="grid gap-2 sm:grid-cols-2 list-none p-0 m-0">
            {view.consents.map((c) => (
              <li key={c.kind} className="flex items-center gap-2.5">
                <span
                  className={`cms-tag ${c.granted ? 'cms-tone-success' : 'cms-tone-quiet'} shrink-0`}
                >
                  {c.granted ? t('office.consent.granted') : t('office.consent.refused')}
                </span>
                <span className="text-[13px] leading-snug">
                  {t(`consent.${c.kind}` as TranslationKey)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {view.settlingNotes ? (
        <Section title={t('office.section.settling')}>
          <p dir="auto" className="text-[13.5px] leading-relaxed m-0">
            {view.settlingNotes}
          </p>
        </Section>
      ) : null}
    </>
  );
}

export default async function OfficeEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t, locale } = await getServerT();
  const live = isCmsLive();

  let view: OfficeEnrollmentDetail | null = demoOfficeDetail;
  let schoolLinked = true;
  let roomLinked = true;

  if (live) {
    const session = await getCmsSession();
    if (!session?.schoolId) notFound();
    const [detail, link] = await Promise.all([
      loadOfficeEnrollment(session, id),
      loadSchoolLinkStatus(session.schoolId),
    ]);
    view = detail;
    schoolLinked = Boolean(link.montreeSchoolId);
    roomLinked = Boolean(detail?.requestedRoomLinked);
  }

  if (!view) {
    return (
      <Card className="text-center py-10">
        <h1 className="font-head text-[20px] m-0">{t('office.detail.notFound.title')}</h1>
        <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-5 leading-relaxed">
          {t('office.detail.notFound.body')}
        </p>
        <Link href="/cms/office/enrollments" className="cms-btn cms-btn-secondary cms-btn-md">
          {t('office.detail.back')}
        </Link>
      </Card>
    );
  }

  const statusKey = STATUS_KEY[view.status] ?? 'office.status.submitted';
  const entryUrl = view.inviteCode ? montreeParentEntryUrl(view.inviteCode) : null;

  return (
    <>
      <Link
        href="/cms/office/enrollments"
        className="cms-btn cms-btn-ghost cms-btn-sm mb-4 -ms-2"
      >
        <ArrowRightIcon className="cms-flip rotate-180" />
        {t('office.detail.back')}
      </Link>

      <PageHeader
        eyebrow={t(statusKey)}
        title={view.legalName || view.preferredName}
        subtitle={t('office.detail.subtitle')}
      />

      <Card className="mb-5 border-s-[3px] border-s-harbor-accent">
        <p className="text-[12.5px] text-harbor-muted leading-relaxed m-0">
          {t('office.detail.readOnly')}
        </p>
      </Card>

      {/* The decision comes FIRST on the page, under the read-only note: the
          office opened this screen to decide, and making them scroll past six
          sections to find the button is making them scroll past six sections. */}
      <Card className="mb-6">
        <h2 className="font-head text-[17px] m-0 mb-1">{t('office.decision.title')}</h2>

        {view.inviteCode ? (
          <SunkPanel className="my-3.5">
            <span className="cms-label mb-1.5">{t('office.code.label')}</span>
            <p className="font-head text-[26px] tracking-[0.18em] m-0 leading-none" dir="ltr">
              {view.inviteCode}
            </p>
            <p className="text-[12px] text-harbor-muted leading-relaxed mt-2.5 mb-0 max-w-[62ch]">
              {t('office.code.help')}
            </p>
            {entryUrl ? (
              <a
                href={entryUrl}
                target="_blank"
                rel="noreferrer"
                className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-sm mt-3"
              >
                {t('office.code.link')}
                <ArrowRightIcon className="cms-flip" />
              </a>
            ) : null}
          </SunkPanel>
        ) : null}

        {view.decisionNote ? (
          <SunkPanel className="my-3.5">
            <span className="cms-label mb-1.5">{t('office.decision.declinedNote')}</span>
            <p dir="auto" className="text-[13px] leading-relaxed m-0">
              {view.decisionNote}
            </p>
          </SunkPanel>
        ) : null}

        <div className="mt-3.5">
          <DecisionPanel
            enrollmentId={view.enrollmentId}
            status={view.status}
            schoolLinked={schoolLinked}
            roomLinked={roomLinked}
            hasInviteCode={Boolean(view.inviteCode)}
            demo={!live}
          />
        </div>
      </Card>

      <Body view={view} t={t} locale={locale} />
    </>
  );
}
