// app/cms/org/overview/page.tsx
// The organisational layer: every school in the group on one line. Rows are
// `SchoolSummary` values from lib/cms/engine/types.
//
// PHASE 2 gave it real counts — and only counts. The org layer reads children,
// rooms, allergy flags and open enrolments across the group; it can never read
// a medical record, a condition or a note, and that is enforced in the database
// as well as here (migration 329: cms_org_school_ids grants no read on
// cms_medical_records). A group office compares schools; it does not read a
// diagnosis. The rest of the org surface is still phase 7.

import { Card } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { StubPanel } from '@/components/cms/StubPanel';
import { demoOrganisation, demoSchoolSummaries } from '@/lib/cms/demo/seed';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadSchoolSummaries } from '@/lib/cms/db/queries';
import { getServerT } from '@/lib/cms/i18n/server';

export const dynamic = 'force-dynamic';

export default async function OrgOverviewPage() {
  const { t } = await getServerT();

  let orgName = demoOrganisation.name;
  let rows = demoSchoolSummaries;

  if (isCmsLive()) {
    const session = await getCmsSession();
    if (session) {
      rows = await loadSchoolSummaries(session);
      orgName = session.displayName || demoOrganisation.name;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={t('org.overview.title')}
        subtitle={t('org.overview.subtitle')}
      />

      <Card padded={false} className="overflow-hidden mb-4">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-harbor-sunk">
              {[
                'org.overview.col.school',
                'org.overview.col.children',
                'org.overview.col.classes',
                'org.overview.col.allergies',
                'org.overview.col.enrolments',
              ].map((key, i) => (
                <th
                  key={key}
                  className={`cms-label !text-[9.5px] px-5 py-3 border-b border-harbor-border ${
                    i === 0 ? 'text-start' : 'text-end'
                  }`}
                >
                  {t(key as Parameters<typeof t>[0])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.school.id} className="border-b border-harbor-border last:border-b-0">
                <td className="px-5 py-3.5 font-semibold">{row.school.name}</td>
                <td className="px-5 py-3.5 text-end tabular-nums">{row.childCount}</td>
                <td className="px-5 py-3.5 text-end tabular-nums">{row.classGroupCount}</td>
                <td className="px-5 py-3.5 text-end tabular-nums text-harbor-danger-deep">
                  {row.allergyFlagCount}
                </td>
                <td className="px-5 py-3.5 text-end tabular-nums">{row.openEnrollmentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-harbor-muted m-0">
            {t('org.overview.empty')}
          </p>
        ) : null}
      </Card>

      <StubPanel phase={7} />
    </>
  );
}
