# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-08 as part of the 13-book the-sat cast
paperwork rollout. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-pat.json."""
from dpbuild import build

BOOK = dict(
    slug='the-pat',
    spreads=[
        dict(text='The ant can pat!', art='p1-ant.png'),
        dict(text='The snake can pat!', art='p5-snake.png'),
        dict(text='The star can pat!', art='p4-star.png'),
        dict(text='The cat can pat!', art='p6-cat.png'),
    ],
)

build(BOOK)
