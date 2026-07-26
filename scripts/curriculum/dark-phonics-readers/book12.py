# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT

K = BOOKS_ROOT + '/kit'

BOOK = dict(
    slug='kim-and-the-kit',
    title_lines=['Kim and', 'the Kit'], title_accent='Kit', title_size=44,
    band='WEEK 12  ·  DECODABLE  ·  s a t p i n m d g o c k', booknum='BOOK TWELVE',
    cover=K + '/kim-and-the-kit-p5-kit-on-kim-v1.png',
    new='kit · Kim',
    review=['cot · cat · pot · dog · pig · pad · mat · Sam', 'sat · pat · tap · sap',
            'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Kim sat on the…', text='kit!', size=92,
             art=K + '/kim-and-the-kit-p1-kim-v1.png'),
        dict(nar='Sam sat on the…', text='kit!', size=92,
             art=K + '/kim-and-the-kit-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='kit!', size=92,
             art=K + '/kim-and-the-kit-p3-cat-v1.png'),
        dict(nar='The dog sat on the…', text='kit!', size=92,
             art=K + '/kim-and-the-kit-p4-dog-v1.png'),
        dict(nar='The kit sat on…', text='Kim!', style='drop', size=92,
             art=K + '/kim-and-the-kit-p5-kit-on-kim-v1.png'),
    ],
)

build(BOOK, '/home/claude/w7build/print')
