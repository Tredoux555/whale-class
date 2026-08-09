# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dpbuild import build, BOOKS_ROOT
Z = BOOKS_ROOT + '/zip'
BOOK = dict(
    slug='zip-it-up',
    title_lines=['Zip It Up'], title_accent='Zip', title_size=56,
    band='WEEK 26  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v w x y z', booknum='BOOK TWENTY-SIX',
    cover=Z + '/zip-it-up-p5-bag-v1.png',
    new='zip · bag',
    review=['yam · big · box · fox · wig · van · jug · jam · log · run · croc · fan · off',
            'bed · bug · hat · hen · rug · rat · mud · duck · stuck · egg · sock · sick',
            'kit · cot · cat · pot · dog · pig · pad · mat · Sam · sat · sit · it · is'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='Sam sat on the…', text='zip!', size=92, art=Z+'/zip-it-up-p1-sam-v1.png'),
        dict(nar='The cat sat on the…', text='zip!', size=92, art=Z+'/zip-it-up-p2-cat-v1.png'),
        dict(nar='The dog sat on the…', text='zip!', size=92, art=Z+'/zip-it-up-p3-dog-v1.png'),
        dict(nar='Kim can…', text='zip!', size=92, art=Z+'/zip-it-up-p4-kim-v1.png'),
        dict(nar='And now they are all in the…', text='bag!', style='drop', size=92, art=Z+'/zip-it-up-p5-bag-v1.png'),
    ],
)
build(BOOK, os.environ.get('MONTREE_BOOK_OUT', '/tmp/work/print'))
