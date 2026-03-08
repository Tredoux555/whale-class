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
      className="px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition-colors flex-shrink-0"
      title={t('weekview.printWeeklyPlan')}
    >
      🖨️
    </button>
  );
}
