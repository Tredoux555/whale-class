'use client';

// app/admin/material-generator/page.tsx
// Material Generator Page

import ErrorBoundary from '@/components/ErrorBoundary';
import MaterialGenerator from '@/components/materials/MaterialGenerator';

export default function MaterialGeneratorPage() {
  return (
    <ErrorBoundary>
      <div >
        <MaterialGenerator />
      </div>
    </ErrorBoundary>
  );
}

