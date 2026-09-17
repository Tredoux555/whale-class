// components/montree/feedback/LangToggle.tsx
//
// EN / 中. Writes the `fb_lang` cookie through the API and reloads, so the
// SERVER renders the next paint in the chosen language — no flash of English,
// and no client-side dictionary shipped twice.
//
// A cookie and not localStorage: the WeChat WKWebView clears web storage
// between sessions, and a toggle that forgets is worse than no toggle.

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Lang } from '@/lib/montree/feedback/types';
import { setLang } from './api';

export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Lang) {
    if (next === lang || pending) return;
    void setLang(next).then(() => {
      startTransition(() => router.refresh());
    });
  }

  return (
    <div className="fb-lang" role="group" aria-label="Language / 语言">
      <button type="button" aria-pressed={lang === 'en'} onClick={() => choose('en')} lang="en">
        EN
      </button>
      <button type="button" aria-pressed={lang === 'zh'} onClick={() => choose('zh')} lang="zh-Hans">
        中
      </button>
    </div>
  );
}
