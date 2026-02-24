// /montree/library/tools/material-generator/page.tsx
'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import MaterialGenerator from '@/components/materials/MaterialGenerator';

export default function LibraryMaterialGeneratorPage() {
  return (
    <ErrorBoundary>
      <MaterialGenerator />
    </ErrorBoundary>
  );
}
