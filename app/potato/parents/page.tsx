// app/potato/parents/page.tsx — the parent door.
//
// v1.1: school-branded. The app advertises the school, not itself — so the
// school's mark takes the hero slot and the mascot retreats to a 20px
// "made with Potato Snaps" signature at the foot.
//
// 🚨 THE HONEST LIMIT OF BRANDING HERE
// Before a code is typed we do not know which school this is, and we will not
// expose a lookup that turns a guessed uuid into a school's name and logo. So:
// a parent who has signed in on this device before gets their school's NAME and
// its initials mark, remembered locally at the last successful sign-in; a
// first-time visitor gets the Potato Snaps hero. The logo image itself needs a
// cookie to fetch through the proxy, and a signed-out parent has none — the
// initials mark is the design's own no-logo state, at the same size and weight,
// so the layout does not shift.
//
// Blue-led throughout, because the parent side is blue and the teacher side is
// honey: same family, different hand.

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot, SchoolMark } from '@/components/potato/PotatoBits';
import CodeEntry from '@/components/potato/CodeEntry';
import { postJson, messageFrom } from '@/lib/potato/client';

/** What we remember locally so a returning parent sees their own school. */
const REMEMBER_KEY = 'potato_last_school';

interface RememberedSchool {
  schoolName: string;
  initials: string;
}

// Deliberately NOT exported: a page module should export only its default (and
// route config), or Next treats the extra export as a route option.
function rememberSchool(value: RememberedSchool | null): void {
  try {
    if (value) window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Private mode / storage disabled — branding is a nicety, never a blocker.
  }
}

function readRememberedSchool(): RememberedSchool | null {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedSchool>;
    if (typeof parsed?.schoolName !== 'string' || typeof parsed?.initials !== 'string') return null;
    return { schoolName: parsed.schoolName, initials: parsed.initials };
  } catch {
    return null;
  }
}

export default function ParentLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [school, setSchool] = useState<RememberedSchool | null>(null);

  useEffect(() => {
    setSchool(readRememberedSchool());
  }, []);

  const submit = useCallback(
    async (candidate: string) => {
      if (busy || candidate.length !== 6) return;
      setBusy(true);
      setError(null);
      try {
        const result = await postJson<{
          child?: { id: string; name: string };
          className?: string;
          schoolName?: string | null;
          initials?: string | null;
        }>('/api/potato/auth/parent', { code: candidate });
        if (result.schoolName && result.initials) {
          rememberSchool({ schoolName: result.schoolName, initials: result.initials });
        }
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
        {school ? (
          <div className="pt-schoolhero">
            <SchoolMark url={null} initials={school.initials} size={112} radius={34} />
            <h1 className="pt-schoolname">{school.schoolName}</h1>
            <div className="pt-schoolsub">Parent sign-in</div>
          </div>
        ) : (
          <>
            <div className="pt-halo">
              <Mascot size={150} shadow={false} />
            </div>
            <h1 className="pt-wordmark">Potato Snaps</h1>
            <div className="pt-wordrule" />
            <p className="pt-logintag">{'Little films of your child’s week'}</p>
          </>
        )}

        {error ? <div className="pt-err" style={{ marginTop: 22 }}>{error}</div> : null}

        <div style={{ marginTop: school ? 34 : 30, width: '100%' }}>
          <CodeEntry value={code} onChange={setCode} onComplete={submit} disabled={busy} autoFocus />
        </div>

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

        <div className="pt-madewith">
          <Mascot size={20} camera={false} shadow={false} />
          made with Potato Snaps
        </div>
      </div>
    </div>
  );
}
