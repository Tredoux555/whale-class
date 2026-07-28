// app/montree/dashboard/montage/page.tsx
// Montage Studio — Daily / Weekly / Custom films across three scopes.
// Shell follows the albums page convention (dark-forest bg + radial wash,
// sticky-ish header with a back arrow, Toaster mounted locally).
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import MontageStudio from '@/components/montree/montage/MontageStudio';

export default function MontagePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.school?.id) {
      router.push('/montree/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a0f] pb-20 relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
      />
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/50 text-xl" aria-label="Back">←</button>
        <div>
          <h1 className="text-lg font-bold text-white/95">🎬 {t('montage.title')}</h1>
          <p className="text-xs text-white/40">{t('montage.subtitle')}</p>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <MontageStudio />
      </div>
    </div>
  );
}
