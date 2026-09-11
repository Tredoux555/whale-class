#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · sheet T04, the EIGHT SAY-IT CARDS (Tray 3)

Puppet Talk. The cat asks, the potato answers. The child does both voices, or
two children take one each. The control of error is the printed line: every word
on the back is a word he can already read off a Dark Phonics reader, so he can
check himself without anyone judging his accent.

FRONTS REUSE EXISTING ART. Not one picture on this sheet was drawn for it —
every one is a page out of a Dark Phonics reader or a SATPIN-v2 book, so the
child meets a picture he already knows and spends his attention on the sentence
instead of the picture. The mapping is in ART below, one file per card, and it
is deliberately readable: if a picture is ever replaced, replace it there.

BACKS ARE THE EXCHANGE, BIG, IN TWO LINES: the question on top, the answer under
it, with a hairline between them so the two voices are two things. Both are set
at one size across all eight cards.

80 × 120 printed, 100 × 140 mounted, four butted 2 × 2 on A4, DUPLEX SHORT EDGE
imposed exactly as Writing Shelf sheet 03.

Run:   python3 scripts/curriculum/talking-shelf/build_T04_say_it_cards.py
Needs: reportlab, fontTools, Pillow
"""

from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import house as H
import cutmarks as CM

NAME = "T04-say-it-cards.pdf"
PAGE_W, PAGE_H = H.A4_W, H.A4_H
CARD_W, CARD_H = H.CARD_W, H.CARD_H
COLS, ROWS = 2, 2
X0 = (PAGE_W - COLS * CARD_W) / 2.0
Y0 = (PAGE_H - ROWS * CARD_H) / 2.0

FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR          # 72
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR          # 112

LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = 30.0
RULE_W = 40.0                                   # the hairline between the voices

# Verbatim. Question first, answer second — that is the order the card is read.
CARDS = [
    (1, "Who is it?", "It is a cat."),
    (2, "Who is it?", "It is a pig."),
    (3, "What can it do?", "It can sit."),
    (4, "What can it do?", "It can jump."),
    (5, "Where is it?", "It is on the mat."),
    (6, "Where is it?", "It is in the box."),
    (7, "Is it big?", "Yes, it is big."),
    (8, "Is it wet?", "No, it is not wet."),
]

# EXISTING Dark Phonics pen-and-ink art, one page per card. Paths are relative
# to the repo root. Every one of these was looked at before it was chosen.
ART = {
    1: "phonics-images/easy-readers/the-cat-sat/p1.jpg",
    2: "phonics-images/dark-phonics-books/the-spat/p3-pig.png",
    3: "phonics-images/satpin-v2/books/sat/sat-p6.png",
    4: "phonics-images/easy-readers/jump-in-the-sand/p1.jpg",
    5: "phonics-images/satpin-v2/books/monkey/sam-and-the-monkey-p3-cat-on-mat.png",
    6: "phonics-images/satpin-v2/books/box/what-is-in-the-box-p5-fox-v1.png",
    7: "phonics-images/easy-readers/frog-and-crab/p1.jpg",
    8: "phonics-images/easy-readers/mud-pup/p1.jpg",
}


def boxes():
    out = []
    for r in range(ROWS):
        for col in range(COLS):
            out.append((X0 + col * CARD_W, Y0 + (ROWS - 1 - r) * CARD_H))
    return out


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)


def laid_out():
    """One size for all eight backs: question block and answer block, fitted
    together into the card with the rule between them."""
    half = (FIT_H - 10.0) / 2.0
    sizes = []
    for _n, q, a in CARDS:
        sq, _ = H.fit_block([q], H.CHILD_FONT, FIT_W, half, leading=1.25,
                            para_gap=0.0, hi=30.0)
        sa, _ = H.fit_block([a], H.CHILD_FONT, FIT_W, half, leading=1.25,
                            para_gap=0.0, hi=30.0)
        sizes += [sq, sa]
    size = min(sizes)
    out = []
    for n, q, a in CARDS:
        _s, ql = H.fit_block([q], H.CHILD_FONT, FIT_W, half, leading=1.25,
                             para_gap=0.0, hi=size, lo=size - 0.01)
        _s, al = H.fit_block([a], H.CHILD_FONT, FIT_W, half, leading=1.25,
                             para_gap=0.0, hi=size, lo=size - 0.01)
        out.append((n, size, ql, al))
    return out


def check(laid, repo):
    bad = []
    v, h = grid()
    H.check_chrome(bad, PAGE_W, PAGE_H, v, h, TEXT_X,
                   [(LABEL_Y, "label"), (FOOT_Y, "footer")])
    if len(CARDS) != 8:
        bad.append("Tray 3 takes eight say-it cards, not %d" % len(CARDS))
    for n, _q, _a in CARDS:
        if n not in ART:
            bad.append("card %d has no picture" % n)
        elif not (repo / ART[n]).exists():
            bad.append("card %d picture %s is not in the repo" % (n, ART[n]))
    for n, size, ql, al in laid:
        for line in ql + al:
            if line is None:
                continue
            w = H.w_mm(line, H.CHILD_FONT, size)
            if (CARD_W - w) / 2.0 < CM.CONTENT_CLEAR:
                bad.append("card %d line %r is %.1f mm and crowds the card edge"
                           % (n, line, w))
        total = (H.block_height(ql, size, leading=1.25, para_gap=0.0)
                 + H.block_height(al, size, leading=1.25, para_gap=0.0) + 10.0)
        if total > FIT_H + 1e-6:
            bad.append("card %d back is %.1f mm in a %.1f mm box" % (n, total, FIT_H))
    if size_floor(laid) < 11.0:
        bad.append("the exchange dropped to %.1f pt — it is meant to be BIG"
                   % size_floor(laid))
    H.done(bad)
    return laid


def size_floor(laid):
    return min(s for _n, s, _q, _a in laid)


def build():
    H.register_fonts()
    repo = H.REPO
    laid = check(laid_out(), repo)
    v, h = grid()
    H.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = H.OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Talking Shelf · say-it cards")
    sheets = [laid[i:i + 4] for i in range(0, len(laid), 4)]
    marks = 0
    for sheet in sheets:
        for i, (n, _s, _q, _a) in enumerate(sheet):
            x, y = boxes()[i]
            H.draw_image(c, repo / ART[n], x + CM.CONTENT_CLEAR,
                         y + CM.CONTENT_CLEAR, FIT_W, FIT_H)
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks = st["marks"]
        H.label_and_footer(c, TEXT_X, LABEL_Y,
                           "say-it cards · tray 3 · FRONTS · 80 × 120 mm printed, 100 × 140 mounted",
                           FOOT_Y, CM.cards_line(4, "card"))
        c.showPage()
        for i, (n, size, ql, al) in enumerate(sheet):
            r, col = divmod(i, COLS)
            br = H.back_row(r, ROWS)
            x = X0 + col * CARD_W
            y = Y0 + (ROWS - 1 - br) * CARD_H
            H.rot180(c, x, y, CARD_W, CARD_H)
            qh = H.block_height(ql, size, leading=1.25, para_gap=0.0)
            ah = H.block_height(al, size, leading=1.25, para_gap=0.0)
            total = qh + ah + 10.0
            top = y + (CARD_H + total) / 2.0
            H.draw_block(c, ql, size, x + CARD_W / 2.0, top,
                         colour=H.INK, font=H.CHILD_FONT, leading=1.25, para_gap=0.0)
            ry = top - qh - 5.0
            c.saveState()
            c.setStrokeColor(H.FOOT_C)
            c.setLineWidth(0.25 * mm)
            c.line((x + CARD_W / 2.0 - RULE_W / 2.0) * mm, ry * mm,
                   (x + CARD_W / 2.0 + RULE_W / 2.0) * mm, ry * mm)
            c.restoreState()
            H.draw_block(c, al, size, x + CARD_W / 2.0, ry - 5.0,
                         colour=H.INK, font=H.CHILD_FONT, leading=1.25, para_gap=0.0)
            c.restoreState()
        CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        H.label_and_footer(c, TEXT_X, LABEL_Y,
                           "say-it cards · tray 3 · BACKS · duplex, flip SHORT EDGE · question, then answer",
                           FOOT_Y, CM.cards_line(4, "card"))
        c.showPage()
    c.save()
    print("say-it cards -> %s" % H.OUT_DIR)
    print("  %-24s %d pp · %d cards (%d × %d of %g × %g mm) · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(sheets) * 2, len(CARDS), COLS, ROWS, CARD_W, CARD_H,
             len(v) + len(h), marks, out.stat().st_size / 1024.0))
    print("  exchange %.1f pt Fredoka Medium, one size on all eight" % size_floor(laid))
    for n, q, a in CARDS:
        print("   %d  %-18s %-20s %s" % (n, q, a, ART[n]))


if __name__ == "__main__":
    build()
