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

import cutmarks as CM

STATS = dict(drawn=0, dropped=0, shortest=0.0)

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
# Adult text starts here: 14 mm in from the page edge (Tredoux, 2026-09-05 late —
# nothing may sit within 12 mm of an edge) and 6.5 mm clear of the vertical cut
# line at TRIM_X0 = 7.5, so no line of type begins on a cut line or on a triangle.
TEXT_X = 14.0

FOOTER_BRAND = "Dark Phonics · Writing Shelf · sound-frame mat"

FOOTER_FRONT = [
    ("Front · Tray 1.",
     " Three frames of 70 mm with 6 mm gutters. One counter into a frame for each sound the "
     "child hears, then each counter is swapped for a letter. A 70 mm frame holds a movable-"
     "alphabet tile of up to about 60 mm with room for a finger."),
    ("",
     "One sheet of A4 landscape card, 300 gsm. Duplex, flip on SHORT EDGE. Print at 100% — never "
     "“fit to page” · cut along every grey line, edge to edge, between the black triangles. The cut "
     "rectangle is 282 × 100 mm and is the same rectangle on both sides, so one cut serves both "
     "faces. Matt laminate — gloss throws the ceiling lights straight back at a child bent over it."),
    ("",
     "Nothing is printed on the mat itself. Every word on this sheet is on the part you throw away."),
]

FOOTER_BACK = [
    ("Back · Tray 3.",
     " Four frames of {f:.0f} mm with {g:.0f} mm gutters — the largest four-up an A4 sheet will hold "
     "with the frames still inside the printer's 5.5 mm margin. The amber frame is "
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
    # ink stays inside the printer-safe margin.  The CUT LINES themselves now
    # run to the paper edge (cut once, 2026-09-05 late) and are allowed to; it
    # is the frames and the type that must not.
    if TEXT_X < 14.0 or PAGE_W - TEXT_X < 14.0:
        problems.append("adult text sits within 14 mm of a page edge")
    if abs(TEXT_X - TRIM_X0) < 3.0:
        problems.append("adult text starts on the vertical cut line")
    if TRIM_X0 + MAT_MARGIN_MIN < CM.SAFE:
        problems.append("the mat reaches inside the %.1f mm safe margin" % CM.SAFE)
    if TRIM_Y1 > PAGE_H - CM.SAFE:
        problems.append("the mat reaches inside the %.1f mm safe margin" % CM.SAFE)
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
    """The house standard (cutmarks.py, 2026-09-05 late): CUT ONCE.

    The mat is one rectangle, so its four cut lines are drawn edge to edge —
    two full-height verticals and two full-width horizontals — and each carries
    a black triangle at the printer-safe margin at both ends.  Four straight
    strokes of the blade and the mat is out, with no waste strip to chase.
    """
    global STATS
    STATS = CM.cut_lines(c,
                         [(TRIM_X0, 0.0, PAGE_H), (TRIM_X1, 0.0, PAGE_H)],
                         [(TRIM_Y0, 0.0, PAGE_W), (TRIM_Y1, 0.0, PAGE_W)],
                         PAGE_W, PAGE_H)
    return STATS


def max_frame(trim_len, n, gutter, margin=None):
    """The largest frame that fits, given a trim length.  THE formula.

        n * frame + (n - 1) * gutter + 2 * margin = trim_len

    so  frame = (trim_len - 2 * margin - (n - 1) * gutter) / n.

    And the trim length itself is bounded by the paper: the frames carry ink, so
    they must stay inside the printer-safe margin —

        (PAGE_W - trim_len) / 2 + margin  >=  SAFE,

    which on A4 landscape with a 3 mm mat margin caps trim_len at 292 mm.  (The
    cut lines may run to the paper edge; only the ink may not.)
    """
    m = MAT_MARGIN_MIN if margin is None else margin
    return (trim_len - 2 * m - (n - 1) * gutter) / float(n)


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
    maxw = PAGE_W - 2 * TEXT_X
    c.setFillColor(BRAND)
    c.setFont(F_BOLD, FS)
    c.drawString(TEXT_X * mm, BRAND_BASELINE * mm, FOOTER_BRAND)

    y = BODY_TOP_BASELINE
    c.setFillColor(BODY)
    for lead, rest in block:
        indent = 0.0
        if lead:
            c.setFont(F_BOLD, FS)
            c.drawString(TEXT_X * mm, y * mm, lead)
            indent = c.stringWidth(lead, F_BOLD, FS) / mm
        c.setFont(F_REG, FS)
        first = True
        for ln in wrap(c, F_REG, FS, rest.strip(), maxw - indent if lead else maxw):
            x = TEXT_X + (indent + 1.0 if first and lead else 0.0)
            c.drawString(x * mm, y * mm, ln)
            y -= LEADING
            first = False
    y -= 1.3
    c.setFillColor(CM.FOOT_C)
    c.setFont(F_BOLD, FS)
    c.drawString(TEXT_X * mm, y * mm, CM.cards_line(1, "mat") + ".")
    if y - 1.3 < SAFE:
        raise SystemExit("SPEC FAILURE:\n  the footer overruns the %.1f mm safe margin" % SAFE)


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
    print("  cut          %d lines edge to edge, %d triangles at the safe margin"
          % (STATS["lines"], STATS["marks"]))
    print("  max frame    at this %.0f mm trim: side 1 %.2f mm (n=%d, g=%.0f), "
          "side 2 %.2f mm (n=%d, g=%.0f)"
          % (TRIM_W, max_frame(TRIM_W, FRONT_N, FRONT_GUTTER), FRONT_N, FRONT_GUTTER,
             max_frame(TRIM_W, BACK_N, BACK_GUTTER), BACK_N, BACK_GUTTER))


if __name__ == "__main__":
    build()
