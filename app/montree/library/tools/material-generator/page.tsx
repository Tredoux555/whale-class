// /montree/library/tools/material-generator/page.tsx
'use client';

import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';
import MaterialGenerator from '@/components/materials/MaterialGenerator';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function LibraryMaterialGeneratorPage() {
  return (
    <ErrorBoundary>
      <div className="bg-[#0D3330] px-4 py-2.5 flex items-center justify-between">
        <Link href="/montree/library" className="flex items-center gap-2 group">
          <MontreeLogo size={26} />
          <span className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">Library</span>
        </Link>
        <LanguageToggle />
      </div>
      <MaterialGenerator />
    </ErrorBoundary>
  );
}
