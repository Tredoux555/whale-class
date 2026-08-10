# Montree Tactile Button Conversion Guide

**Audience:** wave worker agents doing mechanical button conversion across the Montree app.
**Goal:** replace ad-hoc inline-Tailwind button styling with the shared `.btn` system defined in
`app/globals.css` (section: *MONTREE BUTTON SYSTEM — SOFT ELEVATION*).
**Design direction:** Soft Elevation (Option 2, chosen from `proof/pss-button-options.html`) — one
soft directional shadow + 1px hairline border, gentle 180° gradient, 10px radius, 600 weight,
`translateY(1px)` press. **The class API below is unchanged by that choice.**

You are **not** redesigning anything. You are swapping visual class strings for
`btn btn-<variant> btn-<size>` and leaving everything else in the file byte-identical.

---

## 0. The one-line rule

> Find the button → keep its **layout** classes → delete its **visual** classes →
> prepend `btn btn-<variant> btn-<size>`.

---

## 1. The class system you are converting *to*

All of these are plain CSS in `app/globals.css`. No import, no component, nothing to add to the file.

| Class | What it is |
|---|---|
| `btn` | **required base** on every converted button. Font (600 weight), 10px radius, inline-flex centering, transition, `:active` `translateY(1px)` press, `:disabled`, focus ring. |
| `btn-primary` | Emerald CTA. Gentle 180° gradient `#35D89C → #219A6D`, near-black label, one soft emerald shadow + hairline border. |
| `btn-secondary` | Quiet raised surface, hairline border. Dark forest by default; add `on-light` on light screens. |
| `btn-ghost` | Text-only / quiet action. Transparent, muted sage text, tinted hover. |
| `btn-danger` | Red gradient + soft red shadow. Add `btn-soft` for the quiet "tinted red" style. |
| `btn-gold` | Brand gold accent action. |
| `btn-sm` | 36px tall — per-row actions, chips-that-act, table row buttons. |
| `btn-md` | 44px tall — the default. |
| `btn-lg` | 54px tall — hero CTAs, form submits, modal primary. |
| `btn-full` | `width:100%` (this is what `w-full` becomes). |
| `btn-icon` | Square icon-only button; combine with a size (`btn-icon btn-sm` = 36×36). |
| `btn-round` | With `btn-icon`, makes it a circle. |
| `btn-pill` | Fully rounded pill (for pill-shaped text buttons). |
| `btn-outline` | With `btn-ghost`, adds a hairline border — for "Cancel" beside a solid CTA. |
| `btn-soft` | With `btn-danger`, the low-volume tinted version. |
| `btn-glow` | Refined breathing ring. **Use only where the original already had a special glow/emphasis.** Do not add it on your own. |
| `on-light` | Context flag for light backgrounds. See §5. |

Sizes already own the padding. **Never keep `px-*` / `py-*` / `p-*` on a converted button.**

---

## 2. Keep vs drop

### KEEP (layout, positioning, behaviour, a11y)
`flex-1`, `flex-shrink-0`, `shrink-0`, `grow`, `self-*`, `order-*`
`mt-*`, `mb-*`, `mx-auto`, `ml-*`, `mr-*`, `space-*` (on parents)
`absolute`, `relative`, `fixed`, `sticky`, `top-*`, `right-*`, `bottom-*`, `left-*`, `z-*`
`hidden`, `sm:*`/`md:*`/`lg:*` **layout** prefixes, `col-span-*`, `w-*` when it is a real fixed
width the layout depends on (e.g. `w-32` in a grid), `max-w-*`, `min-w-0`, `truncate`
`data-*`, `aria-*`, `id`, `type`, `disabled`, `onClick`, `key`, `ref`, `title` — **all props untouched**

`w-full` → replace with `btn-full` (do not keep both).

### DROP (visual — `.btn` owns these now)
`bg-*` and `hover:bg-*` / `active:bg-*` / `focus:bg-*`
`text-white`, `text-white/70`, `text-gray-*`, `text-emerald-*`, `text-red-*` and any other **colour** text class
`text-xs|sm|base|lg` **when it is only the button's label size** (the size class sets it) — keep `text-xl`/`text-2xl` only when it is sizing an emoji/glyph that IS the icon
`font-medium`, `font-semibold`, `font-bold` (base sets 600)
`rounded-*`, `shadow-*`, `hover:shadow-*`, `ring-*`, `hover:ring-*`
`border`, `border-*` when decorative (colour/width of the button's own outline)
`transition`, `transition-all`, `transition-colors`, `duration-*`, `ease-*`
`active:scale-*`, `hover:scale-*`, `hover:opacity-*`
`disabled:opacity-*`, `disabled:cursor-not-allowed` (base `:disabled` handles both)
`px-*`, `py-*`, `p-*`
`inline-flex`, `flex`, `items-center`, `justify-center`, `gap-*` — **only when they exist purely to center the label**. If the button has a real multi-part internal layout (icon + two stacked text lines, `justify-between`, `flex-col`, `text-left`), KEEP them; `.btn` will not fight them except for `justify-content`, so keep `justify-between` / `justify-start` explicitly when present.
`cursor-pointer`, `select-none`, `whitespace-nowrap`

---

## 3. Archetype table

| If the className looks like… | Becomes |
|---|---|
| `bg-[#1D6B48]` / `bg-emerald-*` / `bg-green-*` / `bg-gradient-to-r from-emerald…` / `bg-gradient-to-r from-blue-500 to-cyan-500` (the admin submit gradient) — i.e. **the loudest action on screen** | `btn btn-primary` |
| `bg-white/[0.08]`, `bg-white/10`, `bg-white/20`, `bg-slate-700`, `bg-gray-200`, `bg-gray-100`, `border border-white/20` + neutral text — a **secondary/neutral** action | `btn btn-secondary` |
| No background at all — only `text-white/70 hover:text-white`, `text-sm hover:underline`, `text-blue-600 hover:text-blue-800` | `btn btn-ghost` |
| `bg-red-500`, `bg-red-600`, `bg-red-600/80` + white text — a **confirmed destructive** action | `btn btn-danger` |
| `bg-red-500/10`, `bg-red-500/20`, `text-red-300`, `border-red-500/30` — a **quiet destructive** action | `btn btn-danger btn-soft` |
| `bg-amber-*`, `bg-yellow-*`, `bg-[#E8C96A]`, `text-amber-*` accent action; also purple/violet "AI generate"-style accent actions | `btn btn-gold` |
| `px-2 py-0.5`, `px-3 py-1`, `px-3 py-1.5`, `text-xs`, per-row / per-card action | add `btn-sm` |
| `px-4 py-2`, `px-4 py-2.5`, default toolbar/modal button | add `btn-md` |
| `py-3`, `py-3.5`, `w-full` form submit, hero CTA, modal primary | add `btn-lg` |
| `w-full` / `flex-1 w-full` on the button itself | add `btn-full` (drop `w-full`) |
| `w-8 h-8` / `w-10 h-10` / `w-12 h-12` + `rounded-full`/`rounded-xl` containing only an icon or `✕`/`×`/`→` | `btn btn-icon` + size (+ `btn-round` if it was `rounded-full`) |
| already had `shadow-lg shadow-emerald-500/…` or a custom glow/pulse | add `btn-glow` |

Size fallback: if you genuinely cannot tell, use `btn-md`.

---

## 4. BEFORE → AFTER (real code from this repo)

### 4.1 Primary, small — `app/montree/dashboard/students/page.tsx:638`
```jsx
// BEFORE
<button
  data-tutorial="add-student-button"
  data-copilot="add-students"
  onClick={openAddFlow}
  className="px-3 py-1.5 bg-[#1D6B48] text-white rounded-lg text-sm font-medium hover:bg-[#236B4C]"
>

// AFTER
<button
  data-tutorial="add-student-button"
  data-copilot="add-students"
  onClick={openAddFlow}
  className="btn btn-primary btn-sm"
>
```
`data-*` attributes and the handler are untouched.

### 4.2 Secondary, small — `app/montree/dashboard/students/page.tsx:690`
```jsx
// BEFORE
className="px-3 py-1.5 bg-white/[0.08] text-white/70 rounded-lg text-sm hover:bg-white/[0.14] border border-[rgba(52,211,153,0.15)]"
// AFTER
className="btn btn-secondary btn-sm"
```

### 4.3 Quiet danger vs confirmed danger — `students/page.tsx:696` and `:712`
```jsx
// BEFORE  (the "Remove" affordance — tinted, low volume)
className="px-3 py-1.5 bg-red-500/10 text-red-300 rounded-lg text-sm hover:bg-red-500/20"
// AFTER
className="btn btn-danger btn-soft btn-sm"

// BEFORE  (the "Yes, delete" confirmation — solid, loud)
className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
// AFTER
className="btn btn-danger btn-sm"
```

### 4.4 Icon-only close — `app/montree/dashboard/students/page.tsx:778`
```jsx
// BEFORE
<button onClick={closeForm} className="text-white/40 hover:text-white/70 text-xl">✕</button>
// AFTER
<button onClick={closeForm} className="btn btn-ghost btn-icon btn-sm text-xl">✕</button>
```
`text-xl` is kept here — it sizes the ✕ glyph, which *is* the icon.

### 4.5 Full-width quiet danger — `app/montree/dashboard/settings/page.tsx:98`
```jsx
// BEFORE
<button
  onClick={handleSignOut}
  className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 font-medium hover:bg-red-500/20 transition-all"
>
  🚪 {t('settings.signOut')}
</button>

// AFTER
<button
  onClick={handleSignOut}
  className="btn btn-danger btn-soft btn-lg btn-full"
>
  🚪 {t('settings.signOut')}
</button>
```
`w-full` → `btn-full`; `flex items-center justify-center gap-2` were pure centering, so they go.

### 4.6 Hero form submit — `app/admin/login/page.tsx:185`
```jsx
// BEFORE
<button
  type="submit"
  disabled={loading}
  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
>

// AFTER
<button
  type="submit"
  disabled={loading}
  className="btn btn-primary btn-lg btn-full"
>
```
`type` and `disabled` stay. `disabled:*` classes go — `.btn:disabled` covers them.

### 4.7 Light-context modal footer pair — `components/montree/AddWorkModal.tsx:528` and `:534`
This modal sits on white. The `flex-1` split must survive, and the secondary needs `on-light`.
```jsx
// BEFORE
<button onClick={handleClose}
  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
  {t('common.cancel')}
</button>
<button onClick={handleSubmit} disabled={saving || !form.name.trim()}
  className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
    form.name.trim()
      ? `bg-gradient-to-r ${selectedArea.color} text-white hover:shadow-lg`
      : 'bg-gray-300 text-gray-500'
  }`}>

// AFTER
<button onClick={handleClose}
  className="btn btn-secondary btn-md flex-1 on-light">
  {t('common.cancel')}
</button>
<button onClick={handleSubmit} disabled={saving || !form.name.trim()}
  className={`btn btn-md flex-1 ${
    form.name.trim()
      ? 'btn-primary'
      : 'btn-secondary on-light'
  }`}>
```
Note the ternary is **preserved** — only the strings inside each branch changed, and both branches
map to a variant.

### 4.8 Conditional selected-state pill — `app/montree/dashboard/page.tsx:546`
```jsx
// BEFORE
className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
  c.id === selectedChild.id
    ? 'bg-emerald-500 text-white'
    : 'bg-white/15 text-white/70 hover:bg-white/25'
}`}

// AFTER
className={`btn btn-sm btn-pill ${
  c.id === selectedChild.id
    ? 'btn-primary'
    : 'btn-secondary'
}`}
```
Selected → `btn-primary`, unselected → `btn-secondary`. Structure of the template literal is identical.

### 4.9 Toolbar button on a coloured header — `app/admin/hub/page.tsx:203`
```jsx
// BEFORE
className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all flex items-center gap-2"
// AFTER
className="btn btn-secondary btn-md"
```

### 4.10 Accent action — `components/montree/AddWorkModal.tsx:436`
```jsx
// BEFORE
className="px-4 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
// AFTER
className="btn btn-gold btn-sm"
```

---

## 5. Dark vs light context

The tokens default to the **dark forest** surface (`#0A1A0F` / `#08140C`). That covers
`app/montree/**` and the dark slate `app/admin/**` screens (`bg-slate-900`, `bg-slate-950`,
`from-slate-900 via-slate-800`).

Add **`on-light`** when the button sits on a light surface — white cards/modals, `bg-white`,
`bg-gray-50`, `bg-slate-50`, `from-slate-50 via-blue-50`, print/PDF views.

- `btn-primary`, `btn-danger`, `btn-gold` are solid and legible on both — `on-light` only softens
  their contact shadow. Add it when the whole screen is light, skip it if unsure.
- `btn-secondary` and `btn-ghost` **must** get `on-light` on a light surface, or they will render
  as a dark slab / low-contrast sage text on white.
- Cheapest correct move: put `on-light` **once on the light container** (the modal shell, the
  `bg-white rounded-2xl` card, the page wrapper) instead of on every button — it inherits.
  Only do this when the container is unambiguously a light surface, and never remove or reorder
  other classes on that container while doing so.

How to tell: scroll up to the nearest wrapper. `min-h-screen bg-gradient-to-br from-slate-50…`
or `bg-white rounded-2xl` → light. `#0a1a0f`, `bg-slate-900/950`, `rgba(8,20,12,…)`,
`bg-white/[0.06]` (that is white *at 6%* over dark — still **dark**) → dark.

---

## 6. What is a button (convert) vs what is not (leave alone)

### CONVERT
- `<button>` with visual styling.
- `<a>` / `<Link>` that is **styled as a button** — has a background fill or a bordered box with a
  short action label ("Get started", "Open", "+ Add"). Keep `href`, `key`, `prefetch`, etc.
- `<div>` / `<span>` with `role="button"` **and** `onClick` **and** button-ish styling.
- Submit/cancel pairs, modal footers, confirmation actions, toolbar actions, FABs, icon buttons.

### LEAVE ALONE — do not touch, do not log
- Anything under `app/potato/**`, `lib/potato/**`, `components/potato/**` (`pt-*` classes). Out of scope forever.
- Nav links / sidebar items / breadcrumbs / menu rows — a `<Link>` in a list of destinations is
  navigation, not a button, even if it has a hover background (e.g. the settings list rows at
  `app/montree/dashboard/settings/page.tsx:74`).
- Tab bars and segmented controls, **unless** the tab is visibly a filled button — if in doubt, leave.
- Cards / tiles / list rows that happen to be clickable but read as content (photo tiles, student
  cards, big dashboard tiles with icon + title + subtitle).
- Status chips / badges / counters that are **labels, not actions** (no `onClick`).
- `<input>`, `<select>`, `<textarea>`, file pickers, and their labels.
- Toggle switches / checkboxes / radio pills (e.g. `app/admin/login/page.tsx:122`, the
  `h-7 w-12 rounded-full` proxy toggle) — the geometry *is* the control.
- Buttons styled **entirely with an inline `style={{ … }}` object and no visual className**
  (e.g. `app/montree/dashboard/notes/page.tsx:132`). Not a class swap — skip and log.
- Buttons whose visual classes come from a **JS constant or prop** you cannot see in the file
  (e.g. `` `w-full ${HOME_THEME.primaryBtn} rounded-2xl …` `` at `app/montree/dashboard/page.tsx:631`).
  Skip and log; a human decides whether to convert the constant.
- Third-party / generated components, anything under `node_modules`, anything in `app/api/**`.

---

## 7. Hard rules

1. **Never** change JSX structure, element type, nesting, props, handlers, state, logic, or text.
2. **Never** touch imports, exports, hooks, or anything outside a `className` value.
3. **Never** add or remove attributes. If you delete a whole `className`, the attribute must go
   with it cleanly — but prefer leaving `className="btn …"` rather than removing the attribute.
4. **Preserve conditional className logic.** Template literals and ternaries stay in exactly the
   same shape; you only rewrite the string literals inside them. Both branches of a conditional
   must map to a `btn-*` variant (see §4.7, §4.8) — never collapse a ternary into one branch.
5. **Never** invent new CSS, new classes, or edit `app/globals.css` / `tailwind.config.ts`.
   The class list in §1 is closed. If you need something that isn't there, log it.
6. **Never** apply `btn-glow` unless the original already had a distinctive glow/emphasis shadow.
7. **Do not** convert non-button styling that happens to sit in the same file. One file may have
   30 `className`s and only 6 buttons.
8. If a button's colour carries **meaning** you'd lose (e.g. per-area colour coding from
   `selectedArea.color`), keep the conditional but map to the closest variant, and log the file —
   a designer may want a bespoke modifier.
9. **When genuinely ambiguous, leave it unconverted and log it.** An unconverted button costs
   nothing. A wrong conversion costs a review cycle.
10. Emoji/icons inside the label stay exactly where they are; `.btn` supplies the `gap`.

---

## 8. QA checklist — run before you report a file done

- [ ] Every `className` you edited still has **balanced quotes**: `"` closes `"`, `` ` `` closes `` ` ``.
- [ ] Every template literal you edited still has matching `${` … `}` and the same number of `${`.
- [ ] Braces/parens around ternaries are unchanged — `? '…' : '…'` still has both branches.
- [ ] No attribute was deleted, renamed, or reordered (`onClick`, `disabled`, `type`, `key`,
      `data-*`, `aria-*`, `href` all still present on every element you touched).
- [ ] No stray comma, no doubled space that swallowed a quote, no leftover `className=""`.
- [ ] Every converted button starts with `btn` and has **exactly one** variant
      (`btn-primary|btn-secondary|btn-ghost|btn-danger|btn-gold`) and **exactly one** size
      (`btn-sm|btn-md|btn-lg`).
- [ ] No `px-*`/`py-*`/`p-*`/`rounded-*`/`bg-*`/`shadow-*`/`font-*`/`transition*` left on any
      converted button.
- [ ] No `w-full` left on a converted button (it became `btn-full`).
- [ ] Light-surface screens: `btn-secondary` / `btn-ghost` carry `on-light` (or an ancestor does).
- [ ] Nothing under `app/potato/**`, `lib/potato/**`, `components/potato/**` was modified.
- [ ] `git diff` for the file shows **only** `className` string changes — zero other lines.
- [ ] Line count of the file is unchanged unless you reflowed a long className (allowed, but
      prefer keeping it on one line).

## 9. What to put in your report

For each file: path, number of buttons converted, and a list of **skipped/ambiguous** buttons as
`path:line — reason` (inline-style-only, class-from-constant, meaning-carrying colour, unsure if
it's a button). Do not guess in the report; the skip list is the useful output.

---
---

# PART 2 — INLINE-STYLE BUTTON CONVERSION (Wave 1b)

Wave 1 converted `className`-styled buttons. It also revealed that a large share of the
dashboard's buttons carry no visual classes at all — they are styled through
`style={{ … }}` objects, shared `CSSProperties` constants, or style **functions**
(`ghostBtn()`, `primaryBtn(saving)`, `pill(active)`).

Part 2 converts those. **The class API from Part 1 is unchanged** — same `btn`,
same variants, same sizes, same modifiers, same `on-light`. Everything in Part 1
§6 (what is a button), §7 (hard rules) and §8 (QA) still applies in full; this
part adds the rules specific to the `style` attribute.

The reason this is worth doing: a `style` attribute has higher specificity than any
stylesheet rule, so an inline `background` will silently defeat `.btn-primary`. A
half-converted button (classes added, style left in place) looks **worse** than an
unconverted one. Convert the whole button or leave the whole button.

---

## P2.1 — Buttons with a literal `style={{ … }}` object

### Step 1 — read the object and pick the variant

| Property you see | Read it as |
|---|---|
| `background: T.emerald` / `'#34d399'` / `'#1D6B48'` / any emerald gradient | `btn-primary` |
| `background: T.emeraldSoft` / `'rgba(52,211,153,0.10-0.18)'` + emerald `color` + emerald `border` | `btn-primary` if it is the main action in its group, otherwise `btn-secondary` |
| `background: 'rgba(255,255,255,0.04…0.10)'` + `border: '1px solid rgba(255,255,255,0.10)'` | `btn-secondary` |
| `background: T.cardBg` / `'rgba(8,20,12,…)'` + `border: T.cardBorder` | `btn-secondary` |
| `background: 'transparent'` / `'none'` + `border: 'none'` (text or a bare icon) | `btn-ghost` |
| `textDecoration: 'underline'` + emerald/blue `color`, no background | `btn-ghost` |
| `background: 'rgba(239,68,68,0.10)'` / `'rgba(248,113,113,…)'` + red `color`/`border` | `btn-danger btn-soft` |
| `background: T.red` / `'#ef4444'` / `'#F87171'` solid + light `color` | `btn-danger` |
| `background: T.gold` / `'#E8C96A'` / `'rgba(232,201,106,…)'` + gold `color` | `btn-gold` |

### Step 2 — pick the size from the padding / fontSize

| `padding` (and/or `fontSize`) | Size |
|---|---|
| `'5px 10px'`, `'6px 12px'`, `'7px 12px'`, `'7px 14px'`, `'8px 14px'`; `fontSize: 12–13` | `btn-sm` |
| `'10px 16px'`, `'11px 16px'`, `'12px 18px'`; `fontSize: 14–15` | `btn-md` |
| `'14px 20px'` or larger, `height: 50+`; `fontSize: 16+`; usually also `width: '100%'` | `btn-lg` |
| fixed square: `width: 38, height: 38` (or 22/28/32/40/44) with a single glyph | `btn-icon` + nearest size (≤36 → `btn-sm`, 37–48 → `btn-md`, 49+ → `btn-lg`) |

`borderRadius: 999` on a text button → also add `btn-pill`. On an icon button → `btn-round`.

### Step 3 — DELETE these style props (the `.btn` classes own them now)

`background`, `backgroundColor`, `backgroundImage`, `color`, `border`, `borderColor`,
`borderWidth`, `borderStyle`, `borderRadius`, `boxShadow`, `padding` (and every
`paddingTop/Right/Bottom/Left`), `fontWeight`, `fontSize`, `fontFamily`, `letterSpacing`,
`lineHeight` (when it is only vertical centering), `transition`, `cursor`, `whiteSpace`,
`textAlign` (when `'center'`), `outline`, `appearance`, `WebkitAppearance`,
`userSelect`, `WebkitTapHighlightColor`, and the centering trio
`display: 'flex' | 'inline-flex'` + `alignItems: 'center'` + `justifyContent: 'center'` + `gap`.

Also delete `opacity`/`cursor` pairs that only express **disabled** (e.g.
`opacity: loading ? 0.6 : 1`, `cursor: mutating ? 'not-allowed' : 'pointer'`) **when the
element already has a `disabled={…}` prop** — `.btn:disabled` reproduces both. If there is
no `disabled` prop, add nothing and keep the opacity expression: never introduce a prop.

### Step 4 — KEEP these style props (residual `style`)

Layout and positioning only:
`width` **when structural** (a fixed `width: 120` or a grid/flex measurement — but
`width: '100%'` becomes `btn-full` and is deleted), `maxWidth`, `minWidth` when it is a real
constraint, `height`/`aspectRatio` when the button is a media tile rather than a control,
`margin*`, `position`, `top`/`right`/`bottom`/`left`, `zIndex`, `flex`, `flexShrink`,
`flexGrow`, `flexBasis`, `alignSelf`, `order`, `gridArea`, `gridColumn`, `overflow`,
`textAlign: 'left'` (a genuinely left-aligned button label), `animation` on the element
itself, and anything computed from data (see P2.4).

`flex: 1` is the one that gets missed most often — `primaryBtn()` in
`conversations/page.tsx` carries it, and dropping it collapses the modal footer.

### Step 5 — if nothing survives, remove the attribute entirely

`style={{}}` left behind is dead weight; delete the whole `style=…` attribute. If props
survive, keep the attribute with only those props and their original formatting.

### Step 6 — `flexDirection: 'column'` and other real internal layout

If the object contains `flexDirection: 'column'`, `justifyContent: 'space-between'`,
`textAlign: 'left'` with multi-line content, or the button wraps a media tile
(`aspectRatio`, `overflow: 'hidden'`), then it is a **card-shaped** control, not a
text button. Keep those layout props in the residual style and, if the result looks
nothing like a button, **skip it and log it** instead. `montage-tracker/page.tsx:238`
(a column-stacked avatar picker) and `:320` (a square photo tile) are both skips.

---

## P2.2 — Shared style constants and style functions

These files declare module- or component-level helpers and spread them at every call site:

```ts
const ghostBtn: CSSProperties = { … };                       // classroom-overview:147
const ctaPrimary: CSSProperties = { …, width: '100%' };      // focus:147
function primaryBtn(disabled = false): CSSProperties { … }   // conversations:1348
function ghostBtn(active = false, override = {}): CSSProperties { … } // conversations:1366
const pill = (active: boolean): CSSProperties => ({ … });    // montage-tracker:899
```

### The procedure

1. **Map each helper to one variant + size before you edit anything**, by reading its body
   once. Write the mapping at the top of your report for that file, e.g.
   `conversations/page.tsx — primaryBtn() → btn btn-primary btn-md (keeps flex:1); ghostBtn() → btn btn-secondary btn-md`.
2. **Edit the call sites, not the declaration.** At each `style={helper()}` replace the
   `style` attribute with the mapped `className`.
3. **LEAVE THE DECLARATION IN PLACE.** Do not delete `ghostBtn`, `ctaPrimary`, `pill`, or their
   types, even when the last call site is gone. Deleting a declaration risks touching a
   still-live usage elsewhere in the file (or an export), and an unused const is a lint
   warning at worst. Zero-risk beats tidy. A later cleanup pass removes them.
4. **Spread + override** (`style={{ ...ghostBtn, padding: '8px 14px' }}`): the spread supplies
   the variant, the override usually only changes the size. Map the whole thing to
   `className` and drop the object — unless an override prop is in the KEEP list, in which
   case keep just that prop in the residual style.
5. **A parameter that changes visuals becomes a className ternary.** The parameter must stay
   in the JSX in the same shape as a conditional class string:
   - `primaryBtn(saving)` — the param only expresses disabled, and the element already has
     `disabled={saving}` → plain `className="btn btn-primary btn-md"`, no ternary needed.
   - `pill(active)` / `ghostBtn(active)` — the param switches selected vs unselected →
     `` className={`btn btn-sm btn-pill ${active ? 'btn-primary' : 'btn-secondary'}`} ``.
6. **A helper used on non-button elements too** (`<span style={shell}>` beside
   `<button style={shell}>` in `montage-tracker/page.tsx:194`): convert only the `<button>`
   call site. Never change the `<span>`.

### `HOME_THEME` — DO NOT CONVERT. See the risk note in P2.8.

---

## P2.3 — Mixed: `className` has layout, `style` has visuals

Merge rather than replace. Append the `btn` classes to the **existing** className string
(keep its layout utilities, drop only its visual ones per Part 1 §2), then strip the visual
props out of `style` per P2.1.

The end state to aim for is exactly `photo-audit/page.tsx:3007`, already converted in Wave 1:

```jsx
<button
  className="btn btn-ghost btn-icon btn-md absolute right-4 z-10 text-3xl"
  style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
  onClick={() => setLightboxUrl(null)}
  aria-label="Close"
>
```
Classes: variant + size + layout. Style: one positional value that no class can express.
That is the shape of a correct mixed conversion.

---

## P2.4 — Data-driven colour: SKIP and log

Same rule as Part 1 §6/§9. If a visual prop is computed from data rather than from a
UI state you can name, the colour carries meaning and a variant would erase it:

```jsx
style={{ background: area.color }}
style={{ borderColor: child.avatar_color, color: statusColor(status) }}
style={{ background: `linear-gradient(${work.hue}, …)` }}
```

Skip the button, log it as `path:line — data-driven colour`. Contrast with
`background: active ? T.emeraldSoft : 'transparent'` — that is a **UI state**, two known
branches, and it converts to a className ternary (P2.2 §5).

---

## P2.5 — Text colour and inner elements

- `color` on the **button element** is deleted; every `.btn` variant sets its own label colour.
- `color`/`size` on **children** — `<Mic size={18} />`, `<span style={{ opacity: .6 }}>`,
  `<small className="text-xs text-white/40">` — is left completely alone. `.btn` colours the
  label by inheritance; anything that opts out was opting out before too.
- Lucide icons take `color`/`strokeWidth` as **props**, not style. Never touch props.
- If a child element's colour was clearly chosen to match the old button background and now
  clashes (e.g. a `#0a1a0f` icon on what is now a gradient), leave it and log it — a colour
  judgement is not a mechanical edit.

---

## P2.6 — Hard rules (in addition to Part 1 §7)

1. All of Part 1 §7 still binds: no changes to JSX structure, element type, props, handlers,
   state, logic, text, or imports.
2. The **`style` attribute may be edited or removed only on the button element you are
   converting.** A `style` on any other element — wrapper `<div>`, `<span>`, icon, sibling —
   is untouchable, even one line away.
3. Never delete, rename, or edit a style constant/function **declaration**. Call sites only.
4. Never add a prop. If the button lacks `disabled` you may not add one to justify deleting an
   opacity expression.
5. Never convert `style` props that reference `env(safe-area-inset-*)`, `var(--safe-top)`, or
   anything in the safe-area contract documented in `app/globals.css`. Keep them in the
   residual style verbatim.
6. If the object contains a property you cannot confidently classify as visual or layout,
   keep it and log the file. Keeping a stray prop is harmless; deleting a load-bearing one
   is not.
7. One button at a time. Do not batch-regex a file; every one of these objects is
   hand-written and slightly different.

---

## P2.7 — BEFORE → AFTER (real code from the files studied)

### P2.7.1 — Plain style-fn call sites — `conversations/page.tsx:713` and `:720`
`ghostBtn()` = translucent card face + card border → `btn-secondary`;
`primaryBtn()` = `T.emerald` face + `#0a1a0f` label → `btn-primary`; both are `12px 18px`/15px → `btn-md`.
`primaryBtn()` also carries `flex: 1`, which is layout and must survive.
```jsx
// BEFORE
<button type="button" onClick={onCancel} style={ghostBtn()}>
  {t('common.cancel')}
</button>
<button type="button" onClick={startRecording} style={primaryBtn()}>
  <Mic size={18} strokeWidth={1.75} />
  {t('meetingNotes.startRecordingConsent' as TranslationKey)}
</button>

// AFTER
<button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
  {t('common.cancel')}
</button>
<button type="button" onClick={startRecording} className="btn btn-primary btn-md" style={{ flex: 1 }}>
  <Mic size={18} strokeWidth={1.75} />
  {t('meetingNotes.startRecordingConsent' as TranslationKey)}
</button>
```
The `<Mic>` icon is untouched. `flex: 1` could equally be the `flex-1` utility — either is
correct; pick one and be consistent within a file.

### P2.7.2 — Style-fn whose parameter is only "disabled" — `conversations/page.tsx:937`
```jsx
// BEFORE
<button type="button" onClick={saveMeeting} disabled={saving} style={primaryBtn(saving)}>

// AFTER
<button type="button" onClick={saveMeeting} disabled={saving} className="btn btn-primary btn-md" style={{ flex: 1 }}>
```
`primaryBtn(saving)` only swapped the background to a dimmed emerald and the cursor to
`wait`; `disabled={saving}` is already on the element, so `.btn:disabled` covers it. The
`disabled` prop itself is untouched.

### P2.7.3 — Style-fn with a size override — `conversations/page.tsx:1208`
```jsx
// BEFORE
style={ghostBtn(false, { padding: '8px 14px', fontSize: 13 })}
// AFTER
className="btn btn-secondary btn-sm"
```
The override was purely "make it smaller" → it becomes the size class. Nothing residual.

### P2.7.4 — Spread + inline danger recolour — `conversations/page.tsx:1241`
```jsx
// BEFORE
<button
  type="button"
  onClick={removeMeeting}
  style={{
    ...ghostBtn(),
    color: '#fecaca',
    border: '1px solid rgba(239,68,68,0.45)',
    background: 'rgba(239,68,68,0.10)',
  }}
>
  <Trash2 size={16} strokeWidth={1.75} />
  {t('common.delete')}
</button>

// AFTER
<button
  type="button"
  onClick={removeMeeting}
  className="btn btn-danger btn-soft btn-md"
>
  <Trash2 size={16} strokeWidth={1.75} />
  {t('common.delete')}
</button>
```
The override wins over the spread, so the button is a quiet destructive action, not a ghost.
Read overrides last-wins, exactly as the spread does.

### P2.7.5 — Module const + spread override — `classroom-overview/page.tsx:408`
`ghostBtn` (module const, `rgba(255,255,255,0.06)` face + hairline border, `7px 12px`, 13px)
→ `btn-secondary btn-sm`; the override only bumps padding, which the size class owns.
```jsx
// BEFORE
<button
  onClick={() => router.back()}
  aria-label={t('common.back')}
  style={{ ...ghostBtn, padding: '8px 14px' }}
>
  <ArrowLeft size={15} strokeWidth={1.75} />
  {t('common.back')}
</button>

// AFTER
<button
  onClick={() => router.back()}
  aria-label={t('common.back')}
  className="btn btn-secondary btn-sm"
>
  <ArrowLeft size={15} strokeWidth={1.75} />
  {t('common.back')}
</button>
```
The `const ghostBtn: CSSProperties = { … }` declaration at line 147 **stays**.

### P2.7.6 — Component-scoped const with a disabled expression — `classroom-overview/page.tsx:1159`
`refreshBtn` is `5px 10px`/12px translucent → `btn-secondary btn-sm`. Its
`cursor`/`opacity` only express loading, and `disabled={loading}` is already present.
```jsx
// BEFORE
<button onClick={onRefresh} style={refreshBtn} disabled={loading}>
  <RefreshCw size={11} strokeWidth={2} />
  {t('classroomOverview.englishWeek.refresh')}
</button>

// AFTER
<button onClick={onRefresh} className="btn btn-secondary btn-sm" disabled={loading}>
  <RefreshCw size={11} strokeWidth={2} />
  {t('classroomOverview.englishWeek.refresh')}
</button>
```

### P2.7.7 — Literal object, full-width CTA, disabled expression — `focus/page.tsx:494`
`ctaPrimary` is emerald-soft + emerald border + emerald label with `width: '100%'` → the
width becomes `btn-full`; the spread's `opacity`/`cursor` express `disabled={mutating === 'bulk'}`,
which is already on the element.
```jsx
// BEFORE
<button
  onClick={addAll}
  disabled={mutating === 'bulk'}
  style={{
    ...ctaPrimary,
    opacity: mutating === 'bulk' ? 0.5 : 1,
    cursor: mutating === 'bulk' ? 'not-allowed' : 'pointer',
  }}
>
  <Sparkles size={14} strokeWidth={1.75} />
  {LABELS.pickTop10}
</button>

// AFTER
<button
  onClick={addAll}
  disabled={mutating === 'bulk'}
  className="btn btn-primary btn-md btn-full"
>
  <Sparkles size={14} strokeWidth={1.75} />
  {LABELS.pickTop10}
</button>
```

### P2.7.8 — Style fn with a selected-state parameter — `montage-tracker/page.tsx:975`
`pill(active)` switches emerald-soft/emerald-border/emerald-label against
translucent/card-border/secondary-label, at `7px 14px`, `borderRadius: 999`.
```jsx
// BEFORE
<button type="button" onClick={() => choosePath('child')} style={pill(path === 'child')} aria-pressed={path === 'child'}>
  🧒 {t('montageTracker.create.child')}
</button>

// AFTER
<button type="button" onClick={() => choosePath('child')} className={`btn btn-sm btn-pill ${path === 'child' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={path === 'child'}>
  🧒 {t('montageTracker.create.child')}
</button>
```
`aria-pressed` is untouched. Apply the identical treatment to the sibling `'class'` and
`'event'` pills, and leave `const pill = …` at line 899 in place.

### P2.7.9 — Icon button, literal object — `montage-tracker/page.tsx:955`
`38×38`, `borderRadius: 12`, emerald-soft face, emerald label → icon button, md bracket.
`flexShrink: 0` is layout and survives.
```jsx
// BEFORE
<button
  type="button"
  onClick={() => setMontagesOpen(true)}
  aria-label={t('montageTracker.jobs.title')}
  title={t('montageTracker.jobs.title')}
  style={{
    flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, borderRadius: 12, fontSize: 17, lineHeight: 1,
    background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`,
    color: T.emerald, cursor: 'pointer',
  }}
>
  🎬
</button>

// AFTER
<button
  type="button"
  onClick={() => setMontagesOpen(true)}
  aria-label={t('montageTracker.jobs.title')}
  title={t('montageTracker.jobs.title')}
  className="btn btn-secondary btn-icon btn-md text-lg"
  style={{ flexShrink: 0 }}
>
  🎬
</button>
```

### P2.7.10 — Mixed className + style — `[childId]/gallery/page.tsx:933`
```jsx
// BEFORE
<button
  onClick={() => setEditingCaption(null)}
  className="flex-1 rounded-lg"
  style={{ padding: '6px 12px', fontSize: 14, color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
>

// AFTER
<button
  onClick={() => setEditingCaption(null)}
  className="btn btn-secondary btn-sm flex-1"
>
```
`rounded-lg` was visual → dropped. `flex-1` was layout → kept. The whole style object was
visual → the attribute is removed.

---

## P2.8 — 🚨 `HOME_THEME` is NOT in scope. Do not convert it.

`HOME_THEME` (`lib/montree/home-theme.ts`) is **not** a style object and **not** the Montree
dark-forest theme. It is a set of Tailwind class strings for the homeschool-parent
"Tender Cartography" look — cream `#FFF8E7` page, dark-teal `#0D3330` buttons — and every
usage is gated behind `isHomeschoolParent()`. Its own header says *"Teachers see NONE of
this."*

Converting `${HOME_THEME.primaryBtn}` to `btn btn-primary` would silently replace a separate,
deliberate brand with emerald across every parent-facing screen, from one edit. That is a
design decision, not a mechanical conversion.

**Rule: leave every `HOME_THEME.*` usage exactly as it is and log the file.** If the founder
later wants parent screens on the same button system, the correct move is one edit to
`lib/montree/home-theme.ts` (or a dedicated `.btn-home` variant), reviewed on its own — not
577 call-site edits.

Same reasoning applies to any other centralised theme-class constant you meet.

---

## P2.9 — QA checklist additions for Part 2

Run these **in addition to** Part 1 §8.

- [ ] No orphaned syntax where a `style` attribute was removed: no doubled space swallowing an
      attribute, no stray `}` or `}}`, no leftover `style=` with nothing after it, no dangling
      comma inside a surviving object literal (`{ flex: 1, }` is fine; `{ , flex: 1 }` is not).
- [ ] Every surviving `style={{ … }}` still opens with `{{` and closes with `}}`.
- [ ] Template literals in a new `className={\`…\`}` are backtick-delimited and their `${…}`
      count is unchanged from the expression you replaced.
- [ ] No **declaration** was deleted or edited — only call sites. `git diff` should show zero
      changes inside `const ghostBtn = …`, `function primaryBtn(…)`, `const pill = …`.
- [ ] Unused-variable lint warnings for now-unused style constants are **expected and
      acceptable**. Do not "fix" them by deleting the constant. Do not add
      `// eslint-disable` either — adding a comment is still an edit outside the button.
- [ ] `flex`, `flexShrink`, `position`/`top`/`right`/`zIndex`, structural `width`, `margin*`
      survived wherever they existed. Spot-check every modal footer and every absolutely
      positioned button in the file.
- [ ] No `style` prop on a non-button element was touched.
- [ ] Any `env(safe-area-inset-*)` / `var(--safe-top)` value is still present verbatim.
- [ ] The file still parses: balanced `{}` `()` `[]` and backticks; JSX attributes each
      separated by whitespace; no attribute duplicated (a button must not end up with two
      `className` attributes — merge into one).
- [ ] Both `className` and `style` are never expressing the same property.

---

## P2.10 — Wave 1b target worklist (`app/montree/dashboard/**`)

Counts are `<button>` elements whose **opening tag carries a `style=`**, measured by tag-scan
(brace-aware), not line grep. `literal` = inline `{{ … }}` object; `helper` = a constant,
function call, or spread; `+cls` = also has a `className` (P2.3 merge cases).

| # | File (under `app/montree/dashboard/`) | inline | literal | helper | +cls |
|---|---|---|---|---|---|
| 1 | `photo-audit/page.tsx` | 63 | 63 | 0 | 1 |
| 2 | `classroom-overview/page.tsx` | 20 | 15 | 5 | 0 |
| 3 | `voice-onboarding/page.tsx` | 18 | 7 | 11 | 0 |
| 4 | `montage-tracker/page.tsx` | 17 | 9 | 8 | 0 |
| 5 | `raz/page.tsx` | 17 | 17 | 0 | 0 |
| 6 | `[childId]/gallery/page.tsx` | 12 | 12 | 0 | 6 |
| 7 | `conversations/page.tsx` | 11 | 4 | 7 | 0 |
| 8 | `present/page.tsx` | 10 | 10 | 0 | 0 |
| 9 | `weekly-admin-docs/page.tsx` | 8 | 8 | 0 | 0 |
| 10 | `language-semester/page.tsx` | 7 | 7 | 0 | 0 |
| 11 | `uploads/page.tsx` | 6 | 6 | 0 | 1 |
| 12 | `parent-codes/page.tsx` | 6 | 6 | 0 | 0 |
| 13 | `curriculum/page.tsx` | 6 | 6 | 0 | 1 |
| 14 | `capture/page.tsx` | 6 | 6 | 0 | 0 |
| 15 | `menu-setup/page.tsx` | 5 | 3 | 2 | 0 |
| 16 | `parent-chats/[parentId]/page.tsx` | 5 | 3 | 2 | 0 |
| 17 | `focus/page.tsx` | 4 | 4 | 0 | 0 |
| 18 | `[childId]/page.tsx` | 3 | 3 | 0 | 0 |
| 19 | `page.tsx` (dashboard home) | 2 | 2 | 0 | 0 |
| 20 | `school-features/page.tsx` | 2 | 2 | 0 | 0 |
| 21 | `messages/[threadId]/page.tsx` | 2 | 2 | 0 | 0 |
| 22 | `vocabulary-flashcards/page.tsx` | 2 | 1 | 1 | 2 |
| 23 | `[childId]/print/page.tsx` | 2 | 2 | 0 | 0 |
| 24 | `notes/page.tsx` | 1 | 1 | 0 | 0 |
| 25 | `calls/[appointmentId]/page.tsx` | 1 | 1 | 0 | 0 |
| 26 | `snap/page.tsx` | 1 | 0 | 1 | 1 |
| 27 | `milestones/page.tsx` | 1 | 1 | 0 | 0 |
| 28 | `curriculum/browse/page.tsx` | 1 | 0 | 1 | 1 |
| 29 | `games/sound-safari/page.tsx` | 1 | 1 | 0 | 1 |
| 30 | `games/sound-games/middle/page.tsx` | 1 | 1 | 0 | 1 |
| 31 | `[childId]/progress/page.tsx` | 1 | 1 | 0 | 0 |
| 32 | `students/page.tsx` | 1 | 1 | 0 | 1 |
| | **TOTAL** | **243** | **205** | **38** | **16** |

### Suggested batching
- **Batch A (helper-heavy, do first — highest leverage per edit, and they teach the pattern):**
  `conversations`, `classroom-overview`, `voice-onboarding`, `montage-tracker`, `menu-setup`,
  `parent-chats/[parentId]`, `focus`. ~80 buttons.
- **Batch B (literal-heavy, mechanical):** `raz`, `present`, `weekly-admin-docs`,
  `language-semester`, `uploads`, `parent-codes`, `curriculum`, `capture`,
  `[childId]/gallery`. ~78 buttons.
- **Batch C (long tail, 1–3 each):** everything from row 18 down. ~19 buttons.
- **Batch D — `photo-audit/page.tsx` alone (63 buttons).** One worker, nothing else. It is a
  ~3000-line file that Wave 1 already partly converted, so it needs a reader who checks
  whether each button is already done before touching it.

### Files named in the Wave 1 report that are NOT on this list, and why
- `earnings/page.tsx` — has 33 `style=` occurrences but **zero `<button>` elements**. Its
  clickables are non-button elements; out of scope until someone confirms they are actions.
- `montage/page.tsx` — no `<button>` and no `style=`. Nothing to do.
- `dashboard/page.tsx` — only 2 inline-style buttons; its other buttons are the
  `HOME_THEME` template-literal ones, which are **out of scope** (P2.8).
