# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
E = BOOKS_ROOT + '/log'
BOOK = dict(
    slug='it-is-not-a-log',
    title_lines=['It Is Not', 'a Log'], title_accent='Log', title_size=44,
    band='WEEK 20  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l', booknum='BOOK TWENTY',
    cover=E + '/it-is-not-a-log-p5-cover-v2.png',
    new='log · run · croc',
    review=['fan · off · bed · bug · hat · hen · rug · rat · mud · duck · stuck',
            'egg · sock · sick · kit · cot · cat · pot · dog · pig · pad · mat · Sam',
            'sat · pat · tap · sap · sit · it · is · pit · sip · spit'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The dog sat on the…', text='log!', size=92, art=E+'/it-is-not-a-log-p1-dog-v1.png'),
        dict(nar='Sam sat on the…', text='log!', size=92, art=E+'/it-is-not-a-log-p2-sam-v1.png'),
        dict(nar='The cat sat on the…', text='log!', size=92, art=E+'/it-is-not-a-log-p3-cat-v2.png'),
        dict(nar='But the log can…', text='run!', size=92, art=E+'/it-is-not-a-log-p4-bolt-v1.png'),
        dict(nar='It is not a log. It is a…', text='croc!', style='drop', size=92, art=E+'/it-is-not-a-log-p5-cover-v2.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
