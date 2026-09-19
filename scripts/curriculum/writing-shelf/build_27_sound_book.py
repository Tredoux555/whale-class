#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 27, MY SOUND BOOK

THE BOOK THE MATS FILL UP.  Sheets 25 and 26 are laid out, tabbed and put away
again; nothing of that work survives the morning.  This is where it survives.
One page a sound, in mat order, and on it the very words that sound's mat
carries — the same photograph, at 18 mm instead of 22 — each beside a
three-line rule for him to WRITE the word on.  Under the pictures the rules run
on free to the foot, because the sound does not stop at the mat: he writes the
ones he finds at home, and the page is his to fill.

IT IS SHEET 15'S BOOK.  The page machinery is imported, not re-made:
build_15_writing_book's own three-line school rule (dotted headline, dashed
midline, solid baseline, x-height 6.6 mm, pitch 21 mm), its fore-edge tab, its
folio, its A5 logical page on build_booklets' 148.5 x 210 at a 14 mm margin,
and its saddle imposition onto A4 landscape — duplex, flip on the SHORT edge,
nest the sheets, sheet 1 outside.  A second booklet engine would drift from the
first and a child would meet two books that folded differently.

THE FORE EDGE IS TWO BLOCKS, NOT THREE.  Sheet 15 divides the fore edge into
the three reading tiers.  This book has two tiers of its own — DIGRAPHS and
BLENDS — so the edge is halved: GREEN on the top half for every digraph page,
BLUE on the bottom half for every blend page, the same 2.2 mm tab 7 mm off the
trim, alternating with verso and recto so it always lands on the edge away from
the fold.  Closed, the book shows two solid blocks and a thumb finds its half.

THE SOUND IS TOP LEFT AND IT IS THE ONLY COLOUR ON THE PAGE, set in Comic Neue
at the writing x-height of 6.6 mm — the size he will write it — in its tier's
colour.  A sound that is a family of spellings prints the family: `ir ur er`,
`oi oy`, `ue ew`.

FIVE PICTURES AT MOST.  Seven rules fit a page at a 21 mm pitch above the 22 mm
foot, and a page of seven pictures is a page with nowhere to go, so a sound's
first five mat words take the top five rules and the last two are free.  A
sound with fewer simply has more free rules, which is the right way round.

THE PAGE COUNT IS A MULTIPLE OF FOUR or it does not fold, so the run is cover,
how-it-works, the sound pages, a back cover, and blank leaves after the back
cover to the next whole sheet.  check() refuses anything else.

Run:   python3 scripts/curriculum/writing-shelf/build_27_sound_book.py
"""

import subprocess
import sys
from pathlib import Path

import pikepdf

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_15_writing_book as W15          # noqa: E402  the page machinery
import build_25_digraph_work as W25          # noqa: E402  the mats, and their art
import build_12_word_card_tin as W12         # noqa: E402  the writing size

BB = W15.BB
mm = W15.mm
rl_canvas = W15.rl_canvas
A4, landscape = W15.A4, W15.landscape

PW, PH, M = W15.PW, W15.PH, W15.M
INK, SOFT_GREY, HAIR_GREY, RED = W15.INK, W15.SOFT_GREY, W15.HAIR_GREY, W15.RED

OUT_DIR = W25.OUT_DIR
PROOF_DIR = W25.PROOF_DIR
SLUG = "sound-book"
NAME_PRINT = "27-sound-book-print.pdf"
NAME_READING = "27-sound-book-reading.pdf"
TITLE = "My Sound Book"

# ------------------------------------------------------------- the page ----
SOUND_BASE = PH - 26.0 * mm             # baseline of the sound, top left
PIC = 18.0 * mm                         # the photograph's square field
PIC_X = M                               # at the left margin
RULE_X0 = 36.0 * mm                     # clear of the picture
RULE_X1 = PW - M
FIRST_BASE = PH - 59.2 * mm             # first writing baseline
PITCH = W15.RULE_PITCH                  # 21.0 mm
RULE_U = W15.RULE_U                     # 6.6 mm x-height
RULES = 7                               # to the 22 mm foot
FOOT = 22.0 * mm
PIC_DROP = 2.4 * mm                     # picture foot below the baseline
MAX_PICS = 5
MIN_DPI = W25.MIN_DPI

# ------------------------------------------------------------- the tabs ----
TAB_W = W15.TAB_W                       # 2.2 mm
TAB_EDGE = W15.TAB_EDGE                 # 7.0 mm
TAB_GAP = W15.TAB_GAP                   # 6.0 mm
TAB_H = (PH - 2 * M - TAB_GAP) / 2.0    # 88.0 mm — TWO blocks, not three
TAB_SLOT = {"digraph": 1, "blend": 0}   # green top half, blue bottom half
TIER_C = {"digraph": W25.GREEN, "blend": W25.BLUE}

HOW_IT_WORKS = [
    'Take a work mat off the shelf and fill every gap with tabs from the tin.',
    'Read the word back, touching the tabs as you go.',
    'Find the sound in this book. Write each word on the line beside its '
    'picture.',
    'The lines under the pictures are yours: write any other word you know '
    'with that sound in it.',
    'Check the control mat, then put the mat and the tin away.',
]

PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, sound work — print "
    "27-sound-book-print.pdf on A4 LANDSCAPE, 100%, DUPLEX flipping on the "
    "SHORT EDGE, plain paper. Nest the sheets with sheet 1 outside, fold once "
    "down the middle and staple twice on the fold."
)


# ============================================================== the content ==
def sounds():
    """[(tier, sound, [word, ...])] — every sound in MAT ORDER that has words.

    Derived from sheets 25 and 26's own plans, so the book cannot drift from
    the mats: a word that leaves a mat leaves this book in the same build.
    """
    out = []
    for cfg in (W25.DIGRAPH, W25.BLEND):
        pl = W25.plan(cfg)
        words = {}
        for (_gn, _gt, rows, _sk, _dr) in pl:
            for w, us in rows:
                for _t, s in us:
                    if s is not None:
                        words.setdefault(s.key, [])
                        if w not in words[s.key]:
                            words[s.key].append(w)
        for _gn, _gt, rows in cfg.groups:
            for s, _pool in rows:
                got = words.get(s.key, [])
                if got:
                    out.append((cfg.slug, s, got))
    return out


def baselines():
    return [FIRST_BASE - i * PITCH for i in range(RULES)]


# ================================================================ painters ==
def tier_tab(c, tier, recto):
    x = (PW - TAB_EDGE - TAB_W) if recto else TAB_EDGE
    y = M + TAB_SLOT[tier] * (TAB_H + TAB_GAP)
    col = TIER_C[tier]
    c.setFillColorRGB(col.red, col.green, col.blue)
    c.roundRect(x, y, TAB_W, TAB_H, TAB_W / 2.0, stroke=0, fill=1)


def make_sound_page(tier, sound, words, art):
    col = TIER_C[tier]
    label = " ".join(sound.variants)
    pics = words[:MAX_PICS]

    def paint(c, _b):
        c.saveState()
        c.setFont(W12.WORD_FONT, W12.SIZE)
        c.setFillColorRGB(col.red, col.green, col.blue)
        lsb = W12.glyph_box(label.replace(" ", ""))[0]
        c.drawString(M - lsb * mm, SOUND_BASE, label)
        c.restoreState()
        for i, base in enumerate(baselines()):
            W15.guidelines(c, RULE_X0, RULE_X1, base, RULE_U)
            if i < len(pics):
                c.drawImage(str(art[pics[i]][0]), PIC_X, base - PIC_DROP,
                            PIC, PIC, preserveAspectRatio=True, anchor="c",
                            mask=None)

    paint.slug = "%s-%s" % (tier, sound.key)
    paint.tier = tier
    paint.words = pics
    return paint


def page_cover(c, _b):
    BB.draw_tracked(c, PW / 2, PH - M - 8, 'M O N T R E E   P H O N I C S',
                    'Label', 8.5, 0.28, INK)
    BB.draw_tracked(c, PW / 2, PH - M - 22, 'THE WRITING SHELF  ·  TRAY FIVE',
                    'Label', 7.5, 0.22, INK)
    size = min(BB.fit(c, TITLE, 'Title', 40, PW - 2 * M), 40)
    c.setFont('Title', size)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, PH - M - 30 - size * 1.25, TITLE)
    rule_y = PH - M - 30 - size * 1.25 - 11 * mm
    c.setStrokeColorRGB(*HAIR_GREY)
    c.setLineWidth(0.5)
    c.setDash()
    c.line(M, rule_y, PW - M, rule_y)
    # the two tiers on the fore edge, at the heights their tabs sit at inside
    for tier in ("digraph", "blend"):
        tier_tab(c, tier, recto=True)
    bw, bh = 90 * mm, 70 * mm
    bx, by = (PW - bw) / 2.0, rule_y - 12 * mm - bh
    c.setStrokeColorRGB(*HAIR_GREY)
    c.setLineWidth(0.5)
    c.setDash()
    c.roundRect(bx, by, bw, bh, 2 * mm, stroke=1, fill=0)
    c.setFont('Nar', 9.5)
    c.setFillColorRGB(*SOFT_GREY)
    c.drawCentredString(PW / 2, by - 7.5 * mm, 'draw the one you liked best')
    c.setFillColorRGB(*RED)
    c.circle(PW / 2, M + 12.5 * mm, 1.6 * mm, stroke=0, fill=1)
    BB.draw_bookplate(c)


def page_how(c, _b):
    y = W15.head(c, 'HOW THIS BOOK WORKS')
    y -= 16 * mm
    num_w = 7 * mm
    body_w = PW - 2 * M - num_w
    for i, item in enumerate(HOW_IT_WORKS, 1):
        lines = W15.wrap(c, item, 'Nar', 9.5, body_w)
        c.setFont('Nar', 9.5)
        c.setFillColorRGB(*SOFT_GREY)
        c.drawString(M, y, '%d.' % i)
        c.setFillColorRGB(*INK)
        for ln in lines:
            c.drawString(M + num_w, y, ln)
            y -= 5.2 * mm
        y -= 4.2 * mm
    y -= 6 * mm
    c.setFont('Nar', 9)
    c.setFillColorRGB(*SOFT_GREY)
    for ln in W15.wrap(c, 'The green half of the fore edge is the digraphs '
                          'and the blue half is the blends, in the order the '
                          'work mats come off the shelf.', 'Nar', 9,
                       PW - 2 * M):
        c.drawString(M, y, ln)
        y -= 5.0 * mm


def page_back(c, _b):
    BB.draw_tracked(c, PW / 2, PH * 0.60, 'M O N T R E E   P H O N I C S',
                    'Label', 9, 0.3, INK)
    c.setFont('Nar', 11)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, PH * 0.60 - 9 * mm,
                        'the writing shelf  ·  tray five')
    c.setFillColorRGB(*RED)
    c.circle(PW / 2, PH * 0.60 - 20 * mm, 1.6 * mm, stroke=0, fill=1)
    c.setFont('Label', 7.5)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, M + 11 * mm, 'teacherpotato.xyz')


def page_blank(c, _b):
    return


# =================================================================== build ==
def pages(art):
    out = [(page_cover, None), (page_how, None)]
    for tier, sound, words in sounds():
        out.append((make_sound_page(tier, sound, words, art), tier))
    out.append((page_back, None))
    while len(out) % 4:
        out.append((page_blank, None))
    return out


def check(ps, art):
    bad = []
    if len(ps) % 4:
        bad.append('%d pages does not fold into whole sheets' % len(ps))
    bs = baselines()
    if bs[-1] - FOOT < -1e-6:
        bad.append('the last baseline is inside the %.0f mm foot' % (FOOT / mm))
    if bs[0] + 2 * RULE_U > SOUND_BASE - 2 * mm:
        bad.append('the first headline runs into the sound')
    for painter, tier in ps:
        if tier is None:
            continue
        if len(painter.words) > MAX_PICS:
            bad.append('%s: %d pictures' % (painter.slug, len(painter.words)))
        for w in painter.words:
            px = art[w][1]
            drawn = PIC / mm
            dpi = max(px) / (drawn / 25.4)
            if dpi < MIN_DPI - 0.5:
                bad.append('%s: %s lands at %d dpi' % (painter.slug, w, dpi))
    if bad:
        raise SystemExit('SPEC FAILURE:\n  ' + '\n  '.join(bad))


def build():
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sn = sounds()
    art = W25.prepare([w for _t, _s, ws in sn for w in ws])
    ps = pages(art)
    check(ps, art)
    N = len(ps)

    c = rl_canvas.Canvas(str(OUT_DIR / NAME_READING), pagesize=(PW, PH))
    c.setTitle(TITLE + ' · A5 reading order')
    c.setAuthor(BB.PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    c.setCreator('Montree Phonics printable generator')
    for i, (painter, tier) in enumerate(ps):
        idx = i + 1
        painter(c, None)
        if tier is not None:
            tier_tab(c, tier, recto=(idx % 2 == 1))
            BB.folio(c, idx, left=(idx % 2 == 0))
        c.showPage()
    c.save()

    sheetW, sheetH = landscape(A4)
    c = rl_canvas.Canvas(str(OUT_DIR / NAME_PRINT), pagesize=(sheetW, sheetH))
    c.setTitle(TITLE + ' · Booklet print')
    c.setAuthor(BB.PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    c.setCreator('Montree Phonics printable generator')
    order = []
    for k in range(N // 2):
        order.append((N - k, k + 1) if k % 2 == 0 else (k + 1, N - k))
    for si, (li, ri) in enumerate(order):
        for idx, xoff in ((li, 0), (ri, sheetW / 2)):
            painter, tier = ps[idx - 1]
            c.saveState()
            c.translate(xoff + (sheetW / 2 - PW) / 2, (sheetH - PH) / 2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, None)
            if tier is not None:
                tier_tab(c, tier, recto=(idx % 2 == 1))
                BB.folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        c.setDash()
        c.line(sheetW / 2, sheetH - 4 * mm, sheetW / 2, sheetH - 9 * mm)
        c.line(sheetW / 2, 4 * mm, sheetW / 2, 9 * mm)
        if si == 0:
            BB.draw_print_note(c)
        c.showPage()
    c.save()

    print('%s  %d pages, %d sheets · %d sound pages'
          % (SLUG, N, N // 4, len(sn)))
    for tier in ('digraph', 'blend'):
        run = [(s.tab, ws) for t, s, ws in sn if t == tier]
        print('  %-8s %2d sounds · %s'
              % (tier, len(run),
                 ' · '.join('%s(%d)' % (t, len(w)) for t, w in run)))
    print('  %d rules a page, pitch %.0f mm, first baseline %.1f mm from the '
          'head, foot %.0f mm'
          % (RULES, PITCH / mm, (PH - FIRST_BASE) / mm, FOOT / mm))
    for p in (OUT_DIR / NAME_PRINT, OUT_DIR / NAME_READING):
        W25.proof(p, p.stem)
        with pikepdf.open(p) as doc:
            npages = len(doc.pages)
        print('  -> %s  %d pages, %d bytes' % (p.name, npages, p.stat().st_size))


if __name__ == '__main__':
    build()
