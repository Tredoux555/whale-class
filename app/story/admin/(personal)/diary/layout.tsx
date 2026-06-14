'use client';

// Secret-Diary guard. The Diary is reached ONLY via the logo's long-press +
// phrase, which sets 'story_diary_view'. Without that token, bounce to the
// Planner front (so the diary never renders to a bare login). On tab-hide,
// clear the token and revert — re-entry needs the phrase again.

import { useEffect, useState, type ReactNode } from 'react';

const DIARY_TOKEN = 'story_diary_view';

export default function DiaryGuardLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionStorage.getItem(DIARY_TOKEN)) {
      window.location.replace('/story/admin/planner');
      return;
    }
    // Client-only gate: reveal the diary only after confirming the token (kept
    // out of a lazy initializer so SSR/hydration agree on the hidden state).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only auth gate
    setReady(true);
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.removeItem(DIARY_TOKEN);
        window.location.replace('/story/admin/planner');
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
