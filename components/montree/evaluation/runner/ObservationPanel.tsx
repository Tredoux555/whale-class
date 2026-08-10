'use client';

/**
 * The observation checklist — the teacher-rated half of a check-in.
 *
 * No child sits here. These milestones (self-regulation, working with others, care of the
 * environment) cannot honestly be sampled by tapping pictures for fifteen minutes, so a
 * teacher rates them from the work cycle they have already watched all window. Best fit,
 * not a tally.
 *
 * Anything left unrated stays "not looked at this time" and is reported as such. A blank
 * is information — pushing a teacher to guess a band for a child they have not observed
 * would be the fastest way to make the whole record untrustworthy.
 */
import { useState } from 'react';
import type { Band } from '@/lib/montree/evaluation/types';
import type { ProjectedBank } from '@/lib/montree/evaluation/bank-projection';
import type { RunnerIndex } from '@/lib/montree/evaluation/runner-engine';
import { bankText } from '../localized';
import { C, SERIF, SANS } from '../tokens';

const BANDS: Band[] = ['emerging', 'developing', 'secure'];

export function ObservationPanel({
  bank,
  index,
  locale,
  observations,
  onRate,
  onNote,
  onDone,
  labels,
}: {
  bank: ProjectedBank;
  index: RunnerIndex;
  locale: string;
  observations: Record<string, { band: Band; note?: string }>;
  onRate: (milestoneId: string, band: Band) => void;
  onNote: (milestoneId: string, note: string) => void;
  onDone: () => void;
  labels: {
    title: string;
    intro: string;
    whichFits: string;
    done: string;
    progress: (done: number, total: number) => string;
    bandLabels: Record<Band, string>;
    note: string;
  };
}) {
  const [openNote, setOpenNote] = useState<string | null>(null);

  const observationItems = bank.items.filter((i) => i.type === 'observation_checklist');
  const total = observationItems.length;
  const done = observationItems.filter((i) => i.milestoneId && observations[i.milestoneId]?.band).length;

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto', padding: '20px 22px 60px',
      fontFamily: SANS, color: C.ink,
    }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: '0 0 8px' }}>{labels.title}</h1>
      <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>{labels.intro}</p>
      <p style={{ color: C.inkSoft, fontSize: 13 }}>{labels.progress(done, total)}</p>

      {bank.observationChecklists.map((checklist) => {
        const domain = bank.domains.find((d) => d.id === checklist.domainId);
        const items = checklist.itemIds
          .map((id) => index.itemById.get(id))
          .filter((i): i is NonNullable<typeof i> => !!i && i.type === 'observation_checklist');
        if (!items.length) return null;

        return (
          <div key={checklist.id} style={{
            background: C.paper, border: `1px solid ${C.line}`, borderRadius: 22,
            padding: '20px 22px', margin: '0 0 18px',
          }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 20, margin: '0 0 6px' }}>
              {bankText(domain?.name, locale) || checklist.domainId}
            </h2>
            <p style={{ fontSize: 12.5, color: C.inkSoft, margin: '0 0 8px' }}>
              {bankText(checklist.guidance, locale)}
            </p>

            {items.map((item) => {
              const milestoneId = item.milestoneId ?? '';
              const current = observations[milestoneId];
              const strand = index.strandById.get(item.strandId);
              return (
                <div key={item.id} style={{ padding: '18px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {bankText(strand?.name, locale)}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, margin: '4px 0 4px', lineHeight: 1.4 }}>
                    {bankText(item.statement, locale)}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>{labels.whichFits}</div>

                  <div style={{
                    display: 'grid', gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  }}>
                    {BANDS.map((band) => {
                      const on = current?.band === band;
                      return (
                        <button
                          key={band}
                          type="button"
                          onClick={() => onRate(milestoneId, band)}
                          style={{
                            textAlign: 'left', minHeight: 96, padding: '12px 14px', borderRadius: 16,
                            border: `2px solid ${on ? C.forest : C.sandDark}`,
                            background: on ? '#F2F6EE' : C.paper,
                            fontSize: 13.5, lineHeight: 1.4, cursor: 'pointer',
                            touchAction: 'manipulation',
                          }}
                        >
                          <span style={{ display: 'block', fontWeight: 700, marginBottom: 4 }}>
                            {labels.bandLabels[band]}
                          </span>
                          {bankText(item.bandDescriptors?.[band], locale)}
                        </button>
                      );
                    })}
                  </div>

                  {current?.band && (
                    <div style={{ marginTop: 10 }}>
                      {openNote === milestoneId ? (
                        <textarea
                          autoFocus
                          defaultValue={current.note ?? ''}
                          onBlur={(e) => { onNote(milestoneId, e.target.value); setOpenNote(null); }}
                          maxLength={item.evidenceNote?.maxChars ?? 300}
                          placeholder={labels.note}
                          style={{
                            width: '100%', minHeight: 80, padding: '12px 14px', borderRadius: 14,
                            border: `1px solid ${C.sandDark}`, background: C.paper,
                            font: 'inherit', lineHeight: 1.4,
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenNote(milestoneId)}
                          className="btn btn-secondary btn-sm btn-pill on-light"
                        >
                          {current.note ? current.note.slice(0, 60) : labels.note}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onDone}
        className="btn btn-primary btn-lg btn-full on-light"
      >
        {labels.done}
      </button>
    </div>
  );
}

export default ObservationPanel;
