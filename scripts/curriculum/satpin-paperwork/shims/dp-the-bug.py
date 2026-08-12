# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-12 for letter-book fifteen (the-bug).
Keep in sync with scripts/curriculum/satpin-paperwork/letters/dp-the-bug.json."""
from dpbuild import build

BOOK = dict(
    slug='the-bug',
    spreads=[
        dict(text='The ant saw a bug.', art='p1-ant.png'),
        dict(text='The snake saw a bug.', art='p5-snake.png'),
        dict(text='The cat saw a bug.', art='p6-cat.png'),
        dict(text='The bug saw a potato!', art='p8-potato.png'),
    ],
)

build(BOOK)
