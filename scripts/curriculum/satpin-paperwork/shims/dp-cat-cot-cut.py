# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of the cat-cot-cut Easy
Reader's paperwork rollout. cat-cot-cut has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script, exactly mirroring dp-the-cat-sat.py's shape (dict(text=,
art=) per spread, no 'nar' field). Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-cat-cot-cut.json."""
from dpbuild import build

BOOK = dict(
    slug='cat-cot-cut',
    spreads=[
        dict(text='A cat.', art='p1.jpg'),
        dict(text='A cot.', art='p2.jpg'),
        dict(text='A cut.', art='p3.jpg'),
        dict(text='The cat is on the cot.', art='p4.jpg'),
        dict(text='Cat? Cot? Cut!', art='p5.jpg'),
    ],
)

build(BOOK)
