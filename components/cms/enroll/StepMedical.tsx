'use client';

// components/cms/enroll/StepMedical.tsx
// STUBBED STEP — same chrome as the working step, no fields yet. Lands in
// phase 2. It writes into `MedicalRecord + Allergy[]`
// from lib/cms/engine/types when built.

import { StepPlaceholder, StepScaffold } from './StepScaffold';

export function StepMedical() {
  return (
    <StepScaffold titleKey="enrol.step.medical" descKey="enrol.step.medical.desc">
      <StepPlaceholder phase={2} />
    </StepScaffold>
  );
}
