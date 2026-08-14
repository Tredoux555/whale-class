# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of the-cat-sat Easy Reader's
paperwork rollout. The-cat-sat has no dark-phonics-readers/bookX.py or
books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-cat-sat.json."""
from dpbuild import build

BOOK = dict(
    slug='the-cat-sat',
    spreads=[
        dict(text='A cat.', art='p1.jpg'),
        dict(text='The cat sat.', art='p2.jpg'),
        dict(text='A cat sat on a cat.', art='p3.jpg'),
        dict(text='A cat on a cat on a cat!', art='p4.jpg'),
        dict(text='Tip-top cats!', art='p5.jpg'),
    ],
)

build(BOOK)
