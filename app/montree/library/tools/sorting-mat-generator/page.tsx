// /montree/library/tools/sorting-mat-generator/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';
import SortingMatGenerator from '@/components/sorting-mat-generator/SortingMatGenerator';

export default function LibrarySortingMatGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SortingMatGenerator
      headerConfig={{
        title: `🎯 ${t('library.sortingMatGeneratorTitle')}`,
        subtitle: t('library.sortingMatGeneratorSubtitle'),
        gradientStart: '#0d9488',
        gradientEnd: '#10b981',
        centered: false,
        showBackButton: true,
        backButtonLabel: `← ${t('library.toolsBack')}`,
        onBackClick: () => router.push('/montree/library/tools'),
      }}
    />
  );
}
