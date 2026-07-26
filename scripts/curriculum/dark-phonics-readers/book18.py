# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/bed'
BOOK = dict(
    slug='the-bug-in-the-bed',
    title_lines=['The Bug in', 'the Bed'], title_accent='Bed', title_size=40,
    band='WEEK 18  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b', booknum='BOOK EIGHTEEN',
    cover=E + '/the-bug-in-the-bed-p5-cover-v1.png',
    new='bed · bug',
    review=['hat · hen · rug · rat · mud · duck · stuck · egg · sock · sick',
            'kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Dad sat on the…', text='bed!', size=92, art=E+'/the-bug-in-the-bed-p1-dad-v1.png'),
        dict(nar='Sam sat on the…', text='bed!', size=92, art=E+'/the-bug-in-the-bed-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='bed!', size=92, art=E+'/the-bug-in-the-bed-p3-cat-v1.png'),
        dict(nar='The dog sat on the…', text='bed!', size=92, art=E+'/the-bug-in-the-bed-p4-dog-v1.png'),
        dict(nar='But who is in the bed? A big…', text='bug!', style='drop', size=92, art=E+'/the-bug-in-the-bed-p5-cover-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
