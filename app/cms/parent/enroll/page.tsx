// app/cms/parent/enroll/page.tsx
// WORKING PAGE 3 of 3 — the intake wizard shell.
//
// Step 1 (Child) is fully working; the other five wear identical chrome and say
// so. The step LIST is `ENROLLMENT_STEPS` from lib/cms/engine/types — the wizard has
// no private idea of what an enrolment consists of.

import { PageHeader } from '@/components/cms/PageHeader';
import { EnrollWizard } from '@/components/cms/enroll/EnrollWizard';
import { getServerT } from '@/lib/cms/i18n/server';

export default async function ParentEnrollPage() {
  const { t } = await getServerT();
  return (
    <>
      <PageHeader title={t('enrol.title')} subtitle={t('enrol.subtitle')} />
      <EnrollWizard />
    </>
  );
}
