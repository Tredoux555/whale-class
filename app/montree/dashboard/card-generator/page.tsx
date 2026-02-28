"use client";

import { useRouter } from 'next/navigation';
import CardGenerator from '@/components/card-generator/CardGenerator';
import { useI18n } from '@/lib/montree/i18n';

export default function MontreeCardGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <CardGenerator
      headerConfig={{
        title: `🃏 ${t('cardGenerator.title')}`,
        subtitle: t('cardGenerator.subtitle'),
        gradientStart: '#10b981',
        gradientEnd: '#0d9488',
        centered: false,
        showBackButton: true,
        backButtonLabel: '←',
        onBackClick: () => router.push('/montree/dashboard/curriculum')
      }}
    />
  );
}
