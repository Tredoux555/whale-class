# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
Q = BOOKS_ROOT + '/quilt'
BOOK = dict(
    slug='quick-under-the-quilt',
    title_lines=['Quick! Under', 'the Quilt!'], title_accent='Quilt!', title_size=36,
    band='WEEK 27  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v w x y z qu', booknum='BOOK TWENTY-SEVEN',
    cover=Q + '/quick-under-the-quilt-p5-squid-v1.png',
    new='quilt · squid',
    review=['zip · bag · yam · big · box · fox · wig · van · jug · jam · log · run · croc',
            'fan · off · bed · bug · hat · hen · rug · rat · mud · duck · stuck · egg',
            'sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam · sat · sit'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Sam sat on the…', text='quilt!', size=92, art=Q+'/quick-under-the-quilt-p1-sam-v1.png'),
        dict(nar='The cat sat on the…', text='quilt!', size=92, art=Q+'/quick-under-the-quilt-p2-cat-v1.png'),
        dict(nar='The dog sat on the…', text='quilt!', size=92, art=Q+'/quick-under-the-quilt-p3-dog-v1.png'),
        dict(nar='Quick! Get under the…', text='quilt!', size=92, art=Q+'/quick-under-the-quilt-p4-dive-v1.png'),
        dict(nar='And who is under it? A…', text='squid!', style='drop', size=92, art=Q+'/quick-under-the-quilt-p5-squid-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
