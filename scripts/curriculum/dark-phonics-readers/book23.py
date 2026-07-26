# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
W = BOOKS_ROOT + '/wig'
BOOK = dict(
    slug='it-is-not-a-wig',
    title_lines=['It Is Not', 'a Wig'], title_accent='Wig', title_size=44,
    band='WEEK 23  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v w', booknum='BOOK TWENTY-THREE',
    cover=W + '/it-is-not-a-wig-p5-cover-v1.png',
    new='wig',
    review=['van · jug · jam · log · run · croc · fan · off · bed · bug · hat · hen',
            'rug · rat · mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot',
            'dog · pig · pad · mat · Sam · sat · sit · it · is'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The dog sat on the…', text='wig!', size=92, art=W+'/it-is-not-a-wig-p1-dog-v1.png'),
        dict(nar='Sam sat on the…', text='wig!', size=92, art=W+'/it-is-not-a-wig-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='wig!', size=92, art=W+'/it-is-not-a-wig-p3-cat-v1.png'),
        dict(nar='But the wig can…', text='run!', size=92, art=W+'/it-is-not-a-wig-p4-run-v1.png'),
        dict(nar='It is not a wig. It is the…', text='cat!', style='drop', size=92, art=W+'/it-is-not-a-wig-p5-cover-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
