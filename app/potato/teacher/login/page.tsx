// app/potato/teacher/login/page.tsx — the teacher door.
//
// v1.4: replaces the 6-character class-code form with a zero-friction name
// picker for the fixed 4-person team. No password, no code — a deliberate
// choice by the owner (Tredoux): this is four people on their own phones in
// their own classroom, not a public login surface. See lib/potato/auth.ts
// (STAFF_NAMES) and app/api/potato/auth/teacher/route.ts for the door this
// posts to; the old class-code door still exists there as a fallback and can
// be reached directly by anything that still POSTs { code }, but this page
// never renders it.

'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot, tintFor } from '@/components/potato/PotatoBits';
import { postJson, messageFrom } from '@/lib/potato/client';

const STAFF = ['Dana', 'Jenny', 'Vanessa', 'Tredoux'] as const;

export default function TeacherLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);

  const choose = useCallback(
    async (name: string) => {
      if (busyName) return;
      setBusyName(name);
      setError(null);
      try {
        await postJson('/api/potato/auth/teacher', { name });
        router.replace('/potato/teacher');
      } catch (err) {
        setError(messageFrom(err, 'Could not sign you in.'));
        setBusyName(null);
      }
    },
    [busyName, router],
  );

  return (
    <div className="pt-app">
      <div className="pt-login">
        <div className="pt-halo">
          <Mascot size={150} shadow={false} />
        </div>
        <h1 className="pt-wordmark">PSS</h1>
        <div className="pt-wordrule" />
        <p className="pt-logintag">Who’s taking photos?</p>

        {error ? <div className="pt-err">{error}</div> : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            width: '100%',
            maxWidth: 340,
          }}
        >
          {STAFF.map((name) => {
            const isBusy = busyName === name;
            const disabled = busyName !== null;
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => choose(name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  height: 128,
                  border: 'none',
                  borderRadius: 'var(--pt-r-card)',
                  background: 'var(--pt-paper)',
                  boxShadow: 'var(--pt-sh-card)',
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled && !isBusy ? 0.5 : 1,
                  transition: '.15s',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: tintFor(name),
                    fontFamily: 'var(--pt-disp)',
                    fontWeight: 800,
                    fontSize: 22,
                    color: 'var(--pt-ink)',
                  }}
                >
                  {name.charAt(0)}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--pt-disp)',
                    fontWeight: 800,
                    fontSize: 17,
                    color: 'var(--pt-ink)',
                  }}
                >
                  {isBusy ? 'One moment…' : name}
                </span>
              </button>
            );
          })}
        </div>

        <p className="pt-helper">Tap your name to open today’s board.</p>
        <div className="pt-byline">Teacher Potato</div>
      </div>
    </div>
  );
}
