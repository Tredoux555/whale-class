'use client';

/**
 * Montree Milestones — participation across the three check-in windows.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Not for app/montree/parent/** or components/parent/**.          │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * "How many children have we sat with, and when" — the first question a principal asks,
 * and the number every other figure on the page depends on. It is a count, so it is a
 * count: stat tiles and one small single-series bar per window, not a percentage.
 *
 * The window a reader is currently looking at is emphasised; the others recede. That is
 * emphasis, not eight hues for three bars.
 */
import { SERIES_1, T, windowLabel } from './tokens';
import { StatTile, TileRow } from './ReportChrome';
import { TooltipLayer, VizRoot, useTooltip } from './Tooltip';

export interface WindowParticipation {
  windowCode: string;
  completed: number;
  children: number;
}

export interface ParticipationSummary {
  childrenOnRoll: number;
  childrenAssessed: number;
  sessionsCompleted: number;
  sessionsInProgress: number;
  sessionsAbandoned: number;
  observationOnlySessions: number;
  classroomsWithData: number;
  classroomsTotal: number;
}

export default function ParticipationPanel({
  windows, summary, activeWindow, onSelectWindow,
}: {
  windows: WindowParticipation[];
  summary: ParticipationSummary;
  activeWindow: string;
  onSelectWindow?: (code: string) => void;
}) {
  const { tip, show, hide } = useTooltip();
  const max = Math.max(1, ...windows.map((w) => w.children));

  return (
    <VizRoot>
      <TileRow>
        <StatTile
          label="Children checked in"
          value={String(summary.childrenAssessed)}
          context={
            summary.childrenOnRoll
              ? `of ${summary.childrenOnRoll} on roll, in ${windowLabel(activeWindow)}`
              : `in ${windowLabel(activeWindow)}`
          }
          tone="hero"
        />
        <StatTile
          label="Check-ins finished"
          value={String(summary.sessionsCompleted)}
          context={
            summary.sessionsInProgress || summary.sessionsAbandoned
              ? `${summary.sessionsInProgress} still open · ${summary.sessionsAbandoned} ended early`
              : 'None left open'
          }
        />
        <StatTile
          label="Classrooms taking part"
          value={`${summary.classroomsWithData}${summary.classroomsTotal ? ` / ${summary.classroomsTotal}` : ''}`}
          context={summary.observationOnlySessions ? `${summary.observationOnlySessions} observation-only` : 'This window'}
        />
      </TileRow>

      <div style={{ marginTop: 22, display: 'grid', gap: 12 }}>
        {windows.map((w) => {
          const share = w.children / max;
          const active = w.windowCode === activeWindow;
          const content = (
            <>
              <strong style={{ fontWeight: 600 }}>{windowLabel(w.windowCode)}</strong>
              <br />
              {w.children} child{w.children === 1 ? '' : 'ren'} · {w.completed} finished check-in{w.completed === 1 ? '' : 's'}
            </>
          );
          return (
            <button
              key={w.windowCode}
              type="button"
              onClick={onSelectWindow ? () => onSelectWindow(w.windowCode) : undefined}
              aria-pressed={active}
              onMouseEnter={(e) => show(e, content)}
              onMouseMove={(e) => show(e, content)}
              onMouseLeave={hide}
              style={{
                display: 'grid', gridTemplateColumns: '82px 1fr auto', alignItems: 'center', gap: 12,
                background: 'transparent', border: 'none', padding: '4px 0', width: '100%',
                cursor: onSelectWindow ? 'pointer' : 'default', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: T.sans, fontSize: 13, color: active ? T.textPrimary : T.textSecondary, fontWeight: active ? 600 : 400 }}>
                {windowLabel(w.windowCode)}
              </span>
              <span style={{ position: 'relative', display: 'block', height: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                <span
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${Math.max(w.children ? 2 : 0, share * 100)}%`,
                    background: active ? SERIES_1 : 'rgba(57,135,229,0.34)',
                    borderRadius: '2px 4px 4px 2px',
                  }}
                />
              </span>
              <span style={{ fontFamily: T.sans, fontSize: 12, color: T.textSecondary, fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>
                {w.children} child{w.children === 1 ? '' : 'ren'}
              </span>
            </button>
          );
        })}
      </div>

      <p style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted, lineHeight: 1.6, marginTop: 14 }}>
        Autumn, Winter and Spring are the three check-in windows in a school year. A child may be
        checked in over several days inside one window; that still counts once.
      </p>

      <TooltipLayer tip={tip} />
    </VizRoot>
  );
}
