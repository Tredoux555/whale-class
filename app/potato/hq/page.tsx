// app/potato/hq/page.tsx — Tredoux only.
// Make a class, read back its teacher code. That is the whole job.
//
// The password is held in React state for the session and sent as a header on
// every call; it is never written to a cookie or to localStorage, so closing the
// tab ends the session.

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Mascot, IconBack } from '@/components/potato/PotatoBits';
import { messageFrom } from '@/lib/potato/client';

interface HqClass {
  id: string;
  name: string;
  loginCode: string;
  tz: string;
  isActive: boolean;
  children: number;
  photos: number;
  montages: number;
}

async function hqFetch<T>(url: string, password: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      'x-admin-password': password,
    },
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const text = await response.text();
  let body: { error?: string } | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(body?.error === 'setup_pending' ? 'Migration 318 has not been run yet.' : body?.error || `Failed (${response.status})`);
  }
  return (body ?? {}) as T;
}

export default function HqPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [classes, setClasses] = useState<HqClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTz, setNewTz] = useState('Asia/Shanghai');

  const loadClasses = useCallback(async (pw: string) => {
    const data = await hqFetch<{ classes: HqClass[] }>('/api/potato/hq/classes', pw);
    setClasses(data.classes ?? []);
  }, []);

  const unlock = useCallback(async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await loadClasses(password);
      setUnlocked(true);
    } catch (err) {
      setError(messageFrom(err, 'Wrong password.'));
    } finally {
      setBusy(false);
    }
  }, [password, busy, loadClasses]);

  const createClass = useCallback(async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await hqFetch('/api/potato/hq/classes', password, {
        method: 'POST',
        body: JSON.stringify({ name, tz: newTz.trim() || 'Asia/Shanghai' }),
      });
      setNewName('');
      await loadClasses(password);
    } catch (err) {
      setError(messageFrom(err, 'Could not create that class.'));
    } finally {
      setBusy(false);
    }
  }, [newName, newTz, password, busy, loadClasses]);

  if (!unlocked) {
    return (
      <div className="pt-app">
        <div className="pt-login">
          <div className="pt-halo">
            <Mascot size={120} shadow={false} />
          </div>
          <h1 className="pt-wordmark" style={{ fontSize: 28 }}>
            HQ
          </h1>
          <div className="pt-wordrule" />
          <p className="pt-logintag">Potato Snaps control</p>

          {error ? <div className="pt-err">{error}</div> : null}

          <input
            className="pt-input"
            style={{ maxWidth: 300, marginBottom: 16 }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Super admin password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') unlock();
            }}
          />
          <button type="button" className="pt-btn pt-btn--primary pt-btn--lg" style={{ maxWidth: 300 }} disabled={busy || !password} onClick={unlock}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">HQ</h1>
          <div className="pt-weekpill">{`${classes.length} classes`}</div>
        </div>
      </div>

      <div className="pt-scroll">
        {error ? <div className="pt-err" style={{ maxWidth: '100%' }}>{error}</div> : null}

        <div className="pt-hgroup">
          <h2>New class</h2>
          <p>The code below is what the teacher types to sign in.</p>
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
          <input
            className="pt-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Class name"
            maxLength={80}
          />
          <input
            className="pt-input"
            value={newTz}
            onChange={(e) => setNewTz(e.target.value)}
            placeholder="Timezone (e.g. Asia/Shanghai)"
          />
          <button type="button" className="pt-btn pt-btn--primary pt-btn--md" disabled={busy || !newName.trim()} onClick={createClass}>
            {busy ? 'Working…' : 'Create class'}
          </button>
        </div>

        <div className="pt-hgroup">
          <h2>Classes</h2>
          <p>Teacher code · children · photos · films</p>
        </div>

        {classes.length === 0 ? (
          <div className="pt-empty">No classes yet.</div>
        ) : (
          classes.map((klass) => (
            <div className="pt-lrow" key={klass.id}>
              <div className="pt-lrow__n">
                {klass.name}
                <small>{`${klass.children} children · ${klass.photos} photos · ${klass.montages} films · ${klass.tz}`}</small>
              </div>
              <div className="pt-code">{klass.loginCode}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
