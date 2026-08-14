# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of the-bell-fell Easy
Reader's paperwork rollout. The-bell-fell has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-bell-fell.json."""
from dpbuild import build

BOOK = dict(
    slug='the-bell-fell',
    spreads=[
        dict(text='A bell.', art='p1.jpg'),
        dict(text='A bell on a hill.', art='p2.jpg'),
        dict(text='The bell fell!', art='p3.jpg'),
        dict(text='Off the hill it fell.', art='p4.jpg'),
        dict(text='Bonk! Bad bell.', art='p5.jpg'),
    ],
)

build(BOOK)
