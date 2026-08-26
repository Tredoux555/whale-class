// lib/lens/ui.ts
// The small shared vocabulary every Lens screen builds from.
//
// Lens uses TAILWIND with the Montree "dark forest" tokens that already exist in
// tailwind.config.ts (forest-bg, forest-card, emerald-primary, forest-gold,
// forest-text, forest-muted, forest-line). It deliberately does NOT use the
// locked Montree `.btn` system: that system belongs to the Montree product's
// chrome, Lens is a separate brand surface with no Montree nav, and importing
// it would drag the whole design-system dependency into an app that has to work
// one-thumbed in a silent classroom.
//
// The class strings below are the only thing that stands in for a component
// library. They are exported as constants rather than components so a page can
// still add a class or drop one without fighting a prop API.
//
// 🚨 THE STYLESHEET IS INJECTED WITH <style dangerouslySetInnerHTML>, NEVER
// <style jsx>. Turbopack rejects a styled-jsx tag that is not the direct child
// of a component's outermost return element, and that rule cost this repo twelve
// consecutive failed deploys. See app/potato/layout.tsx for the same note.

/** Full-bleed page background + safe areas. Applied by app/lens/layout.tsx. */
export const LENS_CSS = `
.ln-root{
  min-height:100dvh;
  background:#0A1A0F;
  color:#E8F0EA;
  -webkit-font-smoothing:antialiased;
  padding-top:env(safe-area-inset-top);
  padding-bottom:env(safe-area-inset-bottom);
}
.ln-root *{box-sizing:border-box}

/* The capture screen's thumb zone. A control here must be reachable one-handed
   on a 6" phone held low, because she is standing at the back of a silent room
   and cannot look at what she is tapping. */
.ln-thumb{
  padding-bottom:calc(env(safe-area-inset-bottom) + 12px);
}

/* Nothing in Lens is small enough to mis-tap. 44px is Apple's floor; the big
   capture buttons are far larger. */
.ln-tap{min-height:44px;min-width:44px}

/* A textarea that grows with the note rather than scrolling inside itself. */
.ln-field{
  background:rgba(8,20,12,0.55);
  border:1px solid rgba(52,211,153,0.20);
  border-radius:12px;
  color:#E8F0EA;
  width:100%;
  padding:10px 12px;
  font-size:16px; /* 16px or iOS zooms the whole page on focus */
  line-height:1.45;
}
.ln-field:focus{outline:2px solid rgba(52,211,153,0.55);outline-offset:1px}
.ln-field::placeholder{color:#6f9880}

/* Chips: the silent-classroom input. Selected state must be readable at a
   glance from arm's length, so it inverts rather than merely brightening. */
.ln-chip{
  border:1px solid rgba(52,211,153,0.25);
  background:rgba(8,20,12,0.55);
  color:#9FC7B0;
  border-radius:999px;
  padding:8px 14px;
  font-size:14px;
  line-height:1.2;
  white-space:nowrap;
}
.ln-chip[data-on="1"]{
  background:#34D399;
  border-color:#34D399;
  color:#06140C;
  font-weight:600;
}

/* Horizontal chip rails scroll rather than wrap — a wrapping rail changes
   height as she taps, which moves everything under her thumb. */
.ln-rail{
  display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;
}
.ln-rail::-webkit-scrollbar{display:none}

@media print{
  .ln-root{background:#fff;color:#000}
  .ln-noprint{display:none !important}
}
`;

// ------------------------------------------------------------------ classes --

export const CARD =
  'rounded-2xl border border-[rgba(52,211,153,0.20)] bg-[rgba(8,20,12,0.55)] p-4';

export const BTN_PRIMARY =
  'ln-tap inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-primary px-4 py-3 ' +
  'text-[15px] font-semibold text-forest-ink transition active:scale-[0.98] disabled:opacity-40';

export const BTN_SECONDARY =
  'ln-tap inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(52,211,153,0.28)] ' +
  'bg-[rgba(8,20,12,0.55)] px-4 py-3 text-[15px] font-medium text-forest-text transition ' +
  'active:scale-[0.98] disabled:opacity-40';

export const BTN_GHOST =
  'ln-tap inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[14px] ' +
  'text-forest-muted transition active:scale-[0.98] disabled:opacity-40';

export const BTN_DANGER =
  'ln-tap inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(248,113,113,0.35)] ' +
  'bg-[rgba(248,113,113,0.10)] px-3 py-2 text-[14px] font-medium text-forest-danger';

export const LABEL = 'block text-[12px] uppercase tracking-wider text-forest-muted mb-1.5';

export const H1 = 'font-[var(--font-lora),Georgia,serif] text-2xl text-forest-text';
export const H2 = 'font-[var(--font-lora),Georgia,serif] text-lg text-forest-text';

/** The gold rule that marks a section head across every Lens screen. */
export const RULE = 'h-px w-full bg-[linear-gradient(90deg,rgba(232,201,106,0.55),transparent)]';

// -------------------------------------------------------------------- utils --

/** HH:MM from an ISO instant, in the viewer's own timezone. */
export function clockLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dateLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
