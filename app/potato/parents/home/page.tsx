// app/potato/parents/home/page.tsx — the payoff.
// Newest week first. A portrait still, a big honey play button, one sentence of
// context. Nothing else — a parent came here to watch their child's week.

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot, Avatar, IconPlay } from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError } from '@/lib/potato/client';

interface Montage {
  id: string;
  weekStart: string;
  weekLabel: string;
  videoUrl: string | null;
  photoCount: number;
  completedAt: string;
}

interface FeedResponse {
  child: { id: string; name: string | null };
  className: string | null;
  montages: Montage[];
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

  const childName = data?.child.name ?? 'your child';
  const montages = data?.montages ?? [];

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Mascot size={34} camera={false} shadow={false} />
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Potato Snaps</h1>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label="Log out"
        >
          <Avatar name={childName} seed={data?.child.id ?? childName} size="xs" />
        </button>
      </div>

      <div className="pt-scroll">
        <div className="pt-greet">
          <h2>
            {`${childName}’s week at`}
            <br />
            {data?.className ?? 'school'}
          </h2>
          <p>A new little film every Friday.</p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : montages.length === 0 ? (
          <div className="pt-empty">
            No films yet.
            <br />
            {'The first one will appear here as soon as it’s made.'}
          </div>
        ) : (
          montages.map((montage, index) => (
            <div className="pt-mcard" key={montage.id}>
              <div className="pt-mcard__top">
                <div className="pt-mcard__wk">{index === 0 ? `This week · ${montage.weekLabel}` : montage.weekLabel}</div>
                {index === 0 ? <div className="pt-newbadge">NEW</div> : null}
              </div>

              <div className="pt-player">
                <div className="pt-frame916">
                  {montage.videoUrl ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={montage.videoUrl}
                      controls={playing === montage.id}
                      autoPlay={playing === montage.id}
                      playsInline
                      preload="metadata"
                    />
                  ) : null}
                  {playing !== montage.id ? (
                    <button
                      type="button"
                      onClick={() => setPlaying(montage.id)}
                      aria-label={`Play ${childName}’s week`}
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

              <div className="pt-mcard__meta">
                <b>{`${montage.photoCount} photos`}</b>
                <div className="pt-dotsep" />
                <span>Tap to play</span>
              </div>

              <button
                type="button"
                className="pt-btn pt-btn--blue pt-btn--md"
                style={{ width: '100%' }}
                onClick={() => setPlaying(montage.id)}
              >
                {`Watch ${childName}’s week`} <IconPlay size={15} color="#23395B" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
