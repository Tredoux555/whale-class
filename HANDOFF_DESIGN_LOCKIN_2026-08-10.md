# Handoff — Montree Design System Lock-In (2026-08-10)

**Read this if you're about to build any new Montree UI, or touch an existing button.**

## What happened

The Montree button system ("Soft Elevation") went from proof-of-concept to codebase-wide
standard and is now **locked in** as the design law for all future Montree builds.

1. **Proof.** Three candidate button treatments were built side-by-side in
   `proof/pss-button-options.html`: Option 1 "Lunchbox Forest", Option 2 "Soft
   Elevation", Option 3 "Arcade Press". Tredoux reviewed all three live and picked
   **Option 2, Soft Elevation**.
2. **System built.** The chosen system landed in `app/globals.css` under the header
   **"MONTREE BUTTON SYSTEM — SOFT ELEVATION"**: `--mt-*` custom properties (palette,
   gradients, per-hue soft shadows, geometry, hairline borders) plus the `.btn` base +
   variant/size/modifier classes. Matching Tailwind tokens (`forest-*`, `emerald-*`,
   `btn`/`btn-sm`/`btn-lg` radii) were mirrored into `tailwind.config.ts`.
3. **Codebase-wide conversion.** ~2,000 existing buttons across the app were mechanically
   converted from ad-hoc Tailwind/inline styling to the new `btn btn-<variant>
   btn-<size>` class API, in two parts across 5 commits:
   - **Part 1 — `className`-styled buttons** (commits `4561158f`, `4e459134`,
     `2660c121`): swapped visual Tailwind classes for `btn` classes across
     `app/montree/**`, `app/admin/**`, and shared `components/montree/**`. Layout classes
     (`flex-1`, `mt-*`, `absolute`, etc.) were preserved; only visual classes were
     replaced.
   - **Part 1b / Wave 1b — inline-`style` buttons** (commits `139804e2`, `da91a090`):
     converted buttons styled via literal `style={{ … }}` objects, shared `CSSProperties`
     constants, and style-returning functions (`ghostBtn()`, `primaryBtn(saving)`,
     `pill(active)`) into the same class API. ~243 buttons across
     `app/montree/dashboard/**` alone (per the worklist in the conversion guide), the
     largest single file being `photo-audit/page.tsx` (63 buttons).
4. **Lock-in.** Tredoux declared Soft Elevation the standing standard on 2026-08-10.
   Canonical docs were written (this handoff, plus the two files below) and pointers were
   added to `CLAUDE.md`, `HANDOFF_LATEST.md`, and `PROJECT_CONTEXT.md`.

## Where the system lives

- **The system itself:** `app/globals.css`, section "MONTREE BUTTON SYSTEM — SOFT
  ELEVATION" (`--mt-*` tokens + `.btn` rules). Tailwind mirror in `tailwind.config.ts`
  (`forest-*` colors, `forest-*` boxShadow, `btn`/`btn-sm`/`btn-lg` borderRadius).
- **Canonical spec (read this for the full class API + rationale):**
  `docs/design/MONTREE_DESIGN_SYSTEM.md`
- **Conversion rules (for anyone still doing mechanical conversion work):**
  `docs/design/CONVERSION_GUIDE.md`
- **Brand palette this all sits on top of:** `MONTREE_BRAND_PALETTE.md` (Dark Forest —
  emerald + gold on deep forest green).
- **Proof artifact:** `proof/pss-button-options.html` (the three-option comparison
  Tredoux chose from).

## The lock-in rule

> Every button, CTA, or action link in Montree app surfaces uses
> `className="btn btn-<variant> btn-<size>"` (+ modifiers). Never hand-roll button
> visuals with `bg-*`/`shadow-*`/`rounded-*` Tailwind or an inline `style={{ background:
> … }}` object. This applies to new code from the moment it's written — there is no
> "ship it ad-hoc, convert later."

Variants: `btn-primary` (emerald CTA) · `btn-secondary` (quiet neutral, needs `on-light`
on light surfaces) · `btn-ghost` (text-only, needs `on-light` on light surfaces) ·
`btn-danger` (+ `btn-soft` for quiet destructive) · `btn-gold` (brand accent). Sizes:
`btn-sm` (36px) / `btn-md` (44px) / `btn-lg` (54px). Modifiers: `btn-full`, `btn-icon` (+
`btn-round`), `btn-pill`, `btn-outline` (with `btn-ghost`), `btn-glow` (emphasis only,
don't add by default). Full reference with a when-to-use table and copy-paste snippets is
in `docs/design/MONTREE_DESIGN_SYSTEM.md`.

## What to do when building the next feature

1. **Check the spec first** — `docs/design/MONTREE_DESIGN_SYSTEM.md` §7 has copy-paste
   snippets for the common shapes (primary CTA, modal footer pair, icon button, danger
   delete, full-width mobile CTA, glow hero CTA, selected/unselected pill, light-surface
   form). Start from one of those rather than writing a button from scratch.
2. **Confirm which surface you're in.** If it's `app/montree/**`, `app/admin/**`, or
   shared `components/montree/**` (outside the exceptions below) — use `.btn`. If it's
   one of the protected separate brands below, use *that* surface's own system instead.
3. **Pick variant + size from the table**, not from vibes — the spec's §2 table maps
   intent ("the loudest action", "a confirmed destructive action", "the brand accent
   action") to a variant.
4. **Missing something?** Check §6 Open items below before improvising. If you truly need
   a new variant/size/modifier, add it centrally to `app/globals.css` (mirror in
   `tailwind.config.ts` if needed) and get it reviewed — never solve a gap with an inline
   override at the call site, that's the exact pattern this system replaced.

## What was excluded, and why

The conversion deliberately skipped:
- **Data-driven status colours** (`style={{ background: area.color }}`,
  `statusColor(status)`) — the colour carries information a fixed variant would erase.
- **Toggle switches** — the geometry *is* the control, not a button face.
- **Tab bars / segmented controls** — unless a tab visibly reads as a filled button.
- **Camera shutters** — capture-flow affordances where shape/animation *is* the UI.
- **Content tiles** — clickable cards that read as content, not actions (photo tiles,
  student cards, dashboard tiles).

New instances of any of these follow the same logic: if the shape or colour carries
meaning/state that a generic `.btn` face would erase, it's exempt — style it on its own
terms rather than forcing it into the variant table.

**Also out of scope, permanently — protected separate brands.** These have their own
signed-off design systems; new features in these surfaces use their own tokens, never
`.btn`:
- PSS (formerly "Potato Snaps") — `pt-*` "Lunchbox Modern" (`app/potato/**`,
  `components/potato/**`, `lib/potato/**`)
- Montree Home (homeschool parent) — `HOME_THEME` + `BIO` bioluminescent theme
  (`lib/montree/home-theme.ts`, `lib/montree/bioluminescent-theme.ts`)
- Signup/funnel pages — `fn-*` / `FUNNEL_CSS` (`components/montree/funnel/funnel-theme.ts`)
- Kids' games — `lib/games/design-system.ts`
- Tredoux's personal platform — `lib/story/personal-theme.ts` ("Sanctuary")
- Montree Milestones child-facing screens — the `C` child palette in
  `components/montree/evaluation/tokens.ts`

## Open items (known gaps, not yet solved)

- **No blue/info variant** — the most-requested gap. No `.btn-info` distinct from
  `btn-secondary` exists yet.
- **No soft-primary** — `btn-danger` has a `btn-soft` quiet mode; `btn-primary` doesn't.
- **No sub-`sm` chip size** — smallest is `btn-sm` (36px); very dense chip rows have
  nothing smaller.
- **Imperative-hover-mutation buttons still unconverted** — a small number of buttons
  that mutate their own inline style via refs/DOM manipulation on hover (rather than CSS
  `:hover`) were out of scope for the mechanical waves and still hand-roll their visuals.

Any of these gets solved by a centrally-reviewed addition to `app/globals.css`, not an
inline workaround. If you hit one of these gaps, either use the closest existing variant
and log it, or raise it for a proper addition — don't invent a one-off class.

## Docs updated as part of this lock-in

- `docs/design/MONTREE_DESIGN_SYSTEM.md` — new, canonical spec (this is the one to read).
- `docs/design/CONVERSION_GUIDE.md` — copied unchanged from repo root.
- `CLAUDE.md` — short "DESIGN SYSTEM — LOCKED" section inserted near the top.
- `HANDOFF_LATEST.md` — dated entry inserted at the top.
- `PROJECT_CONTEXT.md` — short design-system paragraph added under Technical Stack.
