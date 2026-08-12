// app/cms/login/page.tsx
// THE FRONT DOOR'S LOCK. Public by definition — middleware.ts keeps /cms and
// /cms/login open and gates everything else.
//
// Renders bare (no AppShell): app/cms/layout.tsx derives the layer from the
// path, and /cms/login belongs to no layer — a person standing here has not yet
// chosen an end of the hourglass to stand in.
//
// In DEMO MODE the form is replaced by three doors, honestly labelled. Phase 1's
// whole value was that the surface demos with no database; phase 2 must not
// take that away by putting a login wall in front of it.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/cms/auth/AuthForm';
import { LanguageSwitcher } from '@/components/cms/LanguageSwitcher';
import { ArrowRightIcon } from '@/components/cms/icons';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { homePathForRole } from '@/lib/cms/auth/session';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TranslationKey } from '@/lib/cms/i18n/t';

export const dynamic = 'force-dynamic';

const DEMO_DOORS: { href: string; labelKey: TranslationKey; tone: string }[] = [
  { href: '/cms/parent/dashboard', labelKey: 'auth.demo.parent', tone: 'cms-tone-accent' },
  { href: '/cms/teacher/today', labelKey: 'auth.demo.teacher', tone: 'cms-tone-success' },
  { href: '/cms/org/overview', labelKey: 'auth.demo.org', tone: 'cms-tone-amber' },
];

export default async function CmsLoginPage() {
  const { t } = await getServerT();
  const live = isCmsLive();

  // Already signed in? The lock is not the destination.
  if (live) {
    const session = await getCmsSession();
    if (session) redirect(homePathForRole(session.role));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-harbor-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1180px] px-6 h-[68px] flex items-center gap-3">
          <Link href="/cms" className="flex items-center gap-3 no-underline">
            <span className="cms-avatar w-9 h-9 rounded-[10px] text-[15px]">C</span>
            <span className="leading-tight">
              <span className="block font-head text-[17px] text-harbor-text">{t('app.name')}</span>
              <span className="block text-[11px] text-harbor-muted">{t('app.fullName')}</span>
            </span>
          </Link>
          <span className="ms-auto">
            <LanguageSwitcher />
          </span>
        </div>
      </header>

      <main className="flex-1 w-full flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[520px]">
        {live ? (
          <AuthForm />
        ) : (
          <div className="cms-card p-6 sm:p-7">
            <span className="cms-layer-badge cms-tone-amber self-start">
              <i />
              {t('auth.demo.title')}
            </span>
            <h1 className="font-head text-[26px] leading-tight mt-4 mb-0">{t('auth.title')}</h1>
            <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-6 leading-relaxed">
              {t('auth.demo.body')}
            </p>
            <div className="grid gap-2.5">
              {DEMO_DOORS.map((door) => (
                <Link
                  key={door.href}
                  href={door.href}
                  className="cms-btn cms-btn-secondary cms-btn-md cms-btn-full cms-btn-start"
                >
                  <span className={`cms-layer-badge ${door.tone}`}>
                    <i />
                  </span>
                  {t(door.labelKey)}
                  <span className="ms-auto w-4 h-4 block cms-flip text-harbor-muted">
                    <ArrowRightIcon />
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-[12px] text-harbor-muted mt-6 mb-0 leading-relaxed">
              {t('common.demoDataNote')}
            </p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
