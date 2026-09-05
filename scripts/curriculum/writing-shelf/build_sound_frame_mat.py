#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · print sheet A
Rebuilds public/dark-phonics-shelf/v2/01-sound-frame-mat.pdf from scratch.

The original generator for the v2 printables was lost; this file replaces it for
sheet 01 only. Every dimension is a named constant below — never rebuild blind.

Run:   python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
Needs: reportlab (pip install reportlab)

House rules honoured here
-------------------------
* Every adult-facing word sits OUTSIDE the trim rectangle: "every word on this
  sheet is on the part you throw away".
* Dotted trim rectangle with paired tick marks at the page edge — two ticks
  point at each other.
* The trim rectangle is the IDENTICAL rectangle on both sides and is centred on
  the sheet, so ONE cut serves both sides after a short-edge flip.  Short-edge
  duplex of a LANDSCAPE sheet is a rotation about the short (vertical) edge,
  i.e. a left<->right mirror in the paper frame: (x, y) -> (W - x, y).  A
  rectangle centred on the sheet maps onto itself under that map, so the front
  cut line and the back cut line coincide exactly.
* Print at 100 %, never fit-to-page.  Matt laminate.

2026-09-05: frames enlarged.  The old sheet drew 53.7 mm frames with 7.2 mm
gutters (it was *described* as 55 mm / 6 mm, which was already wrong by ~1.3 mm).
Tredoux's movable-alphabet letters do not fit those.  Front is now 70 mm; back
is the largest 4-up that still keeps the trim rectangle AND its ticks inside a
5.5 mm printer-safe margin on a 297 mm sheet.
"""

from pathlib import Path

from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# --------------------------------------------------------------------------
# NAMED CONSTANTS — the whole spec lives here
# --------------------------------------------------------------------------

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "public" / "dark-phonics-shelf" / "v2" / "01-sound-frame-mat.pdf"

# Sheet — exact A4 landscape.
PAGE_W = 297.0
PAGE_H = 210.0
CX = PAGE_W / 2.0          # 148.5
CY = PAGE_H / 2.0          # 105.0

# Printer-safe margin.  NOTHING printed — trim rectangle, ticks, footer —
# may come closer than this to any page edge.
SAFE = 5.5

# Trim rectangle (the cut line).  Identical on both sides, centred on the sheet.
TRIM_W = 282.0
TRIM_H = 100.0
TRIM_X0 = CX - TRIM_W / 2.0   #   7.5
TRIM_X1 = CX + TRIM_W / 2.0   # 289.5
TRIM_Y0 = CY - TRIM_H / 2.0   #  55.0
TRIM_Y1 = CY + TRIM_H / 2.0   # 155.0

# Side 1 — Tray 1, three frames.
FRONT_FRAME = 70.0
FRONT_GUTTER = 6.0
FRONT_N = 3

# Side 2 — Tray 3, four frames.  4 x 66 + 3 x 4 = 276 mm of frames, leaving a
# 3.0 mm mat margin each side inside the 282 mm trim rectangle.  67 mm frames
# (280 mm) would push the trim rectangle to 286 mm, which leaves no room at all
# for the edge ticks inside the 5.5 mm safe margin — see MAT_MARGIN_MIN below.
BACK_FRAME = 66.0
BACK_GUTTER = 4.0
BACK_N = 4

MAT_MARGIN_MIN = 3.0   # frame edge -> cut line, both sides

# Frame drawing, matched to the sheet being replaced.
CORNER_R = 1.84
STROKE_W = 0.265

# Tick marks.  The ticks that mark the two VERTICAL cut lines are drawn above
# and below the rectangle, where there is plenty of waste, so they keep the full
# house length.  The ticks that mark the two HORIZONTAL cut lines stick out
# sideways, and the sheet is saturated in that direction, so they are short.
TICK_V_LEN = 3.17
TICK_V_GAP = 0.93
TICK_H_LEN = 1.40
TICK_H_GAP = 0.50

# Dotted trim rectangle: 1 px dot + 1 px gap at 96 dpi, as the old sheet had.
DOT_ON = 0.265
DOT_OFF = 0.265

# Amber dashes on the spare (4th) frame: 3 px on, 3 px off at 96 dpi.
DASH_ON = 0.79
DASH_OFF = 0.79

# Ink.
INK = Color(0.0784, 0.0667, 0.0549)      # #141110  frames, ticks
DOTC = Color(0.7490, 0.7216, 0.6824)     # #BFB8AE  dotted trim line
AMBER = Color(0.8980, 0.6314, 0.1059)    # #E5A11B  the spare frame
BRAND = Color(0.3725, 0.3490, 0.3098)    # #5F594F  running head
BODY = Color(0.5490, 0.5216, 0.4824)     # #8C857B  footer prose

# Type.  The v2 sheets were set in Atkinson Hyperlegible, which reached them as
# a Google webfont; only 40-glyph subsets survive inside the old PDF and there
# is no copy of the family in this repo, so the footer is set in Andika — the
# house literacy face already shipped at public/fonts/.
FONT_DIR = REPO / "public" / "fonts"
F_REG, F_BOLD = "Andika", "Andika-Bold"
FS = 6.0            # pt
LEADING = 4.3       # mm
BRAND_BASELINE = 164.0
BODY_TOP_BASELINE = 46.0

FOOTER_BRAND = "Dark Phonics · Writing Shelf · sound-frame mat"

FOOTER_FRONT = [
    ("Front · Tray 1.",
     " Three frames of 70 mm with 6 mm gutters. One counter into a frame for each sound the "
     "child hears, then each counter is swapped for a letter. A 70 mm frame holds a movable-"
     "alphabet tile of up to about 60 mm with room for a finger."),
    ("",
     "One sheet of A4 landscape card, 300 gsm. Duplex, flip on SHORT EDGE. Print at 100% — never "
     "“fit to page” · cut on the dotted line, where two ticks point at each other. The cut "
     "rectangle is 282 × 100 mm and is the same rectangle on both sides, so one cut serves both "
     "faces. Matt laminate — gloss throws the ceiling lights straight back at a child bent over it."),
    ("",
     "Nothing is printed on the mat itself. Every word on this sheet is on the part you throw away."),
]

FOOTER_BACK = [
    ("Back · Tray 3.",
     " Four frames of {f:.0f} mm with {g:.0f} mm gutters — the largest four-up an A4 sheet will hold "
     "with the cut line and its ticks still inside the printer's 5.5 mm margin. The amber frame is "
     "the spare — the one used when a word gains or loses a sound.".format(f=BACK_FRAME, g=BACK_GUTTER)),
    ("",
     "Tray 3 letter tin: doubles of a b c d e g h i m n o p r t u — fifteen letters, thirty tiles. "
     "That is the full set the six chain cards need, and no more."),
    ("",
     "Optional: glue the laminated mat onto 3 mm foam board and cut the windows out with a scalpel, "
     "so the tiles sit recessed and cannot drift."),
]



# --------------------------------------------------------------------------
# checks — these run every build, so the sheet can never quietly go out of spec
# --------------------------------------------------------------------------

def frame_origins(n, frame, gutter):
    span = n * frame + (n - 1) * gutter
    x0 = CX - span / 2.0
    return [x0 + i * (frame + gutter) for i in range(n)], span


def check():
    problems = []
    for label, n, f, g in (("front", FRONT_N, FRONT_FRAME, FRONT_GUTTER),
                           ("back", BACK_N, BACK_FRAME, BACK_GUTTER)):
        xs, span = frame_origins(n, f, g)
        if xs[0] < TRIM_X0 + MAT_MARGIN_MIN - 1e-9:
            problems.append("%s frames overrun the mat margin (%.2f < %.2f)"
                            % (label, xs[0] - TRIM_X0, MAT_MARGIN_MIN))
        if f > TRIM_H - 2 * MAT_MARGIN_MIN:
            problems.append("%s frames are taller than the mat allows" % label)
    # ticks inside the safe margin
    if TRIM_X0 - TICK_H_GAP - TICK_H_LEN < SAFE:
        problems.append("horizontal-line ticks break the %.1f mm safe margin" % SAFE)
    if TRIM_Y1 + TICK_V_GAP + TICK_V_LEN > PAGE_H - SAFE:
        problems.append("vertical-line ticks break the %.1f mm safe margin" % SAFE)
    # the duplex identity: a centred rectangle maps onto itself under the
    # left<->right mirror that a short-edge flip of a landscape sheet performs
    if abs((PAGE_W - TRIM_X1) - TRIM_X0) > 1e-9 or abs((PAGE_H - TRIM_Y1) - TRIM_Y0) > 1e-9:
        problems.append("trim rectangle is not centred: one cut will not serve both sides")
    if problems:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(problems))


# --------------------------------------------------------------------------
# drawing
# --------------------------------------------------------------------------

def rounded(c, x, y, w, h, r, colour, dash=None):
    c.saveState()
    c.setStrokeColor(colour)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    if dash:
        c.setDash([dash[0] * mm, dash[1] * mm])
    c.roundRect(x * mm, y * mm, w * mm, h * mm, r * mm, stroke=1, fill=0)
    c.restoreState()


def trim_rect(c):
    c.saveState()
    c.setStrokeColor(DOTC)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    c.setDash([DOT_ON * mm, DOT_OFF * mm])
    c.rect((TRIM_X0) * mm, (TRIM_Y0) * mm, TRIM_W * mm, TRIM_H * mm, stroke=1, fill=0)
    c.restoreState()

    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    c.setDash([])
    # ticks for the two VERTICAL cut lines: above and below, pointing inward
    for x in (TRIM_X0, TRIM_X1):
        c.line(x * mm, (TRIM_Y1 + TICK_V_GAP) * mm,
               x * mm, (TRIM_Y1 + TICK_V_GAP + TICK_V_LEN) * mm)
        c.line(x * mm, (TRIM_Y0 - TICK_V_GAP) * mm,
               x * mm, (TRIM_Y0 - TICK_V_GAP - TICK_V_LEN) * mm)
    # ticks for the two HORIZONTAL cut lines: left and right, pointing inward
    for y in (TRIM_Y0, TRIM_Y1):
        c.line((TRIM_X0 - TICK_H_GAP) * mm, y * mm,
               (TRIM_X0 - TICK_H_GAP - TICK_H_LEN) * mm, y * mm)
        c.line((TRIM_X1 + TICK_H_GAP) * mm, y * mm,
               (TRIM_X1 + TICK_H_GAP + TICK_H_LEN) * mm, y * mm)
    c.restoreState()


def wrap(c, font, size, text, maxw):
    out, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if c.stringWidth(trial, font, size) <= maxw * mm or not line:
            line = trial
        else:
            out.append(line)
            line = word
    if line:
        out.append(line)
    return out


def footer(c, block):
    """Adult-facing text, always outside the trim rectangle."""
    maxw = PAGE_W - TRIM_X0 - SAFE
    c.setFillColor(BRAND)
    c.setFont(F_BOLD, FS)
    c.drawString(TRIM_X0 * mm, BRAND_BASELINE * mm, FOOTER_BRAND)

    y = BODY_TOP_BASELINE
    c.setFillColor(BODY)
    for lead, rest in block:
        indent = 0.0
        if lead:
            c.setFont(F_BOLD, FS)
            c.drawString(TRIM_X0 * mm, y * mm, lead)
            indent = c.stringWidth(lead, F_BOLD, FS) / mm
        c.setFont(F_REG, FS)
        first = True
        for ln in wrap(c, F_REG, FS, rest.strip(), maxw - indent if lead else maxw):
            x = TRIM_X0 + (indent + 1.0 if first and lead else 0.0)
            c.drawString(x * mm, y * mm, ln)
            y -= LEADING
            first = False


def build():
    check()
    pdfmetrics.registerFont(TTFont(F_REG, str(FONT_DIR / "Andika-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(F_BOLD, str(FONT_DIR / "Andika-Bold.ttf")))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · sound-frame mat")
    c.setAuthor("Montree")

    # ---- side 1: three frames -------------------------------------------
    trim_rect(c)
    xs, _ = frame_origins(FRONT_N, FRONT_FRAME, FRONT_GUTTER)
    fy = CY - FRONT_FRAME / 2.0
    for x in xs:
        rounded(c, x, fy, FRONT_FRAME, FRONT_FRAME, CORNER_R, INK)
    footer(c, FOOTER_FRONT)
    c.showPage()

    # ---- side 2: four frames, the last one amber ------------------------
    trim_rect(c)
    xs, _ = frame_origins(BACK_N, BACK_FRAME, BACK_GUTTER)
    by = CY - BACK_FRAME / 2.0
    for i, x in enumerate(xs):
        last = (i == len(xs) - 1)
        rounded(c, x, by, BACK_FRAME, BACK_FRAME, CORNER_R,
                AMBER if last else INK,
                dash=(DASH_ON, DASH_OFF) if last else None)
    footer(c, FOOTER_BACK)
    c.showPage()

    c.save()

    xs3, span3 = frame_origins(FRONT_N, FRONT_FRAME, FRONT_GUTTER)
    xs4, span4 = frame_origins(BACK_N, BACK_FRAME, BACK_GUTTER)
    print("wrote %s" % OUT)
    print("  sheet        %.1f x %.1f mm, safe margin %.1f mm" % (PAGE_W, PAGE_H, SAFE))
    print("  trim rect    %.1f x %.1f mm at (%.1f, %.1f)-(%.1f, %.1f), identical both sides"
          % (TRIM_W, TRIM_H, TRIM_X0, TRIM_Y0, TRIM_X1, TRIM_Y1))
    print("  side 1       %d x %.0f mm frames, %.0f mm gutters, span %.0f mm, mat margin %.1f mm"
          % (FRONT_N, FRONT_FRAME, FRONT_GUTTER, span3, xs3[0] - TRIM_X0))
    print("  side 2       %d x %.0f mm frames, %.0f mm gutters, span %.0f mm, mat margin %.1f mm"
          % (BACK_N, BACK_FRAME, BACK_GUTTER, span4, xs4[0] - TRIM_X0))
    print("  ticks reach  %.2f mm from the left/right edge, %.2f mm from the top/bottom edge"
          % (TRIM_X0 - TICK_H_GAP - TICK_H_LEN,
             PAGE_H - (TRIM_Y1 + TICK_V_GAP + TICK_V_LEN)))


if __name__ == "__main__":
    build()
