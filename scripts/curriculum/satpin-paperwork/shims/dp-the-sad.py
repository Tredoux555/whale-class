# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-08 as part of the 13-book the-sat cast
paperwork rollout. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-sad.json."""
from dpbuild import build

BOOK = dict(
    slug='the-sad',
    spreads=[
        dict(text='The ant is sad.', art='p1-ant.png'),
        dict(text='The snake is sad.', art='p5-snake.png'),
        dict(text='The cat is sad.', art='p6-cat.png'),
        dict(text='The potato is not sad!', art='p8-potato.png'),
    ],
)

build(BOOK)
