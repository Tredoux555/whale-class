// /montree/library/tools/card-generator/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';
import CardGenerator from '@/components/card-generator/CardGenerator';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function LibraryCardGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <div className="bg-[#0D3330] px-4 py-2.5 flex items-center justify-between">
        <Link href="/montree/library" className="flex items-center gap-2 group">
          <MontreeLogo size={26} />
          <span className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">Library</span>
        </Link>
        <LanguageToggle />
      </div>
      <CardGenerator
        headerConfig={{
          title: `🃏 ${t('library.cardGeneratorTitle')}`,
          subtitle: t('library.cardGeneratorSubtitle'),
          gradientStart: '#0D3330',
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
