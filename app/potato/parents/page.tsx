// app/potato/parents/page.tsx — the parent door.
// Blue-led, because the parent side is blue and the teacher side is honey:
// same family, different hand.

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot } from '@/components/potato/PotatoBits';
import CodeEntry from '@/components/potato/CodeEntry';
import { postJson, messageFrom } from '@/lib/potato/client';

export default function ParentLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (candidate: string) => {
      if (busy || candidate.length !== 6) return;
      setBusy(true);
      setError(null);
      try {
        await postJson('/api/potato/auth/parent', { code: candidate });
        router.replace('/potato/parents/home');
      } catch (err) {
        setError(messageFrom(err, 'Could not sign you in.'));
        setCode('');
        setBusy(false);
      }
    },
    [busy, router],
  );

  return (
    <div className="pt-app">
      <div className="pt-login">
        <div className="pt-halo">
          <Mascot size={150} shadow={false} />
        </div>
        <h1 className="pt-wordmark">Potato Snaps</h1>
        <div className="pt-wordrule" />
        <p className="pt-logintag">{'Little films of your child’s week'}</p>

        {error ? <div className="pt-err">{error}</div> : null}

        <CodeEntry value={code} onChange={setCode} onComplete={submit} disabled={busy} autoFocus />

        <button
          type="button"
          className="pt-btn pt-btn--blue pt-btn--lg"
          style={{ maxWidth: 300 }}
          disabled={busy || code.length !== 6}
          onClick={() => submit(code)}
        >
          {busy ? 'One moment…' : 'Enter'}
        </button>

        <p className="pt-helper">{'Ask your teacher for your child’s code.'}</p>
        <div className="pt-byline">Teacher Potato</div>
      </div>
    </div>
  );
}
