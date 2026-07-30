# -*- coding: utf-8 -*-
"""Montree Phonics — build-it sheet + child-written tracing book + sentence
strips.

FORMAT CHANGE per Tredoux 2026-07-30 (supersedes part of the 2026-07-29
locked format): READ IT + BUILD IT + TRACE IT used to share one page. They
are now split onto two different deliverables so the two activities (cut,
stick, and rebuild vs. sit down and write) don't compete for the same sheet:

    build-it-sheet.pdf     the cut-out-and-stick work. One page (two if a
                           book's sentences are too long to sit comfortably
                           on one): every sentence's solid READ IT model with
                           its dashed BUILD IT card slots directly beneath —
                           slots are exactly the sentence-strips word-card
                           size, unchanged. Nothing else on the sheet.

    tracing-workbook.pdf   the book the child writes themselves, "as if they
                           were writing the book". Cover ("written by ___"),
                           then one page per sentence: the scene art, big —
                           a proper book-page illustration, not a thumbnail —
                           and the whole sentence in the exact TRACE IT
                           format (dotted skeleton on the same three-line
                           guide, same x-height, auto-derived red/blue
                           stroke-order arrows). No model line, no slots.

    sentence-strips.pdf    unchanged: the word cards the build-it sheet's
                           slots are sized to.

Model, cards and tracing all still come from `stroke_font` — one
single-stroke alphabet, so the shapes the child reads, builds and traces are
the same shapes. The story is never duplicated here: spreads are imported
live from the book's own build script (`bookScript` in the letter JSON) and
the sentence is `nar` (minus its trailing ellipsis) joined to the shouted
word.

    python3 build_tracing.py --letter n
    python3 build_tracing.py --letter i --repo-root /path/to/montree --out /tmp/out

Outputs (fixed names): build-it-sheet.pdf
                       tracing-workbook.pdf
                       sentence-strips.pdf
"""
import argparse
import importlib.util
import json
import os
import sys
import types

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stroke_font as sf                                          # noqa: E402

# ---------------------------------------------------------------- fonts ----
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title',  F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

# ----------------------------------------------------------------- inks ----
INK   = (0.10, 0.10, 0.10)
RED   = (0.776, 0.157, 0.157)
GREY  = (0.52, 0.52, 0.52)
FAINT = (0.72, 0.72, 0.72)
HAIR  = (0.84, 0.84, 0.84)
SLOT  = (0.48, 0.48, 0.48)

# ------------------------------------------------------------- geometry ---
PW, PH = landscape(A4)                 # 297 x 210 mm
MG = 13 * mm
CW = PW - 2 * MG

HEAD_Y   = PH - MG - 4.2 * mm          # masthead baseline
RULE_Y   = PH - MG - 9.0 * mm
ART_TOP  = PH - MG - 12.0 * mm         # top of the picture, 185 mm
ART_W, ART_H = 58 * mm, 38 * mm        # legacy thumbnail size (unused by the
                                        # tracing book now — kept only as the
                                        # historical reference the brief cites)
MODEL_L, MODEL_R = MG, PW - MG - ART_W - 8 * mm
MODEL_TOP, MODEL_BOT = ART_TOP - 4 * mm, 147 * mm
MODEL_U  = 6.6 * mm                    # x-height of the model sentence

SLOT_H   = 20 * mm                     # velcro card height (== strip cards)
SLOT_TOP = 136 * mm
SLOT_GAP = 4.5 * mm

TRACE_TOP = 104 * mm                   # headline of the first writing line
TRACE_U   = 12.5 * mm                    # x-height of the tracing letters —
                                        # unchanged: same x-height rule as
                                        # the locked format
TRACE_GAP = 5 * mm                     # air between the two writing lines
FOOT_RULE = MG + 6 * mm

CARD_PAD   = 7 * mm                    # card padding either side of the word
CARD_U_MAX = 5.6 * mm                  # card x-height ceiling

# ---- book-page illustration (tracing book) --------------------------------
# Freed up by dropping the model sentence + slots from this page: the picture
# now fills the whole band between the header and the (unchanged) trace-it
# block, instead of a small thumbnail squeezed in beside the model line.
BOOKART_BOT = TRACE_TOP + 9.5 * mm + 5.5 * mm   # a hair above the trace-it label
BOOKART_H   = ART_TOP - BOOKART_BOT             # ~66 mm — a proper book page
BOOKART_BOX_W = 200 * mm                        # wide box; aspect-fit centres it

# ---- build-it sheet ---------------------------------------------------
BS_MODEL_U_MAX = 6.0 * mm               # model text ceiling on the build sheet
BS_TOP_GAP     = 4.0 * mm               # 'read it' label + air -> model top
BS_MODEL_GAP   = 3.0 * mm               # model bottom -> 'build it' label
BS_LABEL_GAP   = 2.5 * mm               # 'build it' label -> slot top
BS_CONTENT_TOP = RULE_Y - 4 * mm
BS_CONTENT_BOT = FOOT_RULE + 4 * mm
BS_ROW_AIR     = 3.0 * mm               # minimum breathing space between rows


# --------------------------------------------------------- repo plumbing ---
def default_repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '..'))


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def load_spreads(repo_root, cfg):
    """The reader's own spreads[], imported without letting it build anything."""
    readers = os.path.join(repo_root, 'scripts', 'curriculum',
                           'dark-phonics-readers')
    art_root = os.path.join(repo_root, 'phonics-images', 'satpin-v2', 'books')
    art_dir = os.path.join(repo_root, cfg['artDir'])

    if readers not in sys.path:
        sys.path.insert(0, readers)
    # Book scripts take their art directory from the environment (bookI.py reads
    # MONTREE_I_ART); point this letter's variable at artDir so nothing falls
    # back to a path that only exists on someone's Mac.
    os.environ['MONTREE_BOOKS_ROOT'] = art_root
    os.environ['MONTREE_BOOK_OUT'] = os.path.join(repo_root, '.tracing-tmp')
    os.environ['MONTREE_%s_ART' % cfg['letter'].upper()] = art_dir

    caught = {}
    stub = types.ModuleType('dpbuild')
    stub.build = lambda book, outdir=None: caught.setdefault('book', book)
    stub.BOOKS_ROOT = art_root
    saved = sys.modules.get('dpbuild')
    sys.modules['dpbuild'] = stub
    try:
        load_module(os.path.join(repo_root, cfg['bookScript']),
                    '_montree_book_' + cfg['letter'])
    finally:
        if saved is not None:
            sys.modules['dpbuild'] = saved
        else:
            sys.modules.pop('dpbuild', None)

    if 'book' not in caught:
        raise SystemExit('%s never called build() — cannot read its spreads'
                         % cfg['bookScript'])
    return caught['book']


def sentence_of(spread):
    """nar + shouted word -> the model sentence ('The pig ate a pineapple!')."""
    nar = (spread.get('nar') or '').strip()
    for tail in ('…', '...'):
        if nar.endswith(tail):
            nar = nar[:-len(tail)].strip()
    word = (spread.get('text') or '').strip()
    return (nar + ' ' + word).strip() if nar else word


# --------------------------------------------------------------- helpers ---
def tracked(c, x, y, text, font, size, tracking, color, align='left'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = {'left': x, 'center': x - total / 2, 'right': x - total}[align]
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def hairline(c, x1, y, x2, color=HAIR, width=0.5):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setDash()
    c.line(x1, y, x2, y)


def draw_image_contained(c, path, x, y, w, h, frame=True):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')
    if frame:
        c.setStrokeColorRGB(*HAIR)
        c.setLineWidth(0.5)
        c.setDash()
        c.rect(dx, dy, dw, dh, stroke=1, fill=0)
    return dx, dy, dw, dh


def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid baseline."""
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(0.70, 0.70, 0.70)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setStrokeColorRGB(0.62, 0.62, 0.62)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setStrokeColorRGB(0.38, 0.38, 0.38)
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


# ------------------------------------------------------------ card sizes ---
def card_width(word, u):
    return max(20 * mm, sf.text_width(word, u, 0.08) + 2 * CARD_PAD)


def card_metrics(sentences):
    """One card size for the whole book: the longest sentence sets the scale."""
    u = CARD_U_MAX
    words = [w for s in sentences for w in s.split(' ')]
    while u > 2.5 * mm:
        widest = max(card_width(w, u) for w in words)
        rows = [sum(card_width(w, u) for w in s.split(' '))
                + SLOT_GAP * (len(s.split(' ')) - 1) for s in sentences]
        if widest <= 74 * mm and max(rows) <= CW:
            break
        u -= 0.1 * mm
    return u


# ------------------------------------------------------------ page parts ---
def chrome(c, cfg, right_text):
    tracked(c, MG, HEAD_Y, 'M O N T R E E   P H O N I C S', 'Label', 8.0, 0.26,
            GREY)
    c.setFont('Label', 8.0)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(PW - MG, HEAD_Y, right_text)
    hairline(c, MG, RULE_Y, PW - MG)
    hairline(c, MG, FOOT_RULE, PW - MG)


def section_label(c, x, y, text):
    tracked(c, x, y, ' '.join(text.upper()), 'LabelB', 6.6, 0.10, FAINT)


def footer(c, left_text, right_text):
    c.setFont('Label', 7)
    c.setFillColorRGB(*FAINT)
    c.drawString(MG, MG + 1.6 * mm, left_text)
    c.drawRightString(PW - MG, MG + 1.6 * mm, right_text)


# --------------------------------------------------- (A) build-it sheet ---
def row_height(sentence):
    """Read-it + build-it footprint this sentence needs (no inter-row air)."""
    size, rows = sf.fit_wrap(sentence, CW - 4 * mm, BS_MODEL_U_MAX,
                             maxlines=2, tracking=0.09)
    pitch = 2.6 * size
    block = pitch * (len(rows) - 1) + 3 * size
    return BS_TOP_GAP + block + BS_MODEL_GAP + BS_LABEL_GAP + SLOT_H


def build_row(c, band_top, band_bottom, sentence, card_u):
    """One sentence: solid READ IT model, dashed BUILD IT slots beneath,
    centred vertically inside [band_bottom, band_top]."""
    size, rows = sf.fit_wrap(sentence, CW - 4 * mm, BS_MODEL_U_MAX,
                             maxlines=2, tracking=0.09)
    pitch = 2.6 * size
    block = pitch * (len(rows) - 1) + 3 * size

    words = sentence.split(' ')
    widths = [card_width(w, card_u) for w in words]
    total_w = sum(widths) + SLOT_GAP * (len(words) - 1)

    row_total = BS_TOP_GAP + block + BS_MODEL_GAP + BS_LABEL_GAP + SLOT_H
    band_h = band_top - band_bottom
    row_top = band_top - (band_h - row_total) / 2   # centred in its band

    section_label(c, MG, row_top, 'read it')
    model_top = row_top - BS_TOP_GAP
    for i, row in enumerate(rows):
        w = sf.text_width(row, size, 0.09)
        sf.draw_solid(c, row, PW / 2 - w / 2, model_top - 2 * size - i * pitch,
                      size, tracking=0.09, weight=0.115, color=INK)
    model_bottom = model_top - block

    build_label_y = model_bottom - BS_MODEL_GAP
    section_label(c, MG, build_label_y, 'build it')

    slot_top = build_label_y - BS_LABEL_GAP
    x = PW / 2 - total_w / 2
    for w, cw in zip(words, widths):
        c.setStrokeColorRGB(*SLOT)
        c.setLineWidth(0.9)
        c.setDash(2.4, 2.4)
        c.roundRect(x, slot_top - SLOT_H, cw, SLOT_H, 2.0 * mm, stroke=1, fill=0)
        c.setDash()
        x += cw + SLOT_GAP


def build_sheet_page(c, cfg, sentences, page_no, total_pages, card_u):
    chrome(c, cfg, '%s  ·  build it  ·  sheet %d of %d'
           % (cfg['bookTitle'], page_no, total_pages))
    n = len(sentences)
    band_h = (BS_CONTENT_TOP - BS_CONTENT_BOT) / n
    for i, sentence in enumerate(sentences):
        top = BS_CONTENT_TOP - i * band_h
        build_row(c, top, top - band_h, sentence, card_u)
    footer(c, 'Montree Phonics  ·  build it  ·  letter %s' % cfg['letter'],
          'sheet %d / %d' % (page_no, total_pages))


def build_sheet_pdf(cfg, sentences, card_u, out):
    content_h = BS_CONTENT_TOP - BS_CONTENT_BOT
    worst_row = max(row_height(s) for s in sentences) + BS_ROW_AIR
    rows_per_page = max(1, int(content_h // worst_row))
    n_pages = -(-len(sentences) // rows_per_page)          # ceil
    per_page = -(-len(sentences) // n_pages)                # even split

    c = rl_canvas.Canvas(out, pagesize=landscape(A4))
    c.setTitle('%s — build it sheet' % cfg['bookTitle'])
    for p in range(n_pages):
        chunk = sentences[p * per_page:(p + 1) * per_page]
        build_sheet_page(c, cfg, chunk, p + 1, n_pages, card_u)
        c.showPage()
    c.save()
    return out, n_pages


# --------------------------------------------------- (B) tracing book -----
def trace_page(c, cfg, idx, total, sentence, art_path):
    chrome(c, cfg, '%s  ·  page %d of %d' % (cfg['bookTitle'], idx, total))

    # ---- the scene art, prominent: a proper book-page illustration --------
    draw_image_contained(c, art_path, PW / 2 - BOOKART_BOX_W / 2, BOOKART_BOT,
                         BOOKART_BOX_W, BOOKART_H)

    # ---- trace it — exact existing format, untouched ----------------------
    section_label(c, MG, TRACE_TOP + 9.5 * mm, 'trace it')
    u, rows = sf.fit_wrap(sentence, CW - 4 * mm, TRACE_U, maxlines=2,
                          tracking=0.12)
    base = TRACE_TOP - 2 * u
    # always two writing lines: whatever the tracing does not use is left blank
    # for the child to write the sentence again unaided
    for i in range(2):
        b = base - i * (3 * u + TRACE_GAP)
        guidelines(c, MG, PW - MG, b, u)
        if i < len(rows):
            sf.draw_traced(c, rows[i], MG + 2 * mm, b, u, tracking=0.12)
        else:
            tracked(c, PW - MG, b + u * 0.5, 'N O W   Y O U', 'LabelB', 6.6,
                    0.10, FAINT, align='right')

    footer(c, 'Montree Phonics  ·  trace and build', '%d / %d' % (idx, total))


def cover_page(c, cfg, art_path):
    tracked(c, MG, HEAD_Y, 'M O N T R E E   P H O N I C S', 'Label', 8.0, 0.26,
            GREY)
    c.setFont('Label', 8.0)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(PW - MG, HEAD_Y, 'WEEK %d' % cfg['week'])
    hairline(c, MG, RULE_Y, PW - MG)

    left_w = 126 * mm
    cx = MG + left_w / 2

    # the picture sets the band the left column is centred in
    art_bot, art_top = MG + 20 * mm, PH - 62 * mm
    ax = MG + left_w + 12 * mm
    draw_image_contained(c, art_path, ax, art_bot, PW - MG - ax,
                         art_top - art_bot)

    title = cfg['bookTitle']
    size = 30.0
    while c.stringWidth(title, 'Title', size) > left_w and size > 12:
        size -= 0.5
    lines, cur = [], ''
    for w in title.split(' '):
        t = (cur + ' ' + w) if cur else w
        if cur and c.stringWidth(t, 'Title', size) > left_w:
            lines.append(cur)
            cur = w
        else:
            cur = t
    lines.append(cur)

    title_h = size * 1.22 * len(lines)
    block = (5 * mm + 9 * mm + title_h + 11 * mm + 18 * mm + 30 * mm
             + 8 * mm + 7 * mm + 4 * mm)
    y = art_top - ((art_top - art_bot) - block) / 2

    tracked(c, cx, y - 5 * mm, 'T R A C E   A N D   B U I L D', 'LabelB', 8.0,
            0.22, RED, align='center')
    y -= 5 * mm + 9 * mm

    for ln in lines:
        c.setFont('Title', size)
        c.setFillColorRGB(*INK)
        c.drawCentredString(cx, y - size * 0.92, ln)
        y -= size * 1.22

    by = y - 11 * mm - 9 * mm
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(1.0)
    c.circle(cx, by, 9 * mm, stroke=1, fill=0)
    c.setFont('Word', 23)
    c.setFillColorRGB(*RED)
    c.drawCentredString(cx, by - 5.4, cfg['letter'])

    wy = by - 9 * mm - 30 * mm
    c.setFont('Label', 12)
    c.setFillColorRGB(*GREY)
    label = 'written by'
    c.drawString(MG + 4 * mm, wy + 1.8 * mm, label)
    lx = MG + 4 * mm + c.stringWidth(label, 'Label', 12) + 4 * mm
    c.setStrokeColorRGB(0.45, 0.45, 0.45)
    c.setLineWidth(0.9)
    c.setDash()
    c.line(lx, wy, MG + left_w, wy)

    c.setFont('Label', 7.5)
    c.setFillColorRGB(*FAINT)
    c.drawString(MG + 4 * mm, wy - 9 * mm,
                 'cut the word cards from sentence-strips.pdf')


# ---------------------------------------------------------- strips sheet ---
SPW, SPH = A4                          # portrait, 210 x 297
SMG = 12 * mm


def strips_pdf(cfg, sentences, card_u, out):
    c = rl_canvas.Canvas(out, pagesize=A4)
    c.setTitle('%s — sentence strips' % cfg['bookTitle'])
    scw = SPW - 2 * SMG
    y = [0.0]
    page = [1]

    def header():
        tracked(c, SMG, SPH - SMG - 4 * mm, 'M O N T R E E   P H O N I C S',
                'Label', 8.0, 0.26, GREY)
        c.setFont('Label', 8.0)
        c.setFillColorRGB(*FAINT)
        c.drawRightString(SPW - SMG, SPH - SMG - 4 * mm,
                          '%s  ·  word cards' % cfg['bookTitle'])
        hairline(c, SMG, SPH - SMG - 9 * mm, SPW - SMG)
        c.setFont('Label', 8)
        c.setFillColorRGB(*GREY)
        c.drawString(SMG, SPH - SMG - 15.5 * mm,
                     'Cut on the lines. Every card fits a slot on its workbook '
                     'page — velcro the back.')
        y[0] = SPH - SMG - 24 * mm

    def footer():
        hairline(c, SMG, SMG + 6 * mm, SPW - SMG)
        c.setFont('Label', 7)
        c.setFillColorRGB(*FAINT)
        c.drawString(SMG, SMG + 1.6 * mm,
                     'Montree Phonics  ·  sentence strips  ·  letter %s'
                     % cfg['letter'])
        c.drawRightString(SPW - SMG, SMG + 1.6 * mm, 'sheet %d' % page[0])

    header()
    for n, s in enumerate(sentences, 1):
        words = s.split(' ')
        rows, cur, curw = [], [], 0.0
        for w in words:
            cwid = card_width(w, card_u)
            add = cwid + (SLOT_GAP if cur else 0)
            if cur and curw + add > scw:
                rows.append(cur)
                cur, curw = [(w, cwid)], cwid
            else:
                cur.append((w, cwid))
                curw += add
        if cur:
            rows.append(cur)

        need = 6 * mm + len(rows) * (SLOT_H + SLOT_GAP)
        if y[0] - need < SMG + 9 * mm:
            footer()
            c.showPage()
            page[0] += 1
            header()

        tracked(c, SMG, y[0], 'P A G E   %d   ·   %s' % (n, s), 'LabelB', 7.0,
                0.08, RED)
        y[0] -= 6 * mm
        for row in rows:
            x = SMG
            for w, cwid in row:
                c.setStrokeColorRGB(0.55, 0.55, 0.55)
                c.setLineWidth(0.6)
                c.setDash()
                c.rect(x, y[0] - SLOT_H, cwid, SLOT_H, stroke=1, fill=0)
                sf.draw_solid(c, w,
                              x + (cwid - sf.text_width(w, card_u, 0.08)) / 2,
                              y[0] - SLOT_H / 2 - card_u * 0.42, card_u,
                              tracking=0.08, weight=0.12, color=INK)
                x += cwid + SLOT_GAP
            y[0] -= SLOT_H + SLOT_GAP
        y[0] -= 3 * mm
    footer()
    c.save()
    return out


# ----------------------------------------------------------------- build ---
def build(cfg, repo_root, outdir):
    os.makedirs(outdir, exist_ok=True)
    book = load_spreads(repo_root, cfg)
    art_dir = os.path.join(repo_root, cfg['artDir'])

    spreads = book['spreads']
    sentences = [sentence_of(s) for s in spreads]
    arts = [os.path.join(art_dir, os.path.basename(s['art'])) for s in spreads]
    for a in arts:
        if not os.path.exists(a):
            raise SystemExit('missing art: ' + a)

    cover_name = (cfg.get('workbook') or {}).get('coverArt') \
        or os.path.basename(book.get('cover') or spreads[0]['art'])
    cover_art = os.path.join(art_dir, cover_name)
    if not os.path.exists(cover_art):
        cover_art = arts[0]

    card_u = card_metrics(sentences)

    # ---- (A) build-it sheet -------------------------------------------
    bs, bs_pages = build_sheet_pdf(cfg, sentences, card_u,
                                   os.path.join(outdir, 'build-it-sheet.pdf'))

    # ---- (B) tracing book — cover + one page per sentence, trace-it only
    wb = os.path.join(outdir, 'tracing-workbook.pdf')
    c = rl_canvas.Canvas(wb, pagesize=landscape(A4))
    c.setTitle('%s — trace and build workbook' % cfg['bookTitle'])
    cover_page(c, cfg, cover_art)
    c.showPage()
    for i, (s, a) in enumerate(zip(sentences, arts), 1):
        trace_page(c, cfg, i, len(sentences), s, a)
        c.showPage()
    c.save()

    # ---- sentence strips (unchanged) -----------------------------------
    st = strips_pdf(cfg, sentences, card_u,
                    os.path.join(outdir, 'sentence-strips.pdf'))

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))
    print('build-it-sheet.pdf   ->', bs, '(%d page%s)'
          % (bs_pages, '' if bs_pages == 1 else 's'))
    print('tracing-workbook.pdf ->', wb, '(%d pages)' % (len(sentences) + 1))
    print('sentence-strips.pdf  ->', st)
    print('card x-height %.2f mm, card height %.0f mm'
          % (card_u / mm, SLOT_H / mm))
    for i, s in enumerate(sentences, 1):
        print('  p%d  %s' % (i, s))
    return bs, wb, st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--letter', default='p', help='letters/<letter>.json')
    ap.add_argument('--repo-root', default=None)
    ap.add_argument('--out', default=None,
                    help='default: <repo>/public/satpin-materials/<slug>')
    a = ap.parse_args()

    root = os.path.abspath(a.repo_root) if a.repo_root else default_repo_root()
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'letters', a.letter + '.json')) as fh:
        cfg = json.load(fh)
    out = a.out or os.path.join(root, 'public', 'satpin-materials', cfg['slug'])
    build(cfg, root, out)


if __name__ == '__main__':
    main()
