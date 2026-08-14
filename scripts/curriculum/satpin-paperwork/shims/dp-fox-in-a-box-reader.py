# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of the fox-in-a-box Easy
Reader's paperwork rollout. fox-in-a-box has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Named dp-fox-in-a-box-reader.py (not dp-fox-in-a-box.py)
to avoid colliding with the pre-existing, unrelated dp-fox-in-a-box.py shim
that belongs to a different, retired 3-page pattern-storybook of a similar
name -- see letters/dp-fox-in-a-box-reader.json's _notes.filenameCollision
for the full explanation. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-fox-in-a-box-reader.json."""
from dpbuild import build

BOOK = dict(
    slug='fox-in-a-box',
    spreads=[
        dict(text='A fox.', art='p1.jpg'),
        dict(text='A fox in a box.', art='p2.jpg'),
        dict(text='Six fox in a box!', art='p3.jpg'),
        dict(text='A big fox, a big mix.', art='p4.jpg'),
        dict(text='Fix the box, fox!', art='p5.jpg'),
    ],
)

build(BOOK)
