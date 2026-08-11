// app/cms/parent/updates/page.tsx
// STUB — phase 6. Montages and reports, assembled by
// lib/cms/engine/report-builder and gated by lib/cms/engine/photo-filter.

import { PageHeader } from '@/components/cms/PageHeader';
import { StubPanel } from '@/components/cms/StubPanel';
import { getServerT } from '@/lib/cms/i18n/server';

export default async function ParentUpdatesPage() {
  const { t } = await getServerT();
  return (
    <>
      <PageHeader title={t('parent.updates.title')} subtitle={t('parent.updates.subtitle')} />
      <StubPanel phase={6} />
    </>
  );
}
