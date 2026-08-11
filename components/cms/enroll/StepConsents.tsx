'use client';

// components/cms/enroll/StepConsents.tsx
// STUBBED STEP — same chrome as the working step, no fields yet. Lands in
// phase 2. It writes into `Enrollment.consents`
// from lib/cms/engine/types when built.

import { StepPlaceholder, StepScaffold } from './StepScaffold';

export function StepConsents() {
  return (
    <StepScaffold titleKey="enrol.step.consents" descKey="enrol.step.consents.desc">
      <StepPlaceholder phase={2} />
    </StepScaffold>
  );
}
