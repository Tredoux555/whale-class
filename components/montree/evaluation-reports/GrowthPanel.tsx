'use client';

/**
 * Montree Milestones — window-over-window growth.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Not for app/montree/parent/** or components/parent/**.          │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * Growth is within-child movement between two check-in windows, summed across the
 * children who have a check-in in BOTH. It is the primary evidence at small n: an
 * individual trajectory is defensible where a cross-sectional comparison is not.
 *
 * The bar is a second ordinal ramp in its own hue family, so "moved up / steady /
 * watching" can never be mistaken for "secure / developing / emerging".
 *
 * "Watching" is not a failure category — it holds milestones that went down a band and
 * milestones sitting at emerging in both windows, i.e. the ones a teacher would want to
 * look at next. It is deliberately printed rather than folded into "steady".
 */
import { useState } from 'react';
import { GROWTH_COLOR, GROWTH_LABEL, GROWTH_ORDER, T, windowLabel, type GrowthKey } from './tokens';
import { Callout, DataTable, StatTile, SuppressionNote, TableToggle, TileRow } from './ReportChrome';
import { TooltipLayer, VizRoot, useTooltip } from './Tooltip';

export interface GrowthData {
  fromWindow: string;
  toWindow?: string;
  pairedChildren: number;
  comparable: number;
  movedUp: number;
  steady: number;
  watching: number;
  movedUpPercent: number | null;
  suppressed: boolean;
  reason: string | null;
}

const LABEL_MIN_SHARE = 0.12;

export default function GrowthPanel({ growth }: { growth: GrowthData | null }) {
  const { tip, show, hide } = useTooltip();
  const [tableOpen, setTableOpen] = useState(false);

  if (!growth) {
    return (
      <Callout title="Only one check-in window so far">
        Growth appears here as soon as a second window is complete. It compares each child with
        themselves between two windows, which is the part of this picture that holds up with a
        small number of children.
      </Callout>
    );
  }

  const values: Record<GrowthKey, number> = {
    movedUp: growth.movedUp,
    steady: growth.steady,
    watching: growth.watching,
  };
  const total = growth.comparable || (values.movedUp + values.steady + values.watching);

  return (
    <VizRoot>
      <TileRow>
        <StatTile
          label="Children in both windows"
          value={String(growth.pairedChildren)}
          context={`${windowLabel(growth.fromWindow)} → ${windowLabel(growth.toWindow ?? null)}`}
        />
        <StatTile
          label="Milestones moved up a band"
          value={String(growth.movedUp)}
          context={
            growth.suppressed || growth.movedUpPercent === null
              ? 'Shown as a count only'
              : `${growth.movedUpPercent.toFixed(1)}% of the ${total} milestones checked in both windows`
          }
          tone="hero"
        />
        <StatTile label="Holding steady" value={String(growth.steady)} context="Same band, developing or secure" />
        <StatTile label="We are watching" value={String(growth.watching)} context="Moved down, or still emerging" />
      </TileRow>

      {total > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '18px 0 8px' }}>
            <TableToggle open={tableOpen} onToggle={() => setTableOpen((v) => !v)} />
          </div>
          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            {GROWTH_ORDER.map((key) => {
              const value = values[key];
              if (!value) return null;
              const share = value / total;
              const content = (
                <>
                  <strong style={{ fontWeight: 600 }}>{GROWTH_LABEL[key]}</strong>
                  <br />
                  {value} of {total} milestones checked in both windows ({Math.round(share * 100)}%)
                </>
              );
              return (
                <div
                  key={key}
                  onMouseEnter={(e) => show(e, content)}
                  onMouseMove={(e) => show(e, content)}
                  onMouseLeave={hide}
                  style={{
                    flex: `${share} 1 0`, background: GROWTH_COLOR[key], minWidth: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default',
                  }}
                >
                  {share >= LABEL_MIN_SHARE ? (
                    <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 600, color: key === 'watching' ? 'rgba(255,255,255,0.94)' : '#22120a', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(share * 100)}%
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
            {GROWTH_ORDER.map((key) => (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 12, color: T.textSecondary }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: GROWTH_COLOR[key] }} />
                {GROWTH_LABEL[key]}
              </span>
            ))}
          </div>
        </>
      ) : null}

      <SuppressionNote reason={growth.suppressed ? growth.reason : null} />

      {tableOpen ? (
        <DataTable
          head={['Movement', 'Milestones', 'Share']}
          rows={GROWTH_ORDER.map((key) => [
            GROWTH_LABEL[key],
            values[key],
            total ? `${Math.round((values[key] / total) * 100)}%` : '—',
          ])}
        />
      ) : null}

      <TooltipLayer tip={tip} />
    </VizRoot>
  );
}
