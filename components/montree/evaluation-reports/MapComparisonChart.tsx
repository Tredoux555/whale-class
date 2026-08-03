'use client';

/**
 * Montree Milestones — side-by-side Milestone Attainment Profile (MAP%) bars.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Not for app/montree/parent/** or components/parent/**.          │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * Used for classrooms within a school and for schools within the organisation. One
 * series, so every bar is the same colour — colouring bars darker-where-bigger would
 * double-encode the length and burn the only free channel.
 *
 * Rows are sorted by NAME, never by value. This is a reflection view, not a league
 * table: sorting by figure would turn a set of classrooms into a ranking, which is
 * exactly the register this product refuses.
 *
 * A row below the reporting minimum keeps its place in the list and shows the reason
 * where its bar would be. Dropping it would hide who is missing.
 */
import { useState } from 'react';
import { SERIES_1, T } from './tokens';
import { DataTable, TableToggle } from './ReportChrome';
import { TooltipLayer, VizRoot, useTooltip } from './Tooltip';

export interface MapComparisonRow {
  id: string;
  label: string;
  /** Children who completed a check-in in this window. */
  childrenAssessed: number;
  /** Children whose own figure was reportable and so entered this mean. */
  reportableChildren: number;
  mapMeanPercent: number | null;
  denominatorMean: number | null;
  suppressed: boolean;
  suppressionReason: string | null;
}

const TICKS = [0, 25, 50, 75, 100];

export default function MapComparisonChart({
  rows, unitLabel = 'classroom',
}: { rows: MapComparisonRow[]; unitLabel?: string }) {
  const { tip, show, hide } = useTooltip();
  const [tableOpen, setTableOpen] = useState(false);

  if (!rows.length) return null;
  const anyReportable = rows.some((r) => !r.suppressed && typeof r.mapMeanPercent === 'number');

  return (
    <VizRoot>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <TableToggle open={tableOpen} onToggle={() => setTableOpen((v) => !v)} />
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {rows.map((row) => (
          <div key={row.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
              <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, color: T.textPrimary }}>{row.label}</span>
              <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {row.childrenAssessed} child{row.childrenAssessed === 1 ? '' : 'ren'} checked in
              </span>
            </div>

            {row.suppressed || typeof row.mapMeanPercent !== 'number' ? (
              <div
                style={{
                  border: `1px solid ${T.grid}`, borderRadius: 8, padding: '10px 13px',
                  fontFamily: T.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.55,
                }}
              >
                {row.suppressionReason ?? 'Not enough children have a figure of their own here yet.'}
              </div>
            ) : (
              <div
                style={{ position: 'relative', height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}
                onMouseEnter={(e) => show(e, (
                  <>
                    <strong style={{ fontWeight: 600 }}>{row.label}</strong>
                    <br />
                    {row.mapMeanPercent!.toFixed(1)}% of milestones typically expected at this age, securely met
                    <br />
                    across {row.reportableChildren} child{row.reportableChildren === 1 ? '' : 'ren'}
                    {typeof row.denominatorMean === 'number'
                      ? `, averaging ${row.denominatorMean.toFixed(0)} milestones each`
                      : ''}
                  </>
                ))}
                onMouseMove={(e) => show(e, (
                  <>
                    <strong style={{ fontWeight: 600 }}>{row.label}</strong>
                    <br />
                    {row.mapMeanPercent!.toFixed(1)}% of milestones typically expected at this age, securely met
                    <br />
                    across {row.reportableChildren} child{row.reportableChildren === 1 ? '' : 'ren'}
                    {typeof row.denominatorMean === 'number'
                      ? `, averaging ${row.denominatorMean.toFixed(0)} milestones each`
                      : ''}
                  </>
                ))}
                onMouseLeave={hide}
              >
                {/* Hairline grid behind the bar. Solid, never dashed. */}
                {TICKS.map((t) => (
                  <span
                    key={t}
                    aria-hidden
                    style={{
                      position: 'absolute', left: `${t}%`, top: 0, bottom: 0, width: 1,
                      background: t === 0 ? T.axis : T.grid,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${Math.max(0, Math.min(100, row.mapMeanPercent))}%`,
                    background: SERIES_1, borderRadius: '2px 4px 4px 2px', minWidth: 2,
                  }}
                />
                <span
                  style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `calc(${Math.max(0, Math.min(100, row.mapMeanPercent))}% + 8px)`,
                    display: 'flex', alignItems: 'center',
                    fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.textPrimary,
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                  }}
                >
                  {row.mapMeanPercent.toFixed(1)}%
                  <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                    n = {row.reportableChildren}
                  </span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {anyReportable ? (
        <div style={{ position: 'relative', height: 18, marginTop: 6 }}>
          {TICKS.map((t) => (
            <span
              key={t}
              style={{
                position: 'absolute', left: `${t}%`, transform: t === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                fontFamily: T.sans, fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t}%
            </span>
          ))}
        </div>
      ) : null}

      <p style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted, lineHeight: 1.6, marginTop: 14 }}>
        Listed alphabetically, not ordered by figure. Each {unitLabel} is shown beside the number of
        children it stands for; a {unitLabel} with fewer than twelve reportable children shows the
        reason instead of a figure.
      </p>

      {tableOpen ? (
        <DataTable
          head={['Name', 'Children checked in', 'Children in the figure', 'Securely met', 'Milestones each']}
          rows={rows.map((r) => [
            r.label,
            r.childrenAssessed,
            r.suppressed ? 'not shown' : r.reportableChildren,
            r.suppressed || typeof r.mapMeanPercent !== 'number' ? 'not shown' : `${r.mapMeanPercent.toFixed(1)}%`,
            r.suppressed || typeof r.denominatorMean !== 'number' ? 'not shown' : r.denominatorMean.toFixed(0),
          ])}
        />
      ) : null}

      <TooltipLayer tip={tip} />
    </VizRoot>
  );
}
