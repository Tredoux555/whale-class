# -*- coding: utf-8 -*-
"""DRAFT print materials -- Book Works for 'The Cat Sat' (Dark Phonics easy
reader). Four Montessori-style manipulative works: picture match, sentence &
picture match, and two sentence-builder variants (guided / free). All A4
portrait. DRAFT ONLY -- not registered, not wired into books_def.py or the
site.

Fonts resolve from MONTREE_CANVAS_FONTS (same convention as
scripts/curriculum/flashcards/build_booklets.py and
scripts/curriculum/satpin-paperwork/build_paperwork.py).

    MONTREE_CANVAS_FONTS=/path/to/canvas-fonts/ python3 _draft_book_works.py
"""
import os
import random

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

F = os.environ.get('MONTREE_CANVAS_FONTS',
                    '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title', F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word', F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F + 'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar', F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label', F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

INK = (0, 0, 0)
RED = (0.776, 0.157, 0.157)
GREY = (0, 0, 0)
FAINT = (0, 0, 0)
LINE = (0, 0, 0)

PW, PH = A4
M = 14 * mm
CW = PW - 2 * M
CONTENT_BOTTOM = M + 12 * mm

BOOK_TITLE = 'The Cat Sat'
ART_DIR = ('/Users/tredouxwillemse/Desktop/English Curriculum 2026/'
           'Dark Phonics/Easy Readers/the-cat-sat')
OUT_DIR = ('/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/'
           'materials-out/book-works-draft')

SENTENCES = [
    {'n': 1, 'text': 'A cat.', 'art': os.path.join(ART_DIR, 'p1.png')},
    {'n': 2, 'text': 'The cat sat.', 'art': os.path.join(ART_DIR, 'p2.png')},
    {'n': 3, 'text': 'A cat sat on a cat.',
     'art': os.path.join(ART_DIR, 'p3.png')},
    {'n': 4, 'text': 'A cat on a cat on a cat!',
     'art': os.path.join(ART_DIR, 'p4.png')},
    {'n': 5, 'text': 'Tip-top cats!', 'art': os.path.join(ART_DIR, 'p5.png')},
]


# --------------------------------------------------------------- helpers ---
def fit(text, font, size, maxw, floor=10, step=0.5):
    while size > floor and stringWidth(text, font, size) > maxw:
        size -= step
    return size


def hairline(c, x1, y, x2, color=LINE, width=0.6):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def dashed_box(c, x, y, w, h, corner=2.6 * mm, color=LINE, width=0.8):
    c.saveState()
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setDash(2.2, 2.2)
    c.roundRect(x, y, w, h, corner, stroke=1, fill=0)
    c.setDash()
    c.restoreState()


def solid_box(c, x, y, w, h, corner=2.6 * mm, color=LINE, width=0.6):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.roundRect(x, y, w, h, corner, stroke=1, fill=0)


def draw_image_contained(c, path, x, y, w, h):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')


def note(c, x, y, text, size=7, color=FAINT, font='Label'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawString(x, y, text)


def centered(c, xc, y, text, font, size, color):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawCentredString(xc, y, text)


def header(c, work_name):
    """Small subtle masthead: book title + red accent dot, work name label,
    a hairline. Returns content_top (y of first usable content row)."""
    top = PH - M
    c.setFont('Title', 14)
    c.setFillColorRGB(*INK)
    c.drawString(M, top - 6 * mm, BOOK_TITLE)
    tw = stringWidth(BOOK_TITLE, 'Title', 14)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3 * mm, top - 6 * mm + 2 * mm, 0.9 * mm,
              stroke=0, fill=1)
    c.setFont('Label', 8)
    c.setFillColorRGB(*GREY)
    c.drawString(M, top - 12 * mm, work_name.upper())
    hairline(c, M, top - 15.5 * mm, PW - M)
    return top - 15.5 * mm - 7 * mm


def footer(c, work_name):
    txt = 'MONTREE PHONICS · %s · %s' % (BOOK_TITLE, work_name)
    c.setFont('Label', 6.5)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(PW - M, 8 * mm, txt)


def row_positions(content_top, n):
    """Evenly divide the content zone into n row bands; return the pitch
    and each row's bottom y (band = [bottom, bottom+pitch])."""
    usable = content_top - CONTENT_BOTTOM
    pitch = usable / n
    bottoms = [content_top - (i + 1) * pitch for i in range(n)]
    return pitch, bottoms


# ---------------------------------------------------- work 1 & 2 geometry --
BOX1_W, BOX1_H = 58 * mm, 42 * mm
GAP = 8 * mm
SENT_W = CW - BOX1_W - GAP
SENT_PAD = 5 * mm
UNIFORM_SENT_SIZE = min(
    fit(s['text'], 'WordRg', 26, SENT_W - 2 * SENT_PAD, floor=12)
    for s in SENTENCES)


def sentence_row_size(text, maxw):
    return fit(text, 'WordRg', 28, maxw, floor=14)


# --------------------------------------------------------------- work 1 ---
def work1_page1(c):
    ct = header(c, 'Picture Match')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    box_h = min(BOX1_H, pitch - 6 * mm)
    text_w = CW - BOX1_W - GAP
    for i, s in enumerate(SENTENCES):
        by = bottoms[i] + (pitch - box_h) / 2
        bx = PW - M - BOX1_W
        dashed_box(c, bx, by, BOX1_W, box_h)
        size = sentence_row_size(s['text'], text_w)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(M, by + box_h / 2 - size * 0.32, s['text'])
    footer(c, 'Picture Match')
    c.showPage()


def work1_page2(c):
    ct = header(c, 'Picture Match — control of error')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    box_h = min(BOX1_H, pitch - 6 * mm)
    text_w = CW - BOX1_W - GAP
    for i, s in enumerate(SENTENCES):
        by = bottoms[i] + (pitch - box_h) / 2
        bx = M
        solid_box(c, bx, by, BOX1_W, box_h)
        draw_image_contained(c, s['art'], bx + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
        size = sentence_row_size(s['text'], text_w)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawRightString(PW - M, by + box_h / 2 - size * 0.32, s['text'])
    note(c, M, 12 * mm, 'control of error — flip to check')
    footer(c, 'Picture Match')
    c.showPage()


def work1_page3(c):
    ct = header(c, 'Picture Match — cut sheet')
    gap_x, gap_y = 10 * mm, 10 * mm
    for i, s in enumerate(SENTENCES):
        col, row = i % 2, i // 2
        x = M + col * (BOX1_W + gap_x)
        y = ct - row * (BOX1_H + gap_y) - BOX1_H
        dashed_box(c, x, y, BOX1_W, BOX1_H)
        draw_image_contained(c, s['art'], x + 2 * mm, y + 2 * mm,
                              BOX1_W - 4 * mm, BOX1_H - 4 * mm)
    footer(c, 'Picture Match')
    c.showPage()


def build_work1():
    path = os.path.join(OUT_DIR, 'the-cat-sat-work1-picture-match.pdf')
    c = rl_canvas.Canvas(path, pagesize=A4)
    work1_page1(c)
    work1_page2(c)
    work1_page3(c)
    c.save()
    return path


# --------------------------------------------------------------- work 2 ---
def work2_page1(c):
    ct = header(c, 'Sentence & Picture Match')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    box_h = min(BOX1_H, pitch - 6 * mm)
    for i in range(len(SENTENCES)):
        by = bottoms[i] + (pitch - box_h) / 2
        dashed_box(c, M, by, SENT_W, box_h)
        dashed_box(c, PW - M - BOX1_W, by, BOX1_W, box_h)
    footer(c, 'Sentence & Picture Match')
    c.showPage()


def work2_page2(c):
    ct = header(c, 'Sentence & Picture Match — control of error')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    box_h = min(BOX1_H, pitch - 6 * mm)
    for i, s in enumerate(SENTENCES):
        by = bottoms[i] + (pitch - box_h) / 2
        px = M
        solid_box(c, px, by, BOX1_W, box_h)
        draw_image_contained(c, s['art'], px + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
        sx = M + BOX1_W + GAP
        solid_box(c, sx, by, SENT_W, box_h)
        c.setFont('WordRg', UNIFORM_SENT_SIZE)
        c.setFillColorRGB(*INK)
        c.drawCentredString(sx + SENT_W / 2,
                             by + box_h / 2 - UNIFORM_SENT_SIZE * 0.32,
                             s['text'])
    note(c, M, 12 * mm, 'control of error — flip to check')
    footer(c, 'Sentence & Picture Match')
    c.showPage()


def work2_page3(c):
    ct = header(c, 'Sentence & Picture Match — cut sheet')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    box_h = min(BOX1_H, pitch - 6 * mm)
    for i, s in enumerate(SENTENCES):
        by = bottoms[i] + (pitch - box_h) / 2
        dashed_box(c, M, by, SENT_W, box_h)
        c.setFont('WordRg', UNIFORM_SENT_SIZE)
        c.setFillColorRGB(*INK)
        c.drawCentredString(M + SENT_W / 2,
                             by + box_h / 2 - UNIFORM_SENT_SIZE * 0.32,
                             s['text'])
        bx = PW - M - BOX1_W
        dashed_box(c, bx, by, BOX1_W, box_h)
        draw_image_contained(c, s['art'], bx + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
    footer(c, 'Sentence & Picture Match')
    c.showPage()


def build_work2():
    path = os.path.join(OUT_DIR,
                         'the-cat-sat-work2-sentence-picture-match.pdf')
    c = rl_canvas.Canvas(path, pagesize=A4)
    work2_page1(c)
    work2_page2(c)
    work2_page3(c)
    c.save()
    return path


# ---------------------------------------------------- work 3 & 4 geometry --
PIC3_W, PIC3_H = 44 * mm, 33 * mm
GAP3 = 6 * mm
TILE_GAP = 2 * mm
TILE_PAD = 3 * mm
TILE_H = 15 * mm


def _row_tile_total(tokens, size):
    return (sum(stringWidth(t, 'WordRg', size) + 2 * TILE_PAD
                for t in tokens)
            + TILE_GAP * (len(tokens) - 1))


def global_tile_font():
    """One shared word-tile font size, chosen so every sentence's tiles
    (base-page slots AND cut-sheet tiles) fit the row width -- guarantees
    tiles are exactly slot-sized wherever they're printed."""
    avail_w = CW - PIC3_W - GAP3
    size = 20.0
    while size > 9:
        if all(_row_tile_total(s['text'].split(' '), size) <= avail_w
               for s in SENTENCES):
            break
        size -= 0.5
    return size


TILE_FONT = global_tile_font()


def tile_widths(tokens):
    return [stringWidth(t, 'WordRg', TILE_FONT) + 2 * TILE_PAD
            for t in tokens]


def sentence_builder_base(c, work_name, show_words):
    ct = header(c, work_name)
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    for i, s in enumerate(SENTENCES):
        rb = bottoms[i]
        py = rb + (pitch - PIC3_H) / 2
        dashed_box(c, M, py, PIC3_W, PIC3_H)
        tokens = s['text'].split(' ')
        widths = tile_widths(tokens)
        block_h = TILE_H + 9 * mm
        slot_y = rb + (pitch - block_h) / 2
        x = M + PIC3_W + GAP3
        for tok, w in zip(tokens, widths):
            if show_words:
                centered(c, x + w / 2, slot_y + TILE_H + 4 * mm, tok,
                         'WordRg', 7.5, GREY)
            dashed_box(c, x, slot_y, w, TILE_H)
            x += w + TILE_GAP
    footer(c, work_name)
    c.showPage()


def work3_page1(c):
    sentence_builder_base(c, 'Sentence Builder — guided', True)


def work4_page1(c):
    sentence_builder_base(c, 'Sentence Builder — free', False)


def work4_page2(c):
    ct = header(c, 'Sentence Builder — free — control of error')
    pitch, bottoms = row_positions(ct, len(SENTENCES))
    avail = CW - PIC3_W - GAP3
    for i, s in enumerate(SENTENCES):
        py = bottoms[i] + (pitch - PIC3_H) / 2
        px = PW - M - PIC3_W
        solid_box(c, px, py, PIC3_W, PIC3_H)
        draw_image_contained(c, s['art'], px + 2 * mm, py + 2 * mm,
                              PIC3_W - 4 * mm, PIC3_H - 4 * mm)
        size = fit(s['text'], 'WordRg', 24, avail, floor=13)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(M, py + PIC3_H / 2 - size * 0.32, s['text'])
    note(c, M, 12 * mm, 'control of error — flip to check')
    footer(c, 'Sentence Builder — free')
    c.showPage()


def sentence_builder_cutsheet(c, work_name):
    ct = header(c, work_name + ' — cut sheet')
    note(c, M, ct, 'PICTURE CARDS', size=7, color=GREY)
    x = M
    row_top = ct - 6 * mm
    for s in SENTENCES:
        if x + PIC3_W > PW - M:
            x = M
            row_top -= PIC3_H + 6 * mm
        dashed_box(c, x, row_top - PIC3_H, PIC3_W, PIC3_H)
        draw_image_contained(c, s['art'], x + 2 * mm,
                              row_top - PIC3_H + 2 * mm,
                              PIC3_W - 4 * mm, PIC3_H - 4 * mm)
        x += PIC3_W + 6 * mm
    y = row_top - PIC3_H - 14 * mm
    note(c, M, y, 'WORD TILES', size=7, color=GREY)
    y -= 8 * mm
    all_tokens = []
    for s in SENTENCES:
        all_tokens.extend(s['text'].split(' '))
    rnd = random.Random(7)
    rnd.shuffle(all_tokens)
    widths = tile_widths(all_tokens)
    x = M
    row_y = y
    for tok, w in zip(all_tokens, widths):
        if x + w > PW - M:
            x = M
            row_y -= TILE_H + 5 * mm
        dashed_box(c, x, row_y - TILE_H, w, TILE_H)
        c.setFont('WordRg', TILE_FONT)
        c.setFillColorRGB(*INK)
        c.drawCentredString(x + w / 2,
                             row_y - TILE_H / 2 - TILE_FONT * 0.32, tok)
        x += w + TILE_GAP
    footer(c, work_name)
    c.showPage()


def build_work3():
    path = os.path.join(
        OUT_DIR, 'the-cat-sat-work3-sentence-builder-guided.pdf')
    c = rl_canvas.Canvas(path, pagesize=A4)
    work3_page1(c)
    sentence_builder_cutsheet(c, 'Sentence Builder — guided')
    c.save()
    return path


def build_work4():
    path = os.path.join(
        OUT_DIR, 'the-cat-sat-work4-sentence-builder-free.pdf')
    c = rl_canvas.Canvas(path, pagesize=A4)
    work4_page1(c)
    work4_page2(c)
    sentence_builder_cutsheet(c, 'Sentence Builder — free')
    c.save()
    return path


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for build in (build_work1, build_work2, build_work3, build_work4):
        print(build())


if __name__ == '__main__':
    main()
