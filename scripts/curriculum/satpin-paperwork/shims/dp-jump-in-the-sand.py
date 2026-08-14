# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of jump-in-the-sand Easy
Reader's paperwork rollout. Jump-in-the-sand has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-jump-in-the-sand.json."""
from dpbuild import build

BOOK = dict(
    slug='jump-in-the-sand',
    spreads=[
        dict(text='Jump!', art='p1.jpg'),
        dict(text='Jump in the sand.', art='p2.jpg'),
        dict(text='Jump, jump, jump!', art='p3.jpg'),
        dict(text='A big jump in the sand.', art='p4.jpg'),
        dict(text='Sand on the pup!', art='p5.jpg'),
    ],
)

build(BOOK)
