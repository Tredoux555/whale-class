'use client';

/**
 * Montree Milestones — shared chrome for the reflection reports.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Do not import anything from this file into app/montree/parent/**│
 * │ or components/parent/**. These are leadership surfaces (principal, org tier).    │
 * │ Parents see the Growth Story for their own child and nothing school-wide.        │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * Card, section heading, stat tile, band chip, legend, suppression note, empty state.
 * Everything a report page needs that is not itself a chart.
 *
 * Vocabulary rule (ARCHITECTURE.md §0): no "test", "exam", "quiz", "score", "grade",
 * "mark", "pass", "fail", "wrong", "percentile", "rank", "above/below average" or
 * "behind" appears in any string a human reads here, and none may be added.
 */
import type { ReactNode } from 'react';
import { BAND_COLOR, BAND_LABEL, BAND_ORDER, T, type BandKey } from './tokens';

/* ───────────────────────────────────────────────────────────────────── layout */

export function Section({
  title, subtitle, children, action,
}: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, color: T.textPrimary, margin: 0, letterSpacing: -0.2 }}>
            {title}
          </h2>
          {subtitle ? (
            <p style={{ fontFamily: T.sans, fontSize: 13, color: T.textSecondary, margin: '6px 0 0', maxWidth: 720, lineHeight: 1.55 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, padding = 20 }: { children: ReactNode; padding?: number }) {
  return (
    <div style={{ background: T.card, border: T.cardBorder, borderRadius: 16, padding }}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── stat tile */

/**
 * A stat tile, not a one-bar chart. When the story is one number, the number IS the
 * chart — the `n` beside it is mandatory for anything expressed as a percentage.
 */
export function StatTile({
  label, value, unit, context, tone = 'default',
}: {
  label: string;
  value: string;
  unit?: string;
  context?: string;
  tone?: 'default' | 'hero' | 'muted';
}) {
  const size = tone === 'hero' ? 40 : 28;
  const color = tone === 'muted' ? T.textSecondary : T.textPrimary;
  return (
    <div
      style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: 14,
        padding: '16px 18px',
        minWidth: 150,
        flex: '1 1 170px',
      }}
    >
      <div style={{ fontFamily: T.sans, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: T.textMuted }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span style={{ fontFamily: T.sans, fontSize: size, fontWeight: 600, color, lineHeight: 1.05 }}>{value}</span>
        {unit ? <span style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary }}>{unit}</span> : null}
      </div>
      {context ? (
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
          {context}
        </div>
      ) : null}
    </div>
  );
}

export function TileRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────────── band pieces */

/** Identity is never colour-alone: the chip always carries its own word. */
export function BandChip({ band }: { band: BandKey | null }) {
  if (!band) {
    return (
      <span style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>—</span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.textPrimary,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 999, padding: '4px 11px 4px 8px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 3, background: BAND_COLOR[band], flexShrink: 0 }} />
      {BAND_LABEL[band]}
    </span>
  );
}

export function BandLegend({ bands = BAND_ORDER }: { bands?: BandKey[] }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
      {bands.map((b) => (
        <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 12, color: T.textSecondary }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: BAND_COLOR[b] }} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── suppression notice */

/**
 * A suppressed figure is never a blank space. It is replaced by the reason, in the
 * same place the figure would have been — that is the whole point of the rule.
 */
export function SuppressionNote({ reason }: { reason: string | null | undefined }) {
  if (!reason) return null;
  return (
    <div
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 12, padding: '11px 14px', marginTop: 12,
      }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1.4 }}>🔒</span>
      <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, margin: 0, lineHeight: 1.6 }}>
        {reason}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── notices */

export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.20)',
        borderRadius: 14, padding: '14px 16px',
      }}
    >
      {title ? (
        <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.emerald, marginBottom: 6 }}>{title}</div>
      ) : null}
      <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── empty state */

export interface EmptyStateStep { title: string; detail: string }

/**
 * Zero-data state. Every view has one, and it always tells the reader what to do next —
 * an empty dashboard on a live demo is a dead end otherwise.
 */
export function EmptyState({
  headline, lead, steps, footnote,
}: { headline: string; lead: string; steps: EmptyStateStep[]; footnote?: string }) {
  return (
    <div
      style={{
        background: T.card, border: T.cardBorder, borderRadius: 18,
        padding: '34px 28px', textAlign: 'left', maxWidth: 720,
      }}
    >
      <div aria-hidden style={{ fontSize: 30, marginBottom: 12 }}>🌱</div>
      <h3 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500, color: T.textPrimary, margin: 0, letterSpacing: -0.2 }}>
        {headline}
      </h3>
      <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, lineHeight: 1.65, margin: '10px 0 22px' }}>
        {lead}
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
        {steps.map((s, i) => (
          <li key={s.title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span
              style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: 999,
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)',
                color: T.emerald, fontFamily: T.sans, fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {i + 1}
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                {s.title}
              </span>
              <span style={{ display: 'block', fontFamily: T.sans, fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginTop: 3 }}>
                {s.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {footnote ? (
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, lineHeight: 1.6, margin: '22px 0 0' }}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────── table toggle */

/**
 * Every chart ships a table view. It is the accessibility channel for anyone who cannot
 * use colour, and the honest channel for anyone who wants the actual numbers.
 */
export function TableToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="btn btn-ghost btn-outline btn-sm btn-pill"
    >
      {open ? 'Hide the numbers' : 'Show the numbers'}
    </button>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 14 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: T.sans, fontSize: 12.5 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: i === 0 ? 'left' : 'right', padding: '8px 10px',
                  color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.axis}`, whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: ci === 0 ? 'left' : 'right', padding: '8px 10px',
                    color: ci === 0 ? T.textPrimary : T.textSecondary,
                    borderBottom: `1px solid ${T.grid}`,
                    fontVariantNumeric: ci === 0 ? 'normal' : 'tabular-nums',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
