# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/egg'
BOOK = dict(
    slug='get-off-the-egg',
    title_lines=['Get Off', 'the Egg!'], title_accent='Egg!', title_size=48,
    band='WEEK 14  ·  DECODABLE  ·  s a t p i n m d g o c k ck e', booknum='BOOK FOURTEEN',
    cover=E + '/get-off-the-egg-p5-crack-v1.png',
    new='egg',
    review=['sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The duck sat on a big…', text='egg!', size=92, art=E+'/get-off-the-egg-p1-duck-v1.png'),
        dict(nar='Sam sat on the…', text='egg!', size=92, art=E+'/get-off-the-egg-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='egg!', size=92, art=E+'/get-off-the-egg-p3-cat-v1.png'),
        dict(nar='The dog sat on the…', text='egg!', size=92, art=E+'/get-off-the-egg-p4-dog-v2.png'),
        dict(nar='CRACK! Get off the…', text='egg!', style='drop', size=92, art=E+'/get-off-the-egg-p5-crack-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
