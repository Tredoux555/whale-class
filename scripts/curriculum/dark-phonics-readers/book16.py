# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/rug'
BOOK = dict(
    slug='under-the-rug',
    title_lines=['Under', 'the Rug'], title_accent='Rug', title_size=48,
    band='WEEK 16  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r', booknum='BOOK SIXTEEN',
    cover=E + '/under-the-rug-p5-rat-v1.png',
    new='rug · rat · under',
    review=['mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The cat sat on the…', text='rug!', size=92, art=E+'/under-the-rug-p1-cat-v1.png'),
        dict(nar='Sam sat on the…', text='rug!', size=92, art=E+'/under-the-rug-p2-sam-v1.png'),
        dict(nar='The dog sat on the…', text='rug!', size=92, art=E+'/under-the-rug-p3-dog-v2.png'),
        dict(nar='But what is that lump? Look under the…', text='rug!', size=92, art=E+'/under-the-rug-p4-lump-v1.png'),
        dict(nar='It is a very cross…', text='rat!', style='drop', size=92, art=E+'/under-the-rug-p5-rat-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
