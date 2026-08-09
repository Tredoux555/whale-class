# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/mud'
BOOK = dict(
    slug='stuck-in-the-mud',
    title_lines=['Stuck in', 'the Mud'], title_accent='Mud', title_size=44,
    band='WEEK 15  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u', booknum='BOOK FIFTEEN',
    cover=E + '/stuck-in-the-mud-p5-stuck-v1.png',
    new='duck · mud · stuck',
    review=['egg · sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='In the mud sat a…', text='duck!', size=92, art=E+'/stuck-in-the-mud-p1-duck-v1.png'),
        dict(nar='Sam sat in the…', text='mud!', size=92, art=E+'/stuck-in-the-mud-p2-sam-v1.png'),
        dict(nar='The cat sat in the…', text='mud!', size=92, art=E+'/stuck-in-the-mud-p3-cat-v1.png'),
        dict(nar='In the mud, the dog can…', text='dig!', size=92, art=E+'/stuck-in-the-mud-p4-dog-v1.png'),
        dict(nar='And now Sam is…', text='stuck!', style='drop', size=92, art=E+'/stuck-in-the-mud-p5-stuck-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
