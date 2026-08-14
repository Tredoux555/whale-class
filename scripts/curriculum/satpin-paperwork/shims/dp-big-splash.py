# -*- coding: utf-8 -*-
"""Data-only shim exposing this reader's spreads[] for build_tracing.py's
bookScript loader. Generated 2026-08-14 as part of big-splash Easy Reader's
paperwork rollout (Dark Phonics displayed Lesson 49, triple blends).
Big-splash has no dark-phonics-readers/bookX.py or books_def.py entry of its
own (it is one of the standalone Easy Readers in
easy-readers-manifest-v2.json, not a books_def.py cast book), so this shim
reproduces its 5 page texts directly from that manifest, exactly mirroring
dp-the-cat-sat.py's shape (dict(text=..., art=...) per spread, no 'nar'
field). Keep in sync with
scripts/curriculum/satpin-paperwork/letters/dp-big-splash.json."""
from dpbuild import build

BOOK = dict(
    slug='big-splash',
    spreads=[
        dict(text='Splash!', art='p1.jpg'),
        dict(text='A big splash.', art='p2.jpg'),
        dict(text='Splash in the tub.', art='p3.jpg'),
        dict(text='Splash, splash, splash!', art='p4.jpg'),
        dict(text='The cat is wet!', art='p5.jpg'),
    ],
)

build(BOOK)
