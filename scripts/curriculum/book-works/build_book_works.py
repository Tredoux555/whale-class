# -*- coding: utf-8 -*-
"""Book Works pipeline -- reusable, data-driven, per-book.

Generates the four approved manipulative works (picture match, sentence &
picture match, sentence builder guided/free) for any Dark Phonics book.
Same fonts/layout/geometry as the approved the-cat-sat draft
(_draft_book_works.py), refactored so the book content (title, sentences,
art) is data-driven instead of hard-coded.

Two content sources, auto-detected by slug:
  a) EASY READERS   -- lib/montree/english-curriculum/spec/
                        easy-readers-manifest-v2.json (e.g. the-cat-sat)
  b) LETTER BOOKS   -- scripts/curriculum/flashcards/books_def.py (BOOKS)
                        (e.g. the-sat, the-spat, the-pat, the-pit, the-nap)

Usage:
    python3 build_book_works.py <slug> [<slug> ...]

Output:
    materials-out/book-works/<slug>/<slug>-work1-picture-match.pdf (etc.)
"""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')

# Fonts: same auto-detect pattern as flashcards/_build_one.py -- prefer the
# repo's own canvas-fonts copy when present (Mac), else fall back to the
# Cowork cloud container's canvas-design skill folder.
_FONTS_DIR = os.path.join(FLASHCARDS, 'canvas-fonts')
if os.path.exists(os.path.join(_FONTS_DIR, 'YoungSerif-Regular.ttf')):
    os.environ.setdefault('MONTREE_CANVAS_FONTS', _FONTS_DIR)

sys.path.insert(0, FLASHCARDS)

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
MAX_ROWS = 7

OUT_ROOT = os.path.join(REPO, 'materials-out', 'book-works')
EASY_READERS_MANIFEST = os.path.join(
    REPO, 'lib', 'montree', 'english-curriculum', 'spec',
    'easy-readers-manifest-v2.json')
EASY_READERS_ART_ROOT = os.path.expanduser(
    '~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers')


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


def header(c, book_title, work_name):
    """Small subtle masthead: book title + red accent dot, work name label,
    a hairline. Returns content_top (y of first usable content row)."""
    top = PH - M
    tsize = fit(book_title, 'Title', 14, CW - 20 * mm, floor=10)
    c.setFont('Title', tsize)
    c.setFillColorRGB(*INK)
    c.drawString(M, top - 6 * mm, book_title)
    tw = stringWidth(book_title, 'Title', tsize)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3 * mm, top - 6 * mm + 2 * mm, 0.9 * mm,
              stroke=0, fill=1)
    c.setFont('Label', 8)
    c.setFillColorRGB(*GREY)
    c.drawString(M, top - 12 * mm, work_name.upper())
    hairline(c, M, top - 15.5 * mm, PW - M)
    return top - 15.5 * mm - 7 * mm


def footer(c, book_title, work_name):
    txt = 'MONTREE PHONICS · %s · %s' % (book_title, work_name)
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


# ------------------------------------------------------------- content ----
def resolve_art(raw_path):
    """Most book dicts carry a working absolute Mac path already. A few
    older entries (e.g. the-sat) carry stale relative Cowork-container
    paths like 'tiles/SAT-p1.png' -- fall back to the permanent
    phonics-images/satpin-v2/books/<name>/<name>-pN.ext location."""
    if os.path.isabs(raw_path) and os.path.exists(raw_path):
        return raw_path
    if os.path.exists(raw_path):
        return os.path.abspath(raw_path)
    base = os.path.basename(raw_path)
    m = re.match(r'([A-Za-z0-9]+)-p(\d+)\.(\w+)$', base)
    if m:
        name, num, ext = m.groups()
        candidate = os.path.join(REPO, 'phonics-images', 'satpin-v2', 'books',
                                  name.lower(), '%s-p%s.%s' % (name.lower(), num, ext))
        if os.path.exists(candidate):
            return candidate
    raise FileNotFoundError('cannot resolve art path: %r' % raw_path)


def load_easy_reader(slug):
    with open(EASY_READERS_MANIFEST) as f:
        data = json.load(f)
    reader = next((r for r in data['readers'] if r['slug'] == slug), None)
    if reader is None:
        return None
    art_dir = os.path.join(EASY_READERS_ART_ROOT, slug)
    rows = [{'text': p['text'], 'art': os.path.join(art_dir, 'p%d.png' % p['n'])}
            for p in reader['pages']]
    return reader['title'], rows, [], 'easy-reader'


def load_letterbook(slug):
    from books_def import BOOKS  # noqa: E402  (sys.path set up above)
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        return None
    title = ' '.join(book['title_lines']).replace('  ', ' ')
    rows = []
    flags = []
    for sp in book['spreads']:
        if sp.get('style') == 'drop':
            continue
        art = sp.get('art')
        nar = sp.get('nar')
        text = sp.get('text')
        if not art or not (nar or text):
            continue
        nar_clean = nar.replace('…', '').replace('...', '').rstrip() if nar else ''
        if isinstance(text, list):
            text_joined = ' '.join(text)
        else:
            text_joined = text or ''
        if nar_clean and text_joined:
            sentence = nar_clean + ' ' + text_joined
        elif text_joined:
            sentence = text_joined
        else:
            sentence = nar_clean
            flags.append('sentence built from nar only (no printed text on '
                          'that page) -- likely a narrative cue, not a true '
                          'decodable sentence: %r' % sentence)
        if '?!' in sentence:
            flags.append('excluded nar-only cliffhanger fragment '
                          '(contains "?!"): %r' % sentence)
            continue
        rows.append({'text': sentence, 'art': resolve_art(art)})
    if len(rows) > MAX_ROWS:
        dropped = rows.pop()
        flags.append('book yielded %d rows (> cap %d) -- dropped the '
                      'finale row: %r' % (len(rows) + 1, MAX_ROWS, dropped['text']))
    return title, rows, flags, 'letter-book'


def load_book(slug):
    result = load_easy_reader(slug)
    if result is not None:
        return result
    result = load_letterbook(slug)
    if result is not None:
        return result
    return None


# ---------------------------------------------------- work 1 & 2 geometry --
BOX1_W, BOX1_H = 58 * mm, 42 * mm
GAP = 8 * mm
SENT_W = CW - BOX1_W - GAP
SENT_PAD = 5 * mm


def sentence_row_size(text, maxw):
    return fit(text, 'WordRg', 28, maxw, floor=14)


def uniform_sent_size(rows):
    return min(fit(r['text'], 'WordRg', 26, SENT_W - 2 * SENT_PAD, floor=12)
               for r in rows)


# --------------------------------------------------------------- work 1 ---
def work1_page1(c, title, rows):
    ct = header(c, title, 'Picture Match')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    box_h = min(BOX1_H, pitch - 6 * mm)
    text_w = CW - BOX1_W - GAP
    for i, r in enumerate(rows):
        by = bottoms[i] + (pitch - box_h) / 2
        bx = PW - M - BOX1_W
        dashed_box(c, bx, by, BOX1_W, box_h)
        size = sentence_row_size(r['text'], text_w)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(M, by + box_h / 2 - size * 0.32, r['text'])
    footer(c, title, 'Picture Match')
    c.showPage()


def work1_page2(c, title, rows):
    """Control of error -- SAME layout as page 1 (sentence left, picture
    slot right), just with the picture filled in. Montessori convention:
    the control must be identical in layout to the activity, not mirrored."""
    ct = header(c, title, 'Picture Match — control of error')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    box_h = min(BOX1_H, pitch - 6 * mm)
    text_w = CW - BOX1_W - GAP
    for i, r in enumerate(rows):
        by = bottoms[i] + (pitch - box_h) / 2
        bx = PW - M - BOX1_W
        solid_box(c, bx, by, BOX1_W, box_h)
        draw_image_contained(c, r['art'], bx + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
        size = sentence_row_size(r['text'], text_w)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        c.drawString(M, by + box_h / 2 - size * 0.32, r['text'])
    footer(c, title, 'Picture Match')
    c.showPage()


def work1_page3(c, title, rows):
    ct = header(c, title, 'Picture Match — cut sheet')
    gap_x, gap_y = 10 * mm, 10 * mm
    for i, r in enumerate(rows):
        col, row = i % 2, i // 2
        x = M + col * (BOX1_W + gap_x)
        y = ct - row * (BOX1_H + gap_y) - BOX1_H
        dashed_box(c, x, y, BOX1_W, BOX1_H)
        draw_image_contained(c, r['art'], x + 2 * mm, y + 2 * mm,
                              BOX1_W - 4 * mm, BOX1_H - 4 * mm)
    footer(c, title, 'Picture Match')
    c.showPage()


def build_work1(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work1-picture-match.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    work1_page1(c, title, rows)
    work1_page2(c, title, rows)
    work1_page3(c, title, rows)
    c.save()
    return path


# --------------------------------------------------------------- work 2 ---
def work2_page1(c, title, rows):
    ct = header(c, title, 'Sentence & Picture Match')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    box_h = min(BOX1_H, pitch - 6 * mm)
    for i in range(n):
        by = bottoms[i] + (pitch - box_h) / 2
        dashed_box(c, M, by, SENT_W, box_h)
        dashed_box(c, PW - M - BOX1_W, by, BOX1_W, box_h)
    footer(c, title, 'Sentence & Picture Match')
    c.showPage()


def work2_page2(c, title, rows):
    """Control of error -- SAME layout as page 1 (sentence slot left,
    picture slot right), just filled in. Not mirrored."""
    ct = header(c, title, 'Sentence & Picture Match — control of error')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    box_h = min(BOX1_H, pitch - 6 * mm)
    usize = uniform_sent_size(rows)
    for i, r in enumerate(rows):
        by = bottoms[i] + (pitch - box_h) / 2
        sx = M
        solid_box(c, sx, by, SENT_W, box_h)
        c.setFont('WordRg', usize)
        c.setFillColorRGB(*INK)
        c.drawCentredString(sx + SENT_W / 2, by + box_h / 2 - usize * 0.32,
                             r['text'])
        bx = M + SENT_W + GAP
        solid_box(c, bx, by, BOX1_W, box_h)
        draw_image_contained(c, r['art'], bx + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
    footer(c, title, 'Sentence & Picture Match')
    c.showPage()


def work2_page3(c, title, rows):
    ct = header(c, title, 'Sentence & Picture Match — cut sheet')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    box_h = min(BOX1_H, pitch - 6 * mm)
    usize = uniform_sent_size(rows)
    for i, r in enumerate(rows):
        by = bottoms[i] + (pitch - box_h) / 2
        dashed_box(c, M, by, SENT_W, box_h)
        c.setFont('WordRg', usize)
        c.setFillColorRGB(*INK)
        c.drawCentredString(M + SENT_W / 2, by + box_h / 2 - usize * 0.32,
                             r['text'])
        bx = PW - M - BOX1_W
        dashed_box(c, bx, by, BOX1_W, box_h)
        draw_image_contained(c, r['art'], bx + 2 * mm, by + 2 * mm,
                              BOX1_W - 4 * mm, box_h - 4 * mm)
    footer(c, title, 'Sentence & Picture Match')
    c.showPage()


def build_work2(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work2-sentence-picture-match.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    work2_page1(c, title, rows)
    work2_page2(c, title, rows)
    work2_page3(c, title, rows)
    c.save()
    return path


# ---------------------------------------------------- work 3 & 4 geometry --
PIC3_W, PIC3_H = 44 * mm, 33 * mm
GAP3 = 6 * mm
TILE_GAP = 2 * mm
TILE_PAD = 3 * mm
TILE_H = 15 * mm


def _row_tile_total(tokens, size):
    return (sum(stringWidth(t, 'WordRg', size) + 2 * TILE_PAD for t in tokens)
            + TILE_GAP * (len(tokens) - 1))


def global_tile_font(rows):
    """One shared word-tile font size for this book, chosen so every
    sentence's tiles (base-page slots AND cut-sheet tiles) fit the row
    width -- guarantees tiles are exactly slot-sized wherever printed."""
    avail_w = CW - PIC3_W - GAP3
    size = 20.0
    while size > 9:
        if all(_row_tile_total(r['text'].split(' '), size) <= avail_w
               for r in rows):
            break
        size -= 0.5
    return size


def tile_widths(tokens, tile_font):
    return [stringWidth(t, 'WordRg', tile_font) + 2 * TILE_PAD
            for t in tokens]


def sentence_builder_base(c, title, work_name, rows, show_words):
    ct = header(c, title, work_name)
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    tile_font = global_tile_font(rows)
    pic_h = min(PIC3_H, pitch - 4 * mm)
    for i, r in enumerate(rows):
        rb = bottoms[i]
        py = rb + (pitch - pic_h) / 2
        dashed_box(c, M, py, PIC3_W, pic_h)
        tokens = r['text'].split(' ')
        widths = tile_widths(tokens, tile_font)
        block_h = min(TILE_H + 9 * mm, pitch - 2 * mm)
        slot_y = rb + (pitch - block_h) / 2
        x = M + PIC3_W + GAP3
        for tok, w in zip(tokens, widths):
            if show_words:
                centered(c, x + w / 2, slot_y + TILE_H + 4 * mm, tok,
                         'WordRg', 7.5, GREY)
            dashed_box(c, x, slot_y, w, TILE_H)
            x += w + TILE_GAP
    footer(c, title, work_name)
    c.showPage()


def work3_page1(c, title, rows):
    sentence_builder_base(c, title, 'Sentence Builder — guided', rows, True)


def work4_page1(c, title, rows):
    sentence_builder_base(c, title, 'Sentence Builder — free', rows, False)


def work4_page2(c, title, rows):
    """Control of error -- SAME layout as page 1 (picture left, words/
    sentence right in the same slot column), just filled in. Not mirrored."""
    ct = header(c, title, 'Sentence Builder — free — control of error')
    n = len(rows)
    pitch, bottoms = row_positions(ct, n)
    pic_h = min(PIC3_H, pitch - 4 * mm)
    avail = CW - PIC3_W - GAP3
    for i, r in enumerate(rows):
        py = bottoms[i] + (pitch - pic_h) / 2
        px = M
        solid_box(c, px, py, PIC3_W, pic_h)
        draw_image_contained(c, r['art'], px + 2 * mm, py + 2 * mm,
                              PIC3_W - 4 * mm, pic_h - 4 * mm)
        size = fit(r['text'], 'WordRg', 24, avail, floor=11)
        c.setFont('WordRg', size)
        c.setFillColorRGB(*INK)
        tx = M + PIC3_W + GAP3
        c.drawString(tx, py + pic_h / 2 - size * 0.32, r['text'])
    footer(c, title, 'Sentence Builder — free')
    c.showPage()


def sentence_builder_cutsheet(c, title, work_name, rows):
    ct = header(c, title, work_name + ' — cut sheet')
    note(c, M, ct, 'PICTURE CARDS', size=7, color=GREY)
    x = M
    row_top = ct - 6 * mm
    for r in rows:
        if x + PIC3_W > PW - M:
            x = M
            row_top -= PIC3_H + 6 * mm
        dashed_box(c, x, row_top - PIC3_H, PIC3_W, PIC3_H)
        draw_image_contained(c, r['art'], x + 2 * mm,
                              row_top - PIC3_H + 2 * mm,
                              PIC3_W - 4 * mm, PIC3_H - 4 * mm)
        x += PIC3_W + 6 * mm
    y = row_top - PIC3_H - 14 * mm
    note(c, M, y, 'WORD TILES', size=7, color=GREY)
    y -= 8 * mm
    tile_font = global_tile_font(rows)
    all_tokens = []
    for r in rows:
        all_tokens.extend(r['text'].split(' '))
    rnd = random.Random(7)
    rnd.shuffle(all_tokens)
    widths = tile_widths(all_tokens, tile_font)
    x = M
    row_y = y
    for tok, w in zip(all_tokens, widths):
        if x + w > PW - M:
            x = M
            row_y -= TILE_H + 5 * mm
        dashed_box(c, x, row_y - TILE_H, w, TILE_H)
        c.setFont('WordRg', tile_font)
        c.setFillColorRGB(*INK)
        c.drawCentredString(x + w / 2, row_y - TILE_H / 2 - tile_font * 0.32,
                             tok)
        x += w + TILE_GAP
    footer(c, title, work_name)
    c.showPage()


def build_work3(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work3-sentence-builder-guided.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    work3_page1(c, title, rows)
    sentence_builder_cutsheet(c, title, 'Sentence Builder — guided', rows)
    c.save()
    return path


def build_work4(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work4-sentence-builder-free.pdf' % slug)
    c = rl_canvas.Canvas(path, pagesize=A4)
    work4_page1(c, title, rows)
    work4_page2(c, title, rows)
    sentence_builder_cutsheet(c, title, 'Sentence Builder — free', rows)
    c.save()
    return path


# --------------------------------------------------------------- driver ---
def build_slug(slug):
    result = load_book(slug)
    if result is None:
        print('[SKIP] %s -- no book found (checked easy-readers manifest '
              'and books_def.BOOKS)' % slug)
        return
    title, rows, flags, source = result
    if not rows:
        print('[SKIP] %s -- source=%s found but yielded 0 rows' % (slug, source))
        return
    out_dir = os.path.join(OUT_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)
    paths = [build_work1(slug, title, rows, out_dir),
             build_work2(slug, title, rows, out_dir),
             build_work3(slug, title, rows, out_dir),
             build_work4(slug, title, rows, out_dir)]
    print('[OK] %s (%s) -- title=%r rows=%d' % (slug, source, title, len(rows)))
    for r in rows:
        print('    - %s' % r['text'])
    for fl in flags:
        print('    FLAG: %s' % fl)
    for p in paths:
        print('    -> %s' % p)


def main():
    slugs = sys.argv[1:]
    if not slugs:
        raise SystemExit('usage: python3 build_book_works.py <slug> [<slug> ...]')
    for slug in slugs:
        build_slug(slug)


if __name__ == '__main__':
    main()
