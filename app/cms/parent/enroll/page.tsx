// app/cms/parent/enroll/page.tsx
// WORKING PAGE 3 of 3 — the intake wizard shell.
//
// PHASE 3: all seven steps are real, and the wizard ends on a review-and-submit
// screen. Step 1 writes the child, the guardian link and the draft; steps 2–7
// write their own tables (profile, medical + allergies, dietary, previous
// schools, contacts + pickup, consents); Submit moves the draft to `submitted`,
// which is the state migration 329's RLS treats as evidence.
//
// The step LIST is `ENROLLMENT_STEPS` from lib/cms/engine/types — the wizard has
// no private idea of what an enrolment consists of.
//
// This page's whole job is to hand the client component its starting state:
// the school's real rooms and the family's open draft in live mode, seeded
// rooms and a blank form in demo mode.
//
// RESUMING IS TWO SOURCES, DELIBERATELY. Step 1 rehydrates from the TYPED
// columns (cms_children / cms_enrollments) because those are the record; steps
// 2–7 rehydrate from `draft_data`, which holds the FORM — including the rows a
// family half-filled and left. Clean typed rows cannot reconstruct a half-typed
// allergy, and losing it is exactly the thing that makes a parent give up.

import { PageHeader } from '@/components/cms/PageHeader';
import { EnrollWizard } from '@/components/cms/enroll/EnrollWizard';
import { DEMO_ROOMS, type RoomOption } from '@/components/cms/enroll/StepChildInfo';
import { EMPTY_WIZARD, hydrateWizardValues, type WizardValues } from '@/components/cms/enroll/values';
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
  let initialValues: WizardValues = EMPTY_WIZARD;
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
        initialValues = hydrateWizardValues(
          {
            ...EMPTY_WIZARD,
            child: {
              legalName: draft.child.legalName,
              preferredName: draft.child.preferredName,
              dateOfBirth: draft.child.dateOfBirth,
              homeLanguage: draft.child.homeLanguage,
              requestedStartDate: draft.requestedStartDate ?? '',
              classGroupId: draft.requestedClassGroupId ?? '',
              settlingNotes: draft.settlingNotes ?? '',
            },
          },
          draft.draftData
        );
        completedSteps = draft.completedSteps.filter((s): s is EnrollmentStep =>
          (ENROLLMENT_STEPS as readonly string[]).includes(s)
        );
      }
    }
  }

  return (
    <>
      <PageHeader title={t('enrol.title')} subtitle={t('enrol.subtitle.v3')} />
      <EnrollWizard
        live={live}
        rooms={rooms}
        initialValues={initialValues}
        initialCompletedSteps={completedSteps}
        resumed={resumed}
      />
    </>
  );
}
