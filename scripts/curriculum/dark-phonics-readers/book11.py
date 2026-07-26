# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT

C = BOOKS_ROOT + '/cot'

BOOK = dict(
    slug='the-cat-and-the-cot',
    title_lines=['The Cat', 'and the Cot'], title_accent='Cot', title_size=40,
    band='WEEK 11  ·  DECODABLE  ·  s a t p i n m d g o c', booknum='BOOK ELEVEN',
    cover=C + '/the-cat-and-the-cot-p5-cot-on-cat-v1.png',
    new='cot · cat',
    review=['pot · dog · pig · pad · mat · Sam', 'sat · pat · tap · sap',
            'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='A cat sat on the…', text='cot!', size=92,
             art=C + '/the-cat-and-the-cot-p1-cat-v1.png'),
        dict(nar='Sam sat on the…', text='cot!', size=92,
             art=C + '/the-cat-and-the-cot-p2-sam-v1.png'),
        dict(nar='The dog sat on the…', text='cot!', size=92,
             art=C + '/the-cat-and-the-cot-p3-dog-v1.png'),
        dict(nar='The ant sat on the…', text='cot!', size=92,
             art=C + '/the-cat-and-the-cot-p4-ant-v1.png'),
        dict(nar='The cot sat on the…', text='cat!', style='drop', size=92,
             art=C + '/the-cat-and-the-cot-p5-cot-on-cat-v1.png'),
    ],
)

build(BOOK, '/home/claude/w7build/print')
