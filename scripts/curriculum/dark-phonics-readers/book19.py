# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/fan'
BOOK = dict(
    slug='off-went-the-fan',
    title_lines=['Off Went', 'the Fan'], title_accent='Fan', title_size=44,
    band='WEEK 19  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f', booknum='BOOK NINETEEN',
    cover=E + '/off-went-the-fan-p5-cover-v1.png',
    new='fan · off',
    review=['bed · bug · hat · hen · rug · rat · mud · duck · stuck · egg',
            'sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The pig sat on the…', text='fan!', size=92, art=E+'/off-went-the-fan-p1-pig-v1.png'),
        dict(nar='Sam sat on the…', text='fan!', size=92, art=E+'/off-went-the-fan-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='fan!', size=92, art=E+'/off-went-the-fan-p3-cat-v1.png'),
        dict(nar='Then Kim put the fan…', text='on!', size=92, art=E+'/off-went-the-fan-p4-kim-v1.png'),
        dict(nar='And off went the…', text='fan!', style='drop', size=92, art=E+'/off-went-the-fan-p5-cover-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
