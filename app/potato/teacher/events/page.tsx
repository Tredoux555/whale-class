// app/potato/teacher/events/page.tsx — the events list.
//
// An EVENT is what the class was doing when a photo was taken — "Music class",
// "Outdoor time". Every photo carries at most one.
//
// 🚨 NAMING. The teacher's word is "event". The database table, the API and
// every identifier underneath say SCENE (tp_scenes, /api/potato/scenes,
// sceneId) — this page is the translation layer between the two, and nothing
// on screen may ever say "scene".
//
// 🚨 HIDE, NEVER DELETE. There is no delete here because there is no DELETE on
// the route: photos point at these rows, and a tidy-up in September must not
// unlabel March. Hiding takes an event off the capture screen and leaves the
// history exactly where it is. Restoring it is one tap.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconBack, IconPencil, IconPlus } from '@/components/potato/PotatoBits';
import { getJson, postJson, patchJson, messageFrom, PotatoApiError } from '@/lib/potato/client';

interface EventRow {
  id: string;
  name: string;
  isActive: boolean;
  photoCount: number;
}

interface ScenesResponse {
  scenes: EventRow[];
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  /** 503 setup_pending — the events migration has not been run on this database. */
  const [setupPending, setSetupPending] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const [showHidden, setShowHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  /** The event whose Hide button is armed. A second tap on the same row is the
   *  confirmation — no native dialog ever appears in this app. */
  const [armedHide, setArmedHide] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(
    async (withHidden: boolean) => {
      try {
        const next = await getJson<ScenesResponse>(
          withHidden ? '/api/potato/scenes?all=1' : '/api/potato/scenes',
        );
        setEvents(next.scenes ?? []);
        setSetupPending(false);
        setFatal(null);
      } catch (err) {
        if (err instanceof PotatoApiError && err.status === 401) {
          router.replace('/potato/teacher/login');
          return;
        }
        if (err instanceof PotatoApiError && err.code === 'setup_pending') {
          setSetupPending(true);
          setFatal(null);
          return;
        }
        setFatal(messageFrom(err, 'Could not load the events.'));
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    load(showHidden);
  }, [load, showHidden]);

  const addEvent = useCallback(async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await postJson('/api/potato/scenes', { name });
      setNewName('');
      setAdding(false);
      await load(showHidden);
      showToast('Added.');
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 409) {
        showToast('You already have an event with that name.', true);
      } else {
        showToast(messageFrom(err, 'Could not add that event.'), true);
      }
    } finally {
      setBusy(false);
    }
  }, [newName, busy, load, showHidden, showToast]);

  const saveName = useCallback(
    async (event: EventRow) => {
      const name = editName.trim();
      if (!name || busy) return;
      if (name === event.name) {
        setEditingId(null);
        return;
      }
      setBusy(true);
      try {
        await patchJson(`/api/potato/scenes/${event.id}`, { name });
        setEditingId(null);
        await load(showHidden);
        showToast('Saved.');
      } catch (err) {
        if (err instanceof PotatoApiError && err.status === 409) {
          showToast('You already have an event with that name.', true);
        } else {
          showToast(messageFrom(err, 'Could not save that.'), true);
        }
      } finally {
        setBusy(false);
      }
    },
    [editName, busy, load, showHidden, showToast],
  );

  /** Hide (isActive:false) or restore (true). Never a row deletion. */
  const setActive = useCallback(
    async (event: EventRow, isActive: boolean) => {
      if (busy) return;
      setBusy(true);
      try {
        await patchJson(`/api/potato/scenes/${event.id}`, { isActive });
        setArmedHide(null);
        await load(showHidden);
        showToast(isActive ? `${event.name} is back.` : `${event.name} is hidden.`);
      } catch (err) {
        showToast(messageFrom(err, 'Could not do that.'), true);
      } finally {
        setBusy(false);
      }
    },
    [busy, load, showHidden, showToast],
  );

  const active = events.filter((event) => event.isActive);
  const hidden = events.filter((event) => !event.isActive);

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Events</h1>
          <div className="pt-weekpill">What the class was doing</div>
        </div>
      </div>

      <div className="pt-scroll">
        <div className="pt-hgroup">
          <h2>Your events</h2>
          <p>{'These are the choices you see right after taking a photo.'}</p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : setupPending ? (
          <div className="pt-empty">
            {'Events aren’t switched on yet — ask Tredoux to run the events update.'}
            <br />
            <Link href="/potato/teacher" style={{ color: '#C9860B', fontWeight: 800 }}>
              Back to the board
            </Link>
          </div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : (
          <>
            {active.length === 0 ? (
              <div className="pt-empty">
                No events yet.
                <br />
                {'Add one below — or make one while you’re tagging a photo.'}
              </div>
            ) : null}

            {active.map((event) => (
              <div className="pt-lrow" key={event.id}>
                {editingId === event.id ? (
                  <>
                    <input
                      className="pt-input"
                      style={{ flex: 1, minWidth: 120, height: 42 }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      aria-label="Event name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName(event);
                      }}
                    />
                    <button
                      type="button"
                      className="pt-btn pt-btn--primary pt-btn--sm"
                      disabled={busy || !editName.trim()}
                      onClick={() => saveName(event)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="pt-btn pt-btn--ghost pt-btn--sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="pt-lrow__n">
                      {event.name}
                      <small>
                        {event.photoCount === 0
                          ? 'No photos yet'
                          : `${event.photoCount} ${event.photoCount === 1 ? 'photo' : 'photos'}`}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="pt-btn pt-btn--ghost pt-btn--sm"
                      aria-label={`Rename ${event.name}`}
                      onClick={() => {
                        setArmedHide(null);
                        setEditingId(event.id);
                        setEditName(event.name);
                      }}
                    >
                      <IconPencil size={15} /> Edit
                    </button>
                    {/* Two taps, no dialog: the button itself does the asking. */}
                    <button
                      type="button"
                      className={`pt-btn pt-btn--sm ${armedHide === event.id ? 'pt-btn--danger' : 'pt-btn--quiet'}`}
                      disabled={busy}
                      onClick={() => {
                        if (armedHide === event.id) setActive(event, false);
                        else setArmedHide(event.id);
                      }}
                    >
                      {armedHide === event.id ? 'Hide?' : 'Hide'}
                    </button>
                  </>
                )}
              </div>
            ))}

            {adding ? (
              <div className="pt-lrow" style={{ gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="pt-input"
                  style={{ flex: 1, minWidth: 140, height: 42 }}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Music class"
                  aria-label="New event name"
                  autoFocus
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addEvent();
                  }}
                />
                <button
                  type="button"
                  className="pt-btn pt-btn--primary pt-btn--sm"
                  disabled={busy || !newName.trim()}
                  onClick={addEvent}
                >
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
                <IconPlus size={18} /> Add an event
              </button>
            )}

            <div className="pt-hgroup">
              <h2>Hidden events</h2>
              <p>
                {'Hiding only takes an event off the camera screen — its photos keep their label forever.'}
              </p>
            </div>

            <button
              type="button"
              className="pt-btn pt-btn--ghost pt-btn--md"
              onClick={() => {
                setArmedHide(null);
                setEditingId(null);
                setShowHidden((v) => !v);
              }}
            >
              {showHidden ? 'Hide the hidden ones' : 'Show hidden'}
            </button>

            {showHidden ? (
              hidden.length === 0 ? (
                <div className="pt-empty" style={{ marginTop: 12 }}>
                  Nothing hidden.
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {hidden.map((event) => (
                    <div className="pt-lrow" key={event.id} style={{ opacity: 0.62 }}>
                      <div className="pt-lrow__n">
                        {event.name}
                        <small>
                          {event.photoCount === 0
                            ? 'No photos'
                            : `${event.photoCount} ${event.photoCount === 1 ? 'photo' : 'photos'} kept`}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="pt-btn pt-btn--ghost pt-btn--sm"
                        disabled={busy}
                        onClick={() => setActive(event, true)}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </>
        )}
      </div>

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
