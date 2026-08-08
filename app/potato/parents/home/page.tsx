// app/potato/parents/home/page.tsx — the payoff.
//
// v1.1: class films and child films in ONE stream, newest first, told apart by
// temperature rather than by reading.
//   • class film = warm — butter-soft player, honey pill, school lockup, 214px
//     still, and the reassurance line "Every child is in this one".
//   • child film = cool — sky player, blue pill, the child's own avatar.
// Same skeleton, opposite temperature: the distinction survives a squint.
//
// Both keep the BLUE watch button. Blue is the parent's hand throughout the
// product; honey stays the teacher's.
//
// The mascot does not appear on this screen at all — the app advertises the
// school, not itself.

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot, Avatar, SchoolMark, EmblemMark, IconPlay, IconCheck } from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError } from '@/lib/potato/client';

interface Branding {
  schoolName: string | null;
  schoolLogoUrl: string | null;
  emblemUrl: string | null;
  initials: string;
}

interface Film {
  id: string;
  kind: 'class' | 'child';
  weekStart: string;
  weekLabel: string;
  videoUrl: string | null;
  photoCount: number;
  excusedCount: number;
  completedAt: string;
}

interface FeedResponse {
  child: { id: string; name: string | null } | null;
  className: string | null;
  branding: Branding | null;
  classFilmsAvailable: boolean;
  films: Film[];
}

export default function ParentHomePage() {
  const router = useRouter();
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getJson<FeedResponse>('/api/potato/montages');
      setData(next);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/parents');
        return;
      }
      setFatal(messageFrom(err, 'Could not load the films.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await postJson('/api/potato/auth/logout', {});
    } catch (err) {
      console.error('[potato] logout failed:', err);
    }
    router.replace('/potato');
  }, [router]);

  const childName = data?.child?.name ?? 'your child';
  const className = data?.className ?? 'school';
  const branding = data?.branding ?? null;
  const films = data?.films ?? [];
  const headline = branding?.schoolName ?? className;
  const classInitials = className.charAt(0).toUpperCase();

  // "NEW" belongs to the newest of EACH kind, not just the first card overall —
  // a fresh child film below a week-old class film is still news.
  const newestClass = films.find((f) => f.kind === 'class')?.id;
  const newestChild = films.find((f) => f.kind === 'child')?.id;

  return (
    <div className="pt-app">
      <div className="pt-topbar" style={{ gap: 11 }}>
        {branding ? (
          <SchoolMark url={branding.schoolLogoUrl} initials={branding.initials} size={36} radius={11} />
        ) : (
          <Mascot size={34} camera={false} shadow={false} />
        )}
        <div className="pt-topbar__txt">
          {branding ? (
            <>
              <div className="pt-brandbar__s">{headline}</div>
              <div className="pt-brandbar__c">
                <EmblemMark url={branding.emblemUrl} initials={classInitials} size={15} /> {className}
              </div>
            </>
          ) : (
            <h1 className="pt-topbar__title">Potato Snaps</h1>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label="Log out"
        >
          <Avatar name={childName} seed={data?.child?.id ?? childName} size="xs" />
        </button>
      </div>

      <div className="pt-scroll">
        <div className="pt-greet">
          <h2>{`${childName}’s films`}</h2>
          <p>
            {data?.classFilmsAvailable
              ? 'A new little film every Friday — hers, and the whole class’s.'
              : 'A new little film every Friday.'}
          </p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : films.length === 0 ? (
          <div className="pt-empty">
            No films yet.
            <br />
            {'The first one will appear here as soon as it’s made.'}
            <div className="pt-emptyhint">
              <Mascot size={26} camera={false} shadow={false} />
              Your teacher is collecting photos.
            </div>
          </div>
        ) : (
          films.map((film) => {
            const isClass = film.kind === 'class';
            const isNew = film.id === (isClass ? newestClass : newestChild);
            return (
              <div className={`pt-mcard ${isClass ? 'pt-mcard--class' : ''}`.trim()} key={film.id}>
                <div className="pt-mcard__brand">
                  {isClass ? (
                    <SchoolMark
                      url={branding?.schoolLogoUrl ?? null}
                      initials={branding?.initials ?? classInitials}
                      size={34}
                      radius={10}
                    />
                  ) : (
                    <Avatar name={childName} seed={data?.child?.id ?? childName} size="xs" />
                  )}
                  <div className="pt-t">
                    <b>{isClass ? className : `${childName}’s week`}</b>
                    <small>{film.weekLabel}</small>
                  </div>
                  <div className={`pt-kindpill ${isClass ? '' : 'pt-kindpill--child'}`.trim()}>
                    {isClass ? 'Class film' : `${childName}’s film`}
                  </div>
                </div>

                <div className={`pt-player ${isClass ? 'pt-player--class' : ''}`.trim()}>
                  <div className="pt-frame916">
                    {film.videoUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={film.videoUrl}
                        controls={playing === film.id}
                        autoPlay={playing === film.id}
                        playsInline
                        preload="metadata"
                      />
                    ) : null}
                    {isNew && playing !== film.id ? <div className="pt-newtag">NEW</div> : null}
                    {playing !== film.id ? (
                      <button
                        type="button"
                        onClick={() => setPlaying(film.id)}
                        aria-label={isClass ? 'Play the class film' : `Play ${childName}’s week`}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%,-50%)',
                          width: 58,
                          height: 58,
                          borderRadius: 999,
                          background: '#E8A317',
                          border: 'none',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          boxShadow:
                            '0 0 0 5px rgba(255,253,246,.55), 0 3px 0 rgba(150,96,4,.2), 0 10px 20px -10px rgba(35,57,91,.4)',
                        }}
                      >
                        <IconPlay size={24} color="#23395B" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* The retention promise the picker screen enforces, said out
                    loud on every class card. */}
                {isClass ? (
                  <div className="pt-everyone">
                    <IconCheck size={13} color="#C9860B" weight={3.6} />
                    {film.excusedCount > 0
                      ? `Every child in class this week is in this one`
                      : 'Every child is in this one'}
                  </div>
                ) : null}

                <div className="pt-mcard__meta">
                  <b>{`${film.photoCount} photos`}</b>
                  <div className="pt-dotsep" />
                  <span>{isClass ? 'Whole class' : `Just ${childName}`}</span>
                </div>

                <button
                  type="button"
                  className="pt-btn pt-btn--blue pt-btn--md"
                  style={{ width: '100%' }}
                  onClick={() => setPlaying(film.id)}
                >
                  {isClass ? 'Watch the class film' : `Watch ${childName}’s week`}{' '}
                  <IconPlay size={15} color="#23395B" />
                </button>
              </div>
            );
          })
        )}

        <div className="pt-emptyhint" style={{ justifyContent: 'center', marginTop: 22 }}>
          <Mascot size={20} camera={false} shadow={false} />
          made with Potato Snaps
        </div>
      </div>
    </div>
  );
}
