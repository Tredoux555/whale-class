# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
J = BOOKS_ROOT + '/jug'
BOOK = dict(
    slug='jam-in-the-jug',
    title_lines=['Jam in', 'the Jug'], title_accent='Jug', title_size=44,
    band='WEEK 21  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j', booknum='BOOK TWENTY-ONE',
    cover=J + '/jam-in-the-jug-p5-blueberry-v1.png',
    new='jug · jam',
    review=['log · run · croc · fan · off · bed · bug · hat · hen · rug · rat',
            'mud · duck · stuck · egg · sock · sick · kit · cot · cat · pot · dog · pig',
            'pad · mat · Sam · sat · pat · tap · sap · sit · it · is · pit · sip'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Sam sat on the…', text='jug!', size=92, art=J+'/jam-in-the-jug-p1-sam-v1.png'),
        dict(nar='The cat sat on the…', text='jug!', size=92, art=J+'/jam-in-the-jug-p2-cat-v1.png'),
        dict(nar='The dog sat on the…', text='jug!', size=92, art=J+'/jam-in-the-jug-p3-dog-v2.png'),
        dict(nar='What is in the jug? It is…', text='jam!', size=92, art=J+'/jam-in-the-jug-p4-blueberry-v1.png'),
        dict(nar='Now Sam is stuck in the…', text='jam!', style='drop', size=92, art=J+'/jam-in-the-jug-p5-blueberry-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
