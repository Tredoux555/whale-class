# Handoff: Resume HTML→PDF Conversion (Feb 23, 2026)

## Summary

Converted Tredoux's HTML resume (`Tredoux_Resume.html`) into a pixel-perfect PDF using Playwright + headless Chromium. Previous session struggled for ~1 hour with other approaches (likely reportlab) — Playwright solved it instantly by rendering the HTML exactly as Chrome would.

## What Was Done

### 1. Playwright PDF Pipeline (NEW)
- Installed Playwright + Chromium on the Mac (`/tmp/resume-work/`)
- Wrote `convert.mjs` — loads HTML in headless Chromium, waits for Google Fonts, prints to PDF with zero margins
- **Key insight:** Browser-based PDF rendering preserves ALL CSS (gradients, grid layout, Google Fonts, border-radius) — reportlab cannot

### 2. Draft 1 — Full Quality, 2 Pages
- Exact replica of the HTML — perfect colors, fonts, layout
- Content overflows A4 by ~97px (8.6%) → References section lands on page 2
- Saved as: `Tredoux_Resume_Draft.pdf` (ACTIVE folder)

### 3. Draft 2 — Tight Fit, 1 Page
- Measured overflow precisely (1219px content vs 1123px A4)
- Shaved 97px through micro CSS adjustments:
  - Body font: 13px → 12.5px, line-height 1.6 → 1.5
  - Sidebar padding: 32/20/24 → 22/18/14, gap 18 → 11
  - Avatar circle: 100px → 85px
  - Main content padding: 30/28/24 → 20/26/14, section gap 16 → 10
  - Experience entries: margin/padding shaved ~3-4px each
  - Bullet line-height: 1.5 → 1.4
  - Montree box + education spacing trimmed slightly
- Forced single page: `height: 297mm; max-height: 297mm; overflow: hidden;`
- Saved as: `Tredoux_Resume_Draft2.pdf` (ACTIVE folder)

### 4. Draft 3 — Edge-to-Edge (In Progress)
- Changed `.page` from `width: 210mm` → `width: 100%`, `margin: 0`
- Added `@media print` body `width: 100%`
- User reports still not fully edge-to-edge — may need viewport width adjustment in Playwright script
- Saved as: `Tredoux_Resume_Draft3.pdf` (ACTIVE folder)

## Files

| File | Location | What |
|------|----------|------|
| `Tredoux_Resume.html` | ACTIVE folder | Original HTML (source of truth for design) |
| `Tredoux_Resume_Draft.pdf` | ACTIVE folder | Draft 1 — full quality, 2 pages |
| `Tredoux_Resume_Draft2.pdf` | ACTIVE folder | Draft 2 — tight fit, 1 page |
| `Tredoux_Resume_Draft3.pdf` | ACTIVE folder | Draft 3 — edge-to-edge attempt |
| `Tredoux_Resume_Tight.html` | ACTIVE/whale + /tmp/resume-work/ | Modified HTML (tight + edge-to-edge CSS) |

## Playwright Setup (on Mac)

```bash
# Already installed at /tmp/resume-work/
cd /tmp/resume-work
node convert-tight.mjs  # Generates PDF from Tredoux_Resume_Tight.html
```

Chromium cached at: `~/Library/Caches/ms-playwright/chromium-1208/`

## Next Steps

- **Edge-to-edge fix:** May need to set Playwright viewport to exactly A4 pixel width (794px at 96dpi) and ensure the page div fills it completely
- **Content updates:** User wanted to update resume content (was the original goal before session crashed)
- **Final version:** Once layout is perfect, update content and generate final PDF
