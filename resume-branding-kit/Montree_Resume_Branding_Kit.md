# Montree "Dark Forest" Branding Kit — for Resume Redesign

Reference: the gold QR "Welcome to Montree" card. This kit is the exact system behind it, pulled from the production codebase (`MONTREE_BRAND_PALETTE.md`).

## Colors

| Role | Hex | Use |
|---|---|---|
| Background | `#0A1A0F` | page base, deep near-black forest green |
| Card surface | `#08140C` @ 55% opacity | glass panels / sidebars |
| Card border | `#34D399` @ 20% opacity | hairline borders on glass cards |
| Gold accent | `#E8C96A` | headings, dividers, dates, key numbers |
| Emerald accent | `#34D399` | secondary accent, bullet dots |
| Body text | `#E8F0EA` | off-white |
| Muted text | `#9FC7B0` | sage, sub-labels |
| Logo field green | `#03261D` | the dark tile behind the gold M |

## Type
- **Headings:** Lora (serif)
- **Body:** Inter (sans)

## Logo
Gold damascus serif "M" on a deep green rounded-square tile. Files attached alongside this kit:
- `m-tile.png` — full tile (green bg + gold M), use for a header mark
- `m-mark.png` — transparent gold M only, use where you need it to float on any background

## Recurring Motifs (seen in the QR card — reuse these)
1. **Thin gold frame** around the whole page, ~1px, `rgba(232,201,106,0.45)`, small corner radius.
2. **Radial gold glow** behind the top of the page (soft halo), never a hard shape.
3. **Gold hairline rule that fades to nothing** — used after every section heading and under the header (`linear-gradient(to right, gold, transparent)`).
4. **Small-caps gold labels** with wide letter-spacing (1.5–3px) for section titles / eyebrow text.
5. **Serif (Lora) for names/numbers/headings, sans (Inter) for everything read in bulk** (body copy, bullet points).
6. **Cream/off-white (`#E8F0EA`) for body text** — never set long text in gold, it's for accents only.

## Applying This to the Resume
Content to preserve (nothing should be cut): contact info, core skills, languages, certifications, tech skills, profile paragraph, 4 teaching roles with bullets, 5 earlier positions, the Montree founder section with its 4 stats (329 works / 5 areas / Live / AI), 2 education entries, references line.

Suggested structure:
- Header: gold M tile + name in large Lora + gold small-caps subtitle ("Montessori Educator · Creator of Montree") + contact line, all above a fading gold rule.
- Two columns: narrow glass-card sidebar (skills/languages/certs/tech, as pill-shaped tags with a thin gold border) + wide main column (profile, experience, education).
- Section headings: gold Lora small-caps + fading gold rule, matching the motif above.
- Job entries: role name in Lora, a gold pill for the date range, institution in muted italic, bullets with small emerald dots.
- Montree section: give it its own bordered box (gold border, faint gold→emerald gradient fill) with the 4 stats laid out like a stat strip — gold Lora numbers, tiny muted caps labels underneath.
- Keep it to one page. If it doesn't fit, tighten spacing before you shrink type below ~7pt.

## Note
I already built a full working version of this (HTML → PDF, one page, using this exact kit) — sitting at `Tredoux_Willemse_Resume.pdf` in your montree folder if you want a starting point instead of building from zero. Delete it if you'd rather start fresh.
