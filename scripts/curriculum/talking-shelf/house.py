#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · the house kit every builder on this shelf shares.

There is exactly one cutting standard in this repo and it lives in
scripts/curriculum/writing-shelf/cutmarks.py.  This module does NOT copy it —
it puts the Writing Shelf's script directory on sys.path so that

    import house                      # noqa
    import cutmarks as CM

imports that same file.  If Rule A ever changes, it changes once and both
shelves move together.

Everything else here is the house look, lifted unchanged from
build_12_word_card_tin.py: Fredoka Medium (instanced at build time out of the
one variable font in the repo) for anything a CHILD reads, Andika for anything
an ADULT reads, #141110 ink, #5F594F adult grey, #8C857B footer grey, and the
amber the shelf uses for "this one is different".

Sizes on this shelf, per docs/handoffs/HANDOFF_SHELF_PRINT_FIX_2026-09-05.md §8.2:

  flip cards      80 × 120 printed  ->  100 × 140 mounted   (card stands)
  story cards     70 × 70  printed  ->  90 × 90  mounted    (10 × 10 envelopes)
  frame cards     100 × 140 printed, UNMOUNTED — they stand at the back of the
                  tray, they do not go into a stand, so they print at finished
                  size and one to a page is what an A4 can hold inside the
                  5.5 mm printer-safe margin.
  teacher card    148.5 × 210, 2-up on A4 landscape, like sheet 09.

DUPLEX is SHORT EDGE everywhere, and the imposition is read off the shipped
Writing Shelf sheet 03, not guessed: front (x, y) is backed by (x, H − y), so
the BACK page keeps the column and flips the row, and the back card's content is
drawn rotated 180° inside its own card.  Verified on 03: p1 cat · pig · rug · hat
is backed by p2 rug · hat · cat · pig, every back word upside down on the sheet.
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
WRITING_SHELF = REPO / "scripts" / "curriculum" / "writing-shelf"
if str(WRITING_SHELF) not in sys.path:
    sys.path.insert(0, str(WRITING_SHELF))

import cutmarks as CM  # noqa: E402  — the one cutting standard, imported not copied

from fontTools import ttLib  # noqa: E402
from fontTools.varLib import instancer  # noqa: E402
from reportlab.lib.colors import Color  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402

OUT_DIR = REPO / "public" / "dark-phonics-talking-shelf" / "v1"
ART_DIR = REPO / "phonics-images" / "satpin-v2" / "talking-shelf"
FONT_DIR = REPO / "public" / "fonts"
FREDOKA_VAR = REPO / "docs" / "circle-time" / "guide-src" / "fonts" / "Fredoka-Variable.ttf"
BUILD_DIR = HERE / ".build"

A4_W, A4_H = 210.0, 297.0
A4L_W, A4L_H = 297.0, 210.0

CARD_W, CARD_H = 80.0, 120.0        # flip cards, printed
STORY = 70.0                        # story cards, printed
FRAME_W, FRAME_H = 100.0, 140.0     # frame cards, printed = finished

INK = CM.MARK_C                                   # #141110
ADULT_C = Color(0.3725, 0.3490, 0.3098)           # #5F594F
FOOT_C = CM.FOOT_C                                # #8C857B
AMBER = Color(0.8784, 0.6196, 0.1961)             # #E09E32
PALE = Color(0.9020, 0.8902, 0.8706)              # #E6E3DE — the placeholder ground
PALE_INK = Color(0.7176, 0.6902, 0.6549)          # #B7B0A7 — the placeholder mark

FOOT_SIZE = 5.5
TEXT_EDGE_MIN = 14.0                # adult text starts no nearer a page edge
LINE_CLEAR = 3.0                    # adult text starts no nearer a cut line

CHILD_FONT = "FredokaMedium"
ADULT_FONT = "Andika"
ADULT_BOLD = "AndikaBold"


def register_fonts():
    """Fredoka ships as one variable font whose default instance is Light.

    The shelf's child-facing face is Fredoka MEDIUM, so the wght=500 / wdth=100
    instance is cut here at build time and thrown away with .build/ — exactly as
    build_12_word_card_tin.py does it, so a word on a Talking Shelf card and a
    word out of the Writing Shelf tin are the same shape.
    """
    BUILD_DIR.mkdir(exist_ok=True)
    out = BUILD_DIR / "Fredoka-Medium-inst.ttf"
    if not out.exists():
        var = ttLib.TTFont(str(FREDOKA_VAR))
        inst = instancer.instantiateVariableFont(var, {"wght": 500, "wdth": 100})
        inst.save(str(out))
    if CHILD_FONT not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(CHILD_FONT, str(out)))
        pdfmetrics.registerFont(TTFont(ADULT_FONT, str(FONT_DIR / "Andika-Regular.ttf")))
        pdfmetrics.registerFont(TTFont(ADULT_BOLD, str(FONT_DIR / "Andika-Bold.ttf")))


# ------------------------------------------------------------------ text ----
def w_mm(text, font, size):
    return pdfmetrics.stringWidth(text, font, size) / 72.0 * 25.4


def wrap(text, font, size, width_mm):
    """Greedy wrap. A single word wider than the box is left on its own line —
    the caller's fitter shrinks the size until that stops happening."""
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = word if not cur else cur + " " + word
        if w_mm(trial, font, size) <= width_mm or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def fit_block(paras, font, box_w, box_h, leading=1.30, para_gap=0.55,
              hi=60.0, lo=4.0, step=0.05):
    """Largest point size at which every paragraph, wrapped, fits box_w × box_h.

    Returns (size, [lines]) where lines is the flat wrapped list with None
    standing for a paragraph gap.
    """
    size = hi
    while size > lo:
        lines, ok = [], True
        for i, p in enumerate(paras):
            if i:
                lines.append(None)
            ls = wrap(p, font, size, box_w)
            if any(w_mm(l, font, size) > box_w + 1e-6 for l in ls):
                ok = False
                break
            lines.extend(ls)
        if ok:
            n_text = sum(1 for l in lines if l is not None)
            n_gap = sum(1 for l in lines if l is None)
            h = (n_text * leading + n_gap * para_gap) * size / 72.0 * 25.4
            if h <= box_h:
                return size, lines
        size -= step
    raise SystemExit("fit_block: nothing fits in %.1f x %.1f mm" % (box_w, box_h))


def fit_lines(paras, font, box_w, box_h, leading=1.30, para_gap=0.55,
              hi=60.0, lo=4.0, step=0.05):
    """Largest size at which every paragraph fits on ONE line inside box_w, and
    the stack fits box_h. Used where a wrapped sentence would read as two — a
    frame card is a sentence a child completes, and a sentence broken across two
    lines is a sentence he reads as two."""
    size = hi
    while size > lo:
        if all(w_mm(p, font, size) <= box_w for p in paras):
            h = (len(paras) * leading + (len(paras) - 1) * para_gap) * size / 72.0 * 25.4
            if h <= box_h:
                lines = []
                for i, p in enumerate(paras):
                    if i:
                        lines.append(None)
                    lines.append(p)
                return size, lines
        size -= step
    raise SystemExit("fit_lines: nothing fits in %.1f x %.1f mm" % (box_w, box_h))


def block_height(lines, size, leading=1.30, para_gap=0.55):
    n_text = sum(1 for l in lines if l is not None)
    n_gap = sum(1 for l in lines if l is None)
    return (n_text * leading + n_gap * para_gap) * size / 72.0 * 25.4


def draw_block(c, lines, size, cx, top_y, colour=INK, font=CHILD_FONT,
               leading=1.30, para_gap=0.55, align="centre"):
    """Draw a wrapped block, first baseline one leading below top_y."""
    c.saveState()
    c.setFillColor(colour)
    c.setFont(font, size)
    lead = leading * size / 72.0 * 25.4
    gap = para_gap * size / 72.0 * 25.4
    y = top_y
    for line in lines:
        if line is None:
            y -= gap
            continue
        y -= lead
        if align == "centre":
            c.drawCentredString(cx * mm, y * mm, line)
        else:
            c.drawString(cx * mm, y * mm, line)
    c.restoreState()


# ------------------------------------------------------------- imposition ---
def back_row(r, rows):
    """SHORT-EDGE duplex: (x, y) -> (x, H - y). The column is untouched, the row
    flips. Read off the shipped Writing Shelf sheet 03."""
    return rows - 1 - r


def rot180(c, x, y, w, h):
    """Push a transform that draws into the card at (x, y, w, h) upside down,
    which is how a short-edge back face is imposed on this shelf."""
    c.saveState()
    c.translate((x + w) * mm, (y + h) * mm)
    c.rotate(180)
    c.translate(-x * mm, -y * mm)


# --------------------------------------------------------------- picture ----
DPI = 300.0                          # print resolution; more is only file size


def _fit_copy(path, w, h):
    """A cached RGB copy of the picture at no more than DPI over the box it will
    occupy. A 4 MB reader page placed 72 mm wide needs 850 px, not 4000, and a
    PDF nobody can email is a PDF nobody prints."""
    from PIL import Image
    BUILD_DIR.mkdir(exist_ok=True)
    import hashlib
    key = hashlib.sha1(str(Path(path).resolve()).encode("utf-8")).hexdigest()[:10]
    cache = BUILD_DIR / ("img-%s-%s-%dx%d.png" % (Path(path).stem, key, int(w), int(h)))
    if cache.exists():
        return cache
    with Image.open(path) as im:
        im = im.convert("RGB")
        cap = (int(w / 25.4 * DPI), int(h / 25.4 * DPI))
        if im.size[0] > cap[0] or im.size[1] > cap[1]:
            im.thumbnail(cap, Image.LANCZOS)
        im.save(cache, optimize=True)
    return cache


def draw_image(c, path, x, y, w, h):
    """Place an image inside the box, aspect preserved, centred, never cropped."""
    from PIL import Image
    src = _fit_copy(path, w, h)
    with Image.open(src) as im:
        iw, ih = im.size
    s = min(w / iw, h / ih)
    dw, dh = iw * s, ih * s
    c.drawImage(str(src), (x + (w - dw) / 2.0) * mm, (y + (h - dh) / 2.0) * mm,
                dw * mm, dh * mm, mask="auto", preserveAspectRatio=True)


def draw_placeholder_photo(c, x, y, w, h, caption="photo to come"):
    """The pale-grey front a card wears until the teacher's photograph lands.

    It says nothing — no word, no number — because the card must not do the
    child's naming for him even while it is a placeholder. A faint camera
    outline and nothing else.
    """
    c.saveState()
    c.setFillColor(PALE)
    c.setStrokeColor(PALE_INK)
    c.setLineWidth(0.3 * mm)
    c.roundRect(x * mm, y * mm, w * mm, h * mm, 3 * mm, stroke=1, fill=1)
    cx, cy = x + w / 2.0, y + h / 2.0
    bw, bh = min(28.0, w * 0.45), min(20.0, h * 0.30)
    c.setStrokeColor(PALE_INK)
    c.setFillColor(PALE)
    c.setLineWidth(0.35 * mm)
    c.roundRect((cx - bw / 2) * mm, (cy - bh / 2) * mm, bw * mm, bh * mm,
                1.6 * mm, stroke=1, fill=1)
    c.roundRect((cx - bw * 0.16) * mm, (cy + bh / 2 - 0.4) * mm,
                bw * 0.32 * mm, 2.0 * mm, 0.6 * mm, stroke=1, fill=1)
    c.circle(cx * mm, cy * mm, (bh * 0.28) * mm, stroke=1, fill=0)
    c.restoreState()


# ---------------------------------------------------------------- chrome ----
def label_and_footer(c, x, label_y, label, foot_y, foot):
    c.saveState()
    c.setFillColor(ADULT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(x * mm, label_y * mm, label)
    c.restoreState()
    CM.footer(c, x, foot_y, foot, ADULT_FONT, FOOT_SIZE)


def check_chrome(bad, page_w, page_h, v, h, text_x, ys):
    """The five things every sheet in this set has to be able to say."""
    for x, _a, _b in v:
        if x < CM.SAFE or x > page_w - CM.SAFE:
            bad.append("a vertical cut line at x %.1f breaks the safe margin" % x)
    for y, _a, _b in h:
        if y < CM.SAFE or y > page_h - CM.SAFE:
            bad.append("a horizontal cut line at y %.1f breaks the safe margin" % y)
    for yy, what in ys:
        if yy < CM.SAFE or yy > page_h - CM.SAFE:
            bad.append("the %s at y %.1f breaks the safe margin" % (what, yy))
        if any(abs(yy - y) < LINE_CLEAR for y, _a, _b in h):
            bad.append("the %s sits on a horizontal cut line" % what)
    if text_x < TEXT_EDGE_MIN or page_w - text_x < TEXT_EDGE_MIN:
        bad.append("adult text starts within %.0f mm of a page edge" % TEXT_EDGE_MIN)
    if any(abs(text_x - x) < LINE_CLEAR for x, _a, _b in v):
        bad.append("adult text starts on a vertical cut line")
    return bad


def done(bad):
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
