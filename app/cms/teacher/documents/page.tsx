// app/cms/teacher/documents/page.tsx
// STUB — phase 3. The grid is real (the six document kinds are
// `DocumentKind` from lib/cms/engine/doc-generator, not a hand-written list); the
// generators behind the buttons are not implemented yet.

import { Card } from '@/components/cms/Card';
import { PageHeader } from '@/components/cms/PageHeader';
import { DocumentIcon } from '@/components/cms/icons';
import type { DocumentKind } from '@/lib/cms/engine/doc-generator';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TranslationKey } from '@/lib/cms/i18n/t';

const DOCS: { kind: DocumentKind; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { kind: 'class_list', titleKey: 'doc.classList', descKey: 'doc.classList.desc' },
  { kind: 'pickup_sheet', titleKey: 'doc.pickupSheet', descKey: 'doc.pickupSheet.desc' },
  { kind: 'name_labels', titleKey: 'doc.labels', descKey: 'doc.labels.desc' },
  { kind: 'dietary_sheet', titleKey: 'doc.dietarySheet', descKey: 'doc.dietarySheet.desc' },
  { kind: 'allergy_poster', titleKey: 'doc.allergyPoster', descKey: 'doc.allergyPoster.desc' },
  { kind: 'medical_summary', titleKey: 'doc.medicalSummary', descKey: 'doc.medicalSummary.desc' },
];

export default async function TeacherDocumentsPage() {
  const { t } = await getServerT();

  return (
    <>
      <PageHeader
        title={t('teacher.documents.title')}
        subtitle={t('teacher.documents.subtitle')}
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
        {DOCS.map((doc) => (
          <Card key={doc.kind} as="li" className="flex flex-col">
            <span className="cms-card-sunk grid place-items-center w-10 h-10 text-harbor-accent-deep mb-3.5">
              <span className="block w-5 h-5">
                <DocumentIcon />
              </span>
            </span>
            <h2 className="font-head text-[17px] m-0">{t(doc.titleKey)}</h2>
            <p className="text-[13px] text-harbor-muted mt-1.5 mb-4 leading-relaxed">
              {t(doc.descKey)}
            </p>
            <div className="mt-auto flex items-center gap-2.5">
              <button type="button" className="cms-btn cms-btn-primary cms-btn-soft cms-btn-sm" disabled>
                {t('teacher.documents.generate')}
              </button>
              <span className="cms-tag cms-tone-quiet">{t('common.notBuiltYet')}</span>
            </div>
          </Card>
        ))}
      </ul>
    </>
  );
}
