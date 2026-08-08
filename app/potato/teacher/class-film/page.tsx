// app/potato/teacher/class-film/page.tsx — the class film picker.
//
// One weekly film for the whole class, and a coverage system that makes "every
// child is in it" the path of least resistance.
//
// THE BUSINESS RULE MADE VISIBLE
// A parent who watches a 60-second class film and doesn't see their child
// cancels. So this is not a photo picker with a coverage widget bolted on:
// coverage IS the header, and the film cannot be made while a child is
// unaccounted for. There are exactly two ways out of "missing" — give the child
// a photo, or excuse them — and both are one tap. No third way, so the teacher
// can never wander off the path.
//
// Selection lives in client state and is only sent on submit; the server
// re-validates every id (see lib/potato/classfilm.ts), because this is the one
// endpoint in the product that accepts a client-chosen media list.

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Avatar,
  EmblemMark,
  IconBack,
  IconCheck,
  IconStar,
  IconSpark,
  IconX,
  IconChevron,
} from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError } from '@/lib/potato/client';
import { currentWeekStartLocal } from '@/lib/potato/week';

interface PickerChild {
  id: string;
  name: string;
  faceUrl: string | null;
  weekPhotoCount: number;
}

interface PickerPhoto {
  id: string;
  url: string | null;
  capturedAt: string;
  dayKey: string;
  dayLabel: string;
  childIds: string[];
}

interface PickerResponse {
  class: { id: string; name: string; emblemUrl: string | null };
  weekStart: string;
  weekLabel: string;
  min: number;
  max: number;
  children: PickerChild[];
  photos: PickerPhoto[];
  latestJob: { id: string; status: string; photoCount: number; excusedChildIds: string[] } | null;
}

type Coverage = 'covered' | 'missing' | 'excused';

const TINTS = ['#FFD466', '#9ED2F0', '#FFC6A8', '#CDE3F5', '#F4D68C', '#B9DFF3', '#FFDDCB', '#D9EAF7'];
function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export default function ClassFilmPage() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [data, setData] = useState<PickerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excused, setExcused] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);
  const [excuseFor, setExcuseFor] = useState<PickerChild | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // ?week= read client-side — no useSearchParams, so no Suspense requirement.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('week');
    setWeekStart(raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : currentWeekStartLocal());
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await getJson<PickerResponse>(
          `/api/potato/class-film?week=${encodeURIComponent(weekStart)}`,
        );
        if (cancelled) return;
        setData(next);
        setFatal(null);
        // Start with everything starred: the teacher's job is to REMOVE the
        // duds, which is far less work than hunting twenty keepers. It also
        // means coverage starts green for most classes.
        setSelected(new Set(next.photos.map((p) => p.id)));
        setExcused(new Set(next.latestJob?.excusedChildIds ?? []));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PotatoApiError && err.status === 401) {
          router.replace('/potato/teacher/login');
          return;
        }
        setFatal(messageFrom(err, 'Could not load the picker.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekStart, router]);

  const children = data?.children ?? [];
  const photos = data?.photos ?? [];

  // ---- coverage, recomputed from the live selection ----------------------
  const coverage = useMemo(() => {
    const coveredSet = new Set<string>();
    for (const photo of photos) {
      if (!selected.has(photo.id)) continue;
      for (const id of photo.childIds) coveredSet.add(id);
    }
    const counts = new Map<string, number>();
    for (const photo of photos) {
      if (!selected.has(photo.id)) continue;
      for (const id of photo.childIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const rows = children.map((child) => {
      const state: Coverage = coveredSet.has(child.id)
        ? 'covered'
        : excused.has(child.id)
          ? 'excused'
          : 'missing';
      return { child, state, count: counts.get(child.id) ?? 0 };
    });
    // missing → excused → covered, then alphabetical. The children who need
    // attention are physically first.
    const rank: Record<Coverage, number> = { missing: 0, excused: 1, covered: 2 };
    rows.sort((a, b) => rank[a.state] - rank[b.state] || a.child.name.localeCompare(b.child.name));
    return rows;
  }, [children, photos, selected, excused]);

  const missing = coverage.filter((r) => r.state === 'missing');
  const excusedRows = coverage.filter((r) => r.state === 'excused');
  const inFilm = coverage.filter((r) => r.state === 'covered').length;

  // The focused chip pins to the front while a filter is on, so it never
  // scrolls away under the teacher's finger.
  const strip = useMemo(() => {
    if (!filter) return coverage;
    const i = coverage.findIndex((r) => r.child.id === filter);
    if (i <= 0) return coverage;
    const copy = [...coverage];
    copy.unshift(copy.splice(i, 1)[0]);
    return copy;
  }, [coverage, filter]);

  const visiblePhotos = useMemo(
    () => (filter ? photos.filter((p) => p.childIds.includes(filter)) : photos),
    [photos, filter],
  );

  const grouped = useMemo(() => {
    const out: { key: string; label: string; items: PickerPhoto[] }[] = [];
    for (const photo of visiblePhotos) {
      const last = out[out.length - 1];
      if (last && last.key === photo.dayKey) last.items.push(photo);
      else out.push({ key: photo.dayKey, label: photo.dayLabel, items: [photo] });
    }
    return out;
  }, [visiblePhotos]);

  const picked = selected.size;
  const min = data?.min ?? 8;
  const max = data?.max ?? 40;
  const seconds = picked * 3;
  const cooking = data?.latestJob?.status === 'queued' || data?.latestJob?.status === 'processing';

  // ---- actions ------------------------------------------------------------
  const toggleStar = useCallback((photoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }, []);

  const tapChip = useCallback(
    (row: { child: PickerChild; state: Coverage }) => {
      if (filter === row.child.id) {
        setFilter(null);
        return;
      }
      setExcuseFor(null);
      // A child with zero photos this week cannot be fixed by filtering —
      // there is nothing to show. Offer the excuse instead.
      if (row.state === 'missing' && row.child.weekPhotoCount === 0) {
        setFilter(null);
        setExcuseFor(row.child);
        return;
      }
      if (row.state === 'excused') {
        setExcused((prev) => {
          const next = new Set(prev);
          next.delete(row.child.id);
          return next;
        });
        return;
      }
      setFilter(row.child.id);
    },
    [filter],
  );

  const excuseChild = useCallback((child: PickerChild) => {
    setExcused((prev) => new Set(prev).add(child.id));
    setExcuseFor(null);
  }, []);

  const showMeMissing = useCallback(() => {
    const first = missing[0];
    if (!first) return;
    if (first.child.weekPhotoCount === 0) setExcuseFor(first.child);
    else setFilter(first.child.id);
  }, [missing]);

  const submit = useCallback(async () => {
    if (!data || !weekStart || submitting) return;
    setSubmitting(true);
    try {
      await postJson('/api/potato/class-film', {
        weekStart,
        mediaIds: Array.from(selected),
        excusedChildIds: Array.from(excused),
      });
      router.replace('/potato/teacher');
    } catch (err) {
      showToast(messageFrom(err, 'Could not start the class film.'), true);
      setSubmitting(false);
    }
  }, [data, weekStart, submitting, selected, excused, router, showToast]);

  // ---- render -------------------------------------------------------------
  if (loading) {
    return (
      <div className="pt-app">
        <div className="pt-empty" style={{ marginTop: 80 }}>Loading…</div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="pt-app">
        <div className="pt-topbar">
          <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
            <IconBack size={20} />
          </Link>
          <div className="pt-topbar__txt">
            <h1 className="pt-topbar__title">Class film</h1>
          </div>
        </div>
        <div className="pt-scroll">
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        </div>
      </div>
    );
  }

  const pinPct = Math.min(100, (picked / 50) * 100);

  return (
    <div className="pt-app">
      <div className="pt-cfhead">
        <div className="pt-cfhead__top">
          <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
            <IconBack size={20} />
          </Link>
          <h1 className="pt-cfhead__t">
            {'This week’s class film'}
            <small>{`${data?.weekLabel ?? ''} · ${data?.class.name ?? ''}`}</small>
          </h1>
          <EmblemMark url={data?.class.emblemUrl} initials={(data?.class.name ?? 'C').charAt(0)} size={32} />
        </div>

        <div className="pt-cfcount">
          <div className="pt-cfcount__n">{picked}</div>
          <div className="pt-cfcount__u">photos picked</div>
          <div className="pt-cfcount__d">{`≈ ${seconds} seconds`}</div>
        </div>

        {/* Advice, not a limit: nothing is blocked for being short or long
            between min and max. */}
        <div className="pt-guide">
          <div className="pt-guide__track">
            <div className="pt-guide__zone" style={{ left: '30%', right: '20%' }} />
            <div className="pt-guide__pin" style={{ left: `${pinPct}%` }} />
          </div>
          <div className="pt-guide__tick" style={{ left: '30%' }}>15</div>
          <div className="pt-guide__tick" style={{ left: '55%' }}>A GOOD FILM</div>
          <div className="pt-guide__tick" style={{ left: '80%' }}>{max}</div>
        </div>

        <div className="pt-cover">
          <div className="pt-cover__h">
            <h4>{'Who’s in the film'}</h4>
            <span>{`${children.length} children · swipe →`}</span>
          </div>
          <div className="pt-cover__wrap">
            <div className="pt-cover__strip">
              {strip.map((row) => {
                const cls = [
                  'pt-cchip',
                  row.state === 'covered' ? 'pt-cchip--cov' : '',
                  row.state === 'missing' ? 'pt-cchip--miss' : '',
                  row.state === 'excused' ? 'pt-cchip--exc' : '',
                  filter === row.child.id ? 'pt-cchip--filter' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button type="button" key={row.child.id} className={cls} onClick={() => tapChip(row)}>
                    <span className="pt-cchip__w">
                      <span
                        className="pt-cchip__av"
                        style={{ background: row.child.faceUrl ? undefined : tintFor(row.child.id) }}
                      >
                        {row.child.faceUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.child.faceUrl} alt="" />
                        ) : (
                          row.child.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="pt-cchip__b">{row.state === 'excused' ? 'zzz' : row.count}</span>
                    </span>
                    <span className="pt-cchip__n">{row.child.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* One banner slot: the excuse sheet, the active filter, the missing
            summary, or the all-clear. Never two at once. */}
        {excuseFor ? (
          <div className="pt-excuse">
            <div className="pt-excuse__top">
              <span style={{ filter: 'grayscale(1)', opacity: 0.55 }}>
                <Avatar name={excuseFor.name} seed={excuseFor.id} url={excuseFor.faceUrl} size="sm" />
              </span>
              <div>
                <div className="pt-excuse__t">{`No photos of ${excuseFor.name} this week`}</div>
                <div className="pt-excuse__s">
                  {`Excuse ${excuseFor.name} from this film? You can undo it any time before you press make.`}
                </div>
              </div>
            </div>
            <div className="pt-excuse__btns">
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setExcuseFor(null)}>
                Not yet
              </button>
              <button type="button" className="pt-btn pt-btn--primary pt-btn--sm" onClick={() => excuseChild(excuseFor)}>
                {`Excuse ${excuseFor.name}`}
              </button>
            </div>
          </div>
        ) : filter ? (
          <div className="pt-cffilter">
            <div className="pt-cffilter__t">
              {`Showing ${children.find((c) => c.id === filter)?.name ?? 'this child'}’s ${visiblePhotos.length} photos`}
            </div>
            <button type="button" className="pt-cffilter__x" onClick={() => setFilter(null)}>
              Show all <IconX size={11} color="#3E93C4" />
            </button>
          </div>
        ) : missing.length > 0 ? (
          <button type="button" className="pt-cfsum" onClick={showMeMissing}>
            <span className="pt-stackav">
              {missing.slice(0, 3).map((row) => (
                <i key={row.child.id} style={{ background: tintFor(row.child.id) }}>
                  {row.child.name.charAt(0).toUpperCase()}
                </i>
              ))}
            </span>
            <span className="pt-cfsum__t">
              {`${missing.length} ${missing.length === 1 ? 'child' : 'children'} not in the film yet`}
              <small>{missing.map((r) => r.child.name).join(', ')}</small>
            </span>
            <span className="pt-cfsum__a">
              Show me <IconChevron size={13} color="#C9860B" />
            </span>
          </button>
        ) : (
          <div className="pt-cfsum pt-cfsum--ok">
            <div className="pt-tick">
              <IconCheck size={12} color="#23395B" weight={3.6} />
            </div>
            <div className="pt-cfsum__t">
              {'Everyone’s in the film'}
              <small>
                {`${inFilm} children`}
                {excusedRows.length > 0 ? ` · ${excusedRows.map((r) => r.child.name).join(', ')} excused` : ''}
              </small>
            </div>
          </div>
        )}
      </div>

      <div className="pt-scroll" style={{ paddingTop: 6 }}>
        {photos.length === 0 ? (
          <div className="pt-empty">
            No photos this week yet.
            <br />
            <Link href="/potato/teacher" style={{ color: '#C9860B', fontWeight: 800 }}>
              Take some first
            </Link>
          </div>
        ) : (
          grouped.map((group) => (
            <React.Fragment key={group.key}>
              <div className="pt-daylabel">{group.label}</div>
              <div className="pt-pgrid">
                {group.items.map((photo) => {
                  const on = selected.has(photo.id);
                  const dots = photo.childIds.slice(0, 3);
                  return (
                    <button
                      type="button"
                      key={photo.id}
                      className={`pt-pth ${on ? 'pt-pth--on' : ''}`.trim()}
                      onClick={() => toggleStar(photo.id)}
                      aria-pressed={on}
                      aria-label={on ? 'Remove from the film' : 'Add to the film'}
                    >
                      {photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt="" loading="lazy" />
                      ) : null}
                      <span className="pt-pth__star">
                        <IconStar size={15} color={on ? '#23395B' : 'rgba(35,57,91,.45)'} filled={on} />
                      </span>
                      <span className="pt-pth__faces">
                        {dots.map((id) => (
                          <i key={id} style={{ background: tintFor(id) }} />
                        ))}
                        <span>
                          {photo.childIds.length > 3 ? `+${photo.childIds.length - 3}` : photo.childIds.length}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))
        )}

        {filter ? (
          <div className="pt-filternote">
            {`That’s every photo of ${children.find((c) => c.id === filter)?.name ?? 'this child'} this week.`}
            <small>
              {`Star one and ${children.find((c) => c.id === filter)?.name ?? 'they'} joins the film.`}
            </small>
          </div>
        ) : null}
      </div>

      <div className="pt-cffoot">
        {cooking ? (
          <>
            <p className="pt-cffoot__hint">This week&apos;s class film is already being made.</p>
            <button type="button" className="pt-btn pt-btn--lg" disabled>
              Cooking…
            </button>
          </>
        ) : missing.length > 0 ? (
          <>
            <p className="pt-cffoot__hint">Every child needs one photo — or an excuse.</p>
            {/* Disabled reads the REASON, not the action. */}
            <button type="button" className="pt-btn pt-btn--lg" disabled>
              {`${missing.length} ${missing.length === 1 ? 'child' : 'children'} missing`}
            </button>
          </>
        ) : picked < min ? (
          <>
            <p className="pt-cffoot__hint">{`A class film needs at least ${min} photos.`}</p>
            <button type="button" className="pt-btn pt-btn--lg" disabled>
              {`${picked} of ${min} photos`}
            </button>
          </>
        ) : picked > max ? (
          <>
            <p className="pt-cffoot__hint">{`Unstar a few — ${max} photos is the most a film can hold.`}</p>
            <button type="button" className="pt-btn pt-btn--lg" disabled>
              {`${picked} photos · ${picked - max} too many`}
            </button>
          </>
        ) : (
          <>
            <p className="pt-cffoot__hint">
              {`${inFilm} children in the film`}
              {excusedRows.length > 0 ? ` · ${excusedRows.map((r) => r.child.name).join(', ')} excused` : ''}
            </p>
            <button
              type="button"
              className="pt-btn pt-btn--primary pt-btn--lg"
              disabled={submitting}
              onClick={submit}
            >
              <IconSpark size={17} />
              {submitting ? 'Starting…' : `Make class film · ${picked} photos`}
            </button>
          </>
        )}
      </div>

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
