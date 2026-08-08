# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-08 as part of the 13-book the-sat cast
paperwork rollout. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-mud.json."""
from dpbuild import build

BOOK = dict(
    slug='the-mud',
    spreads=[
        dict(text='The ant is in the mud.', art='p1-ant.png'),
        dict(text='The snake is in the mud.', art='p5-snake.png'),
        dict(text='The cat is in the mud.', art='p6-cat.png'),
        dict(text='The potato isn\'t in the mud!', art='p8-potato.png'),
    ],
)

build(BOOK)
