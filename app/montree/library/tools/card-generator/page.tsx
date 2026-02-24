// /montree/library/tools/card-generator/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import CardGenerator from '@/components/card-generator/CardGenerator';

export default function LibraryCardGeneratorPage() {
  const router = useRouter();

  return (
    <CardGenerator
      headerConfig={{
        title: '🃏 3-Part Card Generator',
        subtitle: 'Create beautiful Montessori nomenclature cards',
        gradientStart: '#0D3330',
        gradientEnd: '#10b981',
        centered: false,
        showBackButton: true,
        backButtonLabel: '← Tools',
        onBackClick: () => router.push('/montree/library/tools'),
      }}
    />
  );
}
