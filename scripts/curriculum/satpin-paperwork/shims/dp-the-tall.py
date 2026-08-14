# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of authoring the-tall's
paperwork config; sentences corrected 2026-08-14 to 'A tall ___!' per the
confirmed text in public/dark-phonics-books/print/the-tall-A5-reading.pdf.
Keep in sync with scripts/curriculum/satpin-paperwork/letters/dp-the-tall.json."""
from dpbuild import build

BOOK = dict(
    slug='the-tall',
    spreads=[
        dict(text='A tall turtle!', art='p1-turtle.png'),
        dict(text='A tall tomato!', art='p2-tomato.png'),
        dict(text='A tall toothbrush!', art='p3-toothbrush.png'),
        dict(text='A tall tiger!', art='p4-tiger.png'),
        dict(text='A tall taxi!', art='p5-taxi.png'),
    ],
)

build(BOOK)
