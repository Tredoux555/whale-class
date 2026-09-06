'use client';

/**
 * /montree/dashboard/tracker — the tracking screen.
 *
 * THE ONE PLACE A TEACHER TICKS. Everything on it is either a fact from the
 * journal or a tap that writes one:
 *
 *   Header    this week's letter, its book and cover, and the picker that moves
 *             the whole class to another letter (PATCH class-week).
 *   Section 1 children × the five works of the week's letter. Tap climbs;
 *             "Correct" opens the reason-first downward door. A row turns gold
 *             when the letter is finished. Flags carry the engine's own words.
 *             Each row also shows the derived weekly sentence (read-only, with
 *             a Copy button) and the Weekly Plan Language cell.
 *   Section 2 Writing Shelf trays 1-8, three states.
 *   Section 3 the review queue — resolve to a key, or dismiss.
 *
 * DATA: ONE fetch of GET /api/montree/tracking/class per week. Writes are
 * optimistic (the cell moves under the finger) and every write is followed by a
 * refetch, so the screen always settles on what the server derived rather than
 * on what the UI guessed. The optimistic value is never the source of anything
 * that gets saved.
 *
 * NOT HERE, DELIBERATELY: no star, no score, no percentage, no reward, no emoji
 * as a control. A child's work is not a leaderboard, and the constitution's
 * intrinsic-motivation line is a design constraint, not a preference.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Stethoscope } from 'lucide-react';

import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { mediaProxyUrl } from '@/lib/montree/dark-phonics/live-lesson';

import CorrectionDialog from './components/CorrectionDialog';
import ReviewQueue from './components/ReviewQueue';
import Ribbon from './components/Ribbon';
import ShelfSection from './components/ShelfSection';
import WeekGrid from './components/WeekGrid';
import {
  classUrl,
  correctionEvent,
  dismissQueueItem,
  mondayOf,
  nextStatus,
  resolveQueueItem,
  setChildPronoun,
  setClassWeekLetter,
  shiftWeek,
  tapEvent,
  withPronoun,
  withStatus,
  withoutQueueItem,
  type Pronoun,
} from './components/tracker-actions';
import { cardStyle, ctaBtn, ghostBtn, T, TAP } from './components/theme';
import type { ClassChild, ClassResponse, Status } from './components/types';

const LIVE = TRACKER_LETTERS.filter((l) => l.status === 'live');

export default function TrackerPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [weekStart, setWeekStart] = useState<string>(() => mondayOf());
  const [data, setData] = useState<ClassResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [queueBusy, setQueueBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<{ child: ClassChild; workKey: string; current: Status } | null>(null);
  const [correctBusy, setCorrectBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    if (isHomeschoolParent(sess)) { router.push('/montree/dashboard'); return; }
    setSession(sess);
  }, [router]);

  const classroomId = session?.classroom?.id ?? null;

  const load = useCallback(async () => {
    if (!classroomId) return;
    const mine = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(classUrl(classroomId, weekStart), { credentials: 'include' });
      if (!res.ok) throw new Error(`class ${res.status}`);
      const json = (await res.json()) as ClassResponse;
      if (mine !== reqId.current) return; // a newer week won the race
      setData(json);
      setError(null);
    } catch (e) {
      if (mine !== reqId.current) return;
      setError(e instanceof Error ? e.message : 'Could not load the class');
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, [classroomId, weekStart]);

  useEffect(() => { void load(); }, [load]);

  const letter = data?.week_letter ?? LIVE[0]?.letter ?? 's';
  const book = useMemo(() => TRACKER_LETTERS.find((l) => l.letter === letter) ?? null, [letter]);
  const children = data?.children ?? [];
  const works = data?.works ?? [];

  const markPending = (k: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(k); else n.delete(k);
      return n;
    });

  /** Optimistic patch — overwritten by the refetch that follows. */
  const patchChild = (childId: string, workKey: string, status: Status) =>
    setData((d) =>
      d ? { ...d, children: d.children.map((c) => (c.id === childId ? withStatus(c, workKey, status) : c)) } : d
    );

  const onTap = useCallback(
    async (child: ClassChild, workKey: string) => {
      const current = (child.week[workKey] ?? child.current[workKey] ?? 'not_started') as Status;
      const next = nextStatus(current);
      // Rule 4: at 'mastered' a tap does nothing. Down is a correction, not a wrap.
      if (!next) return;
      const cellKey = `${child.id}:${workKey}`;
      markPending(cellKey, true);
      patchChild(child.id, workKey, next);
      try {
        await tapEvent({ childId: child.id, workKey, status: next, classroomId, actor: session?.teacher?.id ?? null });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That tick did not save');
      } finally {
        markPending(cellKey, false);
        void load();
      }
    },
    [classroomId, load, session]
  );

  const onCorrect = useCallback((child: ClassChild, workKey: string) => {
    const current = (child.week[workKey] ?? child.current[workKey] ?? 'not_started') as Status;
    setCorrecting({ child, workKey, current });
  }, []);

  const saveCorrection = useCallback(
    async (status: Status, reason: string) => {
      if (!correcting) return;
      setCorrectBusy(true);
      try {
        await correctionEvent({
          childId: correcting.child.id,
          workKey: correcting.workKey,
          status,
          reason,
          classroomId,
          actor: session?.teacher?.id ?? null,
        });
        patchChild(correcting.child.id, correcting.workKey, status);
        setCorrecting(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The correction did not save');
      } finally {
        setCorrectBusy(false);
        void load();
      }
    },
    [classroomId, correcting, load, session]
  );

  /**
   * He · She. Written straight to the child row (not the journal — a pronoun is
   * not a rung), optimistic like every other tap, then refetched: the summary in
   * the next column is derived server-side and has to be re-read to change.
   */
  const onSetPronoun = useCallback(
    async (child: ClassChild, pronoun: Pronoun) => {
      const cellKey = `${child.id}:pronoun`;
      markPending(cellKey, true);
      setData((d) =>
        d ? { ...d, children: d.children.map((c) => (c.id === child.id ? withPronoun(c, pronoun) : c)) } : d
      );
      try {
        await setChildPronoun(child.id, pronoun);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That pronoun did not save');
      } finally {
        markPending(cellKey, false);
        void load();
      }
    },
    [load]
  );

  const onCopySummary = useCallback(async (child: ClassChild) => {
    try {
      await navigator.clipboard.writeText(child.summary?.text ?? '');
      setCopied(child.id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('The browser would not let us copy that.');
    }
  }, []);

  const onResolve = useCallback(
    async (id: string, workKey: string) => {
      setQueueBusy(id);
      setData((d) => (d ? { ...d, queue: withoutQueueItem(d.queue, id) } : d));
      try {
        await resolveQueueItem(id, workKey);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That did not resolve');
      } finally {
        setQueueBusy(null);
        void load();
      }
    },
    [load]
  );

  const onDismiss = useCallback(
    async (id: string) => {
      setQueueBusy(id);
      setData((d) => (d ? { ...d, queue: withoutQueueItem(d.queue, id) } : d));
      try {
        await dismissQueueItem(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That did not dismiss');
      } finally {
        setQueueBusy(null);
        void load();
      }
    },
    [load]
  );

  const pickLetter = useCallback(
    async (next: string) => {
      if (!classroomId) return;
      setPickerOpen(false);
      setData((d) => (d ? { ...d, week_letter: next } : d));
      try {
        await setClassWeekLetter(classroomId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The class letter did not change');
      } finally {
        void load();
      }
    },
    [classroomId, load]
  );

  if (!session) return null;

  return (
    <main style={{ minHeight: '100dvh', background: T.bg, backgroundImage: T.glow, padding: '16px 16px 64px' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ---------------------------------------------------------- header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Link href="/montree/dashboard" style={{ ...ghostBtn, minHeight: TAP, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 26, color: T.text, margin: 0, flex: '1 1 auto' }}>Tracker</h1>
          <Link href="/montree/dashboard/tracker/health" style={{ ...ghostBtn, minHeight: TAP, textDecoration: 'none' }}>
            <Stethoscope size={16} /> Health
          </Link>
          <button type="button" onClick={() => void load()} style={{ ...ghostBtn, minHeight: TAP }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <section style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
          {book && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaProxyUrl(`books/covers/${book.slug}.png`)}
              alt={`Cover of ${book.bookTitle}`}
              style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 12, border: T.border, background: 'rgba(255,255,255,0.04)' }}
            />
          )}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
              This week
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 30, color: T.gold, lineHeight: 1.15 }}>
              {letter} · {book?.bookTitle ?? 'No book set'}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, marginTop: 2 }}>
              Week of {data?.week_start ?? weekStart} · {children.length} children
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={() => setWeekStart((w) => shiftWeek(w, -1))} style={{ ...ghostBtn, minHeight: TAP }}>
              Previous week
            </button>
            <button type="button" onClick={() => setWeekStart(mondayOf())} style={{ ...ghostBtn, minHeight: TAP }}>
              This week
            </button>
            <button type="button" onClick={() => setWeekStart((w) => shiftWeek(w, 1))} style={{ ...ghostBtn, minHeight: TAP }}>
              Next week
            </button>
            <button type="button" onClick={() => setPickerOpen((o) => !o)} style={{ ...ctaBtn, minHeight: TAP }}>
              Change letter
            </button>
          </div>

          {pickerOpen && (
            <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6 }}>
              {LIVE.map((l) => (
                <button
                  key={l.letter}
                  type="button"
                  onClick={() => void pickLetter(l.letter)}
                  style={{
                    ...ghostBtn,
                    minHeight: TAP,
                    minWidth: TAP,
                    borderColor: l.letter === letter ? T.gold : 'rgba(255,255,255,0.12)',
                    color: l.letter === letter ? T.gold : T.text,
                    fontFamily: T.serif,
                    fontSize: 18,
                  }}
                  title={l.bookTitle}
                >
                  {l.letter}
                </button>
              ))}
            </div>
          )}
        </section>

        {error && (
          <div style={{ ...cardStyle, border: `1px solid ${T.danger}`, color: T.danger, fontFamily: T.sans, fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && !data ? (
          <div style={{ ...cardStyle, fontFamily: T.sans, color: T.muted }}>Reading the journal…</div>
        ) : !classroomId ? (
          <div style={{ ...cardStyle, fontFamily: T.sans, color: T.muted }}>
            This account has no classroom, so there is nothing to track yet.
          </div>
        ) : (
          <>
            <WeekGrid
              letter={letter}
              roster={children}
              pending={pending}
              onTap={(c, k) => void onTap(c, k)}
              onCorrect={onCorrect}
              onCopySummary={(c) => void onCopySummary(c)}
              onSetPronoun={(c, p) => void onSetPronoun(c, p)}
              copiedChildId={copied}
            />

            <div>
              <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '10px 0 8px' }}>Writing Shelf</h2>
              <ShelfSection
                roster={children}
                works={works}
                pending={pending}
                onTap={(c, k) => void onTap(c, k)}
                onCorrect={onCorrect}
              />
            </div>

            <ReviewQueue
              queue={data?.queue ?? []}
              works={works}
              roster={children}
              busyId={queueBusy}
              onResolve={(id, key) => void onResolve(id, key)}
              onDismiss={(id) => void onDismiss(id)}
            />

            {children.length > 0 && (
              <section style={cardStyle}>
                <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 10px' }}>Where the class is</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                  {children.map((c) => (
                    <div key={c.id} style={{ minWidth: 220 }}>
                      <div style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, marginBottom: 5 }}>{c.name}</div>
                      <Ribbon ribbon={c.ribbon} highlight={letter} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {correcting && (
        <CorrectionDialog
          childName={correcting.child.name}
          workLabel={correcting.workKey}
          current={correcting.current}
          busy={correctBusy}
          onCancel={() => setCorrecting(null)}
          onSave={(s, r) => void saveCorrection(s, r)}
        />
      )}
    </main>
  );
}
