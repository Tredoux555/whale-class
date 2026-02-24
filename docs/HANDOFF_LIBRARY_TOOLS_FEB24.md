# Handoff: Montree Library Tools Polish — Feb 24, 2026

## Summary

Extensive polish session on the Montree Library content creation tools, focusing on Picture Bingo Generator and Video Flashcard Maker.

## Commits (10 total this session, all pushed to main)

| Commit | What |
|--------|------|
| `4dacc51e` | Add calling cards to Picture Bingo Generator |
| `ef4adc66` | Add Montree Library link to landing page top-right |
| `142dc01a` | Add Print Labels Only option to three-part card generator |
| `7c0366d6` | Redesign Picture Bingo Generator — modern classy aesthetic |
| `5b1045a8` | Rebuild Video Flashcard Maker — fully client-side video upload tool |
| `b73e83bb` | Remove vowel highlighting from Picture Bingo — plain letters only |
| `57984eea` | Use Comic Sans for bingo words — kid-friendly single-story letters |
| `61b303ae` | Redesign Picture Bingo with card-style borders — color picker, radius, width |
| `ec7b6e0b` | Picture Bingo: boards show picture+word single-sided, calling cards duplex |
| `2eee75ae` | Calling cards: 3-Part Card indent style for cutting guides |

## Files Modified

### Picture Bingo Generator (`public/tools/picture-bingo-generator.html`)

Complete rewrite over multiple iterations:

**Layout changes:**
- Bingo boards: picture AND word together on each cell, single-sided (one page per board, no duplex)
- Calling cards: picture on front page, word on back page (duplex, mirrored rows for alignment)
- Removed FREE space entirely — every cell gets a real picture

**Border system:**
- Bingo boards: Uniform grid-background approach (background = border color, padding = gap = border width). Perfectly uniform borders everywhere.
- Calling cards: 3-Part Card Generator approach (each card has own background = border color, padding = border width, border-radius). Inner white areas with border-radius create diamond indent cutting guides where cards meet. Grid gap = 0.

**Customization controls:**
- Border color picker (input[type="color"] + hex text input, synced)
- Border width selector (Thin 1.5mm / Medium 2.5mm / Thick 4mm)
- Corner radius selector (Square / Slight / Rounded / Very Round)

**Two modes:**
- CVC Word Sets (preset): 69 CVC words across 5 vowel sets with real photos
- Custom Bingo: drag & drop image upload, file names become editable words

**Typography:**
- Comic Sans MS for all word text (kid-friendly single-story 'a')
- Vowel highlighting (colored background pills) removed entirely

### Video Flashcard Maker (`app/montree/library/tools/flashcard-maker/page.tsx`)

Complete rewrite — replaced broken server-dependent version (4 missing API routes) with fully client-side tool:
- Video upload via drag & drop or file picker
- HTML5 `<video>` + `<canvas>` frame capture
- Timeline scrubber with ±1s and ±5s navigation
- Auto-extract frames every 3 seconds
- Editable labels per card
- Border color (8 preset colors) and font family selection
- Print as full-page landscape A4 flashcards

### Tools Page (`app/montree/library/tools/page.tsx`)
- Renamed "Song Flashcard Maker" → "Video Flashcard Maker"
- Updated icon from 🎵 to 🎬

## Architecture Notes

### Bingo Board Border: Uniform Grid Approach
```css
/* Grid background IS the border color */
.bingo-grid {
  background: ${borderColor};
  padding: ${borderW}mm;   /* outer border */
  gap: ${borderW}mm;       /* inner borders = same as outer */
  border-radius: ${radius}px;
}
.bingo-cell {
  background: white;
  border-radius: ${radius}px;
}
```

### Calling Card Border: 3-Part Card Indent Approach
```css
/* Grid: no gap, cards touch */
.calling-cards-grid { gap: 0; }
/* Each card: colored background = border */
.calling-card {
  background: ${borderColor};
  padding: ${borderW}mm;
  border-radius: ${radius}px;
}
/* Inner white area with radius = indent cutting guide */
.calling-card .card-inner {
  background: white;
  border-radius: ${radius - 1}px;
}
```

### Key Design Decision: Boards vs Cards

| Feature | Bingo Boards | Calling Cards |
|---------|-------------|---------------|
| Content | Picture + word together | Picture front, word back |
| Printing | Single-sided | Duplex (flip on short edge) |
| Cutting | Not cut | Cut along indent guides |
| Border style | Uniform (grid background) | Indent guides (per-card) |
| Row mirroring | N/A | Back page rows mirrored for duplex |

## Known Issues

- Some preset images may have broken paths (e.g. `rat.webp` showed alt text in testing)
- `.avif` format images (mop, pot) may not render in all browsers
