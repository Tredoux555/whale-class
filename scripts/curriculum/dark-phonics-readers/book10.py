# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT

P = BOOKS_ROOT + '/pot'

BOOK = dict(
    slug='on-the-pot',
    title_lines=['On the', 'Pot'], title_accent='Pot', title_size=56,
    band='WEEK 10  ·  DECODABLE  ·  s a t p i n m d g o', booknum='BOOK TEN',
    cover=P + '/on-the-pot-p5-pot-on-dog-v1.png',
    new='pot · dog',
    review=['pig · pad · mat · Sam', 'sat · pat · tap · sap',
            'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='An octopus sat on the…', text='pot!', size=92,
             art=P + '/on-the-pot-p1-octopus-v1.png'),
        dict(nar='Sam sat on the…', text='pot!', size=92,
             art=P + '/on-the-pot-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='pot!', size=92,
             art=P + '/on-the-pot-p3-cat-v1.png'),
        dict(nar='The dog sat on the…', text='pot!', size=92,
             art=P + '/on-the-pot-p4-dog-v1.png'),
        dict(nar='The pot sat on the…', text='dog!', style='drop', size=92,
             art=P + '/on-the-pot-p5-pot-on-dog-v1.png'),
    ],
)

build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
