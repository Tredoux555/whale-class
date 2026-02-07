"use client";

import { useRouter } from 'next/navigation';
import CardGenerator from '@/components/card-generator/CardGenerator';

export default function MontreeCardGeneratorPage() {
  const router = useRouter();

  return (
    <CardGenerator
      headerConfig={{
        title: '🃏 3-Part Card Generator',
        subtitle: 'Create cards for your lessons',
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
