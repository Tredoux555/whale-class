#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · print sheet K
Builds public/dark-phonics-shelf/v2/11-backup-object-cards.pdf.

A printed stand-in for every miniature on the shelf.  The shelf wants 26 pieces
of 16 different objects (see the #miniatures table on dark-phonics-shelves.html)
and several of them — mop, peg, tin, bin, kit — are genuinely hard to buy.  This
sheet prints the photograph instead, at miniature scale, so a tray is never held
up by a shopping list.

Run:   python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
Needs: reportlab, Pillow

House rules honoured here
-------------------------
* Every adult-facing word sits OUTSIDE the trim rectangles — the head is above
  the grid, the footer below it, and nothing is printed on a card.
* NO WORD IS PRINTED ON A CARD, ever, and not only by the throw-away rule: these
  are sound-box objects.  The child names the picture.  A word on the card hands
  him the answer.
* Dotted trim rectangle per card, with paired ticks pointing at each other.
* Amber is the one meaningful thing on the sheet.  Here it marks the slots whose
  photograph does not exist yet — they are drawn in amber dashes, carry the word
  in grey (they are markers, not cards) and deliberately get NO cut ticks.
* Print at 100 %, never fit-to-page.  Matt laminate, then cut.

Landscape, not portrait, and why.  A 50 mm card in three columns of five fills
an A4 portrait sheet from 15 mm of the top to 15 mm of the bottom, which leaves
no room for a footer — and this sheet needs one, because the tray allocation is
the only place the counts are written down.  Turned landscape it is five columns
of three, 15 cards a page in exactly the same 2 pages, with 36 mm of waste under
the grid for the words.
"""

import tempfile
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# --------------------------------------------------------------------------
# THE OBJECT LIST — the whole spec lives here
# --------------------------------------------------------------------------
# (word, copies, trays).  Order and counts are the #miniatures table on
# public/dark-phonics-shelves.html, read straight down, so the cut sheet reads
# in the same order as the shopping table.  Duplicates are adjacent on purpose:
# cut the sheet and the three cats come off it already stacked.

OBJECTS = [
    ("cat", 3, "T1 basket · T2 Set A · T8"),
    ("pig", 3, "T1 basket · T2 Set A · T8"),
    ("hat", 3, "T1 basket · T2 Set B · T8"),
    ("dog", 2, "T2 Set A · T8"),
    ("sun", 2, "T1 basket · T2 Set B"),
    ("mug", 2, "T1 basket · T2 Set B"),
    ("bed", 2, "T1 basket · T2 Set B"),
    ("pot", 1, "T2 Set A"),
    ("pan", 1, "T2 Set A"),
    ("tin", 1, "T2 Set A"),
    ("mop", 1, "T2 Set A"),
    ("peg", 1, "T2 Set A"),
    ("nut", 1, "T2 Set B"),
    ("bin", 1, "T2 Set B"),
    ("cot", 1, "T2 Set B"),
    ("kit", 1, "T2 Set B"),
]

REPO = Path(__file__).resolve().parents[3]
PHOTOS = REPO / "phonics-images" / "satpin-v2" / "cvc-photos"
OUT = REPO / "public" / "dark-phonics-shelf" / "v2" / "11-backup-object-cards.pdf"

# --------------------------------------------------------------------------
# NAMED CONSTANTS
# --------------------------------------------------------------------------

# Sheet — exact A4 landscape.
PAGE_W = 297.0
PAGE_H = 210.0

SAFE = 5.5            # printer-safe margin; no ink of any kind comes closer

CARD = 50.0           # the card is square, 50 x 50 mm — miniature scale
COLS = 5
ROWS = 3
GUTTER = 5.0          # between cards, both axes; holds two facing tick pairs

GRID_W = COLS * CARD + (COLS - 1) * GUTTER          # 270.0
GRID_H = ROWS * CARD + (ROWS - 1) * GUTTER          # 160.0
GRID_X0 = (PAGE_W - GRID_W) / 2.0                   #  13.5  (centred)
GRID_TOP = 196.0
GRID_BOT = GRID_TOP - GRID_H                        #  36.0

PHOTO_INSET = 2.0     # white margin between the cut line and the photograph

# Ticks.  Short, because a 5 mm gutter has to hold two sets pointing at each
# other: 2 x (GAP + LEN) = 4.4 mm, leaving 0.6 mm of clear paper between them.
TICK_LEN = 1.6
TICK_GAP = 0.6

STROKE_W = 0.265      # the house hairline
DOT_ON = 0.265        # dotted trim line: 1 px on, 1 px off at 96 dpi
DOT_OFF = 0.265
DASH_ON = 0.79        # amber dashes on a slot with no photograph yet
DASH_OFF = 0.79

# Ink — the v2 palette, unchanged.
INK = Color(0.0784, 0.0667, 0.0549)      # #141110  ticks
DOTC = Color(0.7490, 0.7216, 0.6824)     # #BFB8AE  dotted trim line
AMBER = Color(0.8980, 0.6314, 0.1059)    # #E5A11B  the one meaningful thing
BRAND = Color(0.3725, 0.3490, 0.3098)    # #5F594F  running head
BODY = Color(0.5490, 0.5216, 0.4824)     # #8C857B  footer prose

FONT_DIR = REPO / "public" / "fonts"
F_REG, F_BOLD = "Andika", "Andika-Bold"
FS = 6.0              # pt, footer and head
FS_SLOT = 7.5         # pt, the word on an empty slot
LEADING = 4.0         # mm
PARA_GAP = 1.3        # mm
HEAD_BASELINE = 201.0
FOOT_TOP_BASELINE = 30.5

HEAD = "Dark Phonics · Writing Shelf · backup object cards · Trays 1, 2 and 8"

# Photographs are 1024 x 1024.  50 mm at 300 dpi is 590 px, so 600 is already
# more than the printer can use; anything larger only makes the PDF fat.
PHOTO_PX = 600
PHOTO_Q = 82

FOOTER = {
    1: [
        ("Backup object cards.",
         " A printed stand-in for every miniature the shelf asks for — print the ones you could not "
         "buy and drop them in the basket beside the real objects. A 50 × 50 mm card sits in a "
         "child's hand about the way a 3–6 cm miniature does and stands up in a tray. Twenty-six "
         "cards in all, 15 here and 11 on sheet 2: cat ×3, pig ×3, hat ×3, dog ×2, sun ×2, mug ×2, "
         "bed ×2, and one each of pot, pan, tin, mop, peg, nut, bin, cot and kit. Seven of the "
         "objects are wanted by two or three trays at the same time, which is the only reason any "
         "of them is printed more than once."),
        ("",
         "One sheet of A4 landscape card, 300 gsm, single-sided — there is no duplex on this job. "
         "Print at 100% — never “fit to page”, which quietly turns a 50 mm card into a 48 mm one. "
         "Laminate the whole sheet first, then cut: 15 cards on the dotted rectangles, where two "
         "ticks point at each other. Matt laminate — gloss throws the ceiling lights straight back "
         "off a photograph."),
        ("",
         "No word is printed on any card, and that is not only the throw-away rule. These are "
         "sound-box objects: the child names the picture himself, and a word on the card would hand "
         "him the answer. Every word on this sheet is on the part you throw away."),
    ],
    2: [
        ("Where they go.",
         " Tray 1 basket: pig · cat · sun · bed · mug · hat. Tray 2 Set A: cat · pig · dog · pot · "
         "pan · tin · mop · peg. Tray 2 Set B: hat · sun · mug · bed · nut · bin · cot · kit. "
         "Tray 8 oral game: cat · pig · hat · dog. All eight trays sit on the shelf at once, so an "
         "object that two trays both want is cut twice — the duplicates come off the sheet already "
         "stacked together."),
        ("Four objects are still waiting on a photograph.",
         " sun, pot, pan and tin have none yet, so their slots are drawn in amber dashes with the "
         "word written on them, and they carry no cut ticks because there is nothing to cut. That "
         "is five of the twenty-six pieces, because sun is wanted twice. The four Midjourney "
         "prompts are in scripts/curriculum/writing-shelf/MJ-PROMPTS-BACKUP-CARDS.md; when the "
         "pictures land in phonics-images/satpin-v2/cvc-photos/, rerun "
         "build_backup_object_cards.py and the slots fill themselves."),
        ("",
         "Same print as sheet 1: A4 landscape, 300 gsm card, single-sided, 100%, laminate the whole "
         "sheet and then cut. Eleven cards here."),
    ],
}


# --------------------------------------------------------------------------
# derived layout
# --------------------------------------------------------------------------

def slots():
    """The 26 pieces, in table order, duplicates adjacent."""
    out = []
    for word, copies, trays in OBJECTS:
        for _ in range(copies):
            out.append(word)
    return out


def cell(index):
    """(x0, y0) of the card in slot `index` on its page, in mm."""
    per = COLS * ROWS
    i = index % per
    col, row = i % COLS, i // COLS
    x0 = GRID_X0 + col * (CARD + GUTTER)
    y0 = GRID_TOP - CARD - row * (CARD + GUTTER)
    return x0, y0


def photo_path(word):
    p = PHOTOS / ("%s.png" % word)
    return p if p.exists() else None


# --------------------------------------------------------------------------
# checks — run on every build
# --------------------------------------------------------------------------

def check(pieces):
    problems = []
    if abs(GRID_X0 * 2 + GRID_W - PAGE_W) > 1e-9:
        problems.append("grid is not centred horizontally")
    if GRID_X0 - TICK_GAP - TICK_LEN < SAFE:
        problems.append("left/right ticks break the %.1f mm safe margin" % SAFE)
    if GRID_TOP + TICK_GAP + TICK_LEN > PAGE_H - SAFE:
        problems.append("top ticks break the %.1f mm safe margin" % SAFE)
    if GRID_BOT - TICK_GAP - TICK_LEN < SAFE:
        problems.append("bottom ticks break the %.1f mm safe margin" % SAFE)
    if 2 * (TICK_GAP + TICK_LEN) >= GUTTER:
        problems.append("facing tick pairs collide inside the %.1f mm gutter" % GUTTER)
    if HEAD_BASELINE - 1.3 < GRID_TOP + TICK_GAP + TICK_LEN + 0.8:
        problems.append("the running head sits on top of the grid ticks")
    if FOOT_TOP_BASELINE + 2.2 > GRID_BOT - TICK_GAP - TICK_LEN - 0.8:
        problems.append("the footer sits on top of the grid ticks")
    if PHOTO_INSET * 2 >= CARD:
        problems.append("photo inset swallows the card")
    if sum(c for _, c, _ in OBJECTS) != len(pieces):
        problems.append("piece count does not match the object list")
    if len(pieces) > 2 * COLS * ROWS:
        problems.append("%d pieces will not fit on 2 pages of %d"
                        % (len(pieces), COLS * ROWS))
    for word, _, _ in OBJECTS:
        if photo_path(word) is None and word not in MISSING:
            problems.append("%s has no photo and is not declared missing" % word)
    if problems:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(problems))


MISSING = [w for w, _, _ in OBJECTS if not (PHOTOS / ("%s.png" % w)).exists()]


# --------------------------------------------------------------------------
# drawing
# --------------------------------------------------------------------------

def trim_rect(c, x0, y0):
    c.saveState()
    c.setStrokeColor(DOTC)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    c.setDash([DOT_ON * mm, DOT_OFF * mm])
    c.rect(x0 * mm, y0 * mm, CARD * mm, CARD * mm, stroke=1, fill=0)
    c.restoreState()


def ticks(c, x0, y0):
    """Paired ticks: every cut line gets one at each end, pointing inward."""
    x1, y1 = x0 + CARD, y0 + CARD
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    c.setDash([])
    for x in (x0, x1):        # the two vertical cut lines
        c.line(x * mm, (y1 + TICK_GAP) * mm, x * mm, (y1 + TICK_GAP + TICK_LEN) * mm)
        c.line(x * mm, (y0 - TICK_GAP) * mm, x * mm, (y0 - TICK_GAP - TICK_LEN) * mm)
    for y in (y0, y1):        # the two horizontal cut lines
        c.line((x0 - TICK_GAP) * mm, y * mm, (x0 - TICK_GAP - TICK_LEN) * mm, y * mm)
        c.line((x1 + TICK_GAP) * mm, y * mm, (x1 + TICK_GAP + TICK_LEN) * mm, y * mm)
    c.restoreState()


def empty_slot(c, x0, y0, word):
    """No photograph yet.  A marker, not a card: amber dashes, no cut ticks."""
    c.saveState()
    c.setStrokeColor(AMBER)
    c.setLineWidth(STROKE_W * mm)
    c.setLineCap(0)
    c.setDash([DASH_ON * mm, DASH_OFF * mm])
    c.rect(x0 * mm, y0 * mm, CARD * mm, CARD * mm, stroke=1, fill=0)
    c.restoreState()
    c.setFillColor(BODY)
    c.setFont(F_REG, FS_SLOT)
    c.drawCentredString((x0 + CARD / 2.0) * mm, (y0 + CARD / 2.0 + 0.6) * mm, word)
    c.setFont(F_REG, FS - 1.0)
    c.drawCentredString((x0 + CARD / 2.0) * mm, (y0 + CARD / 2.0 - 3.6) * mm,
                        "photo to come")


def card(c, x0, y0, jpg):
    trim_rect(c, x0, y0)
    ticks(c, x0, y0)
    side = CARD - 2 * PHOTO_INSET
    c.drawImage(str(jpg), (x0 + PHOTO_INSET) * mm, (y0 + PHOTO_INSET) * mm,
                side * mm, side * mm, preserveAspectRatio=True, anchor='c')


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


def head(c, page, pages):
    c.setFillColor(BRAND)
    c.setFont(F_BOLD, FS)
    c.drawString(GRID_X0 * mm, HEAD_BASELINE * mm, HEAD)
    c.drawRightString((PAGE_W - GRID_X0) * mm, HEAD_BASELINE * mm,
                      "sheet %d of %d" % (page, pages))


def footer(c, block):
    maxw = PAGE_W - 2 * GRID_X0
    y = FOOT_TOP_BASELINE
    c.setFillColor(BODY)
    for lead, rest in block:
        indent = 0.0
        if lead:
            c.setFont(F_BOLD, FS)
            c.drawString(GRID_X0 * mm, y * mm, lead)
            indent = c.stringWidth(lead, F_BOLD, FS) / mm
        c.setFont(F_REG, FS)
        first = True
        for ln in wrap(c, F_REG, FS, rest.strip(), maxw - indent if lead else maxw):
            x = GRID_X0 + (indent + 1.0 if first and lead else 0.0)
            c.drawString(x * mm, y * mm, ln)
            y -= LEADING
            first = False
        y -= PARA_GAP
    lowest = y + LEADING + PARA_GAP - 1.3      # descender of the last line
    if lowest < SAFE:
        raise SystemExit("SPEC FAILURE:\n  footer overruns the %.1f mm safe "
                         "margin (reaches %.2f mm)" % (SAFE, lowest))
    return lowest


def build():
    pieces = slots()
    check(pieces)
    pdfmetrics.registerFont(TTFont(F_REG, str(FONT_DIR / "Andika-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(F_BOLD, str(FONT_DIR / "Andika-Bold.ttf")))

    per = COLS * ROWS
    pages = (len(pieces) + per - 1) // per

    with tempfile.TemporaryDirectory() as tmp:
        # Downscale once per DISTINCT word; reportlab caches on the filename, so
        # a word used three times is embedded once.
        jpgs = {}
        for word, _, _ in OBJECTS:
            src = photo_path(word)
            if src is None:
                continue
            dst = Path(tmp) / ("%s.jpg" % word)
            im = Image.open(src).convert("RGB")
            im = im.resize((PHOTO_PX, PHOTO_PX), Image.LANCZOS)
            im.save(dst, "JPEG", quality=PHOTO_Q, optimize=True)
            jpgs[word] = dst

        OUT.parent.mkdir(parents=True, exist_ok=True)
        c = canvas.Canvas(str(OUT), pagesize=(PAGE_W * mm, PAGE_H * mm))
        c.setTitle("Dark Phonics · Writing Shelf · backup object cards")
        c.setAuthor("Montree")

        lowest = None
        for p in range(pages):
            head(c, p + 1, pages)
            for i in range(p * per, min((p + 1) * per, len(pieces))):
                word = pieces[i]
                x0, y0 = cell(i)
                if word in jpgs:
                    card(c, x0, y0, jpgs[word])
                else:
                    empty_slot(c, x0, y0, word)
            lowest = footer(c, FOOTER[p + 1])
            c.showPage()
        c.save()

    kb = OUT.stat().st_size / 1024.0
    print("wrote %s" % OUT)
    print("  sheet        A4 landscape %.1f x %.1f mm, safe margin %.1f mm" % (PAGE_W, PAGE_H, SAFE))
    print("  grid         %d x %d = %d slots/page, %d pages" % (COLS, ROWS, per, pages))
    print("  card         %.1f x %.1f mm, %.1f mm gutters, photo %.1f mm inside a %.1f mm margin"
          % (CARD, CARD, GUTTER, CARD - 2 * PHOTO_INSET, PHOTO_INSET))
    print("  grid box     x %.1f..%.1f, y %.1f..%.1f mm"
          % (GRID_X0, GRID_X0 + GRID_W, GRID_BOT, GRID_TOP))
    print("  ticks reach  %.2f mm from the left/right edge, %.2f mm from the top edge"
          % (GRID_X0 - TICK_GAP - TICK_LEN, PAGE_H - (GRID_TOP + TICK_GAP + TICK_LEN)))
    print("  footer down  to %.2f mm from the bottom edge" % lowest)
    print("  pieces       %d (%d photographed, %d waiting: %s)"
          % (len(pieces), sum(1 for w in pieces if w not in MISSING),
             sum(1 for w in pieces if w in MISSING), ", ".join(MISSING)))
    print("  size         %.0f KB" % kb)


if __name__ == "__main__":
    build()
