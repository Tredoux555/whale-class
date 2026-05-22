// /montree/library/tools/sorting-mat-generator/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';
import SortingMatGenerator from '@/components/sorting-mat-generator/SortingMatGenerator';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function LibrarySortingMatGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <div className="bg-[#0d9488] px-4 py-2.5 flex items-center justify-between">
        <Link href="/montree/library" className="flex items-center gap-2 group">
          <MontreeLogo size={26} />
          <span className="text-white font-semibold text-sm group-hover:text-emerald-200 transition-colors">Library</span>
        </Link>
        <LanguageToggle />
      </div>
      <SortingMatGenerator
        headerConfig={{
        title: `🎯 ${t('library.sortingMatGeneratorTitle')}`,
        subtitle: t('library.sortingMatGeneratorSubtitle'),
        gradientStart: '#0d9488',
        gradientEnd: '#10b981',
        centered: false,
        showBackButton: true,
          backButtonLabel: `← ${t('library.toolsBack')}`,
          onBackClick: () => router.push('/montree/library/tools'),
        }}
      />
    </>
  );
}
