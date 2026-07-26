# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT

S = BOOKS_ROOT + '/sock'

BOOK = dict(
    slug='the-dog-ate-the-sock',
    title_lines=['The Dog Ate', 'the Sock'], title_accent='Sock', title_size=38,
    band='WEEK 13  ·  DECODABLE  ·  s a t p i n m d g o c k ck', booknum='BOOK THIRTEEN',
    cover=S + '/the-dog-ate-the-sock-p5-dog-sick-v1.png',
    new='sock · sick',
    review=['kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit',
            'an · ant · in · nap · pan · tin · nip · snap'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='A duck sat on the…', text='sock!', size=92,
             art=S + '/the-dog-ate-the-sock-p1-duck-v1.png'),
        dict(nar='Sam sat on the…', text='sock!', size=92,
             art=S + '/the-dog-ate-the-sock-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='sock!', size=92,
             art=S + '/the-dog-ate-the-sock-p3-cat-v1.png'),
        dict(nar='The dog ate the…', text='sock!', size=92,
             art=S + '/the-dog-ate-the-sock-p4-dog-ate-v1.png'),
        dict(nar='And now the dog is…', text='sick!', style='drop', size=92,
             art=S + '/the-dog-ate-the-sock-p5-dog-sick-v1.png'),
    ],
)

build(BOOK, '/home/claude/w7build/print')
