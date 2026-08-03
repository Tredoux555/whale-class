# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Added 2026-08-03 as letter book three, "The ___ Sat in
the Pit!" (letter I, short i). Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-pit.json."""
from dpbuild import build

BOOK = dict(
    slug='the-pit',
    spreads=[
        dict(text='The ant sat in the pit!', art='p2-ant.png'),
        dict(text='The snake sat in the pit!', art='p6-snake.png'),
        dict(text='The cat sat in the pit!', art='p7-cat.png'),
        dict(text='The potato sat in the pit!', art='p9-potato.png'),
    ],
)

build(BOOK)
