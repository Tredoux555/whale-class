# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
X = BOOKS_ROOT + '/box'
BOOK = dict(
    slug='what-is-in-the-box',
    title_lines=['What Is in', 'the Box?'], title_accent='Box?', title_size=40,
    band='WEEK 24  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v w x', booknum='BOOK TWENTY-FOUR',
    cover=X + '/what-is-in-the-box-p5-fox-v1.png',
    new='box · fox',
    review=['wig · van · jug · jam · log · run · croc · fan · off · bed · bug · hat · hen',
            'rug · rat · mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot',
            'dog · pig · pad · mat · Sam · sat · sit · it · is'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Kim sat on the…', text='box!', size=92, art=X+'/what-is-in-the-box-p1-kim-v1.png'),
        dict(nar='Sam sat on the…', text='box!', size=92, art=X+'/what-is-in-the-box-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='box!', size=92, art=X+'/what-is-in-the-box-p3-cat-v1.png'),
        dict(nar='The dog sat on the…', text='box!', size=92, art=X+'/what-is-in-the-box-p4-dog-v1.png'),
        dict(nar='And in the box? A…', text='fox!', style='drop', size=92, art=X+'/what-is-in-the-box-p5-fox-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
