// app/cms/teacher/today/page.tsx
// WORKING PAGE 2 of 3 — and the proof that the hourglass is real.
//
// This page holds no child data of its own. It takes the records that a PARENT
// entered (Child, Guardian, Allergy, DietaryRequirement, MedicalRecord), passes
// them through `lib/cms/engine/roster.buildDailyRoster`, and renders whatever
// comes out.
//
// PHASE 2 PROVED THE CLAIM. Phase 1's header said "swap the seed for Supabase
// rows and this file does not change by one line" — and the rendering half
// below is untouched. What was added is a source switch above it: live mode
// reads cms_children / cms_allergies / cms_dietary_requirements /
// cms_medical_records / cms_attendance for the teacher's own room, demo mode
// reads the seed. `buildDailyRoster` was not modified, and its signature is
// still a pure (RosterInput, RosterLabels) → DailyRoster.

import { Avatar } from '@/components/cms/Avatar';
import { Card } from '@/components/cms/Card';
import { StatusTag, Tag } from '@/components/cms/Chip';
import { PageHeader } from '@/components/cms/PageHeader';
import { StatTile } from '@/components/cms/StatTile';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  HandoverIcon,
  IconBox,
  UtensilsIcon,
} from '@/components/cms/icons';
import {
  buildDailyRoster,
  countFlags,
  type RosterInput,
  type RosterLabels,
} from '@/lib/cms/engine/roster';
import {
  DEMO_DATE,
  DEMO_DATE_LABEL,
  demoAllergies,
  demoChildren,
  demoClassGroup,
  demoDailyFacts,
  demoDietary,
  demoMedical,
  demoSchool,
} from '@/lib/cms/demo/seed';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadTeacherRoster } from '@/lib/cms/db/queries';
import { getServerT } from '@/lib/cms/i18n/server';
import type { Locale } from '@/lib/cms/i18n/config';

export const dynamic = 'force-dynamic';

/**
 * Today, in the SCHOOL's timezone — never the server's. A register is cut on
 * the day the room is living, and a Railway container in another hemisphere
 * must not roll the day over early. (`en-CA` because it formats as YYYY-MM-DD,
 * which is what a `date` column wants.)
 */
function schoolToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
  }
}

/** "Tuesday 11 August", in the reader's own language. */
function formatDateLabel(isoDate: string, locale: Locale, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: timezone,
    }).format(new Date(`${isoDate}T12:00:00Z`));
  } catch {
    return isoDate;
  }
}

/**
 * Family name for the roster row. Returns null when it merely repeats the
 * preferred name ("Zhang Wei" → preferred "Wei" must not render as "Wei Wei").
 */
function surnameOf(child: { legalName: string; preferredName: string }): string | null {
  const last = child.legalName.trim().split(/\s+/).slice(-1)[0] ?? '';
  return last && last.toLowerCase() !== child.preferredName.trim().toLowerCase() ? last : null;
}

export default async function TeacherTodayPage() {
  const { t, locale } = await getServerT();

  // The engine is i18n-free by design, so the page hands it the label fragments
  // it needs. This is the ONLY place UI language and engine logic meet.
  const labels: RosterLabels = {
    severity: {
      severe: t('teacher.today.severity.severe'),
      moderate: t('teacher.today.severity.moderate'),
      mild: t('teacher.today.severity.mild'),
    },
    pickup: (time, person) => t('teacher.today.pickupBy', { time, person }),
    droppedOff: (time) => t('teacher.today.droppedOff', { time }),
    absent: (reason) => t('teacher.today.absentReason', { reason }),
    noFlags: t('child.flags.none'),
  };

  // ── the source switch — the ONLY thing phase 2 added to this page ──────
  let input: RosterInput = {
    school: demoSchool,
    classGroup: demoClassGroup,
    date: DEMO_DATE,
    children: demoChildren,
    allergies: demoAllergies,
    dietary: demoDietary,
    medical: demoMedical,
    daily: demoDailyFacts,
  };
  let dateLabel = DEMO_DATE_LABEL;

  if (isCmsLive()) {
    const session = await getCmsSession();
    const data = session ? await loadTeacherRoster(session, schoolToday('UTC')) : null;
    if (!data) {
      // A teacher with no room assignment. Showing somebody else's register
      // would be worse than showing none.
      return (
        <>
          <PageHeader title={t('teacher.today.title')} />
          <Card className="text-center py-10">
            <h2 className="font-head text-[18px] m-0">{t('teacher.today.noRoom.title')}</h2>
            <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-0 leading-relaxed max-w-[54ch] mx-auto">
              {t('teacher.today.noRoom.body')}
            </p>
          </Card>
        </>
      );
    }
    // Re-read the day in the school's own zone now that we know it, then take
    // the register for THAT day.
    const onDate = schoolToday(data.school.timezone);
    const forDay =
      onDate === schoolToday('UTC')
        ? data
        : (session && (await loadTeacherRoster(session, onDate))) || data;

    input = {
      school: forDay.school,
      classGroup: forDay.classGroup,
      date: onDate,
      children: forDay.children,
      allergies: forDay.allergies,
      dietary: forDay.dietary,
      medical: forDay.medical,
      daily: forDay.daily,
    };
    dateLabel = formatDateLabel(onDate, locale, forDay.school.timezone);
  }

  const roster = buildDailyRoster(input, labels);

  return (
    <>
      <PageHeader
        eyebrow={t('teacher.today.attendance', {
          present: roster.presentCount,
          total: roster.totalCount,
        })}
        title={t('teacher.today.title')}
        subtitle={t('teacher.today.subtitle', {
          room: roster.classGroup.name,
          date: dateLabel,
        })}
        actions={
          <>
            <button type="button" className="cms-btn cms-btn-secondary cms-btn-md">
              {t('teacher.today.yesterday')}
            </button>
            <button type="button" className="cms-btn cms-btn-accent cms-btn-md">
              <CheckIcon />
              {t('teacher.today.takeRegister')}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatTile
          value={countFlags(roster, 'allergy')}
          label={t('teacher.today.stat.allergies')}
          tone="danger"
          icon={<AlertTriangleIcon />}
        />
        <StatTile
          value={countFlags(roster, 'dietary')}
          label={t('teacher.today.stat.dietary')}
          tone="amber"
          icon={<UtensilsIcon />}
        />
        <StatTile
          value={countFlags(roster, 'pickup')}
          label={t('teacher.today.stat.pickup')}
          tone="accent"
          icon={<HandoverIcon />}
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="font-head text-[18px] m-0">{t('teacher.today.roll')}</h2>
            <p className="text-[12.5px] text-harbor-muted m-0 mt-1">{t('teacher.today.legend')}</p>
          </div>
          <span className="cms-tag cms-tone-quiet">
            {t('teacher.today.attendance', {
              present: roster.presentCount,
              total: roster.totalCount,
            })}
          </span>
        </div>

        <ul className="list-none m-0 p-0 border-t border-harbor-border">
          {roster.entries.map((entry) => (
            <li
              key={entry.child.id}
              className="flex flex-wrap items-center gap-2.5 px-5 py-3 border-b border-harbor-border last:border-b-0"
            >
              <Avatar name={entry.child.preferredName} size="sm" quiet />
              <span
                dir="auto"
                className="min-w-[9rem] flex-1 text-[13.5px] font-semibold truncate"
              >
                {entry.child.preferredName}
                {surnameOf(entry.child) ? (
                  <span className="font-normal text-harbor-muted"> {surnameOf(entry.child)}</span>
                ) : null}
              </span>

              <span className="flex flex-wrap items-center justify-end gap-1.5">
                {entry.flags.map((flag, i) =>
                  flag.category === 'neutral' ? (
                    <StatusTag
                      key={`${entry.child.id}-${i}`}
                      tone={entry.attendance === 'absent' ? 'muted' : 'success'}
                    >
                      {flag.label}
                    </StatusTag>
                  ) : (
                    <Tag
                      key={`${entry.child.id}-${i}`}
                      category={flag.category}
                      detail={flag.detail}
                      withIcon={flag.category === 'allergy'}
                    >
                      {flag.label}
                    </Tag>
                  )
                )}
                {entry.attendance === 'expected' ? (
                  <StatusTag tone="accent">{t('child.status.expected')}</StatusTag>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-harbor-border bg-harbor-sunk rounded-b-[13px]">
          <p className="text-[12.5px] text-harbor-muted m-0 max-w-[62ch] leading-relaxed">
            {t('teacher.today.legend.body')}
          </p>
          <button type="button" className="cms-btn cms-btn-primary cms-btn-md shrink-0">
            {t('teacher.today.confirmAttendance')}
            <IconBox flip>
              <ArrowRightIcon />
            </IconBox>
          </button>
        </div>
      </Card>
    </>
  );
}
