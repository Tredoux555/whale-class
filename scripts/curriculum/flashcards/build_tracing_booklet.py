#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Montree Phonics — tracing booklet, mirrors a build_booklets reader
page-for-page so the two A5 booklets sit side by side in a stack.

Reuses build_booklets.py wholesale (same fonts/margins/PW,PH/page_words/
page_halftitle/page_back/make_art_page/folio/imposition loop) and only adds
one new page painter, make_trace_page(), built on stroke_font's traced-letter
primitive (the same engine the real satpin-paperwork tracing pipeline uses).

Page-for-page mirror of the reader:
    cover        -> trace cover  (same page_cover art/title, + TRACE badge
                    + 'written by ___' line)
    words        -> UNCHANGED (same page_words call)
    half-title   -> UNCHANGED (same page_halftitle call)
    per spread:
        text page  -> trace page (nar line at the reader's exact position,
                       then a traced guide row for the target word, then an
                       empty guide row for the child to write it unaided)
        art page   -> UNCHANGED (same make_art_page call, same image)
    back cover   -> UNCHANGED (same page_back call)

Target word + celebration line are derived from the book dict itself
(`book['new']`'s first token), so this works for every book in the sat-cast
letter-book chain, not just 'the-sat' — see is_sat_cast_letter_book() below.

Usage:
    python3 build_tracing_booklet.py                 # builds the-sat only
    python3 build_tracing_booklet.py the-sat the-spat # builds these slugs
    python3 build_tracing_booklet.py --all            # every sat-cast
                                                       # letter-book chain title
    python3 build_tracing_booklet.py the-sat --out /path/to/outdir
"""
import argparse
import os
import sys

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# Fonts: MONTREE_CANVAS_FONTS can still be overridden by the caller's
# environment (e.g. to point at a different font set), but the *default*
# is always this repo's own scripts/curriculum/flashcards/canvas-fonts/ —
# that directory ships in the real repo, so no container-only path
# (/root/.claude/skills/... or similar) is ever needed here.
FONTS = os.path.join(HERE, 'canvas-fonts')
os.environ.setdefault('MONTREE_CANVAS_FONTS', FONTS)

sys.path.insert(0, HERE)
import build_booklets as bb                                       # noqa: E402
from books_def import BOOKS                                        # noqa: E402

SATPIN_PAPERWORK = os.path.join(REPO, 'scripts', 'curriculum', 'satpin-paperwork')
sys.path.insert(0, SATPIN_PAPERWORK)
import stroke_font as sf                                           # noqa: E402

# ---- reused, untouched, from build_booklets --------------------------------
PW, PH, M = bb.PW, bb.PH, bb.M
INK, RED, GREY, FAINT = bb.INK, bb.RED, bb.GREY, bb.FAINT
fit = bb.fit
draw_tracked = bb.draw_tracked
folio = bb.folio
page_words = bb.page_words
page_halftitle = bb.page_halftitle
page_back = bb.page_back
page_blank = bb.page_blank
page_cover = bb.page_cover
make_art_page = bb.make_art_page

# ---- new geometry, all derived from the same M / PW / PH constants --------
TRACE_U    = 10 * mm      # nominal x-height of the traced guide word (A5
                          # page, so smaller than build_tracing.py's 12.5mm
                          # A4-landscape workbook — see report deviation #1).
                          # This is a ceiling, not a fixed value: see
                          # compute_trace_u() below for the auto-shrink rule.
TRACE_TRACK = 0.12        # same letter-tracking build_tracing.py's trace
                          # pages use
TRACE_GAP  = 6 * mm       # air between the two guide rows
ROW1_BASE  = 78 * mm      # baseline of the traced row (fixed across all
                          # trace pages of a book for a steady register down
                          # the book)
LABEL_GAP  = 6 * mm       # 'TRACE IT' label above row 1's headline


def target_word(book):
    """The book's hero word, lowercase, from book['new'] ('Sat  ·  at' -> 'sat').
    Falls back to 'sat' if 'new' is missing/empty, but every sat-cast book in
    books_def.py carries a 'new' field so this should always resolve."""
    raw = (book.get('new') or '').split('·')[0]
    word = raw.strip().lower()
    return word or 'sat'


def compute_trace_u(word):
    """The traced guide word is normally drawn at TRACE_U (10mm) x-height,
    but longer target words than 'sat' (e.g. 'spat', 'chased', 'toothbrush'
    on letter T's companion book) can overflow the A5 guide row's usable
    width (PW - 2*M). Shrink the x-height just enough to fit, measured with
    stroke_font's own text_width() (the exact metric draw_traced() uses) so
    the shrink matches the glyphs pixel-for-pixel — never guessed. A small
    2% safety margin keeps the traced strokes off the guide's end caps.
    Both guide rows (traced + empty) always use this same returned height,
    so the three-line school-paper geometry (headline/midline/baseline)
    stays proportionally identical between the two rows."""
    guide_w = (PW - M) - M
    w = sf.text_width(word, TRACE_U, TRACE_TRACK)
    if w <= guide_w:
        return TRACE_U
    return TRACE_U * (guide_w / w) * 0.98


def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid
    baseline — same shape as satpin-paperwork/build_tracing.py's guidelines(),
    reusing build_booklets' INK (this file draws no new colors)."""
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(*INK)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


def draw_guide_row(c, base, u, word=None):
    x0, x1 = M, PW - M
    guidelines(c, x0, x1, base, u)
    if word:
        w = sf.text_width(word, u, TRACE_TRACK)
        sf.draw_traced(c, word, PW / 2 - w / 2, base, u,
                       tracking=TRACE_TRACK, arrows=True)


def make_trace_page(spec, word, u, row1_base, row2_base, celebration=None):
    """Mirrors make_text_page()'s narration placement exactly (same PH*0.68
    / PH*0.55 split on whether the ORIGINAL spread carried both nar+text),
    then adds the traced + empty guide rows below. `u`, `row1_base` and
    `row2_base` are computed once per book (see build_trace_booklet) so both
    rows share the same auto-shrunk x-height and consistent geometry."""
    def _p(c, book):
        nar_text = celebration or spec.get('nar')
        if nar_text:
            has_text_orig = spec.get('text') is not None
            nsize = 34 if has_text_orig else 48
            nsize = min(fit(c, nar_text, 'Nar', nsize, PW - 2 * M), nsize)
            c.setFont('Nar', nsize)
            c.setFillColorRGB(*GREY)
            y_nar = PH * 0.68 if has_text_orig else PH * 0.55
            c.drawCentredString(PW / 2, y_nar, nar_text)
        draw_tracked(c, PW / 2, row1_base + 2 * u + LABEL_GAP,
                    'T R A C E   I T', 'Label', 8, 0.3, GREY)
        draw_guide_row(c, row1_base, u, word)
        draw_guide_row(c, row2_base, u, None)
    return _p


def right_tracked(c, x, y, text, font, size, tracking, color):
    """Right-aligned tracked text — build_booklets.draw_tracked only centers,
    so this is the one small new helper this file adds (no new font/color)."""
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = x - total
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def page_trace_cover(c, book):
    """Same page_cover() art/title/band untouched, plus a small TRACE badge
    in the top margin strip (never competes with page_cover's centred
    content) and a 'written by ___' line in the gap page_cover already
    leaves around its red dot."""
    page_cover(c, book)
    right_tracked(c, PW - M, PH - 7 * mm, 'TRACE  &  WRITE', 'LabelB', 7.5,
                 0.18, RED)
    c.setFont('Label', 8)
    c.setFillColorRGB(*GREY)
    label = 'written by'
    lw = c.stringWidth(label, 'Label', 8)
    ly = M + 19 * mm
    c.drawString(M + 6 * mm, ly, label)
    lx0 = M + 6 * mm + lw + 3 * mm
    lx1 = PW - M - 6 * mm
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(0.7)
    c.setDash()
    c.line(lx0, ly - 1 * mm, lx1, ly - 1 * mm)


def missing_art(book):
    """Pre-flight sanity check, mirroring _build_one.py's check verbatim:
    art paths are used exactly as stored in books_def.py — relative paths
    (e.g. the-sat's 'tiles/SAT-p1.png') resolve against the process cwd,
    absolute paths (the-spat, the-pat, ... via the .../phonics-images/...
    vars in books_def.py) resolve as-is. No HERE/REPO joining is done here,
    same as the reader build — main() below chdir()s to HERE before calling
    this so the cwd assumption matches the reader build's real-world usage
    (run from inside scripts/curriculum/flashcards/, where the repo's real,
    non-symlink tiles/ folder lives). Returns the list of missing paths (or
    an empty list) instead of exiting, so callers can report a clean
    per-book failure and keep going."""
    missing = []
    if not os.path.exists(book['cover']):
        missing.append(book['cover'])
    for sp in book['spreads']:
        if sp.get('art') and not os.path.exists(sp['art']):
            missing.append(sp['art'])
    return missing


def build_trace_booklet(book, outdir):
    missing = missing_art(book)
    if missing:
        raise RuntimeError(
            'missing art for %r:\n  %s' % (book['slug'], '\n  '.join(missing)))

    os.makedirs(outdir, exist_ok=True)
    word = target_word(book)
    u = compute_trace_u(word)
    row1_base = ROW1_BASE
    row2_base = row1_base - (3 * u + TRACE_GAP)
    spreads = book['spreads']
    n = len(spreads)

    pages = [(page_trace_cover, False), (page_words, False),
             (page_halftitle, False)]
    for i, sp in enumerate(spreads):
        celebration = ('I can write %s!' % word) if i == n - 1 else None
        pages.append((make_trace_page(sp, word, u, row1_base, row2_base,
                                       celebration=celebration), True))
        pages.append((make_art_page(sp['art']), True))
    T = -(-(len(pages) + 1) // 4) * 4
    while len(pages) < T - 1:
        pages.append((page_blank, False))
    pages.append((page_back, False))
    N = len(pages)

    reading_path = os.path.join(outdir, '%s-A5-tracing.pdf' % book['slug'])
    c = rl_canvas.Canvas(reading_path, pagesize=(PW, PH))
    for i, (painter, is_story) in enumerate(pages):
        painter(c, book)
        if is_story:
            folio(c, i + 1, left=(i + 1) % 2 == 0)
        c.showPage()
    c.save()

    sheetW, sheetH = landscape(A4)
    print_path = os.path.join(outdir, '%s-A5-tracing-booklet-print.pdf' % book['slug'])
    c = rl_canvas.Canvas(print_path, pagesize=(sheetW, sheetH))
    order = []
    for k in range(N // 2):
        order.append((N - k, k + 1) if k % 2 == 0 else (k + 1, N - k))
    for li, ri in order:
        for idx, xoff in ((li, 0), (ri, sheetW / 2)):
            painter, is_story = pages[idx - 1]
            c.saveState()
            c.translate(xoff + (sheetW / 2 - PW) / 2, (sheetH - PH) / 2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, book)
            if is_story:
                folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        c.line(sheetW / 2, sheetH - 4 * mm, sheetW / 2, sheetH - 9 * mm)
        c.line(sheetW / 2, 4 * mm, sheetW / 2, 9 * mm)
        c.showPage()
    c.save()

    print(book['slug'], N, 'pages,', N // 4, 'sheets, target word =', word)
    print(reading_path)
    print(print_path)
    return reading_path, print_path


def is_sat_cast_letter_book(book):
    """True for every book in the numbered 'the-sat cast' letter-book chain:
    the-sat itself, plus every subsequent letter book (the-spat, the-pit,
    the-pat, the-nap, the-mat, the-sad, the-dig, the-dog, the-cot, the-kit,
    the-egg, the-mud, the-rat, the-hot, the-bug) — 16 books total.

    books_def.py has no single boolean/tag field for "is a sat-cast letter
    book", so this predicate is built from two fields that ARE reliably
    distinct across all of BOOKS:
      - book['booknum'] starts with 'LETTER BOOK' for every letter book.
        the-sat itself is the one exception (its booknum is
        'BOOK THREE OF SIX', not a 'LETTER BOOK...' one) so it is
        special-cased in by slug.
      - book['band'] contains 'companion reader' for the ONE entry whose
        booknum also starts with 'LETTER BOOK' but is explicitly NOT part
        of the chain: 'the-tall' (booknum='LETTER BOOK · TALL',
        band='LETTER T  ·  s a t (companion reader)') — books_def.py's own
        comment says so outright ("NOT part of the-sat cast/numbering
        chain"). Excluding on 'companion reader' filters it out.
    Every other BOOKS entry (snake-in-my-sock, an-apple-for-ant, spat,
    sit-sit-sit, nap-ant-nap) has a plain 'BOOK N OF SIX' booknum and fails
    the 'LETTER BOOK' prefix check outright, so no extra exclusion is
    needed for those.
    """
    if book['slug'] == 'the-sat':
        return True
    booknum = book.get('booknum', '')
    band = book.get('band', '')
    return booknum.startswith('LETTER BOOK') and 'companion reader' not in band


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('slugs', nargs='*',
                     help="one or more book slugs to build (default: the-sat)")
    ap.add_argument('--all', action='store_true',
                     help='build every book in the sat-cast letter-book '
                          'chain (see is_sat_cast_letter_book())')
    ap.add_argument('--out', default=os.path.join(REPO, 'public', 'dark-phonics-books', 'print'),
                     help='output directory (default: <repo>/public/dark-phonics-books/print)')
    a = ap.parse_args()

    # Resolve --out against the caller's cwd BEFORE we chdir(HERE) below.
    out_dir = os.path.abspath(a.out)

    if a.all:
        targets = [b['slug'] for b in BOOKS if is_sat_cast_letter_book(b)]
    elif a.slugs:
        targets = a.slugs
    else:
        targets = ['the-sat']

    # The reader build (_build_one.py / build_booklets.py) resolves each
    # spread's relative art path (e.g. the-sat's 'tiles/SAT-p1.png') against
    # the caller's cwd, with no joining against any script-relative
    # directory. On the real machine that means cwd == this directory,
    # since the repo's actual (non-symlink) tiles/ folder lives right here
    # alongside books_def.py. chdir once, up front, so this driver
    # reproduces that same cwd assumption regardless of where it was
    # invoked from. Absolute art paths (the-spat, the-pat, ... via the
    # .../phonics-images/... vars in books_def.py) are unaffected either
    # way.
    os.chdir(HERE)

    failed = []
    for slug in targets:
        try:
            book = next((b for b in BOOKS if b['slug'] == slug), None)
            if book is None:
                raise ValueError('no book with slug=%r in BOOKS' % slug)
            build_trace_booklet(book, out_dir)
            print('[ok]', slug)
        except Exception as e:
            print('[FAIL] %s: %s' % (slug, e))
            failed.append(slug)

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))

    if failed:
        sys.exit(1)


if __name__ == '__main__':
    main()
