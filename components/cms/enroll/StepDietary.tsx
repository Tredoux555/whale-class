'use client';

// components/cms/enroll/StepDietary.tsx
// STUBBED STEP — same chrome as the working step, no fields yet. Lands in
// phase 2. It writes into `DietaryRequirement[]`
// from lib/cms/engine/types when built.

import { StepPlaceholder, StepScaffold } from './StepScaffold';

export function StepDietary() {
  return (
    <StepScaffold titleKey="enrol.step.dietary" descKey="enrol.step.dietary.desc">
      <StepPlaceholder phase={2} />
    </StepScaffold>
  );
}
