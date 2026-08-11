'use client';

// components/cms/enroll/StepPreviousSchool.tsx
// STUBBED STEP — same chrome as the working step, no fields yet. Lands in
// phase 2. It writes into `Enrollment.previousSchool`
// from lib/cms/engine/types when built.

import { StepPlaceholder, StepScaffold } from './StepScaffold';

export function StepPreviousSchool() {
  return (
    <StepScaffold titleKey="enrol.step.school" descKey="enrol.step.school.desc">
      <StepPlaceholder phase={2} />
    </StepScaffold>
  );
}
