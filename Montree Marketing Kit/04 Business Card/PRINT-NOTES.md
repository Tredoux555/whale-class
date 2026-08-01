# Montree — Business Card, Print Specification

**File to print:** `Montree-Business-Card-PRINT.pdf`
**Page 1 = front** (gold M) · **Page 2 = back** (contact details + QR codes)

---

## 1. Size and bleed

| | |
|---|---|
| **Trim size** | **85 × 55 mm**, landscape |
| **Bleed** | **3 mm on all four sides — already included in the PDF** |
| **PDF page size** | **91 × 61 mm** (258.00 × 173.04 pt) |
| **Safe zone** | all type and artwork sit **≥ 7 mm from the page edge** (≥ 4 mm inside trim) |

Both pages are the same size and unrotated.

**There are no crop marks or registration marks in the file** — the page *is* the bleed box.
Please impose and add your own marks. Do not scale, rotate or "fit to page": print at 100 %.

---

## 2. Stock and finish

- **Recommended: 350 gsm uncoated**, or **soft-touch / matte laminate** on a 350 gsm board.
- Both suit the brand (calm, natural, premium) and hold the deep green well.
- Please avoid gloss — it fights the matte, museum-like character of the design.

**Optional upgrade:** the gold **M** and the **MONTREE** wordmark on the front are excellent
candidates for **gold foil** (or a spot gloss) against the matte green. If you quote for foil,
the M is a raster image and the wordmark is live text — we can supply vector artwork for a
foil die on request. As supplied, both print as normal CMYK.

---

## 3. Colour

Convert to CMYK with your own house profile — **the PDF is deliberately supplied in RGB** so
you can profile it for the chosen stock. There are **no spot colours and no overprint settings.**

| Element | RGB | Note |
|---|---|---|
| Front field | `#03261D` | deep forest green, full bleed |
| Back field | `#0A1A0F` | near-black green, full bleed |
| Gold (M, wordmark, FOUNDER) | `#E8C96A` | **must stay clean and warm — keep black out of the build** |
| Gold hairlines | `#C9AE62` | deliberately one step deeper than the type |
| QR panels | `#F2EFE6` | warm cream — keep light, it is the QR contrast |

Three requests:

1. **Build the two dark greens as a rich dark, not 100 % K alone** — a naive conversion makes
   them look flat and washed on uncoated. They should read as deep, saturated greens.
   Please observe your normal total-ink limit for the stock (typically ≤ 300 % uncoated).
2. **Keep the gold clean.** Any black contamination turns `#E8C96A` olive and kills it.
3. **Keep the cream panels near paper-white.** They are the light backing that makes the QR
   codes scannable — don't let them pick up a heavy tint.

The front carries a very subtle radial glow behind the M. It is genuinely gentle — the whole
ramp spans about 2 % tint — so it should not band, but if your RIP is prone to banding in dark
fields, please flag it before running.

---

## 4. Dark card — edge coverage

This is a **full-bleed dark card**, which is the least forgiving thing to trim: any drift shows
instantly as a **white or pale sliver on the cut edge**. That is exactly what the 3 mm bleed is
there for.

Please watch for white edges on trimming, and — if you are guillotining a stack — check the
first and last cards off each lift. If you offer **edge painting or edge coating**, a dark green
or gold edge would suit this card, but it is not required.

---

## 5. QR codes — do not resize or crop

Both codes on the back are **verified scannable at the printed size** (decoded from a 300 dpi
render of this exact PDF):

| Code | Printed size | Module size | Quiet zone | Resolves to |
|---|---|---|---|---|
| montree.xyz | 13.0 mm | 0.52 mm | 2.30 mm | `https://montree.xyz` |
| WeChat | 13.0 mm | 0.35 mm | 2.30 mm | `https://u.wechat.com/MEvTp9br7fC-…` |

- **The cream panel is part of the code.** Its padding *is* the mandatory quiet zone — please
  do not crop, tighten or reshape the panels.
- The **WeChat code is the finer of the two** (0.35 mm modules, drawn as separated dots). It is
  comfortably above the practical minimum, but it is the element most sensitive to **dot gain**
  on uncoated stock. Please keep it sharp and, if you produce a wet proof, scan-test it.

---

## 6. File technical summary

- 2 pages, 91 × 61 mm each, no rotation, PDF 1.4+
- Fonts (Lora, Inter) **fully embedded as subsetted CID TrueType** — no substitution possible,
  no Type 3 glyphs, all text is live vector
- Images: gold M at 745 ppi, QR codes at 980 / 1176 ppi — all far above 300 ppi
- No crop marks, no spot colours, no overprint, no transparency in the backgrounds
- Colour is RGB by design (see §3)

Any questions before you run, please ask rather than adjust.
