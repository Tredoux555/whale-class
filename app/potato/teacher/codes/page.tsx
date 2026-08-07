// app/potato/teacher/codes/page.tsx — parent codes.
// One code per child. Codes stay visible forever: kindergarten reality is that
// the paper card gets lost and has to be read out again over the phone.
//
// Print sits on every row and once at the bottom. The print sheet is plain white
// paper — the dark chrome is for screens, not for a photocopier.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, IconBack, IconPrint } from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError } from '@/lib/potato/client';

interface CodeRow {
  childId: string;
  childName: string;
  faceUrl: string | null;
  code: string | null;
  lastUsedAt: string | null;
}

export default function ParentCodesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
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
      const data = await getJson<{ codes: CodeRow[] }>('/api/potato/parent-codes');
      setRows(data.codes ?? []);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/teacher/login');
        return;
      }
      setFatal(messageFrom(err, 'Could not load the codes.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const mint = useCallback(
    async (childId: string) => {
      if (busyFor) return;
      setBusyFor(childId);
      try {
        await postJson('/api/potato/parent-codes', { childId });
        await load();
        showToast('Code ready.');
      } catch (err) {
        showToast(messageFrom(err, 'Could not make a code.'), true);
      } finally {
        setBusyFor(null);
      }
    },
    [busyFor, load, showToast],
  );

  const withCodes = rows.filter((row) => !!row.code);

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Parent codes</h1>
        </div>
      </div>

      <div className="pt-scroll">
        <div className="pt-segment">
          <button type="button" onClick={() => router.push('/potato/teacher/children')}>
            Children
          </button>
          <button type="button" className="pt-on">
            Parent codes
          </button>
        </div>

        <div className="pt-hgroup">
          <h2>Parent codes</h2>
          <p>One code per child. Print it and send it home.</p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : rows.length === 0 ? (
          <div className="pt-empty">
            No children yet.
            <br />
            <Link href="/potato/teacher/children" style={{ color: '#C9860B', fontWeight: 800 }}>
              Add your class first
            </Link>
          </div>
        ) : (
          <>
            {rows.map((row) => (
              <div className="pt-lrow" key={row.childId}>
                <Avatar name={row.childName} seed={row.childId} url={row.faceUrl} size="xs" empty={!row.faceUrl} />
                <div className="pt-lrow__n" style={{ fontSize: 15 }}>
                  {row.childName}
                  <small>{row.lastUsedAt ? 'Signed in' : row.code ? 'Not used yet' : 'No code yet'}</small>
                </div>
                {row.code ? (
                  <div className="pt-code">{row.code}</div>
                ) : (
                  <button
                    type="button"
                    className="pt-btn pt-btn--primary pt-btn--sm"
                    disabled={busyFor === row.childId}
                    onClick={() => mint(row.childId)}
                  >
                    {busyFor === row.childId ? '…' : 'Make code'}
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="pt-btn pt-btn--ghost pt-btn--md"
              style={{ width: '100%', marginTop: 12 }}
              disabled={withCodes.length === 0}
              onClick={() => window.print()}
            >
              <IconPrint size={17} /> Print all code cards
            </button>

            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(35,57,91,.35)', textAlign: 'center', marginTop: 14 }}>
              Parents go to teacherpotato.xyz/potato and type their code.
            </p>
          </>
        )}
      </div>

      {/* The print sheet: one card per child, plain black on white paper. Hidden
          on screen, and the app chrome is hidden on paper. */}
      <div className="pt-printsheet" aria-hidden="true">
        {withCodes.map((row) => (
          <div className="pt-printcard" key={row.childId}>
            <div className="pt-printcard__brand">POTATO SNAPS</div>
            <div className="pt-printcard__name">{row.childName}</div>
            <div className="pt-printcard__code">{row.code}</div>
            <div className="pt-printcard__how">
              Go to teacherpotato.xyz/potato
              <br />
              {'Tap “I’m a Parent” and type this code.'}
            </div>
          </div>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
.pt-printsheet{display:none}
@media print{
  .pt-topbar,.pt-scroll,.pt-toast{display:none !important}
  .pt-root{background:#fff}
  .pt-printsheet{display:grid;grid-template-columns:1fr 1fr;gap:10mm;padding:12mm}
  .pt-printcard{
    border:1.5pt dashed #999;border-radius:6mm;padding:10mm 6mm;text-align:center;
    page-break-inside:avoid;break-inside:avoid;color:#000;
  }
  .pt-printcard__brand{font-size:8pt;font-weight:800;letter-spacing:.18em;color:#555}
  .pt-printcard__name{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:18pt;margin:5mm 0 3mm}
  .pt-printcard__code{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:24pt;letter-spacing:.16em}
  .pt-printcard__how{font-size:9pt;line-height:1.5;margin-top:5mm;color:#333}
}`,
        }}
      />

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
