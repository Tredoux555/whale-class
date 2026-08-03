'use client';

/**
 * Montree Milestones — band distribution by domain.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Not for app/montree/parent/** or components/parent/**. This is a │
 * │ school-wide picture; a parent only ever sees their own child's Growth Story.      │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * One stacked bar per domain, 100% wide, segments in the fixed ordinal band order.
 * Colour follows the band, never the row's rank, so filtering to one track never
 * repaints the survivors.
 *
 * A domain below the domain minimum shows no bar at all — it shows the reason in the
 * bar's place. That is the suppression rule made visible rather than a blank row.
 */
import { useState } from 'react';
import { BAND_COLOR, BAND_LABEL, BAND_ORDER, T, type BandKey } from './tokens';
import { BandLegend, DataTable, TableToggle } from './ReportChrome';
import { TooltipLayer, VizRoot, useTooltip } from './Tooltip';

export interface DomainBandRow {
  id: string;
  label: string;
  track: 'core' | 'efl';
  n: number;
  children: number;
  counts: Record<BandKey, number> | null;
  band: BandKey | null;
  suppressed: boolean;
  suppressionReason: string | null;
}

/** Segments under this share of the bar do not get an inline label — the tooltip has it. */
const LABEL_MIN_SHARE = 0.13;

export default function BandDistributionChart({ rows }: { rows: DomainBandRow[] }) {
  const { tip, show, hide } = useTooltip();
  const [tableOpen, setTableOpen] = useState(false);

  if (!rows.length) return null;

  return (
    <VizRoot>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <TableToggle open={tableOpen} onToggle={() => setTableOpen((v) => !v)} />
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        {rows.map((row) => {
          const total = row.counts
            ? BAND_ORDER.reduce((t, b) => t + (row.counts![b] ?? 0), 0)
            : 0;
          return (
            <div key={row.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 7 }}>
                <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, color: T.textPrimary }}>
                  {row.label}
                  {row.track === 'efl' ? (
                    <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>English track — reported on its own</span>
                  ) : null}
                </span>
                <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {row.n} milestone{row.n === 1 ? '' : 's'} · {row.children} child{row.children === 1 ? '' : 'ren'}
                </span>
              </div>

              {row.suppressed || !row.counts || total === 0 ? (
                <div
                  style={{
                    border: `1px solid ${T.grid}`, borderRadius: 8, padding: '10px 13px',
                    fontFamily: T.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.55,
                  }}
                >
                  {row.suppressionReason ?? 'Nothing has been checked in this area yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                  {BAND_ORDER.map((band) => {
                    const value = row.counts![band] ?? 0;
                    if (!value) return null;
                    const share = value / total;
                    return (
                      <div
                        key={band}
                        onMouseEnter={(e) => show(e, (
                          <>
                            <strong style={{ fontWeight: 600 }}>{row.label}</strong>
                            <br />
                            {BAND_LABEL[band]}: {value} of {total} milestones ({Math.round(share * 100)}%)
                          </>
                        ))}
                        onMouseMove={(e) => show(e, (
                          <>
                            <strong style={{ fontWeight: 600 }}>{row.label}</strong>
                            <br />
                            {BAND_LABEL[band]}: {value} of {total} milestones ({Math.round(share * 100)}%)
                          </>
                        ))}
                        onMouseLeave={hide}
                        style={{
                          flex: `${share} 1 0`,
                          background: BAND_COLOR[band],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 3, cursor: 'default',
                        }}
                      >
                        {share >= LABEL_MIN_SHARE ? (
                          <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 600, color: '#062017', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.round(share * 100)}%
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BandLegend />

      {tableOpen ? (
        <DataTable
          head={['Area', 'Secure', 'Developing', 'Emerging', 'Not checked yet', 'Children']}
          rows={rows.map((r) => [
            r.label,
            r.counts ? r.counts.secure : 'not shown',
            r.counts ? r.counts.developing : 'not shown',
            r.counts ? r.counts.emerging : 'not shown',
            r.counts ? r.counts.unassessed : 'not shown',
            r.children,
          ])}
        />
      ) : null}

      <TooltipLayer tip={tip} />
    </VizRoot>
  );
}
