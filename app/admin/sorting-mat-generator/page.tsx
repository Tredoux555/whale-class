"use client";

import SortingMatGenerator from '@/components/sorting-mat-generator/SortingMatGenerator';

export default function AdminSortingMatGeneratorPage() {
  return (
    <SortingMatGenerator
      headerConfig={{
        title: '🎯 Sorting Mat Generator',
        subtitle: 'Create A4 sorting mats with 2, 3, or 4 designated circles',
        gradientStart: '#0d9488',
        gradientEnd: '#10b981',
        centered: true,
        showBackButton: false,
      }}
    />
  );
}
