# -*- coding: utf-8 -*-
"""Week 7 — locked template, no potato, words page moved to the BACK."""
import sys, os
sys.path.insert(0, '/mnt/user-data/uploads/montree/scripts/curriculum/flashcards')
import build_booklets as bb
from build_booklets import (draw_tracked, make_text_page, make_art_page, page_blank,
                            page_cover, page_words, page_halftitle, folio,
                            PW, PH, M, INK, RED, GREY, FAINT, mm)
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas as rl_canvas

M7 = '/mnt/user-data/uploads/montree/phonics-images/satpin-v2/books/monkey'


def page_back(c, book):
    draw_tracked(c, PW/2, PH*0.60, 'D A R K   P H O N I C S', 'Label', 9, 0.3, GREY)
    c.setFont('Nar', 11); c.setFillColorRGB(*INK)
    c.drawCentredString(PW/2, PH*0.60-9*mm, 'decodable readers')
    c.setFont('Label', 8); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, PH*0.60-17*mm, book['booknum'])
    c.setFont('Nar', 9.5); c.setFillColorRGB(*GREY)
    c.drawCentredString(PW/2, M+18*mm, 'One sound. Five sentences. One new word to read.')
    c.setFont('Label', 7.5); c.setFillColorRGB(*FAINT)
    c.drawCentredString(PW/2, M+11*mm, 'teacherpotato.xyz')


def build_words_at_back(book, outdir):
    os.makedirs(outdir, exist_ok=True)
    pages = [(page_cover, False), (page_halftitle, False)]
    for sp in book['spreads']:
        pages.append((make_text_page(sp) if sp.get('text') or sp.get('nar') else page_blank, True))
        pages.append((make_art_page(sp['art']), True))
    # back matter: word list, then back cover
    tail = [(page_words, False), (page_back, False)]
    T = -(-(len(pages) + len(tail)) // 4) * 4
    while len(pages) < T - len(tail):
        pages.append((page_blank, False))
    pages += tail
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
    for li, ri in order:
        for idx, xoff in ((li, 0), (ri, sheetW/2)):
            painter, is_story = pages[idx-1]
            c.saveState(); c.translate(xoff + (sheetW/2-PW)/2, (sheetH-PH)/2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, book)
            if is_story: folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0.8, 0.8, 0.8); c.setLineWidth(0.3)
        c.line(sheetW/2, sheetH-4*mm, sheetW/2, sheetH-9*mm)
        c.line(sheetW/2, 4*mm, sheetW/2, 9*mm)
        c.showPage()
    c.save()
    print(book['slug'], N, 'pages,', N//4, 'sheets')


BOOK7 = dict(
    slug='sam-and-the-monkey',
    title_lines=['Sam and', 'the Monkey'], title_accent='Monkey', title_size=40,
    band='WEEK 7  ·  DECODABLE  ·  s a t p i n m', booknum='BOOK SEVEN',
    cover=M7 + '/sam-and-the-monkey-p4-monkey-sits-on-sam.png',
    new='mat  ·  Sam',
    review=['sat · pat · tap · sap', 'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='A monkey sat on the…', text='mat!', size=92, art=M7+'/sam-and-the-monkey-p1-monkey-on-mat.png'),
        dict(nar='Sam sat on the…', text='mat!', size=92, art=M7+'/sam-and-the-monkey-p2-sam-on-mat.png'),
        dict(nar='The cat sat on the…', text='mat!', size=92, art=M7+'/sam-and-the-monkey-p3-cat-on-mat.png'),
        dict(nar='The monkey sat on…', text='Sam!', style='drop', size=92, art=M7+'/sam-and-the-monkey-p4-monkey-sits-on-sam.png'),
    ],
)

build_words_at_back(BOOK7, '/home/claude/w7build/print')
