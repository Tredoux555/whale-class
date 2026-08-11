'use client';

// components/cms/enroll/StepContacts.tsx
// STUBBED STEP — same chrome as the working step, no fields yet. Lands in
// phase 2. It writes into `Guardian[] + Child.authorisedCollectors`
// from lib/cms/engine/types when built.

import { StepPlaceholder, StepScaffold } from './StepScaffold';

export function StepContacts() {
  return (
    <StepScaffold titleKey="enrol.step.contacts" descKey="enrol.step.contacts.desc">
      <StepPlaceholder phase={2} />
    </StepScaffold>
  );
}
