// app/cms/page.tsx
// The landing page IS the architecture diagram: three doors, top to bottom,
// with the engine named in the middle. Anyone who lands here should be able to
// describe the product afterwards.

import Link from 'next/link';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { LanguageSwitcher } from '@/components/cms/LanguageSwitcher';
import { ArrowRightIcon } from '@/components/cms/icons';

const LAYERS: {
  href: string;
  labelKey: TranslationKey;
  roleKey: TranslationKey;
  tone: string;
}[] = [
  { href: '/cms/parent/dashboard', labelKey: 'layer.parent', roleKey: 'layer.parent.role', tone: 'cms-tone-accent' },
  { href: '/cms/teacher/today', labelKey: 'layer.teacher', roleKey: 'layer.teacher.role', tone: 'cms-tone-success' },
  { href: '/cms/org/overview', labelKey: 'layer.org', roleKey: 'layer.org.role', tone: 'cms-tone-amber' },
];

export default async function HomePage() {
  const { t } = await getServerT();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-harbor-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1180px] px-6 h-[68px] flex items-center gap-3">
          <span className="cms-avatar w-9 h-9 rounded-[10px] text-[15px]">C</span>
          <span className="leading-tight">
            <span className="block font-head text-[17px]">{t('app.name')}</span>
            <span className="block text-[11px] text-harbor-muted">{t('app.fullName')}</span>
          </span>
          <span className="ms-auto">
            <LanguageSwitcher />
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1180px] px-6 py-12">
        <div className="max-w-[64ch]">
          <span className="cms-label mb-3">{t('app.strapline')}</span>
          <h1 className="font-head text-[38px] leading-[1.1] m-0">{t('home.title')}</h1>
          <p className="text-[15px] leading-[1.7] text-harbor-muted mt-3.5 mb-0">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 mt-9 md:grid-cols-3">
          {LAYERS.map((layer) => (
            <Link
              key={layer.href}
              href={layer.href}
              className="cms-card p-6 no-underline flex flex-col gap-3 transition-transform hover:-translate-y-[2px]"
            >
              <span className={`cms-layer-badge ${layer.tone} self-start`}>
                <i />
                {t(layer.labelKey)}
              </span>
              <span className="font-head text-[19px] text-harbor-text">{t(layer.roleKey)}</span>
              <span className="mt-auto pt-2 text-harbor-accent-deep text-[13px] font-semibold inline-flex items-center gap-1.5">
                {t('home.enter')}
                <span className="w-4 h-4 block cms-flip">
                  <ArrowRightIcon />
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="cms-card p-6 mt-4 border-s-[3px] border-s-harbor-accent">
          <h2 className="font-head text-[18px] m-0">{t('home.engine.title')}</h2>
          <p className="text-[14px] leading-[1.7] text-harbor-muted mt-2 mb-0 max-w-[76ch]">
            {t('home.engine.body')}
          </p>
        </div>
      </main>
    </div>
  );
}
