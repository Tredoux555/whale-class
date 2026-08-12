# CMS Design System — "Soft Elevation / Harbor"

## 🔒 STATUS: LOCKED IN

**Decision by:** Tredoux (founder).
**Process:** four palettes were built side-by-side in `proof/cms-palette-options.html`.
Tredoux chose **Option 2 — Harbor**: calm, institutional, trustworthy; the one that reads
like an official school record. The button mechanics are **inherited** from Montree's
"Soft Elevation" (locked in 2026-08-10, rolled out to ~2,000 buttons) and re-hued to
Harbor blue on a light-first surface.

**This is the standard for all CMS builds.** Every new button, CTA, card and tag uses this
system from the moment it is written. There is no "convert it later".

The system lives entirely in plain, unlayered CSS in `app/globals.css`, in the section
headed **"CMS BUTTON SYSTEM — SOFT ELEVATION / HARBOR"** (`--cms-*` custom properties +
`.cms-btn` rules), with matching Tailwind tokens mirrored in the `@theme` block immediately
above it and, name-for-name, in `tailwind.config.ts`. There is no component to import — it is class names.

---

## 0. Where this lives now (read this first)

CMS was built as a standalone skeleton and has since been **ported into the Montree
production repo** as a protected brand surface, alongside PSS (`pt-*`, `app/potato/**`)
and Montree Home. It is listed in the protected-brands table of
`docs/design/MONTREE_DESIGN_SYSTEM.md`.

| What | Where |
|---|---|
| Pages | `app/cms/**` — `/cms` (landing), `/cms/parent/{dashboard,enroll,messages,updates}`, `/cms/teacher/{today,documents}`, `/cms/org/overview` |
| Theme + fonts + shell | `app/cms/layout.tsx` (one layout; derives the hourglass layer from the `x-pathname` header middleware already sets) |
| Components | `components/cms/**` (+ `components/cms/enroll/**`) |
| Engine · i18n · demo data | `lib/cms/engine/**` · `lib/cms/i18n/**` · `lib/cms/demo/**` |
| API | `app/api/cms/health`, `app/api/cms/demo/today` |
| Tokens | "CMS BUTTON SYSTEM — SOFT ELEVATION / HARBOR" section at the bottom of `app/globals.css`; `harbor-*` colours/shadows + `font-head`/`font-body` in `tailwind.config.ts` |
| Schema | `db/cms-schema.sql` |

### 🚨 Two rules the port added, which are now law

**1. Every CMS class is `cms-`-prefixed.** The skeleton used the bare `btn` / `btn-primary`
API because it was alone in its own repo. Montree owns `.btn` — it is dark-forest law
across ~2,000 buttons — so importing the skeleton's classes verbatim would have repainted
every button in the product Harbor blue. The classes are therefore `.cms-btn`,
`.cms-btn-primary`, `.cms-btn-soft`, `.cms-tone-danger`, and so on. This is exactly how
`pt-*` protects PSS. **Never un-prefix a CMS class, and never add a CMS rule that touches a
bare `.btn`/`.card`/`.input` selector.**

**2. Every CMS surface rule is scoped to `.cms-root`.** `app/cms/layout.tsx` wraps the whole
brand in `<div class="cms-root">`. The canvas, type, headings, scrollbars, selection colour
and the Arabic face all hang off that class rather than `html`/`body`, because `body`
belongs to the shared root layout and is painted by Montree. That scoping is what makes
`/cms/**` visually self-contained — pure Harbor, no dark-forest bleed, in either direction.

Fonts follow the same isolation principle: `app/cms/layout.tsx` loads Source Serif 4,
Inter and Noto Sans Arabic through `next/font` (the same mechanism `app/layout.tsx` uses
for Inter/Lora/Newsreader/Hanken) but publishes them as `--font-cms-head`,
`--font-cms-body` and `--font-cms-arabic`, so the root layout's `--font-inter` — which the
rest of the repo paints with — is never shadowed.

---

## 1. The rule for new code

> **NEVER hand-roll button styling.** No `bg-*`, no `hover:bg-*`, no `shadow-*`, no
> `rounded-*` on a button, no inline `style={{ background: … }}`, no one-off gradient
> string. If it is a `<button>`, a `<Link>` styled as a button, or a `role="button"`
> element with an `onClick`, it gets:
>
> ```
> className="cms-btn cms-btn-<variant> cms-btn-<size>"
> ```
>
> plus modifiers as needed. That is the entire API. If what you need isn't in the tables
> below, it doesn't exist yet — add it **centrally** to `app/globals.css`, never inline at
> the call site.

The same law extends to surfaces: cards are `.cms-card`, inset panels are `.cms-card-sunk`,
inputs are `.cms-input`, flags are `<Chip>` / `<Tag>`. If a screen invents its own white
box with its own border radius, that screen is wrong, not the system.

---

## 2. Harbor tokens

| Token | Hex | `--cms-*` | Tailwind | Use |
|---|---|---|---|---|
| Canvas | `#F1F5FA` | `--cms-canvas` | `harbor-canvas` | The page background. |
| Canvas deep | `#E7EFF7` | `--cms-canvas-deep` | `harbor-canvas-deep` | Scroll track, banded sections. |
| Surface / card | `#FFFFFF` | `--cms-surface` | `harbor-surface` | Every card and panel face. |
| Sunk | `#F5F8FC` | `--cms-sunk` | `harbor-sunk` | Inset notes, table headers, quiet plates. |
| Border | `#DCE4EF` | `--cms-border` | `harbor-border` | The default hairline. |
| Border strong | `#C1D0E2` | `--cms-border-strong` | `harbor-border-strong` | Inputs, secondary buttons, outlines. |
| **Accent** | **`#336FAF`** | `--cms-accent` | `harbor-accent` | The brand blue. Primary CTA top stop. |
| Accent hi | `#4A85C3` | `--cms-accent-hi` | `harbor-accent-hi` | Gradient top stop / hover. |
| **Accent deep** | **`#245483`** | `--cms-accent-deep` | `harbor-accent-deep` | Gradient bottom stop, accent text on light. |
| Accent press | `#1D456B` | `--cms-accent-press` | `harbor-accent-press` | `:active` bottom stop. |
| Text | `#131C27` | `--cms-text` | `harbor-text` | Body and headings. |
| Muted | `#617082` | `--cms-muted` | `harbor-muted` | Secondary copy, labels, help text. |
| Success | `#15916A` | `--cms-success` | `harbor-success` | Present/dropped-off states, teacher layer badge. |
| Danger | `#C9483F` | `--cms-danger` | `harbor-danger` | Destructive actions. |
| Danger deep | `#9E342D` | `--cms-danger-deep` | `harbor-danger-deep` | **Allergy** text/tint. |
| Amber | `#C08A2A` | `--cms-amber` | `harbor-amber` | The warm accent action. |
| Amber deep | `#976A18` | `--cms-amber-deep` | `harbor-amber-deep` | **Dietary / medical** text/tint. |

Geometry: radius `10px` buttons (`8` at `sm`, `7` at `chip`, `12` at `lg`), `14px` cards.
Shadows: exactly one soft, hue-tinted, negative-spread fall per hue — `--cms-sh-accent`,
`-neutral`, `-danger`, `-amber`, each with a `-lift` and `-press` state, plus `--cms-sh-card`.

**These hexes are law.** Do not nudge them per screen. If a surface needs a new value, it
gets a new named token here, reviewed once, available everywhere.

---

## 3. Type pairing

**Source Serif 4 headings + Inter body.** Loaded with `next/font/google` in
`app/layout.tsx` as `--font-source-serif` and `--font-inter`, exposed as the Tailwind
`font-head` / `font-body` families.

- Headings: Source Serif 4, weight **600**, tracking **-0.008em**. Applied automatically to
  `h1`–`h5`; use `font-head` when a non-heading element must match (stat numbers, avatars).
- Body: Inter, 400/500/600. Buttons are fixed at 600, neutral tracking, every variant.
- Both faces carry Latin, Latin-Ext and full **Cyrillic** — the Russian dictionary renders
  in the real brand type, not a fallback.
- **Arabic** is paired from **Noto Sans Arabic** (Source Serif 4 has no Arabic coverage).
  `[lang='ar']` swaps the family for body, headings and buttons, and relaxes line-height
  to 1.7. See `app/globals.css`.

The serif is what makes CMS read as *an official record* rather than another SaaS
dashboard. It is not decorative; do not replace headings with the body face to "simplify".

---

## 4. Class API reference

### Variants (`cms-btn-<variant>` — exactly one, always paired with `cms-btn`)

| Variant | When to use | Notes |
|---|---|---|
| `cms-btn-primary` | The single loudest action in its group — main CTA, form submit, "Save and continue". | Harbor blue gradient (`#4A85C3 → #245483`), white label, one soft blue shadow, hairline border. |
| `cms-btn-secondary` | A neutral action beside a primary one — "Cancel", "Yesterday", toolbar buttons. | White face, strong hairline, quiet neutral shadow. |
| `cms-btn-ghost` | Lowest emphasis — close icons, "skip", inline actions. | Transparent, muted text, tinted hover, no elevation. Add `cms-btn-outline` for a hairline. |
| `cms-btn-danger` | A confirmed destructive action — "Remove child". | Red gradient + soft red shadow. Add `cms-btn-soft` for the quiet tinted version. |
| `cms-btn-accent` | The warm amber action — special, but never a second primary. "Take register", "Resolve now". | Amber gradient, dark ink label. |

### Sizes (`cms-btn-<size>` — exactly one)

| Size | Height | Use for |
|---|---|---|
| `cms-btn-chip` | **28px** | Dense flag/filter rows. **CMS-only** — see §6. |
| `cms-btn-sm` | 36px | Per-row actions, header nav, toolbar icon buttons. |
| `cms-btn-md` | 44px | The default — card actions, modal footers, most in-flow actions. |
| `cms-btn-lg` | 54px | Hero CTAs and full-width form submits. |

An un-sized `.cms-btn` falls back to `md` metrics, so a half-written button never collapses —
but always set a size explicitly in new code.

### Modifiers

| Modifier | Effect |
|---|---|
| `cms-btn-full` | `width: 100%`. This is what `w-full` becomes — never keep both. |
| `cms-btn-icon` | Square icon-only button, sized off the paired size class. |
| `cms-btn-round` | With `cms-btn-icon`, makes it a circle. |
| `cms-btn-pill` | Fully rounded pill for text buttons — filter rows. |
| `cms-btn-outline` | With `cms-btn-ghost` only — adds a hairline border. |
| `cms-btn-soft` | With `cms-btn-primary` **or** `cms-btn-danger` — the low-volume tinted style. |
| `cms-btn-start` | Left/start-aligned content instead of centred — nav rails, list-style buttons. |
| `cms-btn-between` | Content pushed to both edges — a label plus a trailing badge. |

> **Why `cms-btn-start` exists.** `.cms-btn` is unlayered plain CSS, so it beats Tailwind's
> `justify-start` / `justify-between` (which live in `@layer utilities`). Rather than
> reach for `!important` at a call site, the system owns the two alignments it needs.
> Icons that need a wrapper (RTL flipping) must use `<IconBox>` — `.cms-btn > svg` only sizes
> *direct* svg children, and a bare wrapper span collapses the icon to zero width.

---

## 5. Light-surface rules

CMS is **light-first**, and that is a real difference from Montree, not a re-skin.

- Montree's tokens default to a dark forest surface, so every light screen needs
  `.on-light`. **CMS has no `.on-light` and must never grow one.** The tokens already
  assume Harbor's `#F1F5FA` canvas; adding a context override would re-introduce exactly
  the bug class it was invented to solve.
- Every panel is a **white card on the canvas**, with a `#DCE4EF` hairline and one very
  soft fall (`--cms-sh-card`). Not a grey box, not a borderless flat region.
- Shadows on light read much louder than the same shadow on near-black, so every Harbor
  shadow is shallower and less opaque than its Montree ancestor. Do not deepen them.
- Body carries a single wide radial blue wash at the top (9% accent). That is the entire
  "atmosphere" budget. No gradients on cards, no glass, no second wash.
- Text contrast floor: `--cms-muted` (`#617082`) on white is the lightest text permitted.
  Anything quieter is a legibility bug, not a style choice.
- Tinted surfaces use the token's `rgb()` at 8–15% with a 22–26% border of the same hue —
  that is what `.cms-tone-*` encodes. Never hand-mix a tint.

### The flag tint scale — a safety convention

| Category | Tint | Class |
|---|---|---|
| **Allergy** | danger red | `cms-tone-danger` |
| **Dietary** | amber | `cms-tone-amber` |
| **Medical** | amber | `cms-tone-amber` |
| **Pickup** | Harbor blue | `cms-tone-accent` |
| Neutral / status | quiet grey, success green | `cms-tone-quiet`, `cms-tone-success` |

A teacher learns these colours once and reads them at a glance for years. **No screen may
re-map them.** Pass a `FlagCategory` to `<Chip>` / `<Tag>` and the tint follows.

---

## 6. Resolved Montree gaps

Montree's design system closes with three known gaps (§6 of `MONTREE_DESIGN_SYSTEM.md`).
CMS resolves all three here, centrally, before any screen was built.

### ❌ `cms-btn-info` — deliberately NOT added

Montree's most-requested gap was a blue/info variant, because its primary is emerald and
blue was free. **In CMS the primary IS blue.** An "informational blue" variant would be
visually indistinguishable from the main CTA and would teach users that blue means nothing
in particular — destroying the one signal the primary button carries.

**If you need a quiet informational action, use `cms-btn-primary cms-btn-soft`.** That is the
answer, and it is the only answer. Do not add `cms-btn-info`.

### ✅ `cms-btn-soft` extended to `cms-btn-primary`

Montree had a quiet mode for `cms-btn-danger` only. CMS defines
`.cms-btn-primary.cms-btn-soft` — tinted blue face (9%), accent-deep label, 26% border, no
shadow — for actions that belong to the primary family but must not be the loudest thing
on screen: the selected nav pill, the disabled "Generate" affordances, secondary CTAs
inside a card that already has a primary.

### ✅ `cms-btn-chip` — the sub-`sm` size

Montree's smallest size was `cms-btn-sm` (36px), too tall for a dense chip row. CMS adds
`cms-btn-chip`: **28px** min-height, `0.75rem` type, `7px` radius, tighter gap. It composes
with every variant and with `cms-btn-icon` (28×28). Use it for filter rows, mobile nav pills
and inline add-buttons — never for a primary action.

**Rule for closing any future gap:** add it centrally to the
`CMS BUTTON SYSTEM — SOFT ELEVATION / HARBOR` section of `app/globals.css` (and mirror it
in `tailwind.config.ts` if it needs a Tailwind token), review once, then use it everywhere.
Never solve a gap with an inline style at the call site — that is the pattern this system
replaced.

---

## 7. Deliberate exclusions

Inherited from Montree's §5, unchanged in spirit. Do not force these into `.cms-btn`:

- **Data-driven colours** — anything where the fill is computed from data rather than a
  nameable UI state. Converting them erases the information the colour carries.
- **Toggle switches** — the geometry is the control.
- **Content tiles** — cards/rows that are clickable but read as content (the child cards on
  the parent dashboard, the layer doors on the landing page), not as actions.
- **Tab bars** — unless a tab is visibly a filled action button.

---

## 8. Copy-paste starters

**Primary CTA**
```jsx
<button onClick={submit} className="cms-btn cms-btn-primary cms-btn-lg">{t('common.continue')}</button>
```

**Cancel / Save pair**
```jsx
<div className="flex gap-2.5">
  <button className="cms-btn cms-btn-secondary cms-btn-md">{t('common.cancel')}</button>
  <button className="cms-btn cms-btn-primary cms-btn-md">{t('common.save')}</button>
</div>
```

**Quiet blue action (the `cms-btn-info` answer)**
```jsx
<button className="cms-btn cms-btn-primary cms-btn-soft cms-btn-sm">{t('common.viewAll')}</button>
```

**Dense chip row**
```jsx
<button className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-chip">{t('child.pickup.add')}</button>
```

**Flags — always via the component, never a hand-rolled span**
```jsx
<Chip category="allergy" detail={t('teacher.today.severity.severe')}>{allergy.allergen}</Chip>
<Tag category="dietary">{requirement.label}</Tag>
```

---

## 9. Forms, errors and the auth card (added phase 2)

Phase 2 added the surface's first credential form (`/cms/login`) and its first
**validating** form (enrolment step 1). Both introduced patterns that are now law,
because a school portal is mostly forms and they must all look like one system.

### The field is always `<Field>`

`components/cms/enroll/StepScaffold.tsx` exports `Field` — label, the
Required/Optional marker, help text, and the control. **Every labelled input in
CMS is built from it, including the auth form**, which is why the login card and
the enrolment wizard read as the same product. Never hand-roll a `<label>` +
`.cms-input` pair.

```jsx
<Field label={t('auth.email')} required>
  <input type="email" className="cms-input" value={email}
         onChange={(e) => setEmail(e.target.value)} dir="ltr" />
</Field>
```

`dir` is a decision, not a default: user-authored content (names, notes) gets
`dir="auto"` so an Arabic name renders right-to-left inside an English form;
machine-shaped values (email, password, a school code) get `dir="ltr"` so they
never flip in the RTL locale.

### The invalid field

No new class. A field in error swaps to `cms-input !border-harbor-danger`, sets
`aria-invalid`, and grows one line of `text-harbor-danger-deep` beneath it —
the same 11.5px scale as the help text it replaces in the reading order.

```jsx
<input className={errors.legalName ? 'cms-input !border-harbor-danger' : 'cms-input'}
       aria-invalid={Boolean(errors.legalName)} />
<span className="block text-[11.5px] text-harbor-danger-deep mt-1.5 leading-snug">
  {t('enrol.error.legalName')}
</span>
```

### The form-level message

One shape for every "something went wrong" line, at the bottom of the card,
above the submit button. Sunk panel, danger rule on the leading edge,
`role="alert"` so it is announced:

```jsx
<p role="alert" className="cms-card-sunk mt-5 mb-0 px-3.5 py-3 text-[13px]
   leading-relaxed text-harbor-danger-deep border-s-[3px] border-s-harbor-danger">
  {t('auth.error.invalid')}
</p>
```

The same shape with `border-s-harbor-success` is the positive notice (the
"picking up where you left off" line on a resumed draft), and with no rule at
all it is the neutral note (the demo-mode banner). Three states, one component
shape.

### The auth card

`/cms/login` is a `cms-card` at `max-w-[520px]`, optically centred in the
viewport, with a two-button segmented control at the top for sign-in vs
create-account. The segments are ordinary buttons — `cms-btn-primary
cms-btn-soft` when selected, `cms-btn-ghost` when not — which is the same
selected-state pair the AppShell nav and the wizard rail already use. **A tab bar
in CMS is a row of buttons in those two states; there is no `cms-tab` class and
there should not be one.**

### 🚨 Error copy never renders a code

Server routes return machine codes (`invalid_credentials`, `school_not_found`).
The UI maps the code to a `TranslationKey` and renders `t(key)`. A raw code or a
server-supplied English string on screen is an I18N LAW violation — the server's
English messages exist for logs and API consumers, not for parents.
