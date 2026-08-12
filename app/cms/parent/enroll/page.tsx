// app/cms/parent/enroll/page.tsx
// WORKING PAGE 3 of 3 — the intake wizard shell.
//
// Step 1 (Child) is fully working and, since phase 2, actually WRITES: a child
// row, the guardian link that makes it this family's, and a draft enrolment.
// The other five wear identical chrome, say so, and park what they capture in
// the draft so the family can leave and come back.
//
// The step LIST is `ENROLLMENT_STEPS` from lib/cms/engine/types — the wizard has
// no private idea of what an enrolment consists of.
//
// This page's whole job is to hand the client component its starting state:
// the school's real rooms and the family's open draft in live mode, seeded
// rooms and a blank form in demo mode.

import { PageHeader } from '@/components/cms/PageHeader';
import { EnrollWizard } from '@/components/cms/enroll/EnrollWizard';
import {
  DEMO_ROOMS,
  EMPTY_CHILD_STEP,
  type ChildStepValue,
  type RoomOption,
} from '@/components/cms/enroll/StepChildInfo';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadClassGroups, loadOpenDraft } from '@/lib/cms/db/queries';
import { ENROLLMENT_STEPS, type EnrollmentStep } from '@/lib/cms/engine/types';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ParentEnrollPage() {
  const { t } = await getServerT();
  const live = isCmsLive();

  let rooms: RoomOption[] = DEMO_ROOMS;
  let initialValue: ChildStepValue = EMPTY_CHILD_STEP;
  let completedSteps: EnrollmentStep[] = [];
  let resumed = false;

  if (live) {
    const session = await getCmsSession();
    // The middleware gate guarantees a session here; the null check is for the
    // direct-render case (a build-time prerender, a test) and degrades to the
    // demo shape rather than throwing.
    if (session?.schoolId) {
      const [classGroups, draft] = await Promise.all([
        loadClassGroups(session.schoolId),
        loadOpenDraft(session),
      ]);
      rooms = classGroups.map((group) => ({ id: group.id, name: group.name }));
      if (draft) {
        resumed = true;
        initialValue = {
          legalName: draft.child.legalName,
          preferredName: draft.child.preferredName,
          dateOfBirth: draft.child.dateOfBirth,
          homeLanguage: draft.child.homeLanguage,
          requestedStartDate: draft.requestedStartDate ?? '',
          classGroupId: draft.requestedClassGroupId ?? '',
          settlingNotes: draft.settlingNotes ?? '',
        };
        completedSteps = draft.completedSteps.filter((s): s is EnrollmentStep =>
          (ENROLLMENT_STEPS as readonly string[]).includes(s)
        );
      }
    }
  }

  return (
    <>
      <PageHeader title={t('enrol.title')} subtitle={t('enrol.subtitle')} />
      <EnrollWizard
        live={live}
        rooms={rooms}
        initialValue={initialValue}
        initialCompletedSteps={completedSteps}
        resumed={resumed}
      />
    </>
  );
}
