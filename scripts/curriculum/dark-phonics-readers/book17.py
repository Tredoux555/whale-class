# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/hat'
BOOK = dict(
    slug='in-the-hat',
    title_lines=['In the Hat'], title_accent='Hat', title_size=56,
    band='WEEK 17  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h', booknum='BOOK SEVENTEEN',
    cover=E + '/in-the-hat-p5-hen-v1.png',
    new='hat · hen',
    review=['rug · rat · mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The cat sat in the…', text='hat!', size=92, art=E+'/in-the-hat-p1-cat-v1.png'),
        dict(nar='The dog sat in the…', text='hat!', size=92, art=E+'/in-the-hat-p2-dog-v2.png'),
        dict(nar='Sam sat in the…', text='hat!', size=92, art=E+'/in-the-hat-p3-sam-v2.png'),
        dict(nar='Kim sat in the…', text='hat!', size=92, art=E+'/in-the-hat-p4-kim-v1.png'),
        dict(nar='And out of the hat got a…', text='hen!', style='drop', size=92, art=E+'/in-the-hat-p5-hen-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
