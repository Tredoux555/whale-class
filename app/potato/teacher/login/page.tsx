// app/potato/teacher/login/page.tsx — the teacher door.

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot } from '@/components/potato/PotatoBits';
import CodeEntry from '@/components/potato/CodeEntry';
import { postJson, messageFrom } from '@/lib/potato/client';

export default function TeacherLoginPage() {
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
        await postJson('/api/potato/auth/teacher', { code: candidate });
        router.replace('/potato/teacher');
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
        <p className="pt-logintag">Type your class code</p>

        {error ? <div className="pt-err">{error}</div> : null}

        <CodeEntry value={code} onChange={setCode} onComplete={submit} disabled={busy} autoFocus />

        <button
          type="button"
          className="pt-btn pt-btn--primary pt-btn--lg"
          style={{ maxWidth: 300 }}
          disabled={busy || code.length !== 6}
          onClick={() => submit(code)}
        >
          {busy ? 'One moment…' : 'Enter'}
        </button>

        <p className="pt-helper">Six characters, from the card Tredoux gave your school.</p>
        <div className="pt-byline">Teacher Potato</div>
      </div>
    </div>
  );
}
