// app/cms/parent/messages/page.tsx
// STUB — phase 5. One thread per child. Delivery is decided by
// lib/cms/engine/routing.planDelivery (locale + channel), then sent by an API route.

import { PageHeader } from '@/components/cms/PageHeader';
import { StubPanel } from '@/components/cms/StubPanel';
import { getServerT } from '@/lib/cms/i18n/server';

export default async function ParentMessagesPage() {
  const { t } = await getServerT();
  return (
    <>
      <PageHeader title={t('parent.messages.title')} subtitle={t('parent.messages.subtitle')} />
      <StubPanel phase={5} />
    </>
  );
}
