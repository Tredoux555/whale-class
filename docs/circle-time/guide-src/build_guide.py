# -*- coding: utf-8 -*-
"""Build the Whale Class circle-time guide books.

ONE source of truth: the week page `public/circle-time-week<N>.html`. Everything in
the guide — the five words, the Littles/Bigs frames, every day's script, the song,
the chord diagrams — is lifted out of that page, so a guide can never drift from the
teachers' page.

Design: the "week-2" card layout (the one Tredoux picked). Big day banner, a
right-hand "Today's words / Grab" column, one tinted CARD per segment with a time
pill and an ALL-CAPS title, dark speaker pills, and a song-moment card at the foot
of every day page. Per-day accent colour, measured off circle-guide-week2.pdf:
  Mon #1B6FA8 · Tue #E2563A · Wed #0F8A72 · Thu #B97A0A · Fri #6D4FC4

NUMBERING (renumbered 2026-09-15): there is now ONE week number, the SCHOOL's —
the number on the principal's printed plan, which is what the teachers say out loud.
The year runs Week 3 = I'm Special (Sep 1-5) ... Week 38 = Graduation (Jun 14-18):
36 taught weeks numbered 3-38, matching the "Printed-plan cell" column of
docs/circle-time/YEAR_CALENDAR_2026-27.md. This script TAKES and PRINTS that number
everywhere: `build_guide.py 6` reads public/circle-time-week6.html and writes
circle-guide-week6.html -> public/circle-guide-week6.pdf, whose cover, footers and
HTML <title> (and so the PDF's /Title metadata and the Chrome tab) all say "Week 6".
The old internal 1-36 count is gone from this file; it survives only in the picture
bank (public/circle-time-images/week<n-2>/), which no guide ever reads.

CHANGED 2026-09-15 (match week 2 EXACTLY — four deviations found by that day's audit):
  1. typeface is Liberation Sans, embedded, body AND headings (was Atkinson + Fredoka);
  2. bare "Littles"/"Bigs" opening a clause become badge pills (#1B6FA8 / #6D4FC4);
  3. the daily song card ALWAYS prints the chorus + chords — the FIT auto-sizer's
     hide-the-chorus and collapse-the-card escapes are deleted, and the CHORUS badge
     is week 2's #C2543B, not --coral;
  4. the overview's "N words they'll own by <day>" reads the week's own last TEACHING
     day, so a four-day week (Week 6, Week 28) no longer promises a closed Friday.

NO CHINESE (owner's hard rule, 2026-09-15): these books are printed for FOREIGN
teachers, so NOT ONE Chinese character may reach a guide — no tray name, no label,
no "中文 + English" phrasing. Everything build() emits goes through no_chinese(),
which translates the meaning into English via the CJK_EN table (edit that when a
week brings a new term) and strips anything left, then tidies the sentence. build()
asserts its own output is clean, and check_guides.py re-asserts it on the PDFs. The
decoded doc and the week PAGES keep their Chinese — other consumers read them.

Usage:  python3 build_guide.py [week ...]     # school weeks; default: 5..38
        python3 render_guide.py [week ...]    # then render the HTML to PDF
"""
import re, sys, os
from bs4 import BeautifulSoup, NavigableString, Tag

HERE = os.path.dirname(os.path.abspath(__file__))
# the week pages: repo public/ (…/docs/circle-time/guide-src -> ../../../public)
SRC = os.environ.get("CT_SRC") or os.path.normpath(os.path.join(HERE, "..", "..", "..", "public"))
OUT = os.environ.get("CT_OUT") or HERE

DAYNAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
# Weeks 3 and 4 (the first two of the year) are HAND-BUILT legacy books and are NOT
# generated here — this script covers school weeks 5..38, the 34 templated books.
FIRST_GEN_WEEK, LAST_WEEK = 5, 38

DAY_COLOR = ["#1B6FA8", "#E2563A", "#0F8A72", "#B97A0A", "#6D4FC4"]
DAY_TINT  = ["#EDF4FA", "#FDF0EC", "#EAF6F2", "#FBF3E2", "#F2EFFC"]
WORD_PILL = ["#E2563A", "#B97A0A", "#0F8A72", "#6D4FC4", "#1B6FA8"]


# Per-week standing note for the overview page — the week's own context line
# (holiday, solar term, short week). Carried verbatim from the hand-authored
# guides that preceded this template; a week with no entry simply has no note.
# Written in ENGLISH ONLY (owner's 2026-09-15 rule): solar terms and festivals are
# named in English here rather than left to no_chinese() to translate.
WEEK_NOTES = {
 9: "\U0001F342 Frost's Descent falls on Friday 23 October \u2014 met on Thursday.",
 18: "\u2744 First week back after the winter holiday \u2014 Minor Cold falls on Tuesday 5 January.",
 23: "\U0001F30F First week back after the Chinese New Year holiday \u2014 the Awakening of Insects "
     "falls on Saturday 6 March.",
 24: "\U0001F30A Water on the floor every day \u2014 put the towel down before the children sit down.",
 25: "\u2600 Our teacher's home continent, named out loud every day \u2014 the Spring Equinox falls on "
     "Saturday 20 March, the day after we finish.",
 26: "\U0001F1FF\U0001F1E6 Teacher Tredoux's own country \u2014 family from Newcastle, KwaZulu-Natal. "
     "The Spring Equinox fell on Sunday 21 March, the day before this week begins.",
 27: "\U0001F338 Qingming falls on Monday 5 April \u2014 school is closed and next week is a four-day "
     "week; Friday announces it. The Spring Equinox has just passed, so the standing egg is on the "
     "shelf all week.",
 28: "\U0001FAB9 A FOUR-day week \u2014 the Qingming Festival falls on Monday 5 April, so we run Tuesday "
     "to Friday. Tuesday carries two homes; the song has four verses; Friday is untouched.",
 29: "\U0001F30D The globe comes out on Monday and stays out for the whole of April \u2014 Earth Day is "
     "22 April, in Week 30's window; Friday announces it.",
 30: "\U0001F30D Water on the mat from Tuesday on \u2014 put the towel down before the children sit down. "
     "Grain Rain falls on Tuesday 20 April and Earth Day on Thursday 22 April: one nod each, then "
     "straight back to the landforms.",
 31: "\U0001F30D Our Earth Day week \u2014 Earth Day itself was Thursday 22 April. Last week before the "
     "Labour Day holiday (1\u20135 May); back Thursday 6 May.",
 35: "\U0001F388 Children's Day falls on Tuesday 1 June \u2014 next week; Day 2 flags it so the children "
     "know it is coming.",
 37: "\u2600 The Dragon Boat Festival falls on Wednesday 9 June and Grain in Ear was Saturday 6 June; "
     "the Summer Solstice, the longest day, comes on 21 June, after we have gone. The last full "
     "teaching week \u2014 next week is graduation.",
 38: "\U0001F393 The last week of the year, and the one week that IS the review \u2014 still exactly ONE "
     "taught song: the old choruses come back as a memory game and a finale medley, never as new "
     "material. The Summer Solstice falls on 21 June, in the holiday.",
}

# ---------------------------------------------------------------- inline HTML
KEEP_SPAN = {"g", "kids", "who", "chd", "say", "say2", "vt"}

def inline(node):
    """Week-page inline markup -> guide inline markup (buttons dropped)."""
    out = []
    for c in node.children:
        if isinstance(c, NavigableString):
            out.append(str(c))
        elif isinstance(c, Tag):
            if c.name == "button":
                continue
            if c.name == "br":
                out.append("<br>")
                continue
            inner = inline(c)
            cls = c.get("class", [])
            if c.name in ("b", "strong"):
                out.append(f"<b>{inner}</b>")
            elif c.name in ("i", "em"):
                out.append(f"<i>{inner}</i>")
            elif c.name == "span":
                if "g" in cls:
                    out.append(f'<span class="g">{inner}</span>')
                elif "who" in cls:
                    out.append(f'<span class="who">{inner}</span>')
                elif "chd" in cls:
                    out.append(f'<span class="chd">{inner}</span>')
                elif {"kids", "say", "say2"} & set(cls):
                    out.append(f'<span class="kids">{inner}</span>')
                else:
                    out.append(inner)
            else:
                out.append(inner)
    return "".join(out)

def txt(html):
    return re.sub(r"<[^>]+>", "", html)

def norm(s):
    return re.sub(r"[^a-z0-9]+", "", txt(s).lower())


# ------------------------------------------------------- the NO-CHINESE rule
# HARD RULE (owner, 2026-09-15): the guide BOOKS are printed for FOREIGN
# teachers, so no Chinese character may appear anywhere in a guide — not in a
# tray name, not in a label, not as "中文 + English" phrasing. The decoded doc
# and the week PAGES keep their Chinese (the newsletter and the site read them);
# only the book output is cleaned, here, on its way out of build().
#
# Two layers, deliberately:
#   1. CJK_EN below translates the MEANING into English wherever the Chinese
#      carried information a teacher needs ("秋分" -> "Autumn Equinox",
#      "红" -> "red", a poem -> the poem in English). Edit THIS when a new week
#      introduces a term — that is the "fix the source content" half.
#   2. whatever is left is stripped outright, then the sentence is tidied
#      (spacing, dangling "·"/"+", empty quotes, capitalisation). This is the
#      GUARANTEE: a week nobody has curated still cannot leak a Chinese glyph.
# `no_chinese()` is idempotent, and build() asserts its own output is clean.
CJKR = ("⺀-⻿⼀-⿟　-〿぀-ヿ㇀-㇯"
        "㈀-㋿㌀-㏿㐀-䶿一-鿿豈-﫿"
        "︐-︟︰-﹏＀-￯")
CJK_CHAR = re.compile("[%s]" % CJKR)
CJK_RUN = re.compile("[%s]+" % CJKR)
_TAG = r"(?:</?[a-zA-Z][^>]*>)"
_DEL = "\x02"   # internal marker: a Chinese run was removed outright
_DUP = "\x03"   # internal marker: its English is already standing next to it

CJK_EN = {
 # ---- solar terms, festivals, the calendar words the guides lean on
 "立春": "Spring Begins", "雨水": "Rain Water", "惊蛰": "Awakening of Insects",
 "春分": "Spring Equinox", "清明节": "Qingming Festival", "清明": "Qingming",
 "谷雨": "Grain Rain", "立夏": "Summer Begins", "芒种": "Grain in Ear",
 "夏至": "Summer Solstice", "立秋": "Autumn Begins", "秋分": "Autumn Equinox",
 "寒露": "Cold Dew", "霜降": "Frost's Descent", "立冬": "Winter Begins",
 "小雪": "Minor Snow", "大雪": "Major Snow", "冬至": "Winter Solstice",
 "小寒": "Minor Cold", "大寒": "Great Cold",
 "中秋节": "Mid-Autumn Festival", "中秋": "Mid-Autumn", "国庆节": "National Day",
 "春节": "Chinese New Year", "除夕": "New Year's Eve", "端午节": "Dragon Boat Festival",
 "重阳节": "Double Ninth Festival", "重阳糕": "Double Ninth cake", "老人节": "Seniors' Day",
 "万圣节": "Halloween", "六一儿童节": "Children's Day", "世界地球日": "Earth Day",
 "地球日": "Earth Day", "春分立蛋": "the Spring Equinox egg-standing",
 "数九歌": "Song of the Nine Nines", "羊年": "Year of the Goat",
 # ---- festival things
 "红包": "red envelope", "灯笼": "lantern", "饺子": "dumplings", "饺": "dumpling",
 "糖果": "sweets", "粽子": "rice dumplings", "粽": "rice dumpling", "艾草": "mugwort",
 "冰糖葫芦": "candied hawthorns", "兔儿爷": "Rabbit God figure",
 "圣诞树": "Christmas tree", "圣诞老人": "Father Christmas", "圣诞快乐！": "Merry Christmas!",
 "礼物": "present", "礼": "present", "圣": "Christmas", "舞狮": "lion dance",
 "舞龙": "dragon dance", "舞": "dance", "拜年": "New Year greetings", "拜": "greeting",
 "登高": "climbing high", "踏青": "a spring walk", "菊花": "chrysanthemum", "菊": "chrysanthemum",
 "毕业帽": "graduation cap", "毕业": "graduation", "灯": "lantern", "鼓": "drum",
 "打鼓": "drumming", "咚咚咚": "boom boom boom", "小手合十": "",   # "(小手合十 — hands together, small bow)"
 # ---- greetings / sayings
 "新年快乐": "Happy New Year", "新年好": "Happy New Year", "恭喜发财": "wishing you luck and wealth",
 "万事如意": "may all go well for you", "中秋快乐": "Happy Mid-Autumn",
 "国庆节快乐！": "Happy National Day!", "国庆节快乐": "Happy National Day",
 "六一快乐": "Happy Children's Day", "谢谢你！": "Thank you!", "谢谢": "thank you",
 "谢": "thanks", "请": "please", "你好": "hello", "再见": "goodbye",
 "不客气": "you're welcome", "好": "good", "爱": "love",
 # ---- whole spoken lines
 "独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。":
   "Alone, a stranger in a far-off land, at every festival I miss my family twice as much. "
   "I know my brothers are climbing high today, and one of them is missing.",
 "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。":
   "In spring I sleep past dawn; everywhere I hear the birds. Last night came wind and rain — "
   "how many blossoms fell?",
 "春眠不觉晓，处处闻啼鸟。": "In spring I sleep past dawn; everywhere I hear the birds.",
 "桃花潭水深千尺，不及汪伦送我情。":
   "Peach Blossom Pool is a thousand feet deep, but not as deep as my friend's love as he sees me off.",
 "《洗手歌》搓搓手心，搓搓手背，洗得干干净净。":
   "The Hand-Washing Song — rub your palms, rub the backs of your hands, wash them clean.",
 "霜降到，天气凉；多吃饭，身体壮。":
   "Frost's Descent is here and the weather turns cool; eat well and grow strong.",
 "不觉初秋夜渐长，清风习习重凄凉。":
   "Before you notice it the early-autumn nights grow long, and the fresh wind turns cool again.",
 "好雨知时节，当春乃发生。": "Good rain knows its season; it comes when spring arrives.",
 "春种一粒粟，秋收万颗子。": "Plant one seed in spring, harvest ten thousand grains in autumn.",
 "但愿人长久，千里共婵娟。":
   "May we all live long, and share this same moon a thousand miles apart.",
 "小汽车，嘀嘀嘀，开到东，开到西": "Little car, beep beep beep, drive to the east, drive to the west",
 "一、二！一、二！": "One, two! One, two!",
 "中国在亚洲，老师在非洲。": "China is in Asia; our teacher comes from Africa.",
 "端午节吃粽子，赛龙舟。": "At Dragon Boat Festival we eat rice dumplings and race dragon boats.",
 "天冷了，回家关门": "It is cold — go home and close the door",
 "下雪了，慢慢走，慢慢骑。": "It is snowing — walk slowly, ride slowly.",
 "下雪了，慢慢走。": "It is snowing — walk slowly.",
 "大寒到，天最冷。": "Great Cold is here — the coldest days of the year.",
 "寒露到，露水凉。": "Cold Dew is here — the dew turns cold.",
 "清明去扫墓，也去踏青": "At Qingming we sweep the graves, and we walk in the spring green too",
 "五月五，是端阳。": "The fifth day of the fifth month is the Dragon Boat Festival.",
 "谢谢老师，谢谢朋友": "thank you teacher, thank you friends",
 "老师再见！朋友再见！": "Goodbye teacher! Goodbye friends!",
 "你是我的好朋友。": "You are my good friend.", "你是我妈妈吗？": "Are you my mother?",
 "地球是我们的家": "the Earth is our home", "你的家在哪里": "where is your home",
 "你家有几口人？": "How many people are in your family?", "我的家在北京": "my home is in Beijing",
 "卢沟桥的狮子": "the lions of Marco Polo Bridge", "数不清": "too many to count",
 "一九二九不出手": "in the first and second nine-days, keep your hands in",
 "三九四九冰上走": "in the third and fourth nine-days we walk on the ice",
 "年年有鱼（余）": "fish every year — the word for fish sounds like the word for plenty",
 "蓝色的大海": "the big blue sea", "海水是咸的": "sea water is salty",
 "你也在长大。": "You are growing too.", "你们长大了！": "You have grown up!",
 "我爱地球！": "I love the Earth!", "我会游泳！": "I can swim!", "毕业啦！": "We are graduating!",
 "立春了！": "Spring has begun!", "春天来了！": "Spring is here!", "夏天来了！": "Summer is here!",
 "冬天来了": "winter is here", "秋天到了": "autumn is here", "树叶变黄了。": "The leaves turned yellow.",
 "再见，树！": "Goodbye, tree!", "太阳出来了": "the sun is out", "今天是晴天": "today is sunny",
 "下雨了": "it is raining", "下雪了": "it is snowing", "刮风了": "it is windy",
 "冷不冷": "is it cold", "凉不凉？": "Is it cool?", "凉不凉": "is it cool", "好冷": "so cold",
 "天气很热": "it is very hot", "非洲很热": "Africa is hot", "冰化了": "the ice melted",
 "多喝水": "drink plenty of water", "节约用水": "save water", "节约": "save",
 "垃圾分类": "sorting the rubbish", "可回收物": "recyclable", "厨余垃圾": "food waste",
 "其他垃圾": "other waste", "垃圾桶": "rubbish bin", "垃圾": "rubbish", "回收": "recycle",
 "谷雨种大田": "at Grain Rain we plant the big fields", "芒种忙种": "Grain in Ear is the busy planting time",
 "雨生百谷": "the rain that grows a hundred grains", "小雪腌菜": "at Minor Snow we pickle the vegetables",
 "北方冬至吃饺子": "in the north we eat dumplings at the Winter Solstice",
 "北方立冬吃饺子": "in the north we eat dumplings when winter begins",
 "中国在亚洲": "China is in Asia", "七大洲": "the seven continents", "一人一块": "one piece each",
 "昼夜平分": "day and night in equal halves", "我的家": "my home", "种树": "plant a tree",
 "你想谁": "who do you miss",
 # ---- titles / poets
 "《春晓》": "“Spring Dawn”", "《赠汪伦》": "“To Wang Lun”", "《我爸爸》": "“My Dad”",
 "《我妈妈》": "“My Mum”", "《小小的家》": "“A Little Home”", "《谁的本领大》": "“Who Is Strongest?”",
 "《小汽车》": "“The Little Car”", "《一闪一闪亮晶晶》": "“Twinkle, Twinkle, Little Star”",
 "《小蝌蚪找妈妈》": "“The Tadpole Looks for His Mother”", "《春天来了》": "“Spring Is Here”",
 "《初秋》": "“Early Autumn”", "《赛龙舟》": "“The Dragon Boat Race”",
 "儿歌《端午节》": "the rhyme “Dragon Boat Festival”",
 "《九月九日忆山东兄弟》王维": "“Thinking of My Brothers on the Double Ninth”, by Wang Wei",
 "《我的好妈妈》": "“My Good Mother”", "《洗手歌》": "“The Hand-Washing Song”",
 "杜甫《春夜喜雨》": "Du Fu's “Welcome Rain on a Spring Night”",
 "孟浩然": "Meng Haoran", "李绅": "Li Shen", "李白": "Li Bai", "王维": "Wang Wei",
 "屈原": "Qu Yuan", "嫦娥": "Chang'e", "航天员": "astronauts",
 "童谣": "nursery rhyme", "儿歌": "rhyme",
 # ---- places
 "北京": "Beijing", "长城": "the Great Wall", "四合院": "courtyard house",
 "石狮子": "stone lions", "风车": "pinwheel", "熊猫": "panda", "四川": "Sichuan",
 "中国": "China", "亚洲": "Asia", "非洲": "Africa", "大洲": "continent",
 "太平洋": "the Pacific", "太平": "Pacific", "大西洋": "the Atlantic",
 "印度洋": "the Indian Ocean", "南冰洋": "the Southern Ocean", "北冰洋": "the Arctic Ocean",
 "海洋": "ocean", "南非": "South Africa", "桌山": "Table Mountain", "世界": "world",
 "地球": "Earth", "陆地": "land", "大地": "the land", "地图": "map",
 "国旗": "national flag", "红旗": "red flag", "高山": "high mountain",
 # ---- people, jobs, family
 "医生": "doctor", "医": "doctor", "消防员": "firefighter", "警察": "police officer",
 "警": "police", "司机": "driver", "老师": "teacher", "阿姨": "auntie",
 "妈妈": "mum", "爸爸": "dad", "奶奶": "grandma", "妈": "mum", "爸": "dad",
 "哥哥": "older brother", "姐姐": "older sister", "弟弟": "younger brother",
 "妹妹": "younger sister", "朋友": "friend", "好朋友": "good friend", "人": "person",
 "一个人": "one person", "两个人": "two people", "三个人": "three people",
 "分享": "sharing", "分": "share", "帮": "help", "家": "home", "长大": "growing up",
 # ---- transport
 "火车": "train", "高铁": "high-speed train", "地铁": "subway", "汽车": "car",
 "公交车": "bus", "公交卡": "bus card", "车": "car", "轮": "wheel", "船": "boat",
 "小船": "little boat", "路": "road", "停": "stop", "走": "go", "滴": "beep",
 # ---- weather, nature, seasons
 "多云": "cloudy", "晴天": "sunny day", "晴": "sunny", "下雨": "rain", "雨": "rain",
 "雨伞": "umbrella", "风": "wind", "雪": "snow", "云": "cloud", "太阳": "sun",
 "星星": "stars", "星": "star", "冷": "cold", "热": "hot", "水": "water",
 "火": "fire", "山": "mountain", "河": "river", "海": "sea", "湖": "lake",
 "岛": "island", "池塘": "pond", "池": "pond", "土": "soil", "泥土": "soil",
 "地": "earth", "树": "tree", "叶": "leaf", "枫叶": "maple leaf", "银杏": "ginkgo",
 "花": "flower", "一朵花": "one flower", "一朵": "one flower", "两朵": "two flowers",
 "三朵": "three flowers", "朵": "flower", "根": "root", "种": "seed", "果": "fruit",
 "春": "spring", "夏": "summer", "秋": "autumn", "冬": "winter",
 "春天": "spring", "夏天": "summer", "秋天": "autumn",
 # ---- animals
 "狮子": "lion", "狮": "lion", "大象": "elephant", "象": "elephant", "熊": "bear",
 "斑马": "zebra", "龙": "dragon", "马": "horse", "鱼": "fish", "小鱼": "little fish",
 "鸟": "bird", "鸟窝": "bird's nest", "窝": "nest", "狐狸洞": "fox's den", "洞": "burrow",
 "蜘蛛网": "spider's web", "网": "web", "虫": "insect", "毛毛虫": "caterpillar",
 "蝴蝶": "butterfly", "蝶": "butterfly", "火鸡": "turkey", "羽毛": "feather", "羽": "feather",
 "咩": "baa", "鼻子": "nose", "蛋": "egg", "鸡蛋": "egg",
 # ---- food
 "红薯": "sweet potato", "萝卜": "radish", "土豆": "potato", "玉米": "corn",
 "栗子": "chestnut", "柿子": "persimmon", "西瓜": "watermelon", "毛豆": "edamame",
 "菜": "vegetable", "米": "rice", "奶": "milk", "凉茶": "herbal tea", "绿豆汤": "mung bean soup",
 # ---- house, body, things
 "厨房": "kitchen", "床": "bed", "门": "door", "窗": "window", "墙": "wall",
 "城": "city", "衣": "clothes", "衣服": "clothes", "鞋": "shoe", "穿鞋": "put on shoes",
 "靴子": "boots", "牙": "tooth", "洗": "wash", "心": "heart", "球": "ball",
 "工具": "tools", "旗": "flag", "送": "give", "灯笼": "lantern",
 # ---- colours, sizes, numbers, senses, feelings
 "红色": "red", "红": "red", "黄": "yellow", "蓝": "blue", "黑": "black", "白": "white",
 "圆的": "round", "圆": "round", "大": "big", "高": "tall", "长": "grow",
 "浮": "float", "沉": "sink", "一": "one", "二": "two", "三": "three", "四": "four",
 "五": "five", "六": "six", "七": "seven", "中": "middle", "北": "north", "南": "south",
 "京": "capital", "非": "Africa",
 "视觉": "sight", "听觉": "hearing", "触觉": "touch", "嗅觉": "smell", "味觉": "taste",
 "开心": "happy", "难过": "sad", "生气": "angry", "害怕": "scared", "平静": "calm",
 "情绪角": "calm corner",
 # ---- meta
 "汉字": "Chinese character", "中文": "", "我爸爸！": "My dad!", "挂艾草": "hang mugwort",
 "我": "I", "挂": "hang", "宀": "", "豕": "",   # "a roof 宀 with a pig 豕 underneath" glosses itself
}
_CJK_EN_RE = re.compile("|".join(re.escape(k) for k in sorted(CJK_EN, key=len, reverse=True)))
UNMAPPED = set()          # runs that fell through to the strip (debug: CT_CJK_DEBUG=1)


def _gloss_parens(h):
    """'霜降 (Frost's Descent)' / '<b>开心</b> (happy)' -> the English gloss alone,
    so a translated term is never printed twice."""
    pat = re.compile(r"[%s]+(%s*)[ \t]*\(\s*([^()<>]{1,90}?)\s*\)" % (CJKR, _TAG))
    def f(m):
        gloss = m.group(2)
        if CJK_CHAR.search(gloss):
            return m.group(0)
        run = CJK_RUN.search(m.group(0)).group(0)
        en = CJK_RUN.sub("", _CJK_EN_RE.sub(lambda x: CJK_EN[x.group(0)], run)).strip()
        if en and norm(en) and norm(en) not in norm(gloss):
            return m.group(0)          # a parenthetical that is not this term's meaning
        return gloss + m.group(1)
    prev = None
    while prev != h:
        prev, h = h, pat.sub(f, h)
    return h


_SEP = r"[\s\u00b7:,\-\u2014\u2013/()\u201c\u201d\"'\u2019\u2026]"
# looking BACK, a colon or comma starts something new — "touching each one: 一 · 二"
# must not read as "one" already said. Only a space or a dash counts there.
_SEPB = r"[\s\u2014\u2013(\u201c]"


def _translate(h):
    """Replace every Chinese run with its English meaning. A run whose English
    is ALREADY standing right beside it (the page glosses most terms) becomes a
    _DUP marker instead, so the book never says the same thing twice."""
    out, last = [], 0
    for m in CJK_RUN.finditer(h):
        run = m.group(0)
        en = CJK_RUN.sub("", _CJK_EN_RE.sub(lambda x: CJK_EN[x.group(0)], run)).strip()
        for piece in CJK_RUN.findall(_CJK_EN_RE.sub("", run)):
            UNMAPPED.add(piece)
        mark = ""
        if en:
            after = re.sub(r"\s+", " ", txt(h[m.end():m.end() + len(en) + 45])).lstrip()
            after = re.sub("^" + _SEP + "+", "", after)
            before = re.sub(r"\s+", " ", txt(h[max(0, m.start() - len(en) - 45):m.start()]))
            if after.lower().startswith(en.lower()):
                mark = _DUP                       # "\u5bd2\u9732 \u00b7 Cold Dew" / "\u6c89 sink"
            elif re.search("(?i)\\b" + re.escape(en) + "\\b" + _SEPB + "*$", before) or (
                    " " not in en and len(en) >= 6
                    and en.lower() in [w.lower() for w in
                                       re.findall(r"[A-Za-z'\u2019-]+", before)[-2:]]):
                mark = _DEL                       # "gold ginkgo leaves \u94f6\u674f"
        if not mark and en:
            # the Chinese closed a sentence and the next one starts immediately
            if en[-1] in ".!?" and re.match(r"[A-Za-z\u201c]", h[m.end():m.end() + 1] or " "):
                en += " "
            mark = en
        out.append(h[last:m.start()])
        out.append(mark or _DEL)
        last = m.end()
    out.append(h[last:])
    return "".join(out)


def _tidy_text(s):
    """Make one text node read cleanly once its Chinese is gone. Rules that can
    fire at a node's EDGE are gated on a marker actually sitting there \u2014 a node
    that legitimately ends in " \u00b7 " (the song-card header) must keep it."""
    if _DUP not in s and _DEL not in s:
        return re.sub(r"[ \t]{2,}", " ", s) if "  " in s else s
    # 1. a term whose English follows: drop it AND the gloss separator, and the
    #    appositive comma the gloss no longer needs ("\u8c37\u96e8, Grain Rain, fell" -> "Grain Rain fell")
    s = re.sub(_DUP + r"\s*[\u2014\u2013]\s*([^\u2014\u2013<]{2,30}?)\s*[\u2014\u2013]\s*", r"\1 ", s)
    s = re.sub(_DUP + r"\s*,\s*([^,<:;.!?\u2014\u2013]{2,20}?),\s+"
               r"(?!which|who|and|but|so|then|because|where)", r"\1 ", s)
    s = re.sub(_DUP + r"\s*[,:\u00b7\u2014\u2013]?\s*", "", s)
    # 2. a term with nothing to put in its place
    head = bool(re.match(r"^\s*" + _DEL, s))
    tail = bool(re.search(_DEL + r"\s*$", s))
    s = re.sub(r"(^|[.!?;:\u00b7\u2014\u2013(\u201c]\s*)" + _DEL + r"\s*([a-z])",
               lambda m: m.group(1) + m.group(2).upper(), s)
    if head:
        s = re.sub(r"^\s*" + _DEL + r"\s*[\u00b7+,;:]\s*", "", s)
    if tail:
        s = re.sub(r"[\u00b7+,;:\u2014\u2013]\s*" + _DEL + r"\s*$", "", s)
    s = s.replace(_DEL, "")
    if tail:
        s = s.rstrip()          # "<b>Land \u9646\u5730</b>" must not leave "<b>Land </b>"
    if head:
        s = s.lstrip()
    # 3. spacing and punctuation
    s = re.sub(r"[ \t]{2,}", " ", s)
    s = re.sub(r"\s+(?=[,.;:!?])", "", s)
    s = re.sub(r"([,\u00b7:;\u2014\u2013])\s*\+\s+", r"\1 ", s)   # ", \u4e2d\u6587 + English." -> ", English."
    s = re.sub(r"\s*[\u00b7+]\s*(?=[,.;:!?)\u201d\u2019])", "", s)  # dangling \u00b7 or +
    if tail or head:
        s = re.sub(r"^\s*[\u00b7+]\s*|\s*[\u00b7+]\s*$", "", s)
    s = re.sub(r"\u00b7\s*(?=\u00b7)", "", s)
    s = re.sub(r"([,;:])\s*(?=[,;:.])", "", s)
    s = re.sub(r"\u201c\s*\u201d", "", s)
    s = re.sub(r"\u2018\s*\u2019", "", s)
    s = re.sub(r"\(\s*\)", "", s)
    s = re.sub(r"([(\u201c])\s*[\u2014\u2013\u00b7,;:]\s*", r"\1", s)
    s = re.sub(r"(\d+\s*\u00b7\s*)([a-z])", lambda m: m.group(1) + m.group(2).upper(), s)
    s = re.sub(r"\s+(?=[,.;:!?])", "", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s


def _tidy(h):
    # an inline tag left holding nothing but the marker would split the sentence
    # across two text nodes and hide the artefact from _tidy_text — unwrap it first
    prev = None
    while prev != h:
        prev = h
        for mk in (_DEL, _DUP):
            h = re.sub(r"<(b|i|em|strong)>\s*" + mk + r"\s*</\1>", mk, h)
            h = re.sub(r"<span[^>]*>\s*" + mk + r"\s*</span>", mk, h)
    parts = re.split(r"(<[^>]+>)", h)
    parts[0::2] = [_tidy_text(p) for p in parts[0::2]]
    h = "".join(parts)
    prev = None
    while prev != h:                       # inline tags emptied by the strip
        prev = h
        h = re.sub(r"<(b|i|em|strong)>\s*</\1>", "", h)
        h = re.sub(r'<span class="(?:g|kids|who[^"]*|chd[^"]*|vlabel[^"]*)"[^>]*>\s*</span>', "", h)
    h = re.sub(r"·(\s*(?:%s\s*)+)·" % _TAG, r"\1·", h)     # · <b></b> · across tags
    h = re.sub(r"—{2,}", "—", h)                 # the Chinese double dash
    h = re.sub(r"\brow of Chinese character\b(?!s)", "row of Chinese characters", h)
    h = re.sub(r"[ \t]{2,}", " ", h)
    return h


def no_chinese(h):
    """The one door every scrap of guide-book text goes through."""
    h = _gloss_parens(h)
    h = _translate(h)
    h = _tidy(h)
    h = _tidy(h)                            # a second pass now that tags merged
    h = CJK_RUN.sub("", h).replace(_DEL, "").replace(_DUP, "")
    return h

# ------------------------------------------------------------------- parsing
SEG_ICON = {"hook": "🎁", "teach": "📣", "game": "⚡", "close": "🤫", "song": "🎵"}

def seg_kind(head):
    h = head.lower()
    if "song" in h: return "song"
    if "magic box" in h or "hook" in h: return "hook"
    if h.startswith("teach") or "teach ·" in h: return "teach"
    if h.startswith("game") or "game ·" in h: return "game"
    if h.startswith("close") or "close" in h: return "close"
    return "teach"

def parse_block(b):
    """div.block -> dict(badge, head, kind, body_html)"""
    h3 = b.find("h3")
    badge = h3.find("span", class_="badge") if h3 else None
    btxt = badge.get_text(strip=True) if badge else ""
    if badge:
        badge.extract()
    head = h3.get_text(" ", strip=True) if h3 else ""
    parts = []
    for el in b.children:
        if not isinstance(el, Tag) or el.name in ("h3", "button"):
            continue
        cls = el.get("class", [])
        if el.name == "p" and "tip" in cls:
            parts.append(f'<p class="tip">{inline(el)}</p>')
        elif el.name == "p":
            parts.append(f"<p>{inline(el)}</p>")
        elif el.name == "div" and "t" in cls:
            parts.append(f'<p class="t">{inline(el)}</p>')
        elif el.name == "div" and ("rhyme" in cls or "lyric" in cls):
            ps = "".join(
                f'<p class="{"vt" if "vt" in (p.get("class") or []) else ""}">{inline(p)}</p>'
                for p in el.find_all("p", recursive=False))
            parts.append(f'<div class="rhyme">{ps}</div>')
        elif el.name == "div" and "strum" in cls:
            parts.append(f'<div class="strum">{inline(el)}</div>')
    return dict(badge=btxt, head=head, kind=seg_kind(head), body="".join(parts))

def parse(week):
    path = os.path.join(SRC, f"circle-time-week{week}.html")
    soup = BeautifulSoup(open(path, encoding="utf-8").read(), "html.parser")
    d = {}
    d["title"] = soup.find("h1").get_text(" ", strip=True)
    tl = soup.find("p", class_="theme-line")
    d["dates"] = tl.find("strong").get_text(strip=True)
    d["themeline"] = tl.get_text(" ", strip=True)
    d["chips"] = [c.get_text(strip=True)
                  for c in soup.find("div", class_="glance").find_all("span", class_="chip")]
    d["frames"] = [(f.find("h3").get_text(" ", strip=True), inline(f.find("p")))
                   for f in soup.find("div", class_="frames").find_all("div", class_="frame")]

    days = []
    for n in range(1, 6):
        sec = soup.find(id=f"day{n}")
        head = sec.find("div", class_="day-head")
        h2 = head.find("h2").get_text(" ", strip=True)
        sub = h2.split("·", 1)[1].strip() if "·" in h2 else h2
        words = inline(head.find("p")) if head.find("p") else ""
        grabs, notes = [], []
        for g in sec.find_all("div", class_="grab"):
            h = inline(g)
            t = txt(h).strip()
            (grabs if re.match(r"^(grab|nothing to grab)", t, re.I) else notes).append(h)
        blocks = [parse_block(b) for b in sec.find_all("div", class_="block")]
        # a closed day ("Friday · No class — 中秋节", "There is no circle time today")
        # still gets its own page, but it is not a teaching day: the overview's
        # "…by <day>" promise has to stop at the last day that IS one.
        noclass = bool(re.search(r"no class|no circle time",
                                 f"{h2} {txt(words)} {txt(' '.join(grabs))}", re.I))
        days.append(dict(sub=sub, words=words, grabs=grabs, notes=notes,
                         blocks=blocks, noclass=noclass))
    d["days"] = days

    # ---- songbook (day6) ----
    sec = soup.find(id="day6")
    hd = sec.find("div", class_="day-head")
    d["song_title"] = hd.find("h2").get_text(" ", strip=True)
    d["song_sub"] = hd.find("p").get_text(" ", strip=True) if hd.find("p") else ""
    d["chordnames"] = [c.get_text(strip=True) for c in sec.find_all("div", class_="nm")]
    boxes = []
    for cb in sec.find_all("div", class_="chordbox"):
        nm = cb.find("div", class_="nm")
        svg = cb.find("svg")
        if nm is not None and svg is not None:
            boxes.append((nm.get_text(strip=True), str(svg)))
    d["chordboxes"] = boxes
    strum = sec.find("div", class_="strum")
    d["strum"] = inline(strum) if strum else ""
    d["sblocks"] = [parse_block(b) for b in sec.find_all("div", class_="block")]

    # chorus + per-day verses, for the day song cards
    chorus, verses = [], {}
    ch = sec.find(id="sng-chorus")
    if ch and ch.find("div", class_="lyric"):
        chorus = [inline(p) for p in ch.find("div", class_="lyric").find_all("p", recursive=False)
                  if "vt" not in (p.get("class") or [])]
    vs = sec.find(id="sng-verses")
    if vs and vs.find("div", class_="lyric"):
        cur = None
        for p in vs.find("div", class_="lyric").find_all("p", recursive=False):
            if "vt" in (p.get("class") or []):
                cur = p.get_text(" ", strip=True)
                verses[cur] = []
            elif cur:
                verses[cur].append(inline(p))
    d["chorus"] = chorus
    d["verses"] = verses
    return d

# ----------------------------------------------------------------------- CSS
CSS = r"""
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
/* brand fonts, shipped locally — fonts.googleapis.com is unreachable from the
   build container (Sep 2026 font audit). fonts/ sits beside this HTML.
   TYPEFACE: Liberation Sans (SIL-OFL, Arial-metric) everywhere — body AND
   headings — because that is what circle-guide-week2.pdf, the design the owner
   picked, is set in end to end (pdffonts: LiberationSans Regular/Bold/Italic).
   NO CJK FONT is embedded any more: as of 2026-09-15 no guide contains a Chinese
   character (see no_chinese()), so Noto Sans CJK SC was dropped from the stack.
   Do not reintroduce Fredoka / Atkinson Hyperlegible without his say-so. */
@font-face{font-family:"Liberation Sans";src:url("fonts/LiberationSans-Regular.ttf");font-weight:400;font-style:normal;}
@font-face{font-family:"Liberation Sans";src:url("fonts/LiberationSans-Bold.ttf");font-weight:700;font-style:normal;}
@font-face{font-family:"Liberation Sans";src:url("fonts/LiberationSans-Italic.ttf");font-weight:400;font-style:italic;}
@font-face{font-family:"Liberation Sans";src:url("fonts/LiberationSans-BoldItalic.ttf");font-weight:700;font-style:italic;}
@font-face{font-family:"Noto Color Emoji";src:url("fonts/NotoColorEmoji.ttf");}

:root{
  --navy:#123850; --ink:#1d2b36; --muted:#5b6b7a; --rule:#dde4ea;
  --coral:#E2563A; --gold:#B97A0A; --teal:#0F8A72; --purple:#6D4FC4; --blue:#1B6FA8;
  --chorus:#C2543B;   /* week-2 CHORUS badge/banner — deliberately NOT --coral */
  --day:#1B6FA8; --tint:#EDF4FA;
}
body{ font-family:"Liberation Sans","Noto Color Emoji",Arial,sans-serif;
      color:var(--ink); background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
h1,h2,h3,h4,.dn,.dsub,.seg-t,.tpill,.who,.pill,.eyebrow,.foot-l,.foot-r,.chd,.cv-ct,.cv-th,
.ov-h,.flow-t,.rit-h,.uke-h,.wpill,.vlabel,.nm,.songcard-h{
  font-family:"Liberation Sans","Noto Color Emoji",sans-serif; font-weight:700;
}
.page{ width:210mm; height:297mm; padding:13mm 14mm 13mm 24mm; overflow:hidden; position:relative;
       background:#fff; page-break-after:always; break-after:page; font-size:9.2pt; line-height:1.38; }
.page:last-child{ page-break-after:auto; }

p{ margin:.24em 0; }
b{ color:var(--navy); }
.g{ color:#7a8894; font-style:italic; }
.kids{ color:#C0392B; font-weight:700; }
.t .kids, .seg .t .kids{ color:var(--day); }
.tip{ color:#5f6f7c; font-size:.96em; }
.tip b, .tip i b{ color:#4a5a68; }
.who{ display:inline-block; background:var(--navy); color:#fff; font-size:.74em; letter-spacing:.09em;
      text-transform:uppercase; padding:.16em .62em .2em; border-radius:4px; margin-right:.45em;
      vertical-align:.08em; line-height:1.25; }
.who-littles{ background:var(--blue); } .who-bigs{ background:var(--purple); }
.rhyme{ margin:.3em 0; padding:.05em 0 .05em .8em; border-left:2.6px solid var(--day); }
.rhyme p{ margin:.12em 0; }
.rhyme p.vt{ margin-top:.5em; color:var(--navy); font-weight:700; }
.strum{ background:#f4f6f8; border-radius:6px; padding:.4em .7em; margin:.4em 0; }

/* ---------- running feet ---------- */
.foot-l{ position:absolute; left:24mm; bottom:8mm; font-size:6.6pt; letter-spacing:.1em;
         text-transform:uppercase; color:#9aa8b4; }
.foot-r{ position:absolute; right:14mm; bottom:8mm; font-size:6.6pt; letter-spacing:.12em;
         text-transform:uppercase; color:var(--day); }

/* ---------- cover ---------- */
.cover .inner{ text-align:center; padding-top:22mm; }
.cv-brand{ font-family:"Liberation Sans",sans-serif; font-weight:700; font-size:10pt; letter-spacing:.42em;
           color:var(--blue); }
.cv-ct{ font-size:34pt; color:var(--navy); line-height:1.08; margin-top:6mm; }
.cv-tag{ font-size:11pt; color:var(--muted); font-weight:700; margin-top:3mm; }
.cv-plaque{ display:inline-block; margin:14mm 0 0; padding:6mm 12mm 6.5mm; border-radius:10px;
            background:linear-gradient(180deg,#E9603F,#E2563A); color:#fff;
            box-shadow:0 5px 0 #F2B33C; }
.cv-th{ font-size:20pt; line-height:1.22; }
.cv-week{ margin-top:9mm; font-family:"Liberation Sans",sans-serif; font-weight:700; font-size:15pt; color:var(--navy); }
.cv-week span{ color:var(--coral); }
.cv-dates{ margin-top:1.5mm; font-size:10.5pt; color:var(--muted); }
.cv-pills{ margin-top:6mm; }
.pill{ display:inline-block; color:#fff; font-size:8.4pt; padding:.34em 1em .4em; border-radius:999px; margin:0 1.4mm; }
.cv-whales{ margin-top:9mm; font-size:17pt; letter-spacing:.25em; }

/* ---------- overview ---------- */
.ov-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:6mm; }
.ov-h{ font-size:19pt; color:var(--navy); }
.ov-note{ font-size:7.6pt; color:var(--muted); text-align:right; letter-spacing:.05em; }
.ov-rule{ height:2.4px; background:var(--blue); border-radius:2px; margin:2mm 0 4mm; }
.wordrow{ display:flex; align-items:center; flex-wrap:wrap; gap:2.4mm; margin-bottom:4mm; }
.wordrow .lbl{ font-size:8pt; color:var(--muted); font-weight:700; margin-right:1mm; }
.wpill{ color:#fff; font-size:12pt; padding:.2em .82em .3em; border-radius:999px; }
.tiers{ display:flex; gap:4.5mm; }
.tier{ flex:1 1 0; border-radius:9px; padding:3.4mm 4mm; }
.tier.l{ background:#EDF4FA; border:1px solid #CFE2F0; }
.tier.b{ background:#FDF0EC; border:1px solid #F6D3C8; }
.tier h4{ margin:0 0 1.2mm; font-size:11pt; color:var(--navy); }
.tier h4 small{ font-size:7.6pt; color:var(--muted); font-weight:400; }
.tier p{ margin:0; }
.tier p{ line-height:1.75; }
.tier .kids{ display:inline-block; background:#fff; border:1px solid #d7e0e8; color:var(--navy);
             border-radius:5px; padding:.1em .5em .16em; margin:.35mm .5mm; font-size:.97em; }
.ovnote{ background:#FDF6E3; border:1px solid #EFDFB4; border-radius:8px; padding:2mm 3mm;
          margin:0 0 3.4mm; font-size:.98em; }
.glance{ margin:4mm 0 4.5mm; }
.glance-h{ font-family:"Liberation Sans",sans-serif; font-weight:700; font-size:9.6pt; color:var(--navy);
           letter-spacing:.03em; margin-bottom:1.4mm; }
table.gl{ border-collapse:collapse; width:100%; }
table.gl td{ padding:.28em .5em .3em 0; vertical-align:top; border-top:1px solid var(--rule); }
table.gl tr:first-child td{ border-top:none; }
table.gl td.d{ width:17mm; font-family:"Liberation Sans",sans-serif; font-weight:700; font-size:.94em;
               letter-spacing:.06em; text-transform:uppercase; }
table.gl td.s{ width:44mm; color:var(--navy); font-weight:700; }
table.gl td.x{ color:#5f6f7c; }
.flow{ display:flex; align-items:stretch; gap:0; margin:4.5mm 0; }
.flow-step{ flex:1 1 0; background:var(--navy); color:#fff; border-radius:8px; padding:2.4mm 2.6mm; }
.flow-step .m{ display:block; font-size:7.2pt; color:#9ec7e2; letter-spacing:.08em; }
.flow-t{ font-size:8.6pt; line-height:1.22; display:block; }
.flow-arrow{ flex:0 0 5mm; align-self:center; text-align:center; color:#9aa8b4; font-size:9pt; }
.rituals{ background:#FDF6E3; border:1px solid #EFDFB4; border-radius:9px; padding:3.4mm 4mm; margin-bottom:4.5mm; }
.rit-h{ font-size:12pt; color:var(--navy); margin:0 0 2mm; }
.rit-cols{ display:flex; gap:5mm; }
.rit-cols > div{ flex:1 1 0; }
.rituals p{ margin:0 0 1.9mm; }
.rituals p b{ color:var(--coral); }
.uke{ background:var(--navy); color:#fff; border-radius:10px; padding:4mm 4.5mm; display:flex; gap:5mm; align-items:center; }
.uke .grid{ display:flex; gap:5mm; flex:1 1 auto; }
.uke .cbox{ text-align:center; }
.uke .nm{ font-size:10.5pt; margin-top:1mm; }
.uke svg{ display:block; }
.uke svg .st{ stroke:#8fa5b6; stroke-width:1.4; fill:none; }
.uke svg .nut{ stroke:#fff; stroke-width:4; fill:none; }
.uke svg .dot{ fill:#F2B33C; }
.uke svg .fn{ fill:var(--navy); font:700 11px "Liberation Sans", Arial, sans-serif; }
.uke svg text{ fill:#cfe0ec !important; }
.uke svg text.fn{ fill:var(--navy) !important; }
.uke-side{ flex:0 0 46mm; }
.uke-h{ font-size:11.5pt; margin:0 0 1.4mm; }
.uke-side p{ margin:0 0 1.4mm; font-size:8.1pt; color:#d5e2ec; }
.uke-side b{ color:#fff; }

/* ---------- day pages ---------- */
.dhead{ display:flex; align-items:flex-start; justify-content:space-between; gap:6mm; }
.eyebrow{ font-size:7.2pt; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
.dn{ font-size:26pt; line-height:1.02; color:var(--day); margin-top:.4mm; }
.dsub{ font-size:12.5pt; color:var(--navy); margin-top:.6mm; }
.dh-r{ flex:0 0 62mm; text-align:right; font-size:7.9pt; color:var(--muted); padding-top:2mm; }
.dh-r .lbl{ color:var(--muted); }
.dh-r b{ color:var(--day); }
.dh-r .gr{ margin-top:.9mm; }
.drule{ height:2.6px; background:var(--day); border-radius:2px; margin:1.9mm 0 2.4mm; }
.daynote{ background:#FDF6E3; border:1px solid #EFDFB4; border-radius:7px; padding:1.7mm 2.6mm; margin-bottom:1.9mm; }
.seg{ background:var(--tint); border-left:3.4px solid var(--day); border-radius:0 8px 8px 0;
      padding:.46em .9em .5em; margin-bottom:.5em; }
.seg-h{ margin-bottom:.2em; }
.tpill{ display:inline-block; background:var(--day); color:#fff; font-size:7.4pt; letter-spacing:.06em;
        padding:.2em .72em .26em; border-radius:5px; margin-right:2.2mm; vertical-align:.12em; }
.seg-t{ font-size:10.5pt; letter-spacing:.02em; text-transform:uppercase; color:var(--navy); }
.seg p:first-of-type{ margin-top:.1em; }
/* the song card scales WITH the page (em, not pt): on a dense day a fixed-size
   card would sit visibly larger than the script it caps, which week 2 never does. */
.songcard{ background:#F3F8FC; border:1px solid #CFE2F0; border-radius:9px; padding:.5em .9em .55em; margin-top:.6em; }
.songcard-h{ font-size:1em; color:var(--blue); letter-spacing:.05em; text-transform:uppercase; margin-bottom:.8mm; }
.songcard-h .nm2{ color:var(--navy); }
.songcard-h .rest{ font-family:"Liberation Sans",sans-serif; font-weight:400; text-transform:none;
                   letter-spacing:0; color:var(--muted); font-size:.87em; }
.vlabel{ display:inline-block; background:var(--blue); color:#fff; font-size:.78em; letter-spacing:.09em;
         text-transform:uppercase; padding:.18em .65em .24em; border-radius:5px; margin:.45mm 0 .3mm; }
.vlabel.chorus{ background:var(--chorus); }
.lyric p{ margin:.1em 0 .3em; font-size:.99em; font-weight:700; color:var(--navy); }
.lyric p .g{ font-weight:400; font-size:.9em; }
.chd{ display:inline-block; background:var(--blue); color:#fff; font-size:.73em; padding:.12em .48em .18em;
      border-radius:4px; margin-right:.28em; vertical-align:.45em; font-weight:600; }
.chd.alt{ background:var(--coral); }
.songcard .tip{ margin-top:.8mm; }
.sc-oneline{ margin:0; color:#5f6f7c; }

/* ---------- songbook page ---------- */
.sb-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:6mm; }
.sb-h{ font-size:20pt; color:var(--navy); }
.sb-h .star{ color:#F2B33C; }
.sb-meta{ font-size:7.8pt; color:var(--muted); text-align:right; }
.sb-rule{ height:2.4px; background:var(--blue); border-radius:2px; margin:2mm 0 3mm; }
.banner{ background:var(--blue); color:#fff; border-radius:6px; padding:.9mm 3mm 1.2mm; font-size:8.2pt;
         letter-spacing:.11em; text-transform:uppercase; font-family:"Liberation Sans",sans-serif; font-weight:700;
         margin:3mm 0 1.4mm; }
.banner.chorus{ background:var(--chorus); }
.sb-panel{ background:var(--navy); color:#fff; border-radius:9px; padding:3mm 4mm; margin-top:4mm; text-align:center; }
.sb-panel b{ color:#fff; }
.sb-panel .h{ font-family:"Liberation Sans",sans-serif; font-weight:700; font-size:11pt; margin-bottom:1.2mm; }
.sb-panel p{ margin:0; font-size:8.3pt; color:#d5e2ec; }
"""

FIT = """
<script>
(function(){
 function fit(){
  document.querySelectorAll('.page').forEach(function(pg){
    var inner = pg.querySelector('.inner'); if(!inner) return;
    function avail(){
      var cs = getComputedStyle(pg);
      return pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 26;
    }
    function shrink(from){
      var f = from, g = 0;
      while(inner.scrollHeight > avail() && f > 4.5 && g < 600){
        f -= 0.1; pg.style.fontSize = f + 'px'; g++;
      }
      return f;
    }
    var base = parseFloat(getComputedStyle(pg).fontSize);
    var fs = shrink(base);
    /* NOTE: the song card is never thinned. Earlier builds hid the chorus below
       10.9px and collapsed the whole card below 10.3px; week 2 does neither, so
       a dense day simply sets a little smaller. */
    var maxfs = pg.classList.contains('cover') ? fs : 15.4, g2 = 0;
    while(fs < maxfs && g2 < 500){
      var next = fs + 0.1; pg.style.fontSize = next + 'px';
      if(inner.scrollHeight > avail()){ pg.style.fontSize = fs + 'px'; break; }
      fs = next; g2++;
    }
    pg.setAttribute('data-fs', fs.toFixed(2));
  });
 }
 if(document.readyState === 'complete') fit(); else window.addEventListener('load', fit);
})();
"""+"</script>"

# ------------------------------------------------------------------ fragments
RITUALS = [
    ("Attention grabber:", 'Teacher: <span class="kids">“One, two, three — eyes on me!”</span> · '
                           'Kids: <span class="kids">“One, two — eyes on you!”</span>'),
    ("The Magic Box:", "any box with a lid. Chant it, shake it, sniff it, peek dramatically — "
                       "the day's key prop lives inside."),
    ("The two-tier rule:", "never make a little produce a sentence, and never let a big get away "
                           "with one word."),
    ("Whisper → shout close:", "calms them down, then releases them — every single closing."),
    ("Teacher-fails-on-purpose:", "once a day, get it wrong and let them correct you — the correction "
                                  "shout is the loudest language of the day."),
    ("One song a week:", "same chorus at every circle, one new verse each morning, the whole song "
                         "on Friday."),
]

def who_class(html):
    """give LITTLES / BIGS speaker pills their own colour"""
    def f(m):
        t = m.group(1)
        low = txt(t).strip().lower()
        cls = " who-littles" if low.startswith("little") else (" who-bigs" if low.startswith("big") else "")
        return f'<span class="who{cls}">{t}</span>'
    return re.sub(r'<span class="who">(.*?)</span>', f, html, flags=re.S)


# The week PAGE only marks Teacher/Everyone as speakers; it writes the two-tier
# labels as ordinary prose ("Littles say the one word…", "Bigs: “I smell mint.”").
# circle-guide-week2.pdf — the design the owner picked — prints those as badge
# pills too (LITTLES on #1B6FA8, BIGS on #6D4FC4, same radius/weight/uppercase as
# EVERYONE/TEACHER), so promote them here. ONLY where the word opens a clause —
# after a tag, a <br>, or a sentence end — so "let the Littles copy you" stays
# prose and never turns into a pill mid-sentence. Plural only: "a Big", "the
# littlest" and "Bigger" must not match.
_LB_PILL = re.compile(
    r'(^|<br>|>|[.!?;:]|[—–]|\))(\s*)(Littles|Bigs)(\s*:)?(?=[\s,.—–]|&|<|$)')

def label_pills(html):
    def f(m):
        lead, gap, word = m.group(1), m.group(2), m.group(3)
        cls = "who-littles" if word == "Littles" else "who-bigs"
        return f'{lead}{gap}<span class="who {cls}">{word}</span>'
    return _LB_PILL.sub(f, html)

def seg_title(head):
    """'3 min Teach · Head, hands, feet' -> 'TEACH · HEAD, HANDS, FEET' (badge already removed)"""
    h = re.sub(r"^\s*\d+\s*min\s*", "", head, flags=re.I).strip()
    return no_chinese(h).upper()   # clean BEFORE upper-casing, or English lands mixed-case

def pillify(html, labels=True):
    """speaker pills. labels=False on the overview tier cards, whose headings
    already ARE 'Littles (2.5–3)' / 'Bigs (4–6)' — week 2 has no pill in there."""
    html = who_class(html)
    return label_pills(html) if labels else html

def split_chips(html):
    """Week-3 design: every gesture/sentence frame is its OWN white chip box.

    The week PAGE often packs a whole tier's frames into ONE <span class="say">
    separated by " · " (Week 6's Bigs: “I feel happy today.” · “He is sad…” · …).
    Rendered verbatim that becomes one wide grey blob, which is the one place the
    generated overview still read unlike circle-guide-week3.pdf. Split those runs
    so each frame gets its own chip, exactly as the hand-built Week 3 book does.
    """
    def one(m):
        inner = m.group(1)
        parts = [x.strip() for x in re.split(r"\s*·\s*", inner) if x.strip()]
        if len(parts) < 2:
            return m.group(0)
        return "".join('<span class="kids">%s</span>' % x for x in parts)
    return re.sub(r'<span class="kids">(.*?)</span>', one, html, flags=re.S)


def chordify(line, alt=False):
    """colour a chord chip by its NAME: G7 coral, everything else blue (as week 2 did)"""
    return re.sub(r'<span class="chd">(G7|C7|D7|E7|A7)</span>',
                  r'<span class="chd alt">\1</span>', line)

def song_card(d, i, day):
    """the blue 'Today's song moment' card at the foot of a day page"""
    blk = next((b for b in day["blocks"] if b["kind"] == "song"), None)
    dayname = DAYNAMES[i]
    vkey = next((k for k in d["verses"] if k.lower().startswith(dayname.lower())), None)
    # a no-class day has neither a song block nor a verse of its own — no card at all
    if blk is None and vkey is None:
        return ""
    # "3 min Song · My Body, My Body — chorus + Monday verse"
    head = blk["head"] if blk else ""
    rest = ""
    m = re.match(r"^\s*\d+\s*min\s*Song\s*·\s*(.*)$", head, flags=re.I)
    title = d["song_title"]
    m2 = re.search(r"[“\"]([^”\"]+)[”\"]", title)
    songname = m2.group(1) if m2 else title.split("·")[-1].strip()
    if m:
        tail = m.group(1)
        if "—" in tail:
            songname, rest = [x.strip() for x in tail.split("—", 1)]
        else:
            songname = tail.strip()
    if not rest:
        if vkey is None:
            rest = "the WHOLE song, top to bottom"
        elif i < 4:
            rest = f"chorus → {dayname}'s verse → chorus"
        else:
            rest = f"{dayname}'s verse, then the WHOLE song, top to bottom" 
    parts = [f'<div class="songcard-h">♪ Today\'s song moment · <span class="nm2">{songname}</span> '
             f'<span class="rest">{rest}</span></div>']
    body = []
    if d["chorus"]:
        # ALWAYS printed, chord chips and all — week 2's day card carries the full
        # chorus above the day's verse, and a teacher holding one page must not have
        # to turn to the songbook mid-circle. (The old build hid this whenever the
        # page auto-sizer squeezed below 10.9px; that escape is gone — see FIT.)
        body.append('<div class="sc-chorus"><span class="vlabel chorus">Chorus</span>'
                    '<div class="lyric">'
                    + "".join(f"<p>{chordify(l, True)}</p>" for l in d["chorus"]) + "</div></div>")
    key = vkey
    if key:
        body.append(f'<span class="vlabel">{key}</span>')
        body.append('<div class="lyric">' + "".join(f"<p>{l}</p>" for l in d["verses"][key]) + "</div>")
    if not body and blk:
        body.append(blk["body"])
    tail = ""
    if blk:
        tips = re.findall(r'<p class="tip">.*?</p>', blk["body"], flags=re.S)
        if tips:
            tail = tips[-1]
    parts.append(f'<div class="sc-full">{"".join(body)}{tail}</div>')
    return f'<div class="songcard">{pillify("".join(parts))}</div>'

# --------------------------------------------------------------------- build
def build(week):
    """week is the SCHOOL week number (3-38) — the one and only numbering."""
    d = parse(week)
    school = week
    theme = d["title"]
    pages = []

    def foot(right, color=None):
        c = f' style="color:{color}"' if color else ""
        return (f'<div class="foot-l">Whale Class · Circle Time Guide · Week {school} · {theme}</div>'
                f'<div class="foot-r"{c}>{right}</div>')

    # ---------------- 1. cover ----------------
    pills = ["13 minutes a day", "ages 2.5–6", "English learners"]
    pill_c = [ "#1B6FA8", "#E2563A", "#0F8A72" ]
    cover = f"""<div class="inner">
      <div class="cv-brand">W H A L E &nbsp; C L A S S</div>
      <div class="cv-ct">Circle Time<br>Guide</div>
      <div class="cv-tag">Everything you need, one page per day</div>
      <div class="cv-plaque"><div class="cv-th">{theme}</div></div>
      <div class="cv-week">Week <span>{school}</span></div>
      <div class="cv-dates">Week of {d['dates']}</div>
      <div class="cv-pills">{"".join(f'<span class="pill" style="background:{c}">{p}</span>' for p, c in zip(pills, pill_c))}</div>
      <div class="cv-whales">🐳 🐳 🐳</div>
    </div>"""
    pages.append(("cover", cover + foot("Cover")))

    # ---------------- 2. week overview ----------------
    words = "".join(f'<span class="wpill" style="background:{WORD_PILL[i % 5]}">{c}</span>'
                    for i, c in enumerate(d["chips"]))
    # "N words they'll own by <last teaching day>" — both halves read off the week
    # itself. A four-day week (Week 6, Friday 中秋节; Week 28, Monday 清明节) must
    # not promise a Friday the page's own day table says is closed.
    teaching = [j for j, dd in enumerate(d["days"]) if not dd["noclass"]]
    last_day = DAYNAMES[teaching[-1]] if teaching else DAYNAMES[-1]
    n_words = len(d["chips"]) or 5
    (lh, lp), (bh, bp) = d["frames"][0], d["frames"][1]
    def tier_head(h):
        m = re.match(r"^(.*?)\s*\((.*)\)\s*$", h)
        return f"{m.group(1)} <small>({m.group(2)})</small>" if m else h
    flow = []
    src_day = next((dd for dd in d["days"]
                    if any(b["kind"] == "hook" for b in dd["blocks"])), d["days"][0])
    mon = {b["kind"]: b["badge"] for b in src_day["blocks"] if re.match(r"\d+\s*min", b["badge"], re.I)}
    FLOW_STEPS = [("hook", "2 min", "Magic Box hook"), ("teach", "4 min", "Teach the words"),
                  ("song", "3 min", "Song · today's verse"), ("game", "3 min", "Game · move it"),
                  ("close", "1 min", "Whisper–shout close")]
    for kind, dflt, label in FLOW_STEPS:
        if flow:
            flow.append('<div class="flow-arrow">→</div>')
        flow.append(f'<div class="flow-step"><span class="m">{mon.get(kind, dflt).upper()}</span>'
                    f'<span class="flow-t">{SEG_ICON.get(kind,"")} {label}</span></div>')
    note = (f'<div class="ovnote">{WEEK_NOTES[week]}</div>' if week in WEEK_NOTES else "")
    gl_rows = []
    for j, day in enumerate(d["days"]):
        g = txt(day["grabs"][0]) if day["grabs"] else ""
        g = re.sub(r"^\s*Grab:\s*", "", g).strip()
        g = re.split(r"\s[;—]\s|\s—\s", g)[0].strip().rstrip(".,;")
        if len(g) > 96:
            g = g[:94].rstrip(" ,;") + "…"
        gl_rows.append(f'<tr><td class="d" style="color:{DAY_COLOR[j]}">{DAYNAMES[j][:3]}</td>'
                       f'<td class="s">{day["sub"]}</td><td class="x">{g}</td></tr>')
    glance = (f'<div class="glance"><div class="glance-h">The week at a glance</div>'
              f'<table class="gl">{"".join(gl_rows)}</table></div>')
    half = (len(RITUALS) + 1) // 2
    def rit(sl):
        return "".join(f"<p><b>{h}</b> {t}</p>" for h, t in sl)
    chordgrid = "".join(f'<div class="cbox">{svg}<div class="nm">{nm}</div></div>'
                        for nm, svg in d["chordboxes"][:4])
    uke_side = f'<p>{d["strum"]}</p>' if d["strum"] else ""
    uke_side += f'<p>The song needs only <b>{" · ".join(d["chordnames"])}</b>.</p>'
    ov = f"""<div class="inner">
      <div class="ov-head"><div class="ov-h">🗺 Week {school} · Week Overview</div>
        <div class="ov-note">{theme}<br>Print · laminate · ring-bind · hold this all week</div></div>
      <div class="ov-rule"></div>
      <div class="wordrow"><span class="lbl">{n_words} words they'll own by {last_day} →</span>{words}</div>
      {note}
      <div class="tiers">
        <div class="tier l"><h4>{tier_head(lh)}</h4><p>{split_chips(pillify(lp, labels=False))}</p></div>
        <div class="tier b"><h4>{tier_head(bh)}</h4><p>{split_chips(pillify(bp, labels=False))}</p></div>
      </div>
      {glance}
      <div class="flow">{"".join(flow)}</div>
      <div class="rituals"><div class="rit-h">Weekly rituals — use these every single day</div>
        <div class="rit-cols"><div>{rit(RITUALS[:half])}</div><div>{rit(RITUALS[half:])}</div></div></div>
      <div class="uke"><div class="grid">{chordgrid}</div>
        <div class="uke-side"><div class="uke-h">Uke quick-ref</div>{uke_side}</div></div>
    </div>"""
    pages.append(("ov", ov + foot("Week Overview")))

    # ---------------- 3–7. day pages ----------------
    for i, day in enumerate(d["days"]):
        dn = DAYNAMES[i]
        col, tint = DAY_COLOR[i], DAY_TINT[i]
        grab = "".join(f'<div class="gr">{g}</div>' for g in day["grabs"])
        notes = "".join(f'<div class="daynote">{pillify(n)}</div>' for n in day["notes"])
        segs = []
        for b in day["blocks"]:
            if b["kind"] == "song":
                continue
            segs.append(f'<div class="seg"><div class="seg-h">'
                        f'<span class="tpill">{b["badge"].upper()}</span>'
                        f'<span class="seg-t">{seg_title(b["head"])}</span></div>'
                        f'{pillify(b["body"])}</div>')
        body = f"""<div class="inner">
          <div class="dhead">
            <div class="dh-l"><div class="eyebrow">Week {school} · {theme}</div>
              <div class="dn">{dn.upper()}</div><div class="dsub">{day['sub']}</div></div>
            <div class="dh-r"><div class="wd">{day['words']}</div>{grab}</div>
          </div>
          <div class="drule"></div>
          {notes}{"".join(segs)}
          {song_card(d, i, day)}
        </div>"""
        page = f'<div class="page day" style="--day:{col}; --tint:{tint}">{body}{foot(dn, col)}</div>'
        pages.append(("__raw__", page))

    # ---------------- 8. songbook ----------------
    fing = {"C": "0003", "F": "2010", "G7": "0212", "Am": "2000", "G": "0232",
            "C7": "0001", "Dm": "2210", "D": "2220"}
    meta = " · ".join(f"{c} ({fing.get(c,'')})" for c in d["chordnames"])
    title = d["song_title"]
    m2 = re.search(r"[“\"]([^”\"]+)[”\"]", title)
    songname = m2.group(1) if m2 else title.split("·")[-1].strip()
    sp = [f'<div class="sb-head"><div class="sb-h"><span class="star">★</span> {songname}</div>'
          f'<div class="sb-meta">Week {school} theme song<br>{meta}</div></div>'
          f'<div class="sb-rule"></div>'
          f'<p class="tip">{d["song_sub"]}</p>']
    if d["chorus"]:
        sp.append('<div class="banner chorus">Chorus — sing it every single day</div>')
        sp.append('<div class="lyric">' + "".join(f"<p>{chordify(l, True)}</p>" for l in d["chorus"]) + "</div>")
    for k, lines in d["verses"].items():
        sp.append(f'<div class="banner">{k}</div>')
        sp.append('<div class="lyric">' + "".join(f"<p>{l}</p>" for l in lines) + "</div>")
    tips = []
    for b in d["sblocks"]:
        if b.get("head", "").lower().startswith("if you"):
            tips += re.findall(r"<p>.*?</p>", b["body"], flags=re.S)
    st = d["strum"] or "<b>Strum:</b> Down · Down · Down-Up"
    m3 = re.search(r"^(.*?[.)])(\s+.*)$", st, flags=re.S)
    strum_h, strum_rest = (m3.group(1), m3.group(2).strip()) if m3 else (st, "")
    extra = (f"<p>{strum_rest}</p>" if strum_rest else "") + "".join(tips[:1])
    sp.append(f'<div class="sb-panel"><div class="h">{strum_h}</div>{extra}</div>')
    song = f'<div class="inner">{pillify("".join(sp))}</div>'
    pages.append(("song", song + foot("Songbook")))

    body = "".join(h if k == "__raw__" else f'<div class="page {k}">{h}</div>' for k, h in pages)
    # THE NO-CHINESE DOOR. Applied to the book's own markup only — never to CSS or to
    # the FIT script, whose JS would not survive a prose tidy.
    body = no_chinese(body)
    # This <title> becomes the PDF's /Title metadata and the Chrome tab caption,
    # so it must carry the SCHOOL week number the teacher is looking for.
    title = no_chinese(f"Whale Class Circle Time · Guide · Week {school} · {theme}")
    out = ("<!doctype html><html lang='en'><head><meta charset='utf-8'>"
           f"<title>{title}</title>"
           f"<style>{CSS}</style></head><body>{body}{FIT}</body></html>")
    bad = CJK_CHAR.findall(out)
    if bad:
        raise SystemExit(f"week {week}: {len(bad)} Chinese characters survived: {''.join(bad[:40])}")
    return out

if __name__ == "__main__":
    weeks = [int(a) for a in sys.argv[1:]] or list(range(FIRST_GEN_WEEK, LAST_WEEK + 1))
    for w in weeks:
        h = build(w)
        p = os.path.join(OUT, f"circle-guide-week{w}.html")
        open(p, "w", encoding="utf-8").write(h)
        print(w, len(h), p)
    if UNMAPPED:
        # not fatal — those runs were stripped, so the book is still clean — but each
        # one is a term nobody has given an English word to yet. Add it to CJK_EN.
        print("NOTE: %d Chinese run(s) had no CJK_EN entry and were stripped: %s"
              % (len(UNMAPPED), " ".join(sorted(UNMAPPED))))
