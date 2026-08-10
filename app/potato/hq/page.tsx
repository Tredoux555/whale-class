// app/potato/hq/page.tsx — Tredoux only.
// Make a class, read back its teacher code. That is the whole job.
//
// The password is held in React state for the session and sent as a header on
// every call; it is never written to a cookie or to localStorage, so closing the
// tab ends the session.

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Mascot, SchoolMark, IconBack, IconUpload, IconPencil } from '@/components/potato/PotatoBits';
import { messageFrom } from '@/lib/potato/client';

interface HqClass {
  id: string;
  name: string;
  loginCode: string;
  tz: string;
  isActive: boolean;
  children: number;
  photos: number;
  films: number;
  /** v1.1 — null before migration 319 */
  schoolName: string | null;
  schoolLogoUrl: string | null;
  emblemUrl: string | null;
}

async function hqFetch<T>(url: string, password: string, init?: RequestInit): Promise<T> {
  // A FormData body must NOT get a Content-Type header — the browser sets the
  // multipart boundary itself.
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
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
    throw new Error(
      body?.error === 'setup_pending'
        ? 'The database setup for this feature has not been run yet.'
        : body?.error || `Failed (${response.status})`,
    );
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
  const [brandingAvailable, setBrandingAvailable] = useState(true);
  const [editing, setEditing] = useState<HqClass | null>(null);
  const [editSchool, setEditSchool] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const logoTargetRef = useRef<string | null>(null);

  const loadClasses = useCallback(async (pw: string) => {
    const data = await hqFetch<{ classes: HqClass[]; brandingAvailable?: boolean }>(
      '/api/potato/hq/classes',
      pw,
    );
    setClasses(data.classes ?? []);
    setBrandingAvailable(data.brandingAvailable !== false);
  }, []);

  const saveSchoolName = useCallback(async () => {
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      await hqFetch(`/api/potato/hq/classes/${editing.id}`, password, {
        method: 'PATCH',
        body: JSON.stringify({ schoolName: editSchool.trim() }),
      });
      setEditing(null);
      await loadClasses(password);
    } catch (err) {
      setError(messageFrom(err, 'Could not save that.'));
    } finally {
      setBusy(false);
    }
  }, [editing, editSchool, busy, password, loadClasses]);

  const pickLogo = useCallback((classId: string) => {
    logoTargetRef.current = classId;
    logoRef.current?.click();
  }, []);

  const uploadLogo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const classId = logoTargetRef.current;
      if (logoRef.current) logoRef.current.value = '';
      if (!file || !classId) return;
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        await hqFetch(`/api/potato/hq/classes/${classId}/logo`, password, {
          method: 'POST',
          body: form,
        });
        await loadClasses(password);
      } catch (err) {
        setError(messageFrom(err, 'That logo didn’t save.'));
      } finally {
        setBusy(false);
      }
    },
    [password, loadClasses],
  );

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
          <p className="pt-logintag">PSS control</p>

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
            <div key={klass.id} style={{ marginBottom: 9 }}>
              <div className="pt-lrow" style={{ marginBottom: brandingAvailable ? 5 : 9 }}>
                <div className="pt-lrow__n">
                  {klass.name}
                  <small>{`${klass.children} children · ${klass.photos} photos · ${klass.films} films · ${klass.tz}`}</small>
                </div>
                <div className="pt-code">{klass.loginCode}</div>
              </div>
              {brandingAvailable ? (
                <div className="pt-lrow" style={{ background: 'rgba(255,255,255,.6)' }}>
                  <SchoolMark
                    url={klass.schoolLogoUrl}
                    initials={(klass.schoolName || klass.name).charAt(0).toUpperCase()}
                    size={34}
                    radius={10}
                  />
                  <div className="pt-lrow__n" style={{ fontSize: 14 }}>
                    {klass.schoolName || 'No school name'}
                    <small>{klass.schoolLogoUrl ? 'Logo set' : 'No logo yet'}</small>
                  </div>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost pt-btn--sm"
                    disabled={busy}
                    onClick={() => {
                      setEditing(klass);
                      setEditSchool(klass.schoolName ?? '');
                    }}
                  >
                    <IconPencil size={14} /> Name
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost pt-btn--sm"
                    disabled={busy}
                    onClick={() => pickLogo(klass.id)}
                  >
                    <IconUpload size={14} /> Logo
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <input
        ref={logoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={uploadLogo}
      />

      {editing ? (
        <div
          role="presentation"
          onClick={() => setEditing(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(35,57,91,.6)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 340, background: '#FFF', borderRadius: 24, padding: 20, display: 'grid', gap: 12 }}
          >
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 19, margin: 0 }}>School name</h2>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'rgba(35,57,91,.5)', lineHeight: 1.5 }}>
              {'Parents see this at the top of their feed and at the end of every film.'}
            </p>
            <input
              className="pt-input"
              value={editSchool}
              onChange={(e) => setEditSchool(e.target.value)}
              placeholder="Willowbank Primary"
              maxLength={120}
              autoFocus
              aria-label="School name"
            />
            <button type="button" className="pt-btn pt-btn--primary pt-btn--md" disabled={busy} onClick={saveSchoolName}>
              Save
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
