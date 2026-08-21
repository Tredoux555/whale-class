# -*- coding: utf-8 -*-
"""Montree Phonics — build-it sheet (+ cut-out word cards) and the A5
trace-and-build take-home booklet.

FORMAT CHANGE per Tredoux 2026-07-30 (supersedes part of the 2026-07-29
locked format): READ IT + BUILD IT + TRACE IT used to share one page. They
were split onto two deliverables so the two activities (cut, stick, and
rebuild vs. sit down and write) don't compete for the same sheet.

FORMAT CHANGE per Tredoux 2026-08-21 (weekly-materials cleanup — vocab
cards and three-part cards dropped from the set entirely; see the dark
phonics library page): the word cards used to ship as their own
sentence-strips.pdf, sized so each row wrapped independently and every card
had to be trimmed out by hand. They now render as one touching-border grid
(see grid_metrics()) and live as trailing page(s) INSIDE build-it-sheet.pdf
— one document, not two, still exactly the slot size on both.

tracing-workbook.pdf is no longer built by this script (was, briefly, via a
bespoke build_a5_booklet.py layout — retired the same day per Tredoux: "why
not follow this exact same build ... keep the exact same media"). It's now
built by duplicating the real book's own saddle-stitch A5 reader build
(same cover, half-title, scene art, back cover as <slug>-A5-booklet-print.pdf)
with only the text pages swapped for traced guides — see
scripts/curriculum/dark-phonics-storybooks/build_a5_tracing.py, which writes
straight into this same public/dark-phonics-materials/<slug>/ folder.

    build-it-sheet.pdf     the cut-out-and-stick work, PLUS the cut-out word
                           cards. Landscape A4 page(s): every sentence's
                           solid READ IT model with its dashed BUILD IT card
                           slots directly beneath (scene art top right of
                           each row) — then, as trailing portrait-A4 page(s),
                           the same cards as one edge-to-edge cut grid, sized
                           from the exact same column widths as the dashed
                           slots above (grid_metrics()), so a cut-out card
                           fits its slot exactly no matter which row it came
                           from.

Model and cards both come from `stroke_font` — the same single-stroke
alphabet the tracing booklet's traced letters use, so the shapes the child
reads, builds and traces are the same shapes. The story is never duplicated
here: spreads are imported live from the book's own build script
(`bookScript` in the letter JSON) and the sentence is `nar` (minus its
trailing ellipsis) joined to the shouted word.

    python3 build_tracing.py --letter n
    python3 build_tracing.py --letter i --repo-root /path/to/montree --out /tmp/out

Output (fixed name): build-it-sheet.pdf (build-it pages + word-card grid)
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
INK   = (0, 0, 0)
RED   = (0.776, 0.157, 0.157)
GREY  = (0, 0, 0)
FAINT = (0, 0, 0)
HAIR  = (0, 0, 0)
SLOT  = (0, 0, 0)

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

# ---- sentence-strips sheet (portrait A4) -----------------------------
# Pulled up here (used by grid_metrics below) from where the strips builder
# used to define them locally, just above strips_pdf().
SPW, SPH = A4
SMG = 12 * mm

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

# each row's scene art, top right — sized so 5-sentence books (the common
# case) still pack 3 + 2 across two pages; 45mm is the bottom of the brief's
# 45-58mm range, chosen deliberately to keep the auto-packer at 2 pages
BS_ART_GAP = 8.0 * mm                   # air between the text column and the art
BS_ART_W   = 45.0 * mm                  # thumbnail width — 3:2, matches the
BS_ART_H   = BS_ART_W * 2 / 3           # scene photos' own aspect exactly
BS_TEXT_R  = PW - MG - BS_ART_W - BS_ART_GAP   # right edge of the text column
BS_TEXT_CX = (MG + BS_TEXT_R) / 2              # model sentence centres here,
                                                # not PW / 2, now that art
                                                # owns the right of the row


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
    c.setStrokeColorRGB(0, 0, 0)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setStrokeColorRGB(0, 0, 0)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)
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


def column_widths(sentences, u):
    """Per-column card width across the whole book: every card in a given
    word position (An / [swap word] / on / my / apple! ...) is exactly as
    wide as the widest word that ever lands there. That's what lets the same
    size work both as a build-it-sheet slot AND a sentence-strip cut cell in
    every row, instead of each row sizing its own cards independently."""
    rows = [s.split(' ') for s in sentences]
    ncols = max(len(r) for r in rows)
    return [max(card_width(r[j], u) for r in rows if j < len(r))
            for j in range(ncols)]


def grid_metrics(sentences):
    """Shared card grid for the whole book: the largest x-height `u` (up to
    CARD_U_MAX) whose per-column widths (a) keep every card <= 74mm, (b) let
    every row still fit the build-it-sheet's content width CW, and (c) let a
    FULL row of cards fit the narrower portrait strips sheet with zero gap
    between them — that last constraint is what makes an edge-to-edge cut
    grid possible (2026-08-21 format change, replaces the old per-row
    word-wrapping sentence-strips layout)."""
    strips_scw = SPW - 2 * SMG
    u = CARD_U_MAX
    while u > 2.5 * mm:
        cw = column_widths(sentences, u)
        widest = max(cw)
        row_w = [sum(cw[:len(s.split(' '))])
                 + SLOT_GAP * (len(s.split(' ')) - 1) for s in sentences]
        if widest <= 74 * mm and max(row_w) <= CW and sum(cw) <= strips_scw:
            break
        u -= 0.1 * mm
    return u, column_widths(sentences, u)


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
def row_art_zone(sentence):
    """Height of the read-it/build-it-label column above the slots — grown to
    fit the scene art (BS_ART_H) beside it when the text alone needs less."""
    size, rows = sf.fit_wrap(sentence, BS_TEXT_R - MG - 4 * mm, BS_MODEL_U_MAX,
                             maxlines=2, tracking=0.09)
    pitch = 2.6 * size
    block = pitch * (len(rows) - 1) + 3 * size
    label_zone = BS_TOP_GAP + block + BS_MODEL_GAP + BS_LABEL_GAP
    return max(label_zone, BS_ART_H)


def row_height(sentence):
    """Read-it + build-it footprint this sentence needs (no inter-row air)."""
    return row_art_zone(sentence) + SLOT_H


def build_row(c, band_top, band_bottom, sentence, card_u, col_widths, art_path):
    """One sentence: solid READ IT model, dashed BUILD IT slots beneath,
    centred vertically inside [band_bottom, band_top]. The scene art sits top
    right of the row, spanning the same zone as the model + 'build it' label
    so it never reaches down as far as the (full-width) slots."""
    size, rows = sf.fit_wrap(sentence, BS_TEXT_R - MG - 4 * mm, BS_MODEL_U_MAX,
                             maxlines=2, tracking=0.09)
    pitch = 2.6 * size
    block = pitch * (len(rows) - 1) + 3 * size
    label_zone = BS_TOP_GAP + block + BS_MODEL_GAP + BS_LABEL_GAP
    art_zone = max(label_zone, BS_ART_H)
    extra = art_zone - label_zone          # slack the art forces open, if any

    words = sentence.split(' ')
    # slot widths come from the book-wide column grid (not this row's own
    # word widths) so every cut-out card fits its slot exactly, whether the
    # card was cut from THIS row or a longer/shorter one elsewhere in the
    # book — see grid_metrics().
    widths = col_widths[:len(words)]
    total_w = sum(widths) + SLOT_GAP * (len(words) - 1)

    row_total = art_zone + SLOT_H
    band_h = band_top - band_bottom
    row_top = band_top - (band_h - row_total) / 2   # centred in its band

    section_label(c, MG, row_top, 'read it')
    model_top = row_top - BS_TOP_GAP
    for i, row in enumerate(rows):
        w = sf.text_width(row, size, 0.09)
        sf.draw_solid(c, row, BS_TEXT_CX - w / 2,
                      model_top - 2 * size - i * pitch,
                      size, tracking=0.09, weight=0.115, color=INK)
    model_bottom = model_top - block

    # scene art: right-aligned, spans row_top -> slot_top (the model +
    # 'build it' label zone) — draw_image_contained centres the actual
    # (3:2, same ratio as the box) image inside whatever slack that leaves
    art_x = PW - MG - BS_ART_W
    slot_top = row_top - art_zone
    draw_image_contained(c, art_path, art_x, slot_top, BS_ART_W, art_zone)

    build_label_y = model_bottom - BS_MODEL_GAP - extra
    section_label(c, MG, build_label_y, 'build it')

    x = PW / 2 - total_w / 2
    for w, cw in zip(words, widths):
        c.setStrokeColorRGB(*SLOT)
        c.setLineWidth(0.9)
        c.setDash(2.4, 2.4)
        c.roundRect(x, slot_top - SLOT_H, cw, SLOT_H, 2.0 * mm, stroke=1, fill=0)
        c.setDash()
        x += cw + SLOT_GAP


def build_sheet_page(c, cfg, sentences, arts, page_no, total_pages, card_u,
                     col_widths):
    chrome(c, cfg, '%s  ·  build it  ·  sheet %d of %d'
           % (cfg['bookTitle'], page_no, total_pages))
    n = len(sentences)
    band_h = (BS_CONTENT_TOP - BS_CONTENT_BOT) / n
    for i, (sentence, art_path) in enumerate(zip(sentences, arts)):
        top = BS_CONTENT_TOP - i * band_h
        build_row(c, top, top - band_h, sentence, card_u, col_widths, art_path)
    footer(c, 'Montree Phonics  ·  build it  ·  letter %s' % cfg['letter'],
          'sheet %d / %d' % (page_no, total_pages))


def build_sheet_pdf(cfg, sentences, arts, card_u, col_widths, out):
    content_h = BS_CONTENT_TOP - BS_CONTENT_BOT
    worst_row = max(row_height(s) for s in sentences) + BS_ROW_AIR
    rows_per_page = max(1, int(content_h // worst_row))
    n_pages = -(-len(sentences) // rows_per_page)          # ceil
    per_page = -(-len(sentences) // n_pages)                # even split

    c = rl_canvas.Canvas(out, pagesize=landscape(A4))
    c.setTitle('%s — build it sheet' % cfg['bookTitle'])
    for p in range(n_pages):
        chunk = sentences[p * per_page:(p + 1) * per_page]
        arts_chunk = arts[p * per_page:(p + 1) * per_page]
        build_sheet_page(c, cfg, chunk, arts_chunk, p + 1, n_pages, card_u,
                         col_widths)
        c.showPage()

    # ---- trailing page(s): the cut-out word-card grid, same document -----
    # 2026-08-21: sentence-strips.pdf folded into this file per Tredoux —
    # one "build it" download instead of two. Portrait, so switch the page
    # size before drawing; strips_draw() calls its own footer but not
    # showPage(), matching the pattern above.
    c.setPageSize(A4)
    strips_draw(c, cfg, sentences, card_u, col_widths)
    c.showPage()

    c.save()
    return out, n_pages + 1


# --------------------------------------------------- (B) tracing book -----
def trace_page(c, cfg, idx, total, sentence, art_path):
    chrome(c, cfg, '%s  ·  page %d of %d' % (cfg['bookTitle'], idx, total))

    # ---- the scene art, prominent: a proper book-page illustration --------
    draw_image_contained(c, art_path, PW / 2 - BOOKART_BOX_W / 2, BOOKART_BOT,
                         BOOKART_BOX_W, BOOKART_H)

    # ---- trace it — exact existing format, untouched ----------------------
    section_label(c, MG, TRACE_TOP + 9.5 * mm, 'trace it')
    # 2026-08-20 FIX: the traced sentence gets exactly ONE writing line,
    # shrunk until it fits. It used to be allowed to wrap onto two lines
    # (maxlines=2) — and because the page only ever draws two writing lines,
    # any sentence long enough to wrap silently ate the second one and the
    # "NOW YOU" independent-practice section vanished from the page (whole
    # books lost it: the-pit, the-mat, the-cot, the-egg, the-mud, the-rat).
    # The second line belongs to the child and is never surrendered; long
    # sentences pay for it in x-height instead.
    u, rows = sf.fit_wrap(sentence, CW - 4 * mm, TRACE_U, maxlines=1,
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
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.9)
    c.setDash()
    c.line(lx, wy, MG + left_w, wy)

    c.setFont('Label', 7.5)
    c.setFillColorRGB(*FAINT)
    c.drawString(MG + 4 * mm, wy - 9 * mm,
                 'cut the word cards from sentence-strips.pdf')


# ------------------------------------------------------- word-card grid ---
# 2026-08-21 format change per Tredoux: word cards used to size themselves
# per row and sit with air between them, so every single card had to be
# trimmed out by hand. They now render as one touching-border grid — every
# card in a column shares col_widths[j] (see grid_metrics()), every row
# shares SLOT_H, zero gap anywhere — so the whole sheet comes apart with a
# small number of full-length straight cuts: across for strips, then down
# for individual cards (optionally through a stack of several strips at
# once). Card sizes stay in lockstep with the build-it-sheet's dashed slots
# because both now come from the same grid_metrics() column widths.
#
# Draws onto whatever page is CURRENT on `c` — the caller (build_sheet_pdf)
# sizes that page portrait A4 and calls showPage() after, so this lives as
# trailing page(s) inside build-it-sheet.pdf instead of its own file.
# Assumes the grid fits one page, true for every book so far (build-it-sheet
# itself only starts a 2nd landscape page past ~5 longer sentences, and the
# portrait grid has much more headroom than that per row).
def strips_draw(c, cfg, sentences, card_u, col_widths):
    rows = [s.split(' ') for s in sentences]
    ncols = max(len(r) for r in rows)
    scw = SPW - 2 * SMG
    grid_w = sum(col_widths[:ncols])
    grid_x0 = SMG + (scw - grid_w) / 2   # centre the grid in the margins

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
                     'Cut straight across each row, then straight down each '
                     'column — every card lines up on both cuts.')
        ref = '   '.join('%d. %s' % (i, s) for i, s in enumerate(sentences, 1))
        c.setFont('Label', 6.6)
        c.setFillColorRGB(*FAINT)
        c.drawString(SMG, SPH - SMG - 20.5 * mm, ref)

    def footer(grid_bottom):
        foot_y = grid_bottom - 9 * mm
        hairline(c, SMG, foot_y, SPW - SMG)
        c.setFont('Label', 7)
        c.setFillColorRGB(*FAINT)
        c.drawString(SMG, foot_y - 4.4 * mm,
                     'Montree Phonics  ·  word cards  ·  letter %s'
                     % cfg['letter'])
        c.drawRightString(SPW - SMG, foot_y - 4.4 * mm, cfg['bookTitle'])

    header()
    grid_top = SPH - SMG - 24 * mm
    grid_h = SLOT_H * len(rows)
    grid_bottom = grid_top - grid_h

    # word text, one card at a time
    for i, words in enumerate(rows):
        row_top = grid_top - i * SLOT_H
        row_bot = row_top - SLOT_H
        x = grid_x0
        for j, w in enumerate(words):
            cw = col_widths[j]
            sf.draw_solid(c, w, x + (cw - sf.text_width(w, card_u, 0.08)) / 2,
                          row_bot + SLOT_H / 2 - card_u * 0.42, card_u,
                          tracking=0.08, weight=0.12, color=INK)
            x += cw

    # grid lines: one continuous stroke per cut, not one rect per card, so
    # every shared edge is a single line instead of two overlapping ones
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.6)
    c.setDash()
    for i in range(len(rows) + 1):
        yy = grid_top - i * SLOT_H
        c.line(grid_x0, yy, grid_x0 + grid_w, yy)
    xx = grid_x0
    c.line(xx, grid_top, xx, grid_bottom)
    for j in range(ncols):
        xx += col_widths[j]
        c.line(xx, grid_top, xx, grid_bottom)

    footer(grid_bottom)


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

    card_u, col_widths = grid_metrics(sentences)

    # ---- build-it sheet (+ trailing word-card grid) -----------------------
    bs, bs_pages = build_sheet_pdf(cfg, sentences, arts, card_u, col_widths,
                                   os.path.join(outdir, 'build-it-sheet.pdf'))

    # tracing-workbook.pdf is no longer built here (2026-08-21, take 2): it
    # now comes from duplicating the real book's OWN saddle-stitch A5 build
    # (cover / half-title / art pages / back cover all identical to
    # <slug>-A5-booklet-print.pdf) instead of a bespoke layout — see
    # scripts/curriculum/dark-phonics-storybooks/build_a5_tracing.py, which
    # writes straight to this same materials folder.

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))
    print('build-it-sheet.pdf   ->', bs, '(%d page%s, incl. word-card grid)'
          % (bs_pages, '' if bs_pages == 1 else 's'))
    print('card x-height %.2f mm, card height %.0f mm'
          % (card_u / mm, SLOT_H / mm))
    for i, s in enumerate(sentences, 1):
        print('  p%d  %s' % (i, s))
    return bs


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
