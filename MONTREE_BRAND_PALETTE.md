# Montree Brand Palette — "Dark Forest"

The canonical Montree look is called the **"dark forest" theme** (deep forest-green base + emerald + gold, Lora serif headings, Inter body). Values below are pulled straight from the production codebase.

## Colours

| Role | Hex | Notes |
|------|-----|-------|
| Background (base) | `#0A1A0F` | deep near-black forest green |
| Card surface | `#08140C` | use at ~55% opacity over the bg for glass cards (`rgba(8,20,12,0.55)`) |
| Card border | `#34D399` @ 20% | `rgba(52,211,153,0.2)` |
| Primary accent (emerald) | `#34D399` | |
| CTA / button gradient | `#34D399 → #1D6B48` | emerald → deep pine (135°) |
| Gold accent | `#E8C96A` | headings flourish, highlights, key action lines |
| Danger / alert | `#F87171` | |
| Body text | `#E8F0EA` | off-white |
| Muted text | `#9FC7B0` | sage |
| Button label (on emerald) | `#06140C` | near-black green |
| Sprout / logo gradient | `#34D399 → #14B8A6` | RETIRED Jul 2026 — see Logo section |
| Logo field green | `#03261D` | the deep green behind the gold M |

## Logo (rebranded 2026-07-03)

The official Montree mark is the **gold damascus serif "M" on deep forest green**
(`#03261D` field, Midjourney "minimal luxury emblem" final, upscaled 2048²).
Master: `public/Montree Logo - M.png`. Component: `components/montree/MonteeLogo.tsx`
(tile = `public/brand/m-tile.png`, transparent mark = `public/brand/m-mark.png` —
same props as the old sprout component). Social sizes + banner:
`docs/marketing/social-pack/` (mirrored to `~/Desktop/Montree Social Media Pack`).
The teal sprout is retired everywhere — favicon, PWA/manifest icons, apple-touch,
SVG icon wrappers, native `resources/icon.png` all carry the M.

Email shades seen in templates: heading `#FFFFFF`, body `#CFE3D6`, muted `#8FB3A0`.

## Type
- **Headings:** Lora (serif)
- **Body / UI:** Inter

## Vibe
Calm & natural — earthy, organic, premium. Lots of dark space; emerald + gold accents on deep forest green.

## Paste-ready prompt (for a design tool)
> Use the Montree "dark forest" palette: background #0A1A0F, glass card surface #08140C at ~55% opacity, primary emerald #34D399, CTA gradient #34D399→#1D6B48, gold accent #E8C96A, body text #E8F0EA, muted text #9FC7B0, border emerald #34D399 at 20%, danger #F87171, button label #06140C. Headings in Lora (serif), body in Inter. Vibe: calm & natural, premium, emerald + gold on deep forest green.
