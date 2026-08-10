'use client';

// components/montree/child/PrintButton.tsx
// Print button that opens the printable weekly plan in a new tab.
// Available for all teachers.

import { useI18n } from '@/lib/montree/i18n';

interface PrintButtonProps {
  childId: string;
  schoolId?: string;
}

export default function PrintButton({ childId }: PrintButtonProps) {
  const { t } = useI18n();
  const handlePrint = () => {
    window.open(`/montree/dashboard/${childId}/print`, '_blank');
  };

  return (
    <button
      onClick={handlePrint}
      className="btn btn-ghost btn-sm on-light flex-shrink-0"
      title={t('weekview.printWeeklyPlan')}
    >
      🖨️
    </button>
  );
}
