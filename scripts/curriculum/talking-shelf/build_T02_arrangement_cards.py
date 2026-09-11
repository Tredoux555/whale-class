#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T02, the EIGHT ARRANGEMENT CARDS (Tray 1)

Behind the Screen is a barrier game, and the barrier is the control of error:
when the screen comes down the two mats either match or they don't, and both
children see which object is wrong. Nobody marks anybody's speaking.

These eight cards are the SOLO entry to that work — the child copies the
arrangement on the card onto his mat, then says it to the card. Front: a
photograph of the real miniatures on the real mat. Back: the sentences, so the
card checks itself.

THE PHOTOGRAPHS ARE NOT TAKEN YET. They are the teacher's own, of her own
miniatures, because a stock photograph of a different cat on a different bed is
a different work. Until they land the front is a PALE-GREY PLACEHOLDER that says
nothing at all except a faint camera outline — no word, no number, because a
card that names its own picture does the child's naming for him. When the eight
PNGs land in phonics-images/satpin-v2/talking-shelf/ as arr-1.png … arr-8.png,
rerun with --art-dir and they drop straight in:

    python3 scripts/curriculum/talking-shelf/build_T02_arrangement_cards.py \
        --art-dir phonics-images/satpin-v2/talking-shelf

LEVEL DOTS, NOT NUMBERS. Cards 1–4 carry one small dot in the corner, 5–6 two,
7–8 three. It is a level, not an order: a child may take any one-dot card in any
order, and the dots are what stop him taking a four-object card in week one.
A dot is the Writing Shelf's own small-word symbol, #8C857B, 2.6 mm, and it sits
inside the 4 mm content margin like every other mark on this shelf.

80 × 120 printed, mounted to 100 × 140 for his card stands, four butted 2 × 2 on
A4 — the flip-card geometry of Writing Shelf sheets 02 and 03, unchanged.
DUPLEX SHORT EDGE: the back page keeps the column and flips the row, and the
back card is drawn rotated 180°, which is exactly how shipped sheet 03 is
imposed.

Run:   python3 scripts/curriculum/talking-shelf/build_T02_arrangement_cards.py
Needs: reportlab, fontTools, Pillow
"""

import argparse
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T02-arrangement-cards.pdf"
PAGE_W, PAGE_H = H.A4_W, H.A4_H
CARD_W, CARD_H = H.CARD_W, H.CARD_H            # 80 x 120 printed
COLS, ROWS = 2, 2
X0 = (PAGE_W - COLS * CARD_W) / 2.0            # 25.0
Y0 = (PAGE_H - ROWS * CARD_H) / 2.0            # 28.5

FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR          # 72
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR          # 112

DOT_D = 2.6
DOT_GAP = 1.6
DOT_RIGHT = 5.5
DOT_BOTTOM = 5.5

LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = 30.0

# Verbatim, and the dot count is the level.
CARDS = [
    (1, 1, ["The cat is on the bed."]),
    (2, 1, ["The pig is in the pot."]),
    (3, 1, ["The dog is in the hat."]),
    (4, 1, ["The nut is in the tin."]),
    (5, 2, ["The cat is on the bed.", "The pig is in the pot."]),
    (6, 2, ["The dog is next to the hat.", "The nut is on the tin."]),
    (7, 3, ["The cat is in the pot.", "The pig is on the bed.",
            "The dog is next to the tin."]),
    (8, 3, ["The nut is in the hat.", "The dog is on the bed.",
            "The cat is next to the pot.", "The pig is in the tin."]),
]


def boxes():
    """The four card boxes of a page, in reading order TL TR BL BR."""
    out = []
    for r in range(ROWS):
        for col in range(COLS):
            out.append((X0 + col * CARD_W, Y0 + (ROWS - 1 - r) * CARD_H))
    return out


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)


def dots(c, n, x, y):
    """n level dots along the bottom-right corner of the card at (x, y)."""
    c.saveState()
    c.setFillColor(H.FOOT_C)
    for i in range(n):
        cx = x + CARD_W - DOT_RIGHT - DOT_D / 2.0 - i * (DOT_D + DOT_GAP)
        c.circle(cx * mm, (y + DOT_BOTTOM + DOT_D / 2.0) * mm, DOT_D / 2.0 * mm,
                 stroke=0, fill=1)
    c.restoreState()


def laid_out():
    """One fitted (size, lines) per card back; every back uses the SAME size, so
    a four-sentence card and a one-sentence card read as the same material."""
    sizes = []
    for _n, _lvl, sents in CARDS:
        size, _lines = H.fit_block(sents, H.CHILD_FONT, FIT_W, FIT_H - 8.0,
                                   leading=1.30, para_gap=0.55, hi=34.0)
        sizes.append(size)
    size = min(sizes)
    out = []
    for n, lvl, sents in CARDS:
        _s, lines = H.fit_block(sents, H.CHILD_FONT, FIT_W, FIT_H,
                                leading=1.30, para_gap=0.55, hi=size, lo=size - 0.01)
        out.append((n, lvl, size, lines))
    return out


def check(laid, art):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X,
                   [(LABEL_Y, "label"), (FOOT_Y, "footer")])
    if len(CARDS) != 8:
        bad.append("Tray 1 takes eight arrangement cards, not %d" % len(CARDS))
    levels = [lvl for _n, lvl, _s in CARDS]
    if levels != [1, 1, 1, 1, 2, 2, 3, 3]:
        bad.append("the level dots are 1 1 1 1 2 2 3 3, in that order")
    for n, lvl, size, lines in laid:
        for line in lines:
            if line is None:
                continue
            w = H.w_mm(line, H.CHILD_FONT, size)
            if (CARD_W - w) / 2.0 < CM.CONTENT_CLEAR:
                bad.append("card %d line %r is %.1f mm and crowds the card edge"
                           % (n, line, w))
        bh = H.block_height(lines, size, leading=1.30, para_gap=0.55)
        if bh > FIT_H + 1e-6:
            bad.append("card %d back is %.1f mm in a %.1f mm box" % (n, bh, FIT_H))
    widest = DOT_RIGHT + 2 * (DOT_D + DOT_GAP) + DOT_D
    if DOT_BOTTOM < CM.CONTENT_CLEAR or widest > CARD_W / 2.0:
        bad.append("the level dots break the 4 mm content margin")
    if art:
        missing = [n for n, _l, _s in CARDS if not (art / ("arr-%d.png" % n)).exists()]
        if missing:
            bad.append("--art-dir given but arr-%s.png missing"
                       % ", arr-".join(str(m) for m in missing))
    H.done(bad)
    return laid


def build(art_dir=None):
    H.register_fonts()
    art = Path(art_dir).resolve() if art_dir else None
    laid = check(laid_out(), art)
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · arrangement cards")
    sheets = [laid[i:i + 4] for i in range(0, len(laid), 4)]
    marks, placed, placeholders = 0, 0, 0
    for sheet in sheets:
        # ---- front: the photograph (or the placeholder that says nothing) ----
        for i, (n, lvl, _size, _lines) in enumerate(sheet):
            x, y = boxes()[i]
            src = art / ("arr-%d.png" % n) if art else None
            if src and src.exists():
                H.draw_image(c, src, x + CM.CONTENT_CLEAR, y + CM.CONTENT_CLEAR,
                             FIT_W, FIT_H)
                placed += 1
            else:
                H.draw_placeholder_photo(c, x + CM.CONTENT_CLEAR, y + CM.CONTENT_CLEAR,
                                         FIT_W, FIT_H)
                placeholders += 1
            dots(c, lvl, x, y)
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks = st["marks"]
        H.label_and_footer(c, TEXT_X, LABEL_Y,
                           "arrangement cards · tray 1 · FRONTS · 80 × 120 mm printed, 100 × 140 mounted",
                           FOOT_Y, CM.cards_line(4, "card"))
        c.showPage()
        # ---- back: the sentences, row-flipped and upside down ----------------
        for i, (n, _lvl, size, lines) in enumerate(sheet):
            r, col = divmod(i, COLS)
            br = H.back_row(r, ROWS)
            x = X0 + col * CARD_W
            y = Y0 + (ROWS - 1 - br) * CARD_H
            H.rot180(c, x, y, CARD_W, CARD_H)
            bh = H.block_height(lines, size, leading=1.30, para_gap=0.55)
            top = y + (CARD_H + bh) / 2.0
            H.draw_block(c, lines, size, x + CARD_W / 2.0, top,
                         colour=H.INK, font=H.CHILD_FONT)
            c.restoreState()
        CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        H.label_and_footer(c, TEXT_X, LABEL_Y,
                           "arrangement cards · tray 1 · BACKS · duplex, flip SHORT EDGE",
                           FOOT_Y, CM.cards_line(4, "card"))
        c.showPage()
    c.save()
    print("arrangement cards -> %s" % H.OUT_DIR)
    print("  %-28s %d pp · %d cards (%d × %d of %g × %g mm) · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(sheets) * 2, len(CARDS), COLS, ROWS, CARD_W, CARD_H,
             len(v) + len(h), marks, out.stat().st_size / 1024.0))
    print("  back text %.1f pt Fredoka Medium · %d photograph(s), %d placeholder(s)"
          % (laid[0][2], placed, placeholders))
    if placeholders:
        print("  fronts are PLACEHOLDERS. When arr-1..8.png land, rerun with "
              "--art-dir phonics-images/satpin-v2/talking-shelf")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--art-dir", default=None,
                    help="directory holding arr-1.png … arr-8.png")
    build(ap.parse_args().art_dir)
