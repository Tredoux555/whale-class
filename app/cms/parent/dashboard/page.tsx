// app/cms/parent/dashboard/page.tsx
// WORKING PAGE 1 of 3.
//
// The family's view of what the school holds. Every value on this screen is a
// `lib/cms/engine/types` record — the same records the teacher end reads — so the
// two ends can never drift into two different truths about one child.

import Link from 'next/link';
import { Avatar } from '@/components/cms/Avatar';
import { Card, SunkPanel } from '@/components/cms/Card';
import { Chip } from '@/components/cms/Chip';
import { PageHeader } from '@/components/cms/PageHeader';
import { StatTile } from '@/components/cms/StatTile';
import {
  AlertTriangleIcon,
  MessageIcon,
  PlusIcon,
  UsersIcon,
} from '@/components/cms/icons';
import type { Child, Relationship } from '@/lib/cms/engine/types';
import {
  ageInYears,
  demoAllergies,
  demoClassGroup,
  demoDietary,
  demoMedical,
  demoParentChildren,
  demoParentName,
} from '@/lib/cms/demo/seed';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';

const RELATIONSHIP_KEY: Record<Relationship, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

function ChildCard({ child, t }: { child: Child; t: TFunction }) {
  const allergies = demoAllergies.filter((a) => a.childId === child.id);
  const dietary = demoDietary.filter((d) => d.childId === child.id);
  const medical = demoMedical.find((m) => m.childId === child.id);
  const primaryGuardian = child.guardians[0];
  const collectors = child.guardians.filter((g) => g.canCollect);

  return (
    <Card as="li" className="flex flex-col">
      <div className="flex items-center gap-3.5">
        <Avatar name={child.preferredName} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 dir="auto" className="font-head text-[17.5px] leading-tight m-0">
            {child.legalName}
          </h2>
          <p className="text-[12.5px] text-harbor-muted m-0 mt-1 leading-snug">
            {demoClassGroup.name} · {t('child.age', { years: ageInYears(child.dateOfBirth) })} ·{' '}
            {t('child.guardian')}: {primaryGuardian.fullName}
          </p>
        </div>
        <span className="cms-tag cms-tone-success shrink-0">{t('child.status.present')}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {allergies.map((a) => (
          <Chip
            key={a.id}
            category="allergy"
            detail={t(`teacher.today.severity.${a.severity}` as TranslationKey)}
          >
            {a.allergen}
          </Chip>
        ))}
        {medical?.medications
          .filter((m) => m.heldOnSite)
          .map((m) => (
            <Chip key={m.name} category="medical">
              {m.name}
            </Chip>
          ))}
        {dietary.map((d) => (
          <Chip key={d.id} category="dietary">
            {d.label}
          </Chip>
        ))}
      </div>

      {medical?.emergencyNote ? (
        <SunkPanel className="mt-4">
          <span className="cms-label mb-1.5">{t('child.medicalNote')}</span>
          <p dir="auto" className="text-[13px] leading-relaxed m-0">
            {medical.emergencyNote}
          </p>
        </SunkPanel>
      ) : null}

      <div className="mt-4">
        <span className="cms-label mb-2">{t('child.pickup.authorised')}</span>
        <div className="flex flex-wrap gap-1.5">
          {collectors.map((g) => (
            <span
              key={g.id}
              className="cms-card-sunk inline-flex items-center gap-2 ps-1 pe-2.5 py-1 !rounded-full text-[12px]"
            >
              <Avatar name={g.fullName} size="sm" />
              <span dir="auto">
                {g.fullName}{' '}
                <span className="text-harbor-muted">· {t(RELATIONSHIP_KEY[g.relationship])}</span>
              </span>
            </span>
          ))}
          <button type="button" className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-chip !rounded-full">
            <PlusIcon />
            {t('child.pickup.add')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mt-auto pt-5">
        <Link href="/cms/parent/messages" className="cms-btn cms-btn-primary cms-btn-md">
          <MessageIcon />
          {t('parent.dashboard.messageSchool')}
        </Link>
        <Link href="/cms/parent/updates" className="cms-btn cms-btn-secondary cms-btn-md">
          {t('parent.dashboard.viewRecords')}
        </Link>
      </div>
    </Card>
  );
}

export default async function ParentDashboardPage() {
  const { t } = await getServerT();

  const allergyCount = demoParentChildren.reduce(
    (sum, c) => sum + demoAllergies.filter((a) => a.childId === c.id).length,
    0
  );

  return (
    <>
      <PageHeader
        eyebrow={t('parent.dashboard.greeting', { name: demoParentName })}
        title={t('parent.dashboard.title')}
        subtitle={t('parent.dashboard.subtitle')}
        actions={
          <Link href="/cms/parent/enroll" className="cms-btn cms-btn-primary cms-btn-md">
            <PlusIcon />
            {t('parent.dashboard.enrolCta')}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatTile
          value={demoParentChildren.length}
          label={t('parent.dashboard.stat.children')}
          tone="accent"
          icon={<UsersIcon />}
        />
        <StatTile
          value={2}
          label={t('parent.dashboard.stat.actions')}
          tone="amber"
          icon={<AlertTriangleIcon />}
        />
        <StatTile
          value={allergyCount}
          label={t('teacher.today.stat.allergies')}
          tone="danger"
          icon={<AlertTriangleIcon />}
        />
      </div>

      <Card className="mb-5 border-s-[3px] border-s-harbor-amber flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-head text-[16px] m-0">{t('parent.dashboard.needsAttention')}</h2>
          <p className="text-[13px] text-harbor-muted m-0 mt-1.5 leading-relaxed">
            {t('parent.dashboard.needsAttentionBody')}
          </p>
        </div>
        <Link href="/cms/parent/enroll" className="cms-btn cms-btn-accent cms-btn-sm shrink-0">
          {t('parent.dashboard.resolve')}
        </Link>
      </Card>

      <ul className="grid gap-4 lg:grid-cols-2 list-none p-0 m-0">
        {demoParentChildren.map((child) => (
          <ChildCard key={child.id} child={child} t={t} />
        ))}
      </ul>
    </>
  );
}
