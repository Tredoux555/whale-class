# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT

D = BOOKS_ROOT + '/dog'

BOOK = dict(
    slug='dad-and-the-dog',
    title_lines=['Dad and', 'the Dog'], title_accent='Dog', title_size=44,
    band='WEEK 8  ·  DECODABLE  ·  s a t p i n m d', booknum='BOOK EIGHT',
    cover=D + '/dad-and-the-dog-p5-inky-bums-on-mat-v2.png',
    new='pad',
    review=['mat · Sam', 'sat · pat · tap · sap',
            'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='A dog sat on the…', text='pad!', size=92,
             art=D + '/dad-and-the-dog-p1-dog-on-pad-v2.png'),
        dict(nar='Sam sat on the…', text='pad!', size=92,
             art=D + '/dad-and-the-dog-p2-sam-on-pad-v2.png'),
        dict(nar='The cat sat on the…', text='pad!', size=92,
             art=D + '/dad-and-the-dog-p3-cat-on-pad.png'),
        dict(nar='The ant sat on the…', text='pad!', size=92,
             art=D + '/dad-and-the-dog-p4-ant-on-pad.png'),
        dict(nar=['The dog, the cat, the ant', 'and Sam sat on the…'], text='mat!',
             style='drop', size=92,
             art=D + '/dad-and-the-dog-p5-inky-bums-on-mat-v2.png'),
    ],
)

build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
