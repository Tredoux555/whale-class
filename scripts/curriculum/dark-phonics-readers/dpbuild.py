# -*- coding: utf-8 -*-
"""Dark Phonics reader builder — locked 5-sentence template.

Page order (locked 2026-08-26, shared with the sat-cast books):
    cover · [blank] · half-title · (text|art)×N · words · [pad] · back cover

Structure is NOT computed here any more.  build() delegates to
build_booklets.story_pages()/paginate() — the single source of truth — so this
builder, build_booklets.build() and build_tracing_booklet.build_trace_booklet()
all produce the same page count, page order and FACING PAIRS for a given book.

This module used to carry its own copy of that pagination, and that copy
predated the 2026-08-26 fix: it emitted `cover · half-title · text · art · …`,
an EVEN two-page front matter, which puts every text page on an ODD folio.
Folded, a saddle-stitched booklet faces (2,3), (4,5), (6,7)… so every picture
then faced the NEXT spread's word — ant-on-my-apple printed the ALLIGATOR
picture opposite "An anteater on my… apple." One blank between the cover and
the half-title makes the front matter odd and fixes the parity.  Only the
painters (make_text_page below, plus whatever page_cover/page_back a caller
monkeypatches on) are local; never re-implement the page list here.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'flashcards'))
import build_booklets as bb
from build_booklets import (draw_tracked, make_art_page, page_blank, fit,
                            page_cover, page_words, page_halftitle, folio,
                            PW, PH, M, INK, RED, GREY, FAINT, mm)


def make_text_page(spec):
    """Like the house version, but `nar` may be a list of lines."""
    def _p(c, book):
        y_word = PH*0.52
        has_text = spec.get('text') is not None
        nar = spec.get('nar')
        if nar:
            lines = nar if isinstance(nar, list) else [nar]
            nsize = 34 if has_text else 48
            nsize = min(fit(c, max(lines, key=len), 'Nar', nsize, PW-2*M), nsize)
            yy = (PH*0.68 if has_text else PH*0.55) + (len(lines)-1)*nsize*1.30
            c.setFillColorRGB(*INK)
            for ln in lines:
                c.setFont('Nar', nsize)
                c.drawCentredString(PW/2, yy, ln)
                yy -= nsize*1.30
        if not has_text:
            return
        style = spec.get('style', 'normal')
        raw = spec['text'] if isinstance(spec['text'], list) else [spec['text']]
        # Each line is either a plain string (rendered at full size) or a
        # (text, size_mult) tuple -- lets a caller fade repeated-word lines
        # down in a decrescendo (e.g. ('Fast! Fast! Fast!', 1.0),
        # ('Fast! Fast!', 0.75)) without disturbing any existing plain-string
        # caller, which still renders every line at one uniform size.
        tlines = [(t, 1.0) if isinstance(t, str) else t for t in raw]
        texts = [t for t, _ in tlines]
        if style == 'drop':
            # Recap / celebration chants are multi-line, not a single reveal
            # word: their authored `size=` is deliberate and stays.
            base = int(spec.get('size', 54 if max(len(t) for t in texts) > 10 else 72) * 1.25)
            size = min(fit(c, max(texts, key=len), 'Word', base, PW-2*M), base)
        else:
            # Narrative reveal word: ONE shared size band across every book
            # (build_booklets.reveal_size, locked 2026-08-26). The per-spread
            # `size=` is deliberately ignored on these pages.
            size = bb.reveal_size(c, texts)
        yy = y_word + (len(tlines)-1)*size*0.62
        for ln, mult in tlines:
            c.setFont('Word', size*mult)
            c.setFillColorRGB(*(RED if style == 'drop' else INK))
            c.drawCentredString(PW/2, yy, ln)
            yy -= size*1.24
    return _p
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas as rl_canvas

# Default is the Cowork container's staged tree (device_stage_files lands the
# repo's phonics-images/ there). Set MONTREE_BOOKS_ROOT to the repo's own
# phonics-images/satpin-v2/books to build on a Mac instead.
BOOKS_ROOT = os.environ.get(
    'MONTREE_BOOKS_ROOT',
    '/mnt/user-data/uploads/montree/phonics-images/satpin-v2/books')


def page_back(c, book):
    draw_tracked(c, PW/2, PH*0.60, 'M O N T R E E   P H O N I C S', 'Label', 9, 0.3, GREY)
    c.setFont('Nar', 11); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.60-9*mm, 'decodable readers')
    c.setFont('Label', 8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.60-17*mm, book['booknum'])
    c.setFont('Nar', 9.5); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, M+18*mm, 'One sound. Five sentences. One new word to read.')
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+11*mm, 'teacherpotato.xyz')


def build(book, outdir):
    os.makedirs(outdir, exist_ok=True)
    # Structure from build_booklets — see this module's docstring. page_cover /
    # page_back resolve out of THIS module's globals at call time, so a caller
    # that monkeypatches dpbuild.page_cover / dpbuild.page_back (build_a5_readers
    # does exactly that) still wins.
    pages = bb.paginate(bb.story_pages(book, lambda sp, i: make_text_page(sp)),
                        cover=(page_cover, False),
                        halftitle=(page_halftitle, False),
                        words=(page_words, False),
                        back=(page_back, False))
    N = len(pages)

    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-reading.pdf", pagesize=(PW, PH))
    for i, (painter, is_story) in enumerate(pages):
        painter(c, book)
        if is_story: folio(c, i+1, left=(i+1) % 2 == 0)
        c.showPage()
    c.save()

    sheetW, sheetH = landscape(A4)
    c = rl_canvas.Canvas(f"{outdir}/{book['slug']}-A5-booklet-print.pdf", pagesize=(sheetW, sheetH))
    order = []
    for k in range(N//2):
        order.append((N-k, k+1) if k % 2 == 0 else (k+1, N-k))
    for si, (li, ri) in enumerate(order):
        for idx, xoff in ((li, 0), (ri, sheetW/2)):
            painter, is_story = pages[idx-1]
            c.saveState(); c.translate(xoff + (sheetW/2-PW)/2, (sheetH-PH)/2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, book)
            if is_story: folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0); c.setLineWidth(0.3)
        c.line(sheetW/2, sheetH-4*mm, sheetW/2, sheetH-9*mm)
        c.line(sheetW/2, 4*mm, sheetW/2, 9*mm)
        if si == 0: bb.draw_print_note(c)
        c.showPage()
    c.save()
    print(book['slug'], N, 'pages,', N//4, 'sheets')
    return N
