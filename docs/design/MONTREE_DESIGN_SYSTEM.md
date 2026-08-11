# Montree Button Design System — "Soft Elevation"

## 🔒 STATUS: LOCKED IN as of 2026-08-10

**Decision by:** Tredoux (founder).
**Process:** three live options were built side-by-side in `proof/pss-button-options.html` —
*Soft Elevation* (Option 2), *Lunchbox Forest* (Option 1), and *Arcade Press* (Option 3).
Tredoux reviewed all three and chose **Soft Elevation**. This is not a placeholder or a
first-draft — it is the sign-off, and it applies codebase-wide.

**Rollout:** ~2,000 buttons converted across the Montree app in 5 commits
(`4561158f`, `4e459134`, `2660c121`, `139804e2`, `da91a090`). See
`HANDOFF_DESIGN_LOCKIN_2026-08-10.md` (repo root) for the wave-by-wave breakdown and
`docs/design/CONVERSION_GUIDE.md` for the mechanical conversion rules those waves followed.

**This is the standard for all future Montree builds.** Every new button, CTA, or action
link anywhere in `app/montree/**`, `app/admin/**`, and shared `components/montree/**`
(outside the protected surfaces listed in §4) uses this system from the moment it is
written. There is no "convert it later" — new code ships correct the first time.

---

## 1. The rule for new code

> **NEVER hand-roll button styling.** No `bg-*`, no `hover:bg-*`, no `shadow-*`, no
> `rounded-*`, no inline `style={{ background: … }}`, no one-off `CSSProperties` object,
> no new Tailwind gradient string. If it is a `<button>`, a `<Link>`/`<a>` styled as a
> button, or a `role="button"` element with an `onClick`, it gets:
>
> ```
> className="btn btn-<variant> btn-<size>"
> ```
>
> plus modifiers as needed. That is the entire API. If what you need isn't in the table
> below, it doesn't exist yet — see §6 (Open items), and add it centrally to
> `app/globals.css`, never inline at the call site.

The system lives entirely in plain, unlayered CSS in `app/globals.css`, in the section
headed **"MONTREE BUTTON SYSTEM — SOFT ELEVATION"** (`--mt-*` custom properties + `.btn`
rules), with the matching Tailwind-side tokens (`forest-*`, `emerald-*`) mirrored in
`tailwind.config.ts`. There is no component to import — it is just class names.

---

## 2. Class API reference

### Variants (`btn-<variant>` — exactly one, always paired with `btn`)

| Variant | When to use | Notes |
|---|---|---|
| `btn-primary` | The single loudest action in its group — the main CTA, a form's primary submit, "Save", "Get started". | Emerald gradient (`#35D89C → #219A6D`), near-black label (`--mt-ink`), one soft emerald shadow, hairline border. Legible on dark and light without `on-light`. |
| `btn-secondary` | A neutral/secondary action next to a primary one — "Cancel" beside "Save", toolbar buttons, non-destructive per-row actions. | Quiet raised translucent surface + hairline border on dark forest. **Needs `on-light`** on light surfaces (renders as a dark slab otherwise). |
| `btn-ghost` | Text-only / lowest-emphasis action — close icons, "skip", inline links styled as actions. | Transparent, muted sage text, tinted hover, no elevation at all. **Needs `on-light`** on light surfaces. Add `btn-outline` for a hairline border (e.g. a ghost "Cancel" next to a solid CTA). |
| `btn-danger` | A confirmed destructive action — "Delete", "Remove", "Yes, delete this". | Solid red gradient + soft red shadow, legible on both contexts. Add `btn-soft` for a quieter tinted-red variant when the destructive action shouldn't be the loudest thing on screen (e.g. a "Remove" row action vs. a confirmation dialog's final "Yes, delete"). |
| `btn-gold` | The brand accent action — "AI generate", featured/upsell actions, anything that should read as special without being a second primary. | Gold gradient, dark ink label, soft gold shadow. Legible on both contexts. |

### Sizes (`btn-<size>` — exactly one)

| Size | Height | Use for |
|---|---|---|
| `btn-sm` | 36px | Per-row actions, chips-that-act, table row buttons, toolbar icon buttons. |
| `btn-md` | 44px | The default — toolbar buttons, modal footers, most in-flow actions. |
| `btn-lg` | 54px | Hero CTAs, form submits, modal primary actions. |

An un-sized `.btn` silently falls back to `md` metrics, so a half-converted button never
collapses — but always set a size explicitly in new code.

### Modifiers (combine freely with variant + size)

| Modifier | Effect |
|---|---|
| `btn-full` | `width: 100%`. This is what `w-full` becomes — never keep both. |
| `btn-icon` | Square icon-only button, sized off the paired size class (44×44 at `md`, 36×36 at `sm`, 54×54 at `lg`). No text gap. |
| `btn-round` | With `btn-icon`, makes it a circle (`border-radius: 999px`). |
| `btn-pill` | Fully rounded pill for text buttons — selected/unselected chip rows, filter pills. |
| `btn-outline` | With `btn-ghost` only — adds a hairline border, for a quiet "Cancel" sitting beside a solid CTA. |
| `btn-soft` | With `btn-danger` only — the low-volume tinted-red style. |
| `btn-glow` | A refined breathing ring animation (`prefers-reduced-motion` respected). **Use only where the button is meant to visibly draw the eye** (a hero CTA, an unmissable next step). Do not add it by default — it is emphasis, not decoration. |

### `.on-light` — context override

Tokens default to the **dark forest** surface (`#0A1A0F` / `#08140C`). Any screen or
container on a light surface (white cards/modals, `bg-white`, `bg-gray-50`,
`bg-slate-50`, print/PDF views) needs `on-light` so shadows and hairlines re-tune for a
light background.

- Put it directly on the button (`btn btn-secondary btn-md on-light`), **or** once on the
  light ancestor (the modal shell, the `bg-white rounded-2xl` card, the page wrapper) —
  it cascades, and putting it once on the container is the cheaper, less error-prone move
  for a form with several buttons.
- `btn-primary`, `btn-danger`, `btn-gold` are solid and legible on both contexts already —
  `on-light` only softens their contact shadow slightly. Add it when the whole screen is
  light; skip it if unsure.
- `btn-secondary` and `btn-ghost` **must** get `on-light` on a light surface or they
  render wrong (dark slab / low-contrast text on white).

---

## 3. Design tokens reference

All tokens are custom properties on `:root` (re-tuned inside `.on-light`) in
`app/globals.css`, prefixed `--mt-*`. Mirrored Tailwind utility tokens (`forest-bg`,
`forest-card`, `emerald-primary`, `emerald-deep`, `forest-gold`, `forest-danger`, the
`forest-*` `boxShadow` keys, and `btn`/`btn-sm`/`btn-lg` `borderRadius` keys) live in
`tailwind.config.ts` for use outside `.btn` itself (cards, inputs, non-button surfaces
that want to match).

**What the tokens encode — the Soft Elevation recipe.** Every solid variant is built from
the same four ingredients, defined once at the top of the button section in
`app/globals.css`:

1. **One soft directional shadow per hue** (`--mt-sh-emerald`, `--mt-sh-neutral`,
   `--mt-sh-danger`, `--mt-sh-gold`, each with a `-lift` and `-press` state). A single,
   wide, hue-tinted fall with a *negative* spread — no stacked contact layer, no ambient
   bloom. It should read as the button floating a few millimetres off the surface, not
   sitting in a box.
2. **1px hairline border** (`--mt-hairline` / `--mt-hairline-quiet` / `--mt-hairline-light`).
   A light border on solid variants (dark-tinted on light surfaces) is what gives edge
   definition now that there's no stacked contact shadow doing that job.
3. **Gentle 180° top-lit gradient** (`--mt-grad-cta`, `--mt-grad-gold`, `--mt-grad-danger`,
   each with `-hover` / `-press` stops). Low contrast between the two stops — just enough
   to keep the face from reading as flat paint, not enough to look glossy or 3-D.
4. **Press behaviour**: `:active` triggers `transform: translateY(1px)` (shared by every
   variant via the base `.btn` rule) while the variant's shadow tightens to its `-press`
   value beneath it. Hover instead lifts by `translateY(-1px)` and the shadow spreads to
   its `-lift` value. The motion — not any extra ornament — is what sells "pressable."

Other tokens: `--mt-r-btn` / `-sm` / `-lg` (10px / 8px / 12px radius, tighter at `sm`,
looser at `lg`), `--mt-focus` (focus-visible ring colour), `--mt-ease` (shared
`cubic-bezier` easing). `--mt-bevel` / `--mt-bevel-soft` are intentionally no-op
placeholders — Soft Elevation has no inset bevel; the hairline border does that job
instead. Type is fixed at 600 weight, neutral letter-spacing, across every variant.

These rules are **unlayered plain CSS**, so they beat Tailwind utilities living in
`@layer utilities` — a stray `bg-blue-500` on a `.btn` will not fight it. `.btn`
deliberately does not set `width`, `margin`, `position`, or `flex-grow`, so layout
utilities (`w-full`→`btn-full` aside, `flex-1`, `mt-4`, `absolute`, etc.) keep working
untouched alongside it.

---

## 4. What NOT to touch — protected separate brands

The `.btn` system is the Montree app's button language. These surfaces are **deliberate,
signed-off, separate design systems** and must keep using their own tokens for any new
feature work — never `.btn`:

| Surface | System | Files |
|---|---|---|
| PSS (formerly "Potato Snaps") teacher/parent app | "Lunchbox Modern" `pt-*` classes | `app/potato/**`, `components/potato/**`, `lib/potato/**` (canonical: `lib/potato/ui.ts`) |
| CMS — Classroom Management System (parent intake → engine → teacher outputs, org layer) | "Harbor" `cms-*` classes (`.cms-btn`, `.cms-btn-primary`, `.cms-tone-*`, `.cms-card`, …) — light-first Harbor blue, Source Serif 4 + Inter. Scoped to `.cms-root`, set by `app/cms/layout.tsx`. | `app/cms/**`, `components/cms/**`, `lib/cms/**`; tokens in the "CMS BUTTON SYSTEM — SOFT ELEVATION / HARBOR" section at the bottom of `app/globals.css` + `harbor-*` in `tailwind.config.ts` (canonical: `docs/design/CMS_DESIGN_SYSTEM.md`) |
| Montree Home — homeschool-parent screens | `HOME_THEME` ("Tender Cartography": cream/dark-teal) + `BIO` (Bioluminescent Depth: dark mint/jade) — teachers see neither | `lib/montree/home-theme.ts`, `lib/montree/bioluminescent-theme.ts` |
| First-touch signup / funnel pages | "Lanternlight Ceremony" `fn-*` classes, `FUNNEL_CSS`, `FT` tokens | `components/montree/funnel/funnel-theme.ts` and consumers (`AstraNarrator.tsx`, `GoldenThread.tsx`, funnel/onboarding pages) |
| Kids' games | `GAME_COLORS` / games design tokens | `lib/games/design-system.ts` |
| Tredoux's personal platform (diary/planner/coach) | "Sanctuary" `T` tokens | `lib/story/personal-theme.ts` |
| Montree Milestones child-facing (tablet) screens | Child palette `C` (warm cream, ages 3) — separate from the teacher-chrome `T` palette in the same file | `components/montree/evaluation/tokens.ts` |

If a future feature needs new buttons **inside one of these surfaces**, it uses that
surface's own system, not `btn btn-*`. If a founder decision later wants one of these
surfaces onto Soft Elevation, that is a deliberate, reviewed edit to that surface's theme
file (or a new dedicated `.btn` variant) — never a silent per-callsite swap.

---

## 5. Deliberate exclusions from the rollout

The rollout intentionally did not convert these categories, because they are not "a
button that happens to be styled" — the visual treatment *is* the control, or the colour
*is* meaningful data:

- **Data-driven status colours** — anything where the fill/border is computed from data
  rather than a nameable UI state (`style={{ background: area.color }}`,
  `borderColor: child.avatar_color`, `statusColor(status)`). Converting these to a fixed
  variant would erase the information the colour carries.
- **Toggle switches** — the `h-7 w-12 rounded-full` style proxy toggle. The geometry *is*
  the control; it is not a button.
- **Tab bars / segmented controls** — unless a "tab" is visibly a filled action button, in
  which case it was left for human judgement.
- **Camera shutters** — capture-flow UI where the shape/animation is the affordance.
- **Content tiles** — cards/tiles/list rows that happen to be clickable but read as
  content (photo tiles, student cards, dashboard tiles with icon + title + subtitle), not
  as actions.

**Guidance for new instances:** the same exclusion logic applies going forward. Before
reaching for `.btn`, ask "does this need to look like an action, or does its own shape
carry meaning/state that a generic button face would erase?" If the latter, it's exempt —
build it with its own styling, same as the excluded categories above, and don't force it
into the variant table just for consistency's sake.

---

## 6. Open items — known gaps

- **No blue/info variant.** This is the most-requested gap from the rollout. There is
  currently no `.btn-info` for a neutral "informational" action distinct from
  `btn-secondary`. Anyone who needs one: this is a case for a new centrally-defined
  variant, not an inline override.
- **No soft-primary.** `btn-danger` has a `btn-soft` quiet mode; `btn-primary` does not.
  If a low-volume emerald action is needed, it currently has no home.
- **No sub-`sm` chip size.** The smallest size is `btn-sm` (36px). Very dense chip rows
  that want something smaller than that have no matching size token today.
- **Imperative-hover-mutation buttons still unconverted.** A handful of buttons that
  mutate their own inline style imperatively (via refs / DOM manipulation on hover,
  rather than CSS `:hover`) were out of scope for the mechanical conversion waves and
  still hand-roll their visuals. These need a bespoke pass, not a class swap.

**Rule for closing any of these:** any new variant, size, or modifier is added centrally
to the `MONTREE BUTTON SYSTEM — SOFT ELEVATION` section of `app/globals.css` (and mirrored
in `tailwind.config.ts` if it needs a Tailwind-side token), reviewed once, then available
everywhere. Never solve a gap with an inline style or a one-off class at the call site —
that is exactly the pattern this system replaced.

---

## 7. Copy-paste starter snippets

**Primary CTA**
```jsx
<button onClick={handleSubmit} className="btn btn-primary btn-lg">
  Get started
</button>
```

**Modal footer pair — Cancel / Save (on a light modal shell)**
```jsx
<div className="flex gap-3">
  <button onClick={handleClose} className="btn btn-secondary btn-md flex-1 on-light">
    {t('common.cancel')}
  </button>
  <button
    onClick={handleSubmit}
    disabled={saving || !form.name.trim()}
    className={`btn btn-md flex-1 ${
      form.name.trim() ? 'btn-primary' : 'btn-secondary on-light'
    }`}
  >
    {t('common.save')}
  </button>
</div>
```

**Icon button**
```jsx
<button onClick={closeForm} aria-label="Close" className="btn btn-ghost btn-icon btn-sm text-xl">
  ✕
</button>
```

**Danger delete (confirmed destructive action)**
```jsx
<button onClick={confirmDelete} className="btn btn-danger btn-md">
  Delete
</button>
```
Quiet variant for a per-row "Remove" that shouldn't be the loudest thing on screen:
```jsx
<button onClick={handleRemove} className="btn btn-danger btn-soft btn-sm">
  Remove
</button>
```

**Full-width mobile CTA**
```jsx
<button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
  Continue
</button>
```

**Glow hero CTA** (only where the original design calls for a breathing emphasis ring)
```jsx
<button onClick={startTrial} className="btn btn-gold btn-lg btn-glow">
  Start free trial
</button>
```

**Selected / unselected pill ternary**
```jsx
<button
  onClick={() => setSelectedChild(c)}
  className={`btn btn-sm btn-pill ${c.id === selectedChild.id ? 'btn-primary' : 'btn-secondary'}`}
>
  {c.name}
</button>
```

**Light-surface form submit**
```jsx
<div className="bg-white rounded-2xl p-6 on-light">
  <button type="submit" className="btn btn-primary btn-md btn-full">
    {t('form.submit')}
  </button>
</div>
```

---

## 8. Further reading

For the mechanical conversion rules used to migrate the existing ~2,000 buttons
(archetype tables, before/after examples, inline-`style` conversion, QA checklists), see
`docs/design/CONVERSION_GUIDE.md`. That guide is written for wave-worker agents doing
conversion work; this document is the standing reference for anyone writing **new** UI.
