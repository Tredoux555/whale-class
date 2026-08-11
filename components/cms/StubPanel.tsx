// components/cms/StubPanel.tsx
// The SAME clothes on every unbuilt screen. A stub that looks bespoke is a lie
// about how finished the product is; a stub that looks identical everywhere
// reads honestly as "scaffolded, on purpose, in this order".
//
// Deliberately not grey-boxed: it is a real Harbor card, because the founder
// will show these screens before they work.

import { getServerT } from '@/lib/cms/i18n/server';
import { DocumentIcon } from './icons';

export async function StubPanel({ phase }: { phase: number }) {
  const { t } = await getServerT();

  return (
    <div className="cms-card p-8 flex flex-col items-center text-center">
      <span className="cms-card-sunk grid place-items-center w-12 h-12 text-harbor-accent-deep mb-4">
        <span className="block w-6 h-6">
          <DocumentIcon />
        </span>
      </span>
      <h2 className="font-head text-[20px] m-0">{t('stub.title')}</h2>
      <p className="text-[14px] text-harbor-muted leading-relaxed mt-2.5 mb-4 max-w-[56ch]">
        {t('stub.body')}
      </p>
      <span className="cms-tag cms-tone-accent">{t('stub.phase', { phase })}</span>
    </div>
  );
}
