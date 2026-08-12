// app/cms/parent/updates/page.tsx
// ============================================================================
// PHASE 7 — the same door, seen from the "what has my child been doing?" side.
// ============================================================================
// The phase-1 note here promised montages and reports assembled by
// lib/cms/engine/report-builder + photo-filter. Montree publishes both already —
// weekly reports written by the child's own teacher, and photo montages gated by
// the family's own consent — to the parent account this page hands out the key
// for. A CMS copy would be a second, thinner feed of the same week.
//
// Same component as /cms/parent/messages, different heading: it is one doorway,
// and a family should not have to learn that CMS has two of them.

import { PageHeader } from '@/components/cms/PageHeader';
import { MontreeDoorway } from '@/components/cms/parent/MontreeDoorway';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadParentDoorways, type ParentDoorway } from '@/lib/cms/db/queries';
import { demoParentDoorways } from '@/lib/cms/demo/seed';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ParentUpdatesPage() {
  const { t } = await getServerT();
  const live = isCmsLive();

  let doorways: ParentDoorway[] = demoParentDoorways;
  if (live) {
    const session = await getCmsSession();
    doorways = session ? await loadParentDoorways(session) : [];
  }

  return (
    <>
      <PageHeader title={t('parent.updates.title')} subtitle={t('parent.updates.subtitle')} />
      <MontreeDoorway doorways={doorways} variant="updates" demo={!live} />
    </>
  );
}
