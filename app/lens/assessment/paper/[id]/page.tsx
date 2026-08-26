// app/lens/assessment/paper/[id]/page.tsx — key in a printed scoring sheet.
//
// THE PAPER PATH, observer-side. She prints the pack, sits with the child and
// the paper, marks the sheet, and then transcribes it here. The grid below is
// laid out in the same order the pack prints — module, then strand, then item —
// so she reads down the sheet and taps down the screen without hunting.
//
// 🚨 A BLANK IS A REAL ANSWER. An item she never got to is left untouched and is
// sent as `administered: false`, which the scorer treats as absent evidence and
// reports as "not looked at this time". It is never sent as a wrong answer. That
// distinction is the difference between an honest partial sitting and a child
// who looks worse than they are.
//
// Everything typed here goes through /api/lens/assessment/paper-entry, which
// expands each mark into the item's own declared answer and lets the SERVER
// score it — so a paper band and a digital band come out of the same code.

'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL, RULE } from '@/lib/lens/ui';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { bankText } from '@/components/montree/evaluation/localized';
import type { ProjectedBank } from '@/lib/montree/evaluation/bank-projection';
import type { Band, BankItem } from '@/lib/montree/evaluation/types';

interface SessionRow {
  id: string;
  child_alias: string;
  age_band: string;
  form_code: string;
  modules: string[];
  delivery_mode: string;
  status: string;
}

/** One item's mark, as it stands on screen. `undefined` = still blank. */
type Mark =
  | { kind: 'correct'; correct: boolean }
  | { kind: 'rubric'; rubricScore: number }
  | { kind: 'band'; band: Band };

export default function LensPaperEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<SessionRow | null>(null);
  const [bank, setBank] = useState<ProjectedBank | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await lensApi<{ session: SessionRow }>(`/api/lens/assessment/sessions/${id}`);
        if (cancelled) return;
        if (data.session.status !== 'in_progress') {
          router.replace(`/lens/assessment/results/${id}`);
          return;
        }
        setSession(data.session);
        const query = new URLSearchParams({
          ageBand: data.session.age_band,
          formCode: data.session.form_code,
          modules: (data.session.modules ?? []).join(','),
        });
        const projection = await lensApi<{ bank: ProjectedBank }>(`/api/lens/assessment/bank?${query}`);
        if (!cancelled) setBank(projection.bank);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof LensApiError && err.status === 401) { router.replace('/lens'); return; }
        setError(err instanceof LensApiError ? err.message : 'Could not open that check-in.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, router]);

  // Practice items are dropped here as well as server-side: they never enter a
  // child's record, so putting them on the sheet-entry grid would only invite
  // somebody to key them in.
  const grouped = useMemo(() => {
    if (!bank) return [];
    const byModule = new Map<string, BankItem[]>();
    for (const item of bank.items) {
      if (item.form === 'P') continue;
      const list = byModule.get(item.moduleId);
      if (list) list.push(item);
      else byModule.set(item.moduleId, [item]);
    }
    return [...byModule.entries()].map(([moduleId, items]) => ({
      moduleId,
      moduleName: bankText(bank.modules.find((m) => m.id === moduleId)?.name, 'en') || moduleId,
      items: items.sort((a, b) =>
        a.strandId.localeCompare(b.strandId) || (a.sequence ?? 0) - (b.sequence ?? 0)),
    }));
  }, [bank]);

  const markedCount = Object.keys(marks).length;
  const totalCount = grouped.reduce((n, g) => n + g.items.length, 0);

  const entries = useCallback(() => Object.entries(marks).map(([itemId, mark]) => {
    if (mark.kind === 'correct') return { itemId, correct: mark.correct };
    if (mark.kind === 'rubric') return { itemId, rubricScore: mark.rubricScore };
    return { itemId, band: mark.band };
  }), [marks]);

  const send = useCallback(async (complete: boolean) => {
    setError(null);
    setSaved(null);
    if (markedCount === 0) { setError('Record at least one item first.'); return; }
    setBusy(true);
    try {
      await lensApi('/api/lens/assessment/paper-entry', {
        method: 'POST',
        json: { session_id: id, entries: entries(), complete },
      });
      if (complete) {
        router.replace(`/lens/assessment/results/${id}`);
        return;
      }
      setSaved(`Saved ${markedCount} of ${totalCount}.`);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not save those marks.');
    } finally {
      setBusy(false);
    }
  }, [id, entries, markedCount, totalCount, router]);

  const setMark = (itemId: string, mark: Mark | null) => {
    setSaved(null);
    setMarks((prev) => {
      const next = { ...prev };
      if (mark === null) delete next[itemId];
      else next[itemId] = mark;
      return next;
    });
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Paper check-in" back="/lens/assessment" />
        <p className="text-sm text-forest-muted">Loading…</p>
      </main>
    );
  }

  if (!session || !bank) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Paper check-in" back="/lens/assessment" />
        <ErrorNote message={error ?? 'That check-in could not be opened.'} />
      </main>
    );
  }

  const packHref = `/api/lens/assessment/paper-pack?band=${session.age_band}&form=${session.form_code}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-3">
      <LensHeader
        title={session.child_alias}
        subtitle={`Paper · ${session.age_band} · Form ${session.form_code}`}
        back="/lens/assessment"
      />

      <div className={CARD}>
        <span className={LABEL}>Before you sit down</span>
        <p className="text-[13px] leading-relaxed text-forest-muted">
          Print the pack for this band and form. It carries the item art at the printed size the
          bank specifies, and the recording sheet is the last section.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={packHref} target="_blank" rel="noreferrer" className={BTN_SECONDARY}>
            Pack · {session.age_band} form {session.form_code}
          </a>
          <a
            href="/api/lens/assessment/paper-pack?sheet=scoring"
            target="_blank"
            rel="noreferrer"
            className={BTN_SECONDARY}
          >
            Recording sheets only
          </a>
        </div>
      </div>

      <ErrorNote message={error} />
      {saved && <p className="mt-3 text-[13px] text-emerald-primary">{saved}</p>}

      <p className="mt-6 text-[12px] uppercase tracking-wider text-forest-muted">
        {markedCount} of {totalCount} recorded
      </p>
      <div className={`${RULE} mt-2`} />

      {grouped.map((group) => (
        <section key={group.moduleId} className="mt-6">
          <h2 className="mb-3 font-serif text-lg text-forest-text">{group.moduleName}</h2>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => {
              const mark = marks[item.id];
              const strand = bank.strands.find((s) => s.id === item.strandId);
              const rubric = item.scoring?.rubric
                ?? (item.scoring?.rubricKey ? bank.rubrics?.[item.scoring.rubricKey] : null);
              const prompt =
                bankText(item.prompt?.teacherScript, 'en')
                || bankText(item.prompt?.audio, 'en')
                || bankText(item.statement, 'en')
                || item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3"
                >
                  <p className="text-[11px] uppercase tracking-wider text-forest-muted">
                    {bankText(strand?.name, 'en') || item.strandId} · {item.id}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-forest-text">{prompt}</p>

                  <div className="ln-rail mt-2.5">
                    {item.type === 'observation_checklist' ? (
                      (['emerging', 'developing', 'secure'] as Band[]).map((b) => (
                        <button
                          key={b}
                          type="button"
                          className="ln-chip"
                          data-on={mark?.kind === 'band' && mark.band === b ? '1' : '0'}
                          onClick={() => setMark(item.id, { kind: 'band', band: b })}
                        >
                          {b === 'emerging' ? 'Emerging' : b === 'developing' ? 'Developing' : 'Secure'}
                        </button>
                      ))
                    ) : item.type === 'teacher_scored_oral' && rubric ? (
                      rubric.levels.map((level) => (
                        <button
                          key={level.score}
                          type="button"
                          className="ln-chip"
                          data-on={mark?.kind === 'rubric' && mark.rubricScore === level.score ? '1' : '0'}
                          onClick={() => setMark(item.id, { kind: 'rubric', rubricScore: level.score })}
                          title={bankText(level.descriptor, 'en')}
                        >
                          {level.score}
                        </button>
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ln-chip"
                          data-on={mark?.kind === 'correct' && mark.correct ? '1' : '0'}
                          onClick={() => setMark(item.id, { kind: 'correct', correct: true })}
                        >
                          Did it
                        </button>
                        <button
                          type="button"
                          className="ln-chip"
                          data-on={mark?.kind === 'correct' && !mark.correct ? '1' : '0'}
                          onClick={() => setMark(item.id, { kind: 'correct', correct: false })}
                        >
                          Not yet
                        </button>
                      </>
                    )}
                    {mark && (
                      <button type="button" className="ln-chip" onClick={() => setMark(item.id, null)}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="ln-thumb sticky bottom-0 -mx-5 mt-8 border-t border-[rgba(52,211,153,0.15)] bg-[#0A1A0F]/95 px-5 pt-3 backdrop-blur">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(false)}
            className={`${BTN_SECONDARY} flex-1`}
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(true)}
            className={`${BTN_PRIMARY} flex-1`}
          >
            {busy ? 'Working…' : 'Finish'}
          </button>
        </div>
        <p className="mt-2 pb-1 text-[11.5px] leading-relaxed text-forest-muted">
          Anything you leave blank is reported as not looked at this time — never as a wrong answer.
        </p>
      </div>
    </main>
  );
}
