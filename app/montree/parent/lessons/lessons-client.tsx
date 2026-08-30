'use client';

/**
 * The parent portal's door to the parent-led lesson.
 *
 * This file is now ONLY the guard: the lesson itself lives in the shared
 * <ParentLedLessons /> component, which carries no auth of its own because it
 * is also served publicly at /parents. Everything private stays here.
 *
 * AUTH — copied verbatim in behaviour from the parent dashboard's guard
 * (app/montree/parent/dashboard/page.tsx, "Session 113 V2 Parent audit F-1.3"):
 * the httpOnly cookie is the only authority. On mount we GET
 * /api/montree/parent/auth/access-code; anything other than an authenticated
 * response bounces to /montree/parent, which itself forwards to the unified
 * login. Nothing renders before that check resolves, so a logged-out visitor
 * sees a splash and then the login page — never lesson content.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import ParentLedLessons from '@/components/montree/dark-phonics-live/ParentLedLessons';

type Phase = 'checking' | 'ready';

export default function ParentLessonsClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/montree/parent/auth/access-code', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!res.ok) {
          router.push('/montree/parent');
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { authenticated?: boolean };
        if (cancelled) return;
        if (!data?.authenticated) {
          router.push('/montree/parent');
          return;
        }
        setPhase('ready');
      } catch {
        if (!cancelled) router.push('/montree/parent');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (phase === 'checking') {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center bg-[var(--dpl-chrome)] px-6 text-center text-[14px] text-[var(--dpl-ink2)]"
        style={{ fontFamily: 'var(--dpl-font-body)' }}
      >
        Opening your lessons…
      </div>
    );
  }

  return <ParentLedLessons backHref="/montree/parent/dashboard" backLabel="Back" />;
}
