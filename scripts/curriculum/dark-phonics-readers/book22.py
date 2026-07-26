# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
V = BOOKS_ROOT + '/van'
BOOK = dict(
    slug='the-van-can-not',
    title_lines=['The Van', 'Can Not'], title_accent='Not', title_size=44,
    band='WEEK 22  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v', booknum='BOOK TWENTY-TWO',
    cover=V + '/the-van-can-not-p5-flat-v2.png',
    new='van',
    review=['jug · jam · log · run · croc · fan · off · bed · bug · hat · hen · rug · rat',
            'mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot · dog · pig',
            'pad · mat · Sam · sat · pat · tap · sap · sit · it · is · pit · sip'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Kim sat in the…', text='van!', size=92, art=V+'/the-van-can-not-p1-kim-v2.png'),
        dict(nar='Sam sat in the…', text='van!', size=92, art=V+'/the-van-can-not-p2-sam-v2.png'),
        dict(nar='The cat sat in the…', text='van!', size=92, art=V+'/the-van-can-not-p3-cat-v2.png'),
        dict(nar='The dog sat in the…', text='van!', size=92, art=V+'/the-van-can-not-p4-dog-v2.png'),
        dict(nar='And now the van can…', text='not!', style='drop', size=92, art=V+'/the-van-can-not-p5-flat-v2.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
