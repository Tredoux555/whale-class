"use client";

import CardGenerator from '@/components/card-generator/CardGenerator';

export default function AdminCardGeneratorPage() {
  return (
    <CardGenerator
      headerConfig={{
        title: '🍎 Montessori Three-Part Card Generator',
        subtitle: 'Create beautiful nomenclature cards for your classroom',
        gradientStart: '#2D5A27',
        gradientEnd: '#4a8c42',
        centered: true,
        showBackButton: false
      }}
    />
  );
}
