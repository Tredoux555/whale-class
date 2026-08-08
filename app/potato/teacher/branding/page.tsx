// app/potato/teacher/branding/page.tsx — logos.
//
// The lockup order is a system law: SCHOOL first, CLASS second, Potato Snaps
// last. The school logo is a READ-ONLY row with a lock chip — HQ sets it and a
// teacher can never break school branding. The class emblem is hers.
//
// The "Where it appears" previews exist because a teacher is about to put a
// mark on something a parent will screenshot; she should see all three
// placements before she commits.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mascot,
  Avatar,
  SchoolMark,
  EmblemMark,
  IconBack,
  IconMenu,
  IconPencil,
  IconUpload,
  IconLock,
} from '@/components/potato/PotatoBits';
import { getJson, postForm, messageFrom, PotatoApiError } from '@/lib/potato/client';
import { currentWeekStartLocal, weekLabel } from '@/lib/potato/week';

interface Branding {
  schoolName: string | null;
  schoolLogoUrl: string | null;
  emblemUrl: string | null;
  initials: string;
}

interface BoardLite {
  class: { id: string; name: string };
  branding: Branding | null;
  weekLabel: string;
}

export default function BrandingPage() {
  const router = useRouter();
  const [data, setData] = useState<BoardLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      const week = currentWeekStartLocal();
      const next = await getJson<BoardLite>(`/api/potato/board?week=${encodeURIComponent(week)}`);
      setData(next);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/teacher/login');
        return;
      }
      setFatal(messageFrom(err, 'Could not load your branding.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileRef.current) fileRef.current.value = '';
      if (!file) return;
      setBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        await postForm('/api/potato/branding/emblem', form);
        await load();
        showToast('Emblem saved.');
      } catch (err) {
        showToast(messageFrom(err, 'That image didn’t save.'), true);
      } finally {
        setBusy(false);
      }
    },
    [load, showToast],
  );

  const branding = data?.branding ?? null;
  const className = data?.class.name ?? 'Your class';
  const schoolName = branding?.schoolName ?? null;
  const classInitials = className.charAt(0).toUpperCase();

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Branding</h1>
          <div className="pt-weekpill">{className}</div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={upload} />

      <div className="pt-scroll">
        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : !branding ? (
          <div className="pt-empty">
            Branding is not switched on yet.
            <br />
            {'It will appear here once the setup is finished.'}
          </div>
        ) : (
          <>
            <div className="pt-hgroup" style={{ marginTop: 4 }}>
              <h2>Logos</h2>
              <p>Your emblem appears on your board, in the parent feed and at the end of every film.</p>
            </div>

            {/* School logo — HQ's. A teacher can never break school branding. */}
            <div className="pt-lrow">
              <SchoolMark url={branding.schoolLogoUrl} initials={branding.initials} size={44} radius={13} />
              <div className="pt-lrow__n">
                {schoolName ?? 'No school name yet'}
                <small>School logo</small>
              </div>
              <span className="pt-lockchip">
                <IconLock size={12} color="#6C7C96" /> Set by school
              </span>
            </div>

            {/* Class emblem — hers. */}
            {branding.emblemUrl ? (
              <div className="pt-lrow">
                <EmblemMark url={branding.emblemUrl} initials={classInitials} size={44} />
                <div className="pt-lrow__n">
                  {className}
                  <small>Class emblem</small>
                </div>
                <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <IconPencil size={14} /> Change
                </button>
              </div>
            ) : (
              <div className="pt-lrow" style={{ borderStyle: 'dashed', borderColor: '#E4DAC6', boxShadow: 'none' }}>
                <EmblemMark url={null} initials={classInitials} size={44} />
                <div className="pt-lrow__n">
                  Class emblem
                  <small>Not uploaded yet</small>
                </div>
                <button type="button" className="pt-btn pt-btn--primary pt-btn--sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <IconUpload size={14} /> Upload
                </button>
              </div>
            )}

            <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(35,57,91,.35)', margin: '10px 4px 0', lineHeight: 1.5 }}>
              JPG, PNG or WebP · 2MB max · a square image looks best.
            </p>

            <div className="pt-hgroup">
              <h2>Where it appears</h2>
              <p>Three places, always the same order: school first, class second.</p>
            </div>

            <div className="pt-previewcard">
              <div className="pt-previewcard__l">Teacher board</div>
              <div className="pt-previewcard__in">
                <div className="pt-topbar" style={{ position: 'static', paddingTop: 13 }}>
                  <EmblemMark url={branding.emblemUrl} initials={classInitials} size={38} />
                  <div className="pt-topbar__txt">
                    <h1 className="pt-topbar__title">{className}</h1>
                    <div className="pt-weekpill">{`This week · ${data?.weekLabel ?? weekLabel(currentWeekStartLocal())}`}</div>
                  </div>
                  <span className="pt-iconbtn" aria-hidden="true">
                    <IconMenu size={20} />
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-previewcard">
              <div className="pt-previewcard__l">Parent feed</div>
              <div className="pt-previewcard__in">
                <div className="pt-topbar" style={{ position: 'static', paddingTop: 13, gap: 11 }}>
                  <SchoolMark url={branding.schoolLogoUrl} initials={branding.initials} size={36} radius={11} />
                  <div className="pt-topbar__txt">
                    <div className="pt-brandbar__s">{schoolName ?? className}</div>
                    <div className="pt-brandbar__c">
                      <EmblemMark url={branding.emblemUrl} initials={classInitials} size={15} /> {className}
                    </div>
                  </div>
                  <Avatar name="A child" seed={data?.class.id ?? 'child'} size="xs" />
                </div>
              </div>
            </div>

            <div className="pt-previewcard">
              <div className="pt-previewcard__l">End of every film</div>
              <div
                className="pt-previewcard__in"
                style={{ padding: 16, display: 'grid', placeItems: 'center', background: '#FFFCF3' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <SchoolMark url={branding.schoolLogoUrl} initials={branding.initials} size={38} radius={10} />
                  <div
                    style={{
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 8,
                      letterSpacing: '-.015em',
                    }}
                  >
                    {schoolName ?? className}
                  </div>
                  <div className="pt-endrule" style={{ margin: '7px 0' }} />
                  <div className="pt-endclass" style={{ fontSize: 11.5 }}>
                    <EmblemMark url={branding.emblemUrl} initials={classInitials} size={14} /> {className}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'rgba(35,57,91,.35)',
                      marginTop: 9,
                    }}
                  >
                    made with Potato Snaps
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-emptyhint" style={{ justifyContent: 'center', marginTop: 18 }}>
              <Mascot size={22} camera={false} shadow={false} />
              Ask Tredoux to set your school logo and name.
            </div>
          </>
        )}
      </div>

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
