// app/cms/parent/messages/page.tsx
// ============================================================================
// PHASE 7 — this stopped being a stub, and it did NOT become a messenger.
// ============================================================================
// The phase-1 note here said "one thread per child, delivery decided by
// planDelivery, sent by an API route". Building that would have meant a second
// parent inbox in a repo that already has a complete one: Montree's threads are
// encrypted (migration 226), carry appointments and video-call invites, push to
// the family's phone, and sit beside the reports and photos the same family
// already reads. CMS's job is to get the family THROUGH that door, not to
// rebuild it on this side of it.
//
// So this page is a doorway, and every word on it is true in all three states —
// see components/cms/parent/MontreeDoorway.tsx.

import { PageHeader } from '@/components/cms/PageHeader';
import { MontreeDoorway } from '@/components/cms/parent/MontreeDoorway';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadParentDoorways, type ParentDoorway } from '@/lib/cms/db/queries';
import { demoParentDoorways } from '@/lib/cms/demo/seed';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ParentMessagesPage() {
  const { t } = await getServerT();
  const live = isCmsLive();

  let doorways: ParentDoorway[] = demoParentDoorways;
  if (live) {
    const session = await getCmsSession();
    doorways = session ? await loadParentDoorways(session) : [];
  }

  return (
    <>
      <PageHeader title={t('parent.messages.title')} subtitle={t('parent.messages.subtitle')} />
      <MontreeDoorway doorways={doorways} variant="messages" demo={!live} />
    </>
  );
}
