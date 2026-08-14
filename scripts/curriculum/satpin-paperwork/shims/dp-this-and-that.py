# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of this-and-that Easy
Reader's paperwork rollout. This-and-that has no dark-phonics-readers/bookX.py
or books_def.py entry of its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest instead of importing
a book build script. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-this-and-that.json."""
from dpbuild import build

BOOK = dict(
    slug='this-and-that',
    spreads=[
        dict(text='This.', art='p1.jpg'),
        dict(text='That.', art='p2.jpg'),
        dict(text='This is a moth.', art='p3.jpg'),
        dict(text='That is a moth!', art='p4.jpg'),
        dict(text='This, that... moths!', art='p5.jpg'),
    ],
)

build(BOOK)
