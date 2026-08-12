'use client';

// components/cms/enroll/StepReview.tsx
// THE END OF THE TOP OF THE HOURGLASS. Everything the family typed, read back
// in one page, then one button that turns a draft into evidence.
//
// 🚨 SUBMIT IS A ONE-WAY DOOR AND THE SCREEN SAYS SO TWICE. Migration 329's RLS
// ends a parent's write access the moment `status` leaves `draft` — the update
// policy's USING clause requires draft, so after submit the family can read the
// application forever and edit it never. That is deliberate (a submitted form is
// evidence), which makes an honest warning part of the feature, not politeness.
//
// The summary renders from the wizard's OWN state, not from a re-read of the
// database, so it is identical in demo mode and live mode and cannot show a
// family something different from what they are about to send.

import { useT } from '@/lib/cms/i18n/provider';
import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';
import { CONSENT_KINDS, TEMPERAMENT_KEYS } from '@/lib/cms/validation';
import type { EnrollmentStep } from '@/lib/cms/engine/types';
import type { RoomOption } from './StepChildInfo';
import type { WizardValues } from './values';
import { StepScaffold } from './StepScaffold';

const RELATIONSHIP_LABEL: Record<string, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

const SEVERITY_LABEL: Record<string, TranslationKey> = {
  mild: 'teacher.today.severity.mild',
  moderate: 'teacher.today.severity.moderate',
  severe: 'teacher.today.severity.severe',
};

const REASON_LABEL: Record<string, TranslationKey> = {
  allergy: 'dietary.reason.allergy',
  medical: 'dietary.reason.medical',
  religious: 'dietary.reason.religious',
  cultural: 'dietary.reason.cultural',
  preference: 'dietary.reason.preference',
};

const CONSENT_LABEL: Record<string, TranslationKey> = {
  photography: 'consent.photography',
  media: 'consent.media',
  outings: 'consent.outings',
  emergency_medical: 'consent.emergency_medical',
  sunscreen: 'consent.sunscreen',
  data_processing: 'consent.data_processing',
};

const AXIS_LABEL: Record<string, TranslationKey> = {
  settling: 'enrol.about.axis.settling',
  company: 'enrol.about.axis.company',
  adventure: 'enrol.about.axis.adventure',
  energy: 'enrol.about.axis.energy',
};

/** One block of the summary: a title, an Edit that jumps back to that step, and
 *  whatever the step collected — or one quiet line saying it collected nothing. */
function Section({
  title,
  onEdit,
  editLabel,
  emptyLabel,
  empty,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  emptyLabel: string;
  /** Whether this step collected anything. Passed EXPLICITLY rather than
   *  inferred from `children`: a child that renders null is still a truthy
   *  element in the array, so an inferred check silently showed an empty
   *  section instead of "Nothing entered." */
  empty: boolean;
  children: React.ReactNode;
}) {
  const isEmpty = empty;
  return (
    <section className="border-t border-harbor-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3 mb-2.5">
        <h3 className="font-head text-[15.5px] m-0">{title}</h3>
        <button type="button" className="cms-btn cms-btn-ghost cms-btn-chip ms-auto" onClick={onEdit}>
          {editLabel}
        </button>
      </div>
      {isEmpty ? (
        <p className="text-[12.5px] text-harbor-muted m-0">{emptyLabel}</p>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </section>
  );
}

/** A label/value line. A two-column GRID, not a flex row: with flex, a long
 *  label ("Anything the teacher should know on day one") pushes its own value
 *  right and the whole summary goes ragged. A fixed label column keeps every
 *  value on one edge, which is what makes a page of these read as a record. */
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[13rem_minmax(0,1fr)] text-[13px]">
      <span className="text-harbor-muted leading-snug">{label}</span>
      <span className="font-medium text-harbor-text min-w-0" dir="auto">
        {value}
      </span>
    </div>
  );
}

function TagLine({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[13rem_minmax(0,1fr)] text-[13px]">
      <span className="text-harbor-muted leading-snug">{label}</span>
      <span className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="cms-tag cms-tone-quiet" dir="auto">
            {v}
          </span>
        ))}
      </span>
    </div>
  );
}

function positionLabel(t: TFunction, axis: string, value: number): string {
  const left = t(`enrol.about.axis.${axis}.left` as TranslationKey);
  const right = t(`enrol.about.axis.${axis}.right` as TranslationKey);
  if (value <= 2) return left;
  if (value >= 4) return right;
  return t('enrol.about.axis.mid');
}

export interface StepReviewProps {
  values: WizardValues;
  rooms: RoomOption[];
  /** Jump the wizard back to a step so the family can fix something. */
  onEditStep: (step: EnrollmentStep) => void;
  onSubmit: () => void;
  submitting: boolean;
  /** True in demo mode — the summary is real, the submit is switched off. */
  live: boolean;
}

export function StepReview({
  values,
  rooms,
  onEditStep,
  onSubmit,
  submitting,
  live,
}: StepReviewProps) {
  const t = useT();
  const edit = t('enrol.review.edit');
  const empty = t('enrol.review.empty');
  const roomName = rooms.find((r) => r.id === values.child.classGroupId)?.name ?? '';

  return (
    <StepScaffold titleKey="enrol.step.review" descKey="enrol.step.review.desc">
      <p className="cms-card-sunk px-3.5 py-3 mt-0 mb-5 text-[12.5px] text-harbor-muted leading-relaxed">
        {live ? t('enrol.review.body') : t('enrol.review.demoNote')}
      </p>

      <div className="grid gap-5">
        {/* ── child ─────────────────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.child')}
          onEdit={() => onEditStep('child')}
          editLabel={edit}
          emptyLabel={empty}
          empty={!values.child.legalName && !values.child.dateOfBirth && !roomName}
        >
          {values.child.legalName ? (
            <Line label={t('enrol.child.legalName')} value={values.child.legalName} />
          ) : null}
          {values.child.preferredName ? (
            <Line label={t('enrol.child.preferredName')} value={values.child.preferredName} />
          ) : null}
          {values.child.dateOfBirth ? (
            <Line label={t('enrol.child.dateOfBirth')} value={values.child.dateOfBirth} />
          ) : null}
          {values.child.homeLanguage ? (
            <Line label={t('enrol.child.homeLanguage')} value={values.child.homeLanguage} />
          ) : null}
          {roomName ? <Line label={t('enrol.child.classGroup')} value={roomName} /> : null}
          {values.child.requestedStartDate ? (
            <Line label={t('enrol.child.startDate')} value={values.child.requestedStartDate} />
          ) : null}
          {values.child.settlingNotes ? (
            <Line label={t('enrol.child.notes')} value={values.child.settlingNotes} />
          ) : null}
        </Section>

        {/* ── about your child ──────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.about')}
          onEdit={() => onEditStep('about_child')}
          editLabel={edit}
          emptyLabel={empty}
          empty={values.about_child.likes.length === 0 &&
            values.about_child.dislikes.length === 0 &&
            values.about_child.interests.length === 0 &&
            Object.keys(values.about_child.temperament ?? {}).length === 0 &&
            !values.about_child.parentNotes}
        >
          <TagLine label={t('enrol.about.likes')} values={values.about_child.likes} />
          <TagLine label={t('enrol.about.dislikes')} values={values.about_child.dislikes} />
          <TagLine label={t('enrol.about.interests')} values={values.about_child.interests} />
          {TEMPERAMENT_KEYS.filter((axis) => values.about_child.temperament?.[axis]).map((axis) => (
            <Line
              key={axis}
              label={t(AXIS_LABEL[axis])}
              value={positionLabel(t, axis, values.about_child.temperament[axis] as number)}
            />
          ))}
          {values.about_child.parentNotes ? (
            <Line label={t('enrol.about.notes')} value={values.about_child.parentNotes} />
          ) : null}
        </Section>

        {/* ── medical ───────────────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.medical')}
          onEdit={() => onEditStep('medical')}
          editLabel={edit}
          emptyLabel={empty}
          empty={values.medical.conditions.length === 0 &&
            !values.medical.doctorName &&
            !values.medical.doctorPhone &&
            !values.medical.emergencyNote &&
            values.medical.allergies.filter((r) => r.allergen.trim()).length === 0}
        >
          <TagLine label={t('enrol.medical.conditions')} values={values.medical.conditions} />
          {values.medical.doctorName ? (
            <Line label={t('enrol.medical.doctorName')} value={values.medical.doctorName} />
          ) : null}
          {values.medical.doctorPhone ? (
            <Line label={t('enrol.medical.doctorPhone')} value={values.medical.doctorPhone} />
          ) : null}
          {values.medical.emergencyNote ? (
            <Line label={t('enrol.medical.emergencyNote')} value={values.medical.emergencyNote} />
          ) : null}
          {values.medical.allergies
            .filter((row) => row.allergen.trim())
            .map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-[13px] sm:ps-[calc(13rem+1rem)]">
                <span className="cms-tag cms-tone-danger" dir="auto">
                  {row.allergen}
                </span>
                {row.severity ? (
                  <span className="text-harbor-muted">{t(SEVERITY_LABEL[row.severity])}</span>
                ) : null}
                {row.reaction ? (
                  <span className="text-harbor-muted" dir="auto">
                    · {row.reaction}
                  </span>
                ) : null}
                {row.carriesEpipen ? (
                  <span className="cms-tag cms-tone-amber">{t('enrol.medical.epipen')}</span>
                ) : null}
              </div>
            ))}
        </Section>

        {/* ── dietary ───────────────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.dietary')}
          onEdit={() => onEditStep('dietary')}
          editLabel={edit}
          emptyLabel={empty}
          empty={values.dietary.requirements.filter((r) => r.label.trim()).length === 0}
        >
          {values.dietary.requirements
            .filter((row) => row.label.trim())
            .map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-[13px] sm:ps-[calc(13rem+1rem)]">
                <span className="cms-tag cms-tone-amber" dir="auto">
                  {row.label}
                </span>
                {row.reason ? (
                  <span className="text-harbor-muted">{t(REASON_LABEL[row.reason])}</span>
                ) : null}
                {row.excludedFoods.length ? (
                  <span className="text-harbor-muted" dir="auto">
                    · {row.excludedFoods.join(', ')}
                  </span>
                ) : null}
              </div>
            ))}
        </Section>

        {/* ── previous school ───────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.school')}
          onEdit={() => onEditStep('previous_school')}
          editLabel={edit}
          emptyLabel={empty}
          empty={!values.previous_school.noPreviousSchool &&
            values.previous_school.schools.filter((r) => r.name.trim()).length === 0}
        >
          {values.previous_school.noPreviousSchool ? (
            <p className="text-[13px] m-0 sm:ps-[calc(13rem+1rem)]">{t('enrol.review.firstSetting')}</p>
          ) : (
            values.previous_school.schools
              .filter((row) => row.name.trim())
              .map((row, i) => (
                <Line
                  key={i}
                  label={row.name}
                  value={[row.city, row.countryCode, [row.attendedFrom, row.attendedTo].filter(Boolean).join(' – ')]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))
          )}
        </Section>

        {/* ── contacts ──────────────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.contacts')}
          onEdit={() => onEditStep('contacts')}
          editLabel={edit}
          emptyLabel={empty}
          empty={values.contacts.contacts.filter((r) => r.fullName.trim()).length === 0}
        >
          {values.contacts.contacts
            .filter((row) => row.fullName.trim())
            .map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-[13px] sm:ps-[calc(13rem+1rem)]">
                <span className="cms-tag cms-tone-quiet">
                  {t('enrol.contacts.callOrder', { n: i + 1 })}
                </span>
                <span className="font-medium" dir="auto">
                  {row.fullName}
                </span>
                {row.relationship ? (
                  <span className="text-harbor-muted">{t(RELATIONSHIP_LABEL[row.relationship])}</span>
                ) : null}
                {row.phone ? (
                  <span className="text-harbor-muted" dir="ltr">
                    · {row.phone}
                  </span>
                ) : null}
                {row.canCollect ? (
                  <span className="cms-tag cms-tone-accent">{t('enrol.contacts.canCollect')}</span>
                ) : null}
              </div>
            ))}
        </Section>

        {/* ── consents ──────────────────────────────────────────────────── */}
        <Section
          title={t('enrol.review.section.consents')}
          onEdit={() => onEditStep('consents')}
          editLabel={edit}
          emptyLabel={empty}
          empty={false}
        >
          {CONSENT_KINDS.map((kind) => (
            <div key={kind} className="grid gap-x-4 sm:grid-cols-[13rem_minmax(0,1fr)] items-center text-[13px]">
              <span className="text-harbor-muted leading-snug">{t(CONSENT_LABEL[kind])}</span>
              <span
                className={`cms-tag justify-self-start ${
                  values.consents.consents?.[kind] ? 'cms-tone-success' : 'cms-tone-quiet'
                }`}
              >
                {values.consents.consents?.[kind] ? t('common.yes') : t('common.no')}
              </span>
            </div>
          ))}
          {values.consents.signedName ? (
            <Line label={t('enrol.consents.sign')} value={values.consents.signedName} />
          ) : null}
        </Section>
      </div>

      <div className="mt-7 pt-5 border-t border-harbor-border flex flex-wrap items-center gap-3">
        <p className="text-[12px] text-harbor-muted m-0 max-w-[46ch] leading-relaxed">
          {t('enrol.review.lockNote')}
        </p>
        <button
          type="button"
          className="cms-btn cms-btn-primary cms-btn-lg ms-auto"
          disabled={!live || submitting}
          onClick={onSubmit}
        >
          {submitting ? t('enrol.review.submitting') : t('enrol.review.submit')}
        </button>
      </div>
    </StepScaffold>
  );
}
