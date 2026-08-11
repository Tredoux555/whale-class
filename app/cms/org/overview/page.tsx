// app/cms/org/overview/page.tsx
// STUB — phase 7. The organisational layer: every school in the group on one
// line. Rows are `SchoolSummary` values from lib/cms/engine/types; the aggregation
// query that produces them for real is not written yet.

import { Card } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { StubPanel } from '@/components/cms/StubPanel';
import { demoOrganisation, demoSchoolSummaries } from '@/lib/cms/demo/seed';
import { getServerT } from '@/lib/cms/i18n/server';

export default async function OrgOverviewPage() {
  const { t } = await getServerT();

  return (
    <>
      <PageHeader
        eyebrow={demoOrganisation.name}
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
            {demoSchoolSummaries.map((row) => (
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
      </Card>

      <StubPanel phase={7} />
    </>
  );
}
