// /montree/library/english-corner/page.tsx
// Redirect to the full HTML page directly (iframe blocked by security headers)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';

export default function EnglishCornerPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    window.location.href = '/tools/english-corner-master-plan.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white">
      <p className="text-gray-500">{t('library.englishCornerRedirecting')}</p>
    </div>
  );
}
