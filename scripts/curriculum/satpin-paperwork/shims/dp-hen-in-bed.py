# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of hen-in-bed Easy Reader's
paperwork rollout. hen-in-bed has no dark-phonics-readers/bookX.py or
books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-hen-in-bed.json."""
from dpbuild import build

BOOK = dict(
    slug='hen-in-bed',
    spreads=[
        dict(text='A hen.', art='p1.jpg'),
        dict(text='A big red hen.', art='p2.jpg'),
        dict(text='The hen ran.', art='p3.jpg'),
        dict(text='The hen ran to the bed.', art='p4.jpg'),
        dict(text='A hen in my bed!', art='p5.jpg'),
    ],
)

build(BOOK)
