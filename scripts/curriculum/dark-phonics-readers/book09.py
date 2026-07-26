# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT

P = BOOKS_ROOT + '/pig'

BOOK = dict(
    slug='the-goat-and-the-pig',
    title_lines=['The Goat', 'and the Pig'], title_accent='Pig', title_size=40,
    band='WEEK 9  ·  DECODABLE  ·  s a t p i n m d g', booknum='BOOK NINE',
    cover=P + '/the-goat-and-the-pig-p5-bank-on-sam-v1.png',
    new='pig',
    review=['pad · mat · Sam', 'sat · pat · tap · sap',
            'sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='A goat sat on the…', text='pig!', size=92,
             art=P + '/the-goat-and-the-pig-p1-goat-on-bank-v1.png'),
        dict(nar='Sam sat on the…', text='pig!', size=92,
             art=P + '/the-goat-and-the-pig-p2-sam-on-bank-v1.png'),
        dict(nar='The cat sat on the…', text='pig!', size=92,
             art=P + '/the-goat-and-the-pig-p3-cat-on-bank-v1.png'),
        dict(nar='The dog sat on the…', text='pig!', size=92,
             art=P + '/the-goat-and-the-pig-p4-dog-on-bank-v1.png'),
        dict(nar='The pig sat on…', text='Sam!', style='drop', size=92,
             art=P + '/the-goat-and-the-pig-p5-bank-on-sam-v1.png'),
    ],
)

build(BOOK, '/home/claude/w7build/print')
