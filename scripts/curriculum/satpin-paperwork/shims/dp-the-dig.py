# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-08 as part of the 13-book the-sat cast
paperwork rollout. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-dig.json."""
from dpbuild import build

BOOK = dict(
    slug='the-dig',
    spreads=[
        dict(text='The ant digs.', art='p1-ant.png'),
        dict(text='The snake digs.', art='p5-snake.png'),
        dict(text='The cat digs.', art='p6-cat.png'),
        dict(text='The potato doesn\'t dig!', art='p8-potato.png'),
    ],
)

build(BOOK)
