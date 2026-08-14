# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of frog-and-crab Easy
Reader's paperwork rollout (Dark Phonics displayed Lesson 47, r-blends).
Frog-and-crab has no dark-phonics-readers/bookX.py or books_def.py entry of
its own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest, exactly mirroring
dp-the-cat-sat.py's shape (dict(text=..., art=...) per spread, no 'nar'
field). Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-frog-and-crab.json."""
from dpbuild import build

BOOK = dict(
    slug='frog-and-crab',
    spreads=[
        dict(text='A frog.', art='p1.jpg'),
        dict(text='A crab.', art='p2.jpg'),
        dict(text='The frog and the crab.', art='p3.jpg'),
        dict(text='The frog sat on the crab!', art='p4.jpg'),
        dict(text='The crab is mad!', art='p5.jpg'),
    ],
)

build(BOOK)
