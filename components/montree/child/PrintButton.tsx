'use client';

// components/montree/child/PrintButton.tsx
// Print button that opens the printable weekly plan in a new tab.
// Only renders when print_weekly_plan feature is enabled for the school.

import { useState, useEffect } from 'react';

interface PrintButtonProps {
  childId: string;
  schoolId?: string;
}

export default function PrintButton({ childId, schoolId }: PrintButtonProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/montree/features?school_id=${schoolId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const features = data?.features || [];
        const printFeature = features.find((f: { feature_key: string; enabled: boolean }) =>
          f.feature_key === 'print_weekly_plan'
        );
        if (printFeature?.enabled) {
          setEnabled(true);
        }
      })
      .catch(() => {});
  }, [schoolId]);

  if (!enabled) return null;

  const handlePrint = () => {
    window.open(`/montree/dashboard/${childId}/print`, '_blank');
  };

  return (
    <button
      onClick={handlePrint}
      className="px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition-colors flex-shrink-0"
      title="Print Weekly Plan"
    >
      🖨️
    </button>
  );
}
