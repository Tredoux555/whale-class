// app/montree/library/tools/reading-log/page.tsx
// The Reading Log tool's own screen. Same shape as Classroom Helpers: the
// PAGE owns the one header bar (back arrow, title, the Montree mark as the
// way back up to the library) and the tool component owns everything below
// it, so a teacher never sees two stacked ← buttons.
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import ReadingLogTool from '@/components/montree/tools/ReadingLogTool';

export default function ReadingLogPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <div className="print:hidden relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/montree/library/tools')}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('common.back')}
          >
            ←
          </button>
          <span className="text-xl">📖</span>
          <h1 className="font-bold text-white/95">{t('readingLog.title')}</h1>
          <Link
            href="/montree/library"
            className="ml-auto flex items-center gap-2 no-underline shrink-0"
          >
            <MontreeLogo size={26} />
            <span className="text-sm font-semibold text-white/80">Library</span>
          </Link>
        </div>
      </div>

      <ReadingLogTool />
    </>
  );
}
