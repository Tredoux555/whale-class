# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/home/claude/w7build')
from dpbuild import build, BOOKS_ROOT
Y = BOOKS_ROOT + '/yam'
BOOK = dict(
    slug='yum-yam',
    title_lines=['Yum, Yam!'], title_accent='Yam!', title_size=56,
    band='WEEK 25  ·  DECODABLE  ·  s a t p i n m d g o c k ck e u r h b f l j v w x y', booknum='BOOK TWENTY-FIVE',
    cover=Y + '/yum-yam-p5-big-v1.png',
    new='yam · big',
    review=['box · fox · wig · van · jug · jam · log · run · croc · fan · off',
            'bed · bug · hat · hen · rug · rat · mud · duck · stuck · egg · sock · sick',
            'kit · cot · cat · pot · dog · pig · pad · mat · Sam · sat · sit · it · is'],
    heart='heart words — a  ·  I  ·  ate',
    oral_note='the teacher reads the grey line — the child reads the big word',
    spreads=[
        dict(nar='The cat sat on the…', text='yam!', size=92, art=Y+'/yum-yam-p1-cat-v1.png'),
        dict(nar='Sam sat on the…', text='yam!', size=92, art=Y+'/yum-yam-p2-sam-v1.png'),
        dict(nar='The dog sat on the…', text='yam!', size=92, art=Y+'/yum-yam-p3-dog-v1.png'),
        dict(nar='The pig ate the…', text='yam!', size=92, art=Y+'/yum-yam-p4-pig-v1.png'),
        dict(nar='And now the pig is very…', text='big!', style='drop', size=92, art=Y+'/yum-yam-p5-big-v1.png'),
    ],
)
build(BOOK, '/home/claude/w7build/print')
