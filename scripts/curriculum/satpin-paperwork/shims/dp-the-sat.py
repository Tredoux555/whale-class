# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-08 as part of the 13-book the-sat cast
paperwork rollout. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-sat.json."""
from dpbuild import build

BOOK = dict(
    slug='the-sat',
    spreads=[
        dict(text='The ant sat!', art='sat-p1.png'),
        dict(text='The snake sat!', art='sat-p2.png'),
        dict(text='The star sat!', art='sat-p5.png'),
        dict(text='The cat sat!', art='sat-p6.png'),
    ],
)

build(BOOK)
