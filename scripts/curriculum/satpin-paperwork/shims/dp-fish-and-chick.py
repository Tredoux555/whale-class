# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of fish-and-chick Easy
Reader's paperwork rollout. Fish-and-chick has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-fish-and-chick.json."""
from dpbuild import build

BOOK = dict(
    slug='fish-and-chick',
    spreads=[
        dict(text='A fish.', art='p1.jpg'),
        dict(text='A chick.', art='p2.jpg'),
        dict(text='The fish and the chick.', art='p3.jpg'),
        dict(text='The chick is on the fish!', art='p4.jpg'),
        dict(text='Chip-chip, chick!', art='p5.jpg'),
    ],
)

build(BOOK)
