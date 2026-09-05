#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · print sheet K — backup object cards, BUTTED

Builds public/dark-phonics-shelf/v2/11-backup-object-cards.pdf.

A printed stand-in for every miniature on the shelf.  The shelf wants 26 pieces
of 16 different objects (the #miniatures table on dark-phonics-shelves.html) and
several — mop, peg, tin, bin, kit — are genuinely hard to buy.  This sheet prints
the photograph instead, at miniature scale, so a tray is never held up by a
shopping list.

2026-09-05 late, three changes:

* CUT ONCE.  The 5 mm gutters are gone; the cards butt, and every cut line runs
  the full width or full height of the page (cutmarks.py).  5 x 3 = 15 cards on
  a 250 x 150 mm block, centred on A4 landscape.
* 4 mm of white inside every card edge, not 2, so a wandering blade cannot clip
  a photograph.  50 mm card, 42 mm photograph.
* NOTHING IS WAITING ON A PHOTOGRAPH ANY MORE.  sun, pot, pan and tin had none
  in phonics-images/satpin-v2/cvc-photos/ and printed as amber "photo to come"
  slots.  All four are in the Montessori picture bank at
  docs/picture-bank/photos/<word>/<word>.jpg — real objects on white, the house
  rule for these cards — so the builder now falls back to the picture bank and
  all 26 pieces are real cards.  The picture-bank photographs are 3:2, so they
  are padded to square on white (never cropped: a crop can cut the object).
  The amber empty-slot drawing is kept for the next object that has no picture.

PRINTED SIZE IS THE FINISHED SIZE HERE.  These cards are NOT mounted on backing
card — a 50 mm square sits in the hand the way a 3–6 cm miniature does and stands
up in a tray next to the real objects.  (The flip cards and the sequence cards
ARE mounted, which is why their printed sizes are 20 mm smaller than their
finished ones.)

House rules honoured: no word is ever printed on a card — these are sound-box
objects and the child names the picture; every adult-facing word is on the paper
that gets thrown away; print at 100%, never fit-to-page; matt laminate, then cut.

Run:   python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
Needs: reportlab, Pillow
"""

import tempfile
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import cutmarks as CM

# --------------------------------------------------------------------------
# THE OBJECT LIST — the whole spec lives here
# --------------------------------------------------------------------------
# (word, copies, trays).  Order and counts are the #miniatures table on
# public/dark-phonics-shelves.html, read straight down, duplicates adjacent, so
# the three cats come off the blade already stacked.

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
PHOTOS = REPO / "phonics-images" / "satpin-v2" / "cvc-photos"     # gitignored, Mac only
BANK = REPO / "docs" / "picture-bank" / "photos"                  # in the repo
OUT = REPO / "public" / "dark-phonics-shelf" / "v2" / "11-backup-object-cards.pdf"

# --------------------------------------------------------------------------
# NAMED CONSTANTS
# --------------------------------------------------------------------------

PAGE_W, PAGE_H = 297.0, 210.0     # exact A4 landscape

CARD = 50.0                        # square, 50 x 50 mm — miniature scale, unmounted
COLS, ROWS = 5, 3                  # butted: no gutters anywhere
GRID_W, GRID_H = COLS * CARD, ROWS * CARD          # 250 x 150
GRID_X0 = (PAGE_W - GRID_W) / 2.0                  # 23.5  centred
GRID_BOT = (PAGE_H - GRID_H) / 2.0                 # 30.0  centred
GRID_TOP = GRID_BOT + GRID_H                       # 180.0

PHOTO_INSET = CM.CONTENT_CLEAR     # 4 mm of white inside the cut line

STROKE_W = 0.265
DASH_ON = DASH_OFF = 0.79          # amber dashes on a slot with no photograph

INK = Color(0.0784, 0.0667, 0.0549)
AMBER = Color(0.8980, 0.6314, 0.1059)
BRAND = Color(0.3725, 0.3490, 0.3098)
BODY = Color(0.5490, 0.5216, 0.4824)

FONT_DIR = REPO / "public" / "fonts"
F_REG, F_BOLD = "Andika", "Andika-Bold"
FS = 6.0
FS_SLOT = 7.5
LEADING = 3.7
PARA_GAP = 1.3
HEAD_BASELINE = 190.0              # in the top margin, above the grid
FOOT_TOP_BASELINE = 26.5           # in the bottom margin, below the grid
# Adult text starts 4 mm inside the outer cut line, so no line of type begins on
# a cut line and nothing sits above the triangle at the foot of one (Tredoux,
# 2026-09-05 late: the bottom-left triangle was printing under the footer).
# 27.5 mm is also well clear of the 12 mm no-text zone at either page edge.
TEXT_X = GRID_X0 + 4.0

HEAD = "Dark Phonics · Writing Shelf · backup object cards · Trays 1, 2 and 8"

PHOTO_PX = 600
PHOTO_Q = 82

FOOTER = {
    1: [
        ("Backup object cards.",
         " A printed stand-in for every miniature the shelf asks for — print the ones you could "
         "not buy and drop them in the basket beside the real objects. 50 × 50 mm, unmounted: "
         "that is the finished card. Twenty-six in all, 15 here and 11 on sheet 2 — cat ×3, "
         "pig ×3, hat ×3, dog ×2, sun ×2, mug ×2, bed ×2, and one each of pot, pan, tin, mop, "
         "peg, nut, bin, cot and kit. Seven objects are wanted by two or three trays at once, "
         "which is the only reason any is printed more than once."),
        ("",
         "A4 landscape, 300 gsm, single-sided, 100% — never “fit to page”. Matt laminate the "
         "whole sheet, then cut. No word is printed on any card: these are sound-box objects and "
         "the child names the picture himself."),
    ],
    2: [
        ("Where they go.",
         " Tray 1 basket: pig · cat · sun · bed · mug · hat. Tray 2 Set A: cat · pig · dog · pot · "
         "pan · tin · mop · peg. Tray 2 Set B: hat · sun · mug · bed · nut · bin · cot · kit. "
         "Tray 8 oral game: cat · pig · hat · dog. All eight trays sit on the shelf at once, so an "
         "object two trays both want is cut twice."),
        ("",
         "Eleven cards here. The four empty squares at the end of the grid cut into blank 50 mm "
         "cards — keep them as spares for the next object. Same print as sheet 1."),
    ],
}


# --------------------------------------------------------------------------

def slots():
    out = []
    for word, copies, _ in OBJECTS:
        out += [word] * copies
    return out


def cell(index):
    per = COLS * ROWS
    i = index % per
    col, row = i % COLS, i // COLS
    return GRID_X0 + col * CARD, GRID_TOP - CARD - row * CARD


def photo_path(word):
    """cvc-photos first (the studio set), then the Montessori picture bank."""
    p = PHOTOS / ("%s.png" % word)
    if p.exists():
        return p
    b = BANK / word / ("%s.jpg" % word)
    return b if b.exists() else None


MISSING = [w for w, _, _ in OBJECTS if photo_path(w) is None]


def check(pieces):
    problems = []
    if abs(GRID_X0 * 2 + GRID_W - PAGE_W) > 1e-9:
        problems.append("grid is not centred horizontally")
    if abs(GRID_BOT * 2 + GRID_H - PAGE_H) > 1e-9:
        problems.append("grid is not centred vertically")
    if GRID_X0 < CM.SAFE + CM.MARK_H or GRID_BOT < CM.SAFE + CM.MARK_H:
        problems.append("the margin cannot hold a triangle outside the safe margin")
    if HEAD_BASELINE + 2.0 > PAGE_H - CM.SAFE:
        problems.append("the running head breaks the safe margin")
    if TEXT_X < 14.0 or PAGE_W - TEXT_X < 14.0:
        problems.append("adult text sits within 14 mm of a page edge")
    if PHOTO_INSET < CM.CONTENT_CLEAR:
        problems.append("photo inset is under the %.1f mm content rule" % CM.CONTENT_CLEAR)
    if sum(c for _, c, _ in OBJECTS) != len(pieces):
        problems.append("piece count does not match the object list")
    if len(pieces) > 2 * COLS * ROWS:
        problems.append("%d pieces will not fit on 2 pages of %d" % (len(pieces), COLS * ROWS))
    if problems:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(problems))


def square(src, dst):
    """Pad to square on white — never crop, a crop can cut the object."""
    im = Image.open(src).convert("RGB")
    n = max(im.size)
    pad = Image.new("RGB", (n, n), (255, 255, 255))
    pad.paste(im, ((n - im.width) // 2, (n - im.height) // 2))
    pad.resize((PHOTO_PX, PHOTO_PX), Image.LANCZOS).save(
        dst, "JPEG", quality=PHOTO_Q, optimize=True)


def empty_slot(c, x0, y0, word):
    c.saveState()
    c.setStrokeColor(AMBER)
    c.setLineWidth(STROKE_W * mm)
    c.setDash([DASH_ON * mm, DASH_OFF * mm])
    c.rect((x0 + 2) * mm, (y0 + 2) * mm, (CARD - 4) * mm, (CARD - 4) * mm, stroke=1, fill=0)
    c.restoreState()
    c.setFillColor(BODY)
    c.setFont(F_REG, FS_SLOT)
    c.drawCentredString((x0 + CARD / 2.0) * mm, (y0 + CARD / 2.0 + 0.6) * mm, word)
    c.setFont(F_REG, FS - 1.0)
    c.drawCentredString((x0 + CARD / 2.0) * mm, (y0 + CARD / 2.0 - 3.6) * mm, "photo to come")


def card(c, x0, y0, jpg):
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
    c.drawString(TEXT_X * mm, HEAD_BASELINE * mm, HEAD)
    c.drawRightString((PAGE_W - TEXT_X) * mm, HEAD_BASELINE * mm,
                      "sheet %d of %d" % (page, pages))


def footer(c, block):
    maxw = PAGE_W - 2 * TEXT_X
    y = FOOT_TOP_BASELINE
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
        y -= PARA_GAP
    lowest = y + LEADING + PARA_GAP - 1.3
    floor = CM.SAFE + CM.MARK_H + 1.5      # clear of the triangles at the line feet
    if lowest < floor:
        raise SystemExit("SPEC FAILURE:\n  the footer reaches %.2f mm, into the "
                         "triangles at the foot of the cut lines (floor %.2f mm)"
                         % (lowest, floor))
    return lowest


def build():
    pieces = slots()
    check(pieces)
    pdfmetrics.registerFont(TTFont(F_REG, str(FONT_DIR / "Andika-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(F_BOLD, str(FONT_DIR / "Andika-Bold.ttf")))

    per = COLS * ROWS
    pages = (len(pieces) + per - 1) // per
    v, h = CM.grid_lines(GRID_X0, GRID_BOT, COLS, ROWS, CARD, CARD, PAGE_W, PAGE_H)

    with tempfile.TemporaryDirectory() as tmp:
        jpgs, sources = {}, {}
        for word, _, _ in OBJECTS:
            src = photo_path(word)
            if src is None:
                continue
            dst = Path(tmp) / ("%s.jpg" % word)
            square(src, dst)
            jpgs[word] = dst
            sources[word] = "cvc" if src.parent == PHOTOS else "picture-bank"

        OUT.parent.mkdir(parents=True, exist_ok=True)
        c = canvas.Canvas(str(OUT), pagesize=(PAGE_W * mm, PAGE_H * mm))
        c.setTitle("Dark Phonics · Writing Shelf · backup object cards")
        c.setAuthor("Montree")

        lowest, stats = None, None
        for p in range(pages):
            head(c, p + 1, pages)
            stats = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
            n_here = 0
            for i in range(p * per, min((p + 1) * per, len(pieces))):
                word = pieces[i]
                x0, y0 = cell(i)
                if word in jpgs:
                    card(c, x0, y0, jpgs[word])
                    n_here += 1
                else:
                    empty_slot(c, x0, y0, word)
            lowest = footer(c, FOOTER[p + 1] + [(CM.cards_line(n_here) + ".", "")])
            c.showPage()
        c.save()

    kb = OUT.stat().st_size / 1024.0
    bank = sorted(w for w, s in sources.items() if s == "picture-bank")
    print("wrote %s" % OUT)
    print("  sheet        A4 landscape %.1f x %.1f mm" % (PAGE_W, PAGE_H))
    print("  grid         %d x %d butted = %d cards/page, %d pages" % (COLS, ROWS, per, pages))
    print("  card         %.1f x %.1f mm, photo %.1f mm inside a %.1f mm white margin"
          % (CARD, CARD, CARD - 2 * PHOTO_INSET, PHOTO_INSET))
    print("  block        x %.1f..%.1f, y %.1f..%.1f mm — margins %.1f / %.1f"
          % (GRID_X0, GRID_X0 + GRID_W, GRID_BOT, GRID_TOP, GRID_X0, GRID_BOT))
    print("  cut          %d lines edge to edge, %d triangles" % (stats["lines"], stats["marks"]))
    print("  footer down  to %.2f mm from the bottom edge (safe %.1f)" % (lowest, CM.SAFE))
    print("  pieces       %d, %d photographed, %d waiting: %s"
          % (len(pieces), sum(1 for w in pieces if w not in MISSING),
             sum(1 for w in pieces if w in MISSING), ", ".join(MISSING) or "none"))
    print("  from bank    %s" % (", ".join(bank) or "none"))
    print("  size         %.0f KB" % kb)


if __name__ == "__main__":
    build()
