// components/cms/AppShell.tsx
// The chrome every screen wears. Server component: it resolves the locale and
// its own strings, so a page never has to thread `t` into the header.
//
// The header carries a LAYER BADGE — Parent / Teacher / Org — because CMS is an
// hourglass and a user should always know which end of it they are standing in.
// Each layer gets its own tint: parent = Harbor blue, teacher = green,
// org = amber.

import Link from 'next/link';
import { getServerT } from '@/lib/cms/i18n/server';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SignOutButton } from './auth/SignOutButton';

export type Layer = 'parent' | 'teacher' | 'org';

const LAYER_TONE: Record<Layer, string> = {
  parent: 'cms-tone-accent',
  teacher: 'cms-tone-success',
  org: 'cms-tone-amber',
};

const LAYER_LABEL: Record<Layer, TranslationKey> = {
  parent: 'layer.parent',
  teacher: 'layer.teacher',
  org: 'layer.org',
};

const NAV: Record<Layer, { href: string; key: TranslationKey }[]> = {
  parent: [
    { href: '/cms/parent/dashboard', key: 'nav.dashboard' },
    { href: '/cms/parent/enroll', key: 'nav.enroll' },
    { href: '/cms/parent/messages', key: 'nav.messages' },
    { href: '/cms/parent/updates', key: 'nav.updates' },
  ],
  teacher: [
    { href: '/cms/teacher/today', key: 'nav.today' },
    // Phase 4/5, in the order a teacher uses them: put the class in, then
    // print what the class needs. Documents last because it is the payoff.
    { href: '/cms/teacher/roster', key: 'nav.roster' },
    { href: '/cms/teacher/documents', key: 'nav.documents' },
  ],
  org: [{ href: '/cms/org/overview', key: 'nav.overview' }],
};

/** Is this nav item the one we are standing on? A nested route counts —
 *  `/cms/teacher/documents/class-list` should keep the Documents pill lit. */
function isActive(active: string | undefined, href: string): boolean {
  if (!active) return false;
  return active === href || active.startsWith(`${href}/`);
}

export async function AppShell({
  layer,
  active,
  children,
}: {
  layer: Layer;
  /** href of the current page, for the nav's selected state. */
  active?: string;
  children: React.ReactNode;
}) {
  const { t } = await getServerT();
  // Phase 2: the shell tells the truth about which mode it is in. A sign-out
  // button with no session behind it, or a "Demo data" tag over real children,
  // are both lies the chrome must not tell.
  const live = isCmsLive();

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#cms-main" className="sr-only focus:not-sr-only">
        {t('nav.skipToContent')}
      </a>

      {/* 🚨 SAFE-AREA CONTRACT (app/globals.css, "THE SAFE-AREA CONTRACT FOR TOP
          BARS"). This bar is `sticky top-0` and IS the topmost element in the
          viewport on every /cms/** route — nothing renders above it — so on an
          iPhone with viewportFit:"cover" the status-bar clock would land on the
          CMS wordmark. `var(--safe-top)` is the contract's variable, not a bare
          env(): it collapses to 0 when a bar that already owns the inset sits
          above, which is why it is safe here and stays correct if the CMS shell
          is ever nested. The pre-commit hook's advisory checks for exactly this
          mention. */}
      <header
        className="sticky top-0 z-30 border-b border-harbor-border bg-white/85 backdrop-blur-md"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="mx-auto max-w-[1180px] px-6 h-[68px] flex items-center gap-5">
          <Link href="/cms" className="flex items-center gap-3 shrink-0 no-underline">
            <span className="cms-avatar w-9 h-9 rounded-[10px] text-[15px]">C</span>
            <span className="hidden sm:block leading-tight">
              <span className="block font-head text-[17px] text-harbor-text">{t('app.name')}</span>
              <span className="block text-[11px] text-harbor-muted">{t('app.fullName')}</span>
            </span>
          </Link>

          <span className={`cms-layer-badge ${LAYER_TONE[layer]} shrink-0`}>
            <i />
            {t(LAYER_LABEL[layer])}
          </span>

          <nav aria-label={t('nav.primary')} className="hidden md:flex items-center gap-1 ms-auto">
            {NAV[layer].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`cms-btn cms-btn-sm ${
                  isActive(active, item.href) ? 'cms-btn-primary cms-btn-soft' : 'cms-btn-ghost'
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto md:ms-0 shrink-0 flex items-center gap-1.5">
            <LanguageSwitcher />
            {live ? <SignOutButton /> : null}
          </div>
        </div>

        {/* Mobile nav — the same links, below the bar rather than in it. */}
        <nav
          aria-label={t('nav.primary')}
          className="md:hidden flex items-center gap-1 overflow-x-auto px-6 pb-3"
        >
          {NAV[layer].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`cms-btn cms-btn-chip ${
                isActive(active, item.href)
                  ? 'cms-btn-primary cms-btn-soft'
                  : 'cms-btn-ghost cms-btn-outline'
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </header>

      <main id="cms-main" className="flex-1 mx-auto w-full max-w-[1180px] px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-harbor-border mt-6">
        <div className="mx-auto max-w-[1180px] px-6 py-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-head text-[13px] text-harbor-text">{t('app.strapline')}</span>
          {live ? null : (
            <span className="cms-tag cms-tone-quiet ms-auto">{t('common.demoData')}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
