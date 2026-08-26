// app/potato/teacher/children/page.tsx — the roster.
// Name and face photo. A child with no face yet takes a dashed empty avatar —
// the gap is visible without being scolding.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, IconBack, IconPencil, IconPlus } from '@/components/potato/PotatoBits';
import {
  getJson,
  postJson,
  patchJson,
  postForm,
  messageFrom,
  PotatoApiError,
} from '@/lib/potato/client';

interface Child {
  id: string;
  name: string;
  faceUrl: string | null;
}

interface ChildrenResponse {
  class: { id: string; name: string };
  children: Child[];
}

export default function ChildrenPage() {
  const router = useRouter();
  const [data, setData] = useState<ChildrenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [editName, setEditName] = useState('');

  const faceInputRef = useRef<HTMLInputElement>(null);
  const faceTargetRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await getJson<ChildrenResponse>('/api/potato/children');
      setData(next);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/teacher/login');
        return;
      }
      setFatal(messageFrom(err, 'Could not load the children.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const addChild = useCallback(async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await postJson('/api/potato/children', { name });
      setNewName('');
      setAdding(false);
      await load();
      showToast('Added.');
    } catch (err) {
      showToast(messageFrom(err, 'Could not add that child.'), true);
    } finally {
      setBusy(false);
    }
  }, [newName, busy, load, showToast]);

  const saveName = useCallback(async () => {
    if (!editing || busy) return;
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await patchJson('/api/potato/children', { id: editing.id, name });
      setEditing(null);
      await load();
      showToast('Saved.');
    } catch (err) {
      showToast(messageFrom(err, 'Could not save that.'), true);
    } finally {
      setBusy(false);
    }
  }, [editing, editName, busy, load, showToast]);

  const removeChild = useCallback(
    async (child: Child) => {
      if (busy) return;
      // Retire rather than delete: their photos and past films stay intact.
      if (!window.confirm(`Take ${child.name} off the board? Their films stay safe.`)) return;
      setBusy(true);
      try {
        await patchJson('/api/potato/children', { id: child.id, isActive: false });
        setEditing(null);
        await load();
        showToast(`${child.name} is off the board.`);
      } catch (err) {
        showToast(messageFrom(err, 'Could not do that.'), true);
      } finally {
        setBusy(false);
      }
    },
    [busy, load, showToast],
  );

  const pickFace = useCallback((childId: string) => {
    faceTargetRef.current = childId;
    faceInputRef.current?.click();
  }, []);

  const uploadFace = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const childId = faceTargetRef.current;
      if (faceInputRef.current) faceInputRef.current.value = '';
      if (!file || !childId) return;
      setBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        await postForm(`/api/potato/children/${childId}/face`, form);
        await load();
        showToast('Face photo saved.');
      } catch (err) {
        showToast(messageFrom(err, 'That photo didn’t save.'), true);
      } finally {
        setBusy(false);
      }
    },
    [load, showToast],
  );

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Children</h1>
          {data ? <div className="pt-weekpill">{data.class.name}</div> : null}
        </div>
      </div>

      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" style={{ display: 'none' }} onChange={uploadFace} />

      <div className="pt-scroll">
        <div className="pt-segment">
          <button type="button" className="pt-on">
            Children
          </button>
          <button type="button" onClick={() => router.push('/potato/teacher/codes')}>
            Parent codes
          </button>
        </div>

        <div className="pt-hgroup">
          <h2>Children</h2>
          <p>Tap a child to change their name or face photo.</p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : (
          <>
            {(data?.children ?? []).map((child) => (
              <div className="pt-lrow" key={child.id}>
                <button
                  type="button"
                  onClick={() => pickFace(child.id)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  aria-label={`Change ${child.name}’s face photo`}
                >
                  <Avatar name={child.name} seed={child.id} url={child.faceUrl} size="sm" empty={!child.faceUrl} />
                </button>
                <div className="pt-lrow__n">
                  {child.name}
                  {/* Copy diet: only the GAP earns a line. A face that is
                      already there does not need telling. */}
                  {child.faceUrl ? null : <small>No face photo yet</small>}
                </div>
                {/* v1.7 — the roster is the other place a teacher thinks
                    "let me look at that child", so it opens the same screen
                    the board's faces do. */}
                <Link
                  href={`/potato/teacher/photos/${child.id}`}
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  style={{ textDecoration: 'none' }}
                  aria-label={`Open ${child.name}’s photos`}
                >
                  Photos
                </Link>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  onClick={() => {
                    setEditing(child);
                    setEditName(child.name);
                  }}
                >
                  <IconPencil size={15} /> Edit
                </button>
              </div>
            ))}

            {adding ? (
              <div className="pt-lrow" style={{ gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="pt-input"
                  style={{ flex: 1, minWidth: 140, height: 42 }}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Their name"
                  autoFocus
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addChild();
                  }}
                />
                <button type="button" className="pt-btn pt-btn--primary pt-btn--sm" disabled={busy || !newName.trim()} onClick={addChild}>
                  Add
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  onClick={() => {
                    setAdding(false);
                    setNewName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="pt-addrow" onClick={() => setAdding(true)}>
                <IconPlus size={18} /> Add a child
              </button>
            )}
          </>
        )}
      </div>

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
            <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 19, margin: 0 }}>Edit child</h2>
            <input
              className="pt-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              autoFocus
              aria-label="Name"
            />
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--md" onClick={() => pickFace(editing.id)}>
              Change face photo
            </button>
            <button type="button" className="pt-btn pt-btn--primary pt-btn--md" disabled={busy || !editName.trim()} onClick={saveName}>
              Save
            </button>
            <button type="button" className="pt-btn pt-btn--danger pt-btn--md" disabled={busy} onClick={() => removeChild(editing)}>
              Take off the board
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
