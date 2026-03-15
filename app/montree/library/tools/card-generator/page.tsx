// /montree/library/tools/card-generator/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';
import CardGenerator from '@/components/card-generator/CardGenerator';

export default function LibraryCardGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <CardGenerator
      headerConfig={{
        title: `🃏 ${t('library.cardGeneratorTitle')}`,
        subtitle: t('library.cardGeneratorSubtitle'),
        gradientStart: '#0D3330',
        gradientEnd: '#10b981',
        centered: false,
        showBackButton: true,
        backButtonLabel: `← ${t('library.toolsBack')}`,
        onBackClick: () => router.push('/montree/library/tools'),
      }}
    />
  );
}
