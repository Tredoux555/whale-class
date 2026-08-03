# -*- coding: utf-8 -*-
"""Data-only shim exposing this book's spreads[] for build_tracing.py's
bookScript loader. Adapted 2026-08-03 as the letter P dark-phonics book,
replacing the retired pig-ate-a-pineapple. Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-the-spat.json."""
from dpbuild import build

BOOK = dict(
    slug='the-spat',
    spreads=[
        dict(text='The penguin spat!', art='p2-penguin.png'),
        dict(text='The pig spat!', art='p3-pig.png'),
        dict(text='The pelican spat!', art='p4-pelican.png'),
        dict(text='The potato spat!', art='p6-potato.png'),
    ],
)

build(BOOK)
