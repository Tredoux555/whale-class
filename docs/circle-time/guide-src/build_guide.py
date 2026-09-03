# -*- coding: utf-8 -*-
"""Rebuild circle-time guide-book HTML sources from the (canonical) week pages."""
import re, sys, json, os
from bs4 import BeautifulSoup, NavigableString, Tag
import pdfplumber

SRC = "/mnt/user-data/uploads/montree/public"
OUT = "/tmp/sp/guide/out"
os.makedirs(OUT, exist_ok=True)

DAYNAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday"]
CHORD_FING = {"C":"0003","F":"2010","G7":"0212","Am":"2000","G":"0232","C7":"0001","Dm":"2210","D":"2220"}

# ---------- inline conversion ----------
KEEP = {"b","i","strong","em","br","span","sub","sup"}
def inline(node):
    out=[]
    for c in node.children:
        if isinstance(c, NavigableString):
            out.append(str(c))
        elif isinstance(c, Tag):
            if c.name=="button": continue
            cls=" ".join(c.get("class",[]))
            if c.name=="br": out.append("<br>"); continue
            inner=inline(c)
            if c.name in ("b","strong"): out.append(f"<b>{inner}</b>")
            elif c.name in ("i","em"): out.append(f"<i>{inner}</i>")
            elif c.name=="span":
                if "g" in c.get("class",[]): out.append(f'<span class="g">{inner}</span>')
                elif "kids" in c.get("class",[]): out.append(f'<span class="kids">{inner}</span>')
                elif "say" in c.get("class",[]) or "say2" in c.get("class",[]): out.append(f'<span class="kids">{inner}</span>')
                elif "who" in c.get("class",[]): out.append(f'<span class="who">{inner}</span>')
                elif "chd" in c.get("class",[]): out.append(f'<span class="chd">{inner}</span>')
                else: out.append(inner)
            else: out.append(inner)
    return "".join(out)

def block_html(b):
    """div.block -> guide html"""
    h3 = b.find("h3")
    badge = h3.find("span", class_="badge")
    btxt = badge.get_text(strip=True) if badge else ""
    if badge: badge.extract()
    head = h3.get_text(" ", strip=True)
    bh = f'<span class="badge">{btxt}</span>' if btxt else ""
    parts=[f'<h3>{bh}{head}</h3>']
    for el in b.children:
        if not isinstance(el, Tag): continue
        if el.name in ("h3","button"): continue
        cls = el.get("class", [])
        if el.name=="p" and "tip" in cls: parts.append(f'<p class="tip">{inline(el)}</p>')
        elif el.name=="p": parts.append(f'<p>{inline(el)}</p>')
        elif el.name=="div" and "t" in cls: parts.append(f'<div class="t">{inline(el)}</div>')
        elif el.name=="div" and "rhyme" in cls:
            ps="".join(f"<p>{inline(p)}</p>" for p in el.find_all("p", recursive=False))
            parts.append(f'<div class="rhyme">{ps}</div>')
        elif el.name=="div" and "lyric" in cls:
            ps="".join(f'<p class="{" ".join(p.get("class",[]))}">{inline(p)}</p>' for p in el.find_all("p", recursive=False))
            parts.append(f'<div class="rhyme">{ps}</div>')
        elif el.name=="div" and "strum" in cls: parts.append(f'<div class="strum">{inline(el)}</div>')
    return f'<div class="block">{"".join(parts)}</div>'

# ---------- old-pdf footers ----------
def old_footers(week):
    p=pdfplumber.open(f"{SRC}/circle-guide-week{week}.pdf")
    res={}
    for i in range(2,7):
        lines=(p.pages[i].extract_text() or "").split("\n")
        idx=None
        for j,l in enumerate(lines):
            if "song moment" in l.lower(): idx=j; break
        if idx is None: res[i-2]=None; continue
        tail=lines[idx:]
        # drop the running footer / page number line
        while tail and (re.fullmatch(r"\d+", tail[-1].strip()) or tail[-1].startswith("Whale Class Circle Time")):
            tail.pop()
        res[i-2]=" ".join(x.strip() for x in tail)
    p.close()
    return res

# ---------- per-week parse ----------
def parse(week):
    soup=BeautifulSoup(open(f"{SRC}/circle-time-week{week}.html",encoding="utf-8").read(),"html.parser")
    d={}
    d["title"]=soup.find("h1").get_text(" ",strip=True)
    tl=soup.find("p",class_="theme-line")
    d["dates"]=tl.find("strong").get_text(strip=True)
    d["chips"]=[c.get_text(strip=True) for c in soup.find("div",class_="glance").find_all("span",class_="chip")]
    frames=soup.find("div",class_="frames").find_all("div",class_="frame")
    d["frames"]=[(f.find("h3").get_text(" ",strip=True), inline(f.find("p"))) for f in frames]
    days=[]
    for n in range(1,6):
        sec=soup.find(id=f"day{n}")
        head=sec.find("div",class_="day-head")
        h2=head.find("h2").get_text(" ",strip=True)
        sub=h2.split("·",1)[1].strip() if "·" in h2 else h2
        words=inline(head.find("p")) if head.find("p") else ""
        grabs=[inline(g) for g in sec.find_all("div",class_="grab")]
        grabstyles=[("note" if g.get("style") else "") for g in sec.find_all("div",class_="grab")]
        blocks=[]
        for b in sec.find_all("div",class_="block"):
            h=b.find("h3").get_text(" ",strip=True)
            blocks.append((("song" if " Song ·" in h or h.startswith("3 min Song") else "other"), block_html(b)))
        days.append(dict(sub=sub,words=words,grabs=list(zip(grabs,grabstyles)),blocks=blocks))
    d["days"]=days
    # songbook
    sec=soup.find(id="day6")
    hd=sec.find("div",class_="day-head")
    d["song_title"]=hd.find("h2").get_text(" ",strip=True)
    d["song_sub"]=hd.find("p").get_text(" ",strip=True)
    d["chords"]=[c.get_text(strip=True) for c in sec.find_all("div",class_="nm")]
    sblocks=[]
    for b in sec.find_all("div",class_="block"):
        bid=b.get("id","")
        if bid=="sng-chords":
            strum=b.find("div",class_="strum"); tip=b.find("p",class_="tip")
            sblocks.append(("chords", inline(strum) if strum else "", inline(tip) if tip else ""))
        else:
            sblocks.append(("blk", block_html(b), ""))
    d["sblocks"]=sblocks
    return d

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html,body { margin:0; padding:0; }
body { font-family: "Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif;
       color:#1d2b36; -webkit-print-color-adjust:exact; print-color-adjust:exact; background:#fff; }
.page { width:210mm; height:297mm; padding:14mm 14mm 12mm 24mm; overflow:hidden;
        page-break-after:always; break-after:page; position:relative; background:#fff;
        font-size:8.6pt; line-height:1.38; }
.page:last-child { page-break-after:auto; }
.inner { }
h1,h2,h3,h4 { margin:0; color:#123850; }
p { margin:.30em 0; }
b { color:#123850; }
.g { color:#5b6b7a; font-style:italic; }
.kids { color:#a8412c; font-weight:700; }
.who { display:inline-block; min-width:62px; padding-right:.55em; font-size:.86em; letter-spacing:.04em;
       text-transform:uppercase; color:#7c8b99; font-weight:700; }
.t { margin:.34em 0; padding:.30em .5em; background:#f4f6f8; border-radius:4px; }
.rhyme { margin:.42em 0 .42em 0; padding:.30em 0 .30em .70em; border-left:2.4px solid #e2725b; }
.rhyme p { margin:.16em 0; }
.rhyme p.vt { margin-top:.55em; font-weight:700; color:#123850; }
.tip { color:#4a5a68; font-size:.95em; font-style:italic; }
.tip b, .tip i b { font-style:normal; }
.strum { margin:.4em 0; padding:.35em .55em; background:#f4f6f8; border-radius:4px; }
.badge { display:inline-block; background:#e2725b; color:#fff; font-weight:700; font-size:.78em;
         letter-spacing:.05em; text-transform:uppercase; padding:.16em .5em; border-radius:3px;
         margin-right:.5em; vertical-align:.08em; }
.block { margin:0 0 .55em 0; padding-bottom:.15em; }
.block h3 { font-size:1.06em; margin:.35em 0 .18em; text-transform:uppercase; letter-spacing:.02em; }
.grab { margin:.35em 0; padding:.38em .6em; border:1px dashed #c8d2da; border-radius:5px;
        background:#fbfcfd; font-size:.97em; }
.grab.note { border-style:solid; border-color:#e2725b; background:#fdf3f0; }
/* cover */
.cover { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.cover .whale { font-size:44pt; line-height:1; }
.cover .brand { font-size:11pt; letter-spacing:.42em; color:#5b6b7a; margin:10mm 0 2mm; font-weight:700; }
.cover .ct { font-size:26pt; color:#e2725b; font-weight:700; }
.cover .gd { font-size:44pt; color:#123850; font-weight:700; line-height:1.05; }
.cover .thm { font-size:19pt; color:#123850; font-weight:700; margin:12mm 6mm 0; line-height:1.2; }
.cover .dt { font-size:11pt; color:#5b6b7a; margin-top:4mm; }
.cover .wl { font-size:13pt; color:#5b6b7a; margin-top:3mm; letter-spacing:.03em; }
.cover .tag { font-size:10.5pt; color:#5b6b7a; font-style:italic; margin-top:10mm; }
/* overview */
.ov h2 { font-size:18pt; margin-bottom:2mm; }
.ov h3 { font-size:11pt; margin:4mm 0 1mm; letter-spacing:.02em; }
.ov.caps h3 { text-transform:uppercase; letter-spacing:.04em; }
.cover.famA .brand { letter-spacing:.16em; }
.ov .lede { color:#5b6b7a; font-size:9.5pt; }
.words { margin:2mm 0; }
.words span { display:inline-block; background:#123850; color:#fff; font-weight:700; font-size:11pt;
              padding:.18em .7em; border-radius:4px; margin:0 .35em .35em 0; }
.two { display:flex; gap:6mm; }
.two > div { flex:1 1 0; }
.two h4 { font-size:10pt; color:#123850; margin-bottom:.6mm; }
table.mini { border-collapse:collapse; width:100%; font-size:.97em; }
table.mini td { padding:.22em .4em .22em 0; vertical-align:top; }
table.mini td.d { font-weight:700; color:#123850; width:12mm; }
.flow { font-size:.97em; }
.flow b { color:#e2725b; }
/* day page */
.dayhead { border-bottom:2px solid #e2725b; padding-bottom:1.6mm; margin-bottom:1.6mm; }
.dayhead .dn { font-size:11pt; letter-spacing:.22em; text-transform:uppercase; color:#e2725b; font-weight:700; }
.dayhead h2 { font-size:17pt; margin:.4mm 0 .8mm; }
.dayhead .tw { font-size:9.6pt; color:#4a5a68; }
.footline { position:absolute; left:24mm; right:14mm; bottom:12mm; border-top:1px solid #dde4ea;
            padding-top:1.4mm; font-size:.95em; color:#4a5a68; }
.footline b { color:#123850; }
.pgnum { position:absolute; right:14mm; bottom:6mm; font-size:8pt; color:#9aa8b4; }
.runfoot { position:absolute; left:24mm; bottom:6mm; font-size:8pt; color:#9aa8b4; }
/* song page */
.song h2 { font-size:20pt; }
.song .star { font-size:20pt; color:#e2725b; }
.chordline span { display:inline-block; background:#f4f6f8; border:1px solid #dde4ea; border-radius:4px;
                  padding:.14em .55em; margin:0 .4em .4em 0; font-weight:700; color:#123850; font-size:1.02em; }
.chd { color:#e2725b; font-weight:700; font-size:.86em; vertical-align:.35em; margin-right:.14em; }
"""

FIT = """
<script>
(function(){
 function fit(){
  document.querySelectorAll('.page').forEach(function(pg){
    var inner = pg.querySelector('.inner'); if(!inner) return;
    var cs = getComputedStyle(pg);
    var foot = pg.querySelector('.footline');
    var footH = foot ? foot.offsetHeight + 14 : 0;
    var avail = pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - footH - 2;
    var fs = parseFloat(cs.fontSize);
    var guard = 0;
    while(inner.scrollHeight > avail && fs > 4.5 && guard < 400){
      fs -= 0.1; pg.style.fontSize = fs + 'px';
      foot = pg.querySelector('.footline');
      footH = foot ? foot.offsetHeight + 14 : 0;
      avail = pg.clientHeight - parseFloat(getComputedStyle(pg).paddingTop) - parseFloat(getComputedStyle(pg).paddingBottom) - footH - 2;
      guard++;
    }
    var maxfs = pg.classList.contains('cover') ? fs : 13.4;
    var g2 = 0;
    while (fs < maxfs && g2 < 400) {
      var next = fs + 0.1;
      pg.style.fontSize = next + 'px';
      var f2 = pg.querySelector('.footline');
      var fh2 = f2 ? f2.offsetHeight + 14 : 0;
      var c2 = getComputedStyle(pg);
      var av2 = pg.clientHeight - parseFloat(c2.paddingTop) - parseFloat(c2.paddingBottom) - fh2 - 2;
      if (inner.scrollHeight > av2) { pg.style.fontSize = fs + 'px'; break; }
      fs = next; g2++;
    }
    pg.setAttribute('data-fs', fs.toFixed(2));
  });
 }
 if(document.readyState==='complete') fit(); else window.addEventListener('load', fit);
})();
</script>
"""

# =====================================================================
# Per-week cover + overview. Text transcribed verbatim from the shipped
# PDFs; ONLY dates, the Dark-Phonics sound and (W30) the 2-day note change.
# =====================================================================
def words_row(chips):
    return '<div class="words">' + "".join(f"<span>{c}</span>" for c in chips) + "</div>"

def tiers(d):
    (h1,p1),(h2,p2) = d["frames"]
    return (f'<div class="two"><div><h4>{h1}</h4><p>{p1}</p></div>'
            f'<div><h4>{h2}</h4><p>{p2}</p></div></div>')

FLOW_ROWS = ("<table class='mini'>"
 "<tr><td class='d'>2 min</td><td><b>Magic Box hook</b> — chant, shake, sniff, dramatic peek.</td></tr>"
 "<tr><td class='d'>4 min</td><td><b>Teach</b> — the day's word, dramatised with the object. Get it wrong once on purpose.</td></tr>"
 "<tr><td class='d'>3 min</td><td><b>Song</b> — chorus &rarr; today's new verse &rarr; chorus.</td></tr>"
 "<tr><td class='d'>3 min</td><td><b>Game</b>.</td></tr>"
 "<tr><td class='d'>1 min</td><td><b>Close</b> — whisper &rarr; normal &rarr; shout.</td></tr></table>")

FLOW_A = ("<table class='mini'>"
 "<tr><td class='d'>2 min</td><td><b>Magic Box hook</b> — chant, shake, sniff, dramatic peek, the day's real food.</td></tr>"
 "<tr><td class='d'>4 min</td><td><b>Teach</b> — the day's group, real food in your hands, into its basket. Get it wrong once on purpose.</td></tr>"
 "<tr><td class='d'>3 min</td><td><b>Song</b> — chorus &rarr; today's new verse &rarr; chorus.</td></tr>"
 "<tr><td class='d'>3 min</td><td><b>Game</b> — one named game, tied to the day's word.</td></tr>"
 "<tr><td class='d'>1 min</td><td><b>Close</b> — whisper &rarr; normal &rarr; SHOUT.</td></tr></table>")

FLOW_C = ("<p class='flow'><b>2 min</b> Magic Box hook &nbsp;·&nbsp; <b>4 min</b> Teach &nbsp;·&nbsp; "
 "<b>3 min</b> Song &nbsp;·&nbsp; <b>3 min</b> Game &nbsp;·&nbsp; <b>1 min</b> Close</p>")

NEVER = ("<p class='tip'>Never ask a little for a sentence. They will get there by watching the bigs.</p>")

def glance_table(rows):
    return "<table class='mini'>" + "".join(
        f"<tr><td class='d'>{d}</td><td>{t}</td></tr>" for d,t in rows) + "</table>"

WEEKS = {}

WEEKS[7] = dict(
  family="A", weeklabel="Week 7",
  cover_theme="Week 7 · Five Food Groups on My Plate",
  cover_dates="19&ndash;23 October 2026 · 13 minutes a day · ages 2.5&ndash;6, English learners",
  cover_note="霜降 (Frost's Descent) falls on Friday 23 October — met on Thursday",
  cover_words=None,
  overview=lambda d: f"""
   <h2>Week Overview</h2>
   <p class="lede">🗺 Print · laminate · ring-bind · hold this all week.</p>
   <h3>Five words they'll own by Friday</h3>
   {words_row(d['chips'])}
   {tiers(d)}
   <h3>The 13-minute flow, every day</h3>
   {FLOW_A}
   <h3>In the Magic Box, day by day</h3>
   <p><b>Mon</b> a basket of real fruit — apple, banana, grapes · <b>Tue</b> a carrot with its leaves on + fresh bean pods (毛豆) · <b>Wed</b> a jar of rice, a whole corn cob, a slice of bread · <b>Thu</b> a cup of milk, a piece of cheese, and a metal spoon straight from the freezer, furred with frost, for 霜降 · <b>Fri</b> an egg, a dish of nuts, and every prop from the week, built into the pyramid.</p>
   <h3>The week's close</h3>
   <p><span class="who">Everyone</span><span class="kids">“Fruit… vegetable… grain… milk… EGG! FIVE FOOD GROUPS!”</span></p>
   <h3>Theme shelf · four trays</h3>
   <p>1 · 食物分类卡 food-group sorting — five labelled baskets, picture cards, a colour dot per group on the back.<br>
      2 · The food pyramid mat — cards go on their layer; the printed outlines are the control.<br>
      3 · Bean shelling and rice spooning — real pods, a bowl, a shell dish, a jar and a small spoon.<br>
      4 · 霜降节气三段卡 Frost's Descent three-part cards + the cold glass and a magnifying glass.</p>
   <h3>Chinese angle</h3>
   <p>汉字 beside the day's basket: 果 · 菜 · 米 · 奶 · 蛋. The 霜降 童谣, chanted on Thursday with the frosty spoon in hand: 霜降到，天气凉；多吃饭，身体壮。</p>
   <h3>Friday's Dark Phonics sound</h3>
   <p><b>g</b> — a little click right at the back of the throat: goat, gum, go, get, good, garden. The food words <b>grapes</b> and <b>egg</b> carry it. <span class="kids">goat got my gum!</span></p>
  """)

WEEKS[30] = dict(
  family="C", weeklabel=None,
  cover_theme=None,
  cover_dates=None, cover_note=None, cover_words=None,
  overview=lambda d: f"""
   <h2>Week Overview</h2>
   <p class="lede">🗺 Print · laminate · ring-bind · hold this all week.</p>
   <div class="grab note"><b>⚠️ 2-day week (Labour Day):</b> this week runs <b>Thursday 6 and Friday 7 May</b> only. Teach <b>Day 1</b> on Thursday and <b>Day 5</b> on Friday; Days 2&ndash;4 are optional — fold in whatever you have time for, or skip them.</div>
   <h3>Five words they'll own by Friday</h3>
   {words_row(d['chips'])}
   {tiers(d)}
   <h3>The 13 minutes, same every day</h3>
   {FLOW_C}
   <h3>What's in the box</h3>
   {glance_table([("Mon","Nothing. An empty box under a black cloth — and the lights go off."),
                  ("Tue","A torch — the first light."),
                  ("Wed","A balloon — small, big, bigger… BANG!"),
                  ("Thu","Glow-in-the-dark stars (lights off again)."),
                  ("Fri","All the week's props + black paper and white chalk.")])}
   <h3>Every day, without fail</h3>
   <p>“One, two, three — eyes on me!” · the Magic Box chant · Littles get one word + gesture, Bigs get the sentence frame · get something wrong on purpose once so they can correct you · close whisper &rarr; normal &rarr; shout.</p>
   <p><b>Dark Phonics this week:</b> short <b>i</b> — big, pig, dig, did, sit, it. <span class="kids">“big pig did a jig!”</span></p>
  """)

def bfam(glance_rows, extra_note=""):
    def f(d):
        return f"""
   <h2>Week Overview</h2>
   <p class="lede">🗺 Print · laminate · ring-bind · hold this all week. One page per day, in your hand, at the circle. Every script here is word-for-word the same as the teachers' page.{extra_note}</p>
   <h3>Five words they'll own by Friday</h3>
   {words_row(d['chips'])}
   {tiers(d)}
   {NEVER}
   <h3>The week at a glance</h3>
   {glance_table(glance_rows)}
   <h3>The 13 minutes, every day</h3>
   {FLOW_ROWS}
  """
    return f

WEEKS[31] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="sun · moon · Earth · round · hot",
  overview=bfam([
    ("Mon","<b>The Sun</b> — Magic Box: a torch and a big yellow ball. Game: Hot or Cold? (warm bottle vs ice pack). Shelf: Tray 2 · Hot &amp; Cold."),
    ("Tue","<b>Our Earth</b> — Magic Box: a globe. Game: Pass the Earth. Shelf: Tray 1 · Sun, Earth &amp; Moon cards."),
    ("Wed","<b>The Moon</b> — Magic Box: a white ball poked full of craters. Game: Day and Night with the torch. Shelf: Tray 4 · Moon phases."),
    ("Thu","<b>The Planets</b> — Magic Box: fruit planets, peppercorn to watermelon. Game: the planet parade, small to big. Shelf: Tray 3 · Planet parade &amp; orbit mat."),
    ("Fri","<b>Round and Round</b> — everything laid out on the black cloth. Game: Walk the orbit. Full song, top to bottom.")]))

WEEKS[32] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="rocket · astronaut · up · down · blast off",
  overview=bfam([
    ("Mon","<b>My Rocket</b> — Magic Box: a cardboard-tube rocket. Game: rocket launch (crouch, countdown, JUMP). Shelf: Tray 1 · Countdown rockets."),
    ("Tue","<b>Astronauts</b> — Magic Box: a box helmet you can really wear. Game: dress the astronaut (helmet, suit, gloves, boots). Shelf: Tray 2 · Astronaut dressing."),
    ("Wed","<b>Up to the Moon</b> — Magic Box: a moon rock (a stone in foil). Game: slow-motion moon walk with Up!/Down! freezes. Shelf: Tray 3 · Moon surface."),
    ("Thu","<b>Plant the Flag</b> — Magic Box: a little flag. Game: the obstacle path to the moon. Shelf: Tray 4 · Space 3-part cards."),
    ("Fri","<b>My Space Book</b> — everything back in the box + the number cards 5 4 3 2 1. Game: countdown relay. Full song, top to bottom.")]))

WEEKS[33] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="dinosaur · big · teeth · roar · egg",
  overview=bfam([
    ("Mon","<b>Big Dinosaurs</b> — Magic Box: the biggest dinosaur toy you own. Game: big dinosaur / small dinosaur stomp-and-tiptoe. Shelf: Tray 1 · Big &rarr; small grading."),
    ("Tue","<b>Big Teeth</b> — Magic Box: a giant paper tooth + a mirror. Game: count the teeth, then the leaf-eater / meat-eater sorting run. Shelf: Tray 2 · 3-part cards and Tray 3 · Leaf/meat sorting."),
    ("Wed","<b>Dinosaur Eggs</b> — Magic Box: an egg buried in sand. Game: crack the egg — guess what's inside. Shelf: Tray 4 · Dig the eggs."),
    ("Thu","<b>ROAR!</b> — Magic Box: a huge paper footprint everyone stands in. Game: roar and freeze with the hand volume dial + the action cards."),
    ("Fri","<b>Measure a Dinosaur</b> — every prop back in the box + 12 metres of string. Game: unroll one whole T-rex down the corridor and walk it. Full song, top to bottom.")],
    extra_note=" 🎈 六一儿童节 (Children's Day) falls on Tuesday 1 June — next week; Day 2 flags it so the children know it is coming."))

WEEKS[34] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="fossil · bone · dig · rock · old",
  overview=bfam([
    ("Mon","<b>A Fossil in the Rock</b> — Magic Box: a real fossil (or a shell pressed into clay). Game: what's under the sand? Shelf: Tray 2 · Excavation (the sand bowl walks straight over)."),
    ("Tue","<b>Bones Make a Dinosaur</b> — Magic Box: a clean bone. Game: build the skeleton on the wall. Shelf: Tray 3 · Fossil 3-part cards (the bone sits on the tray)."),
    ("Wed","<b>Dig, Brush, Find</b> — Magic Box: a trowel and a soft brush. Game: brush it gently (the quietest game of the year). Shelf: Tray 1 · Make a fossil (the clay and the pressing objects)."),
    ("Thu","<b>Old and New</b> — Magic Box: yesterday's clay fossils, now dry. Game: old or new? Shelf: Tray 4 · Old &rarr; New timeline (the two sorting signs, shrunk)."),
    ("Fri","<b>The Whole May Story</b> — the whole month in one box. Game: the May finale quick-fire + awards. Full song, top to bottom.")]))

def build(week):
    d = parse(week)
    cfg = WEEKS[week]
    fam = cfg["family"]
    foot = old_footers(week)
    pages = []

    # ---- cover ----
    if fam == "A":
        cover = f"""<div class="inner">
          <div class="whale">🐳</div>
          <div class="brand">WHALE CLASS</div>
          <div class="ct">Circle Time</div>
          <div class="gd">Guide</div>
          <div class="tag">Everything you need, one page per day.</div>
          <div class="thm">{cfg['cover_theme']}</div>
          <div class="dt">{cfg['cover_dates']}</div>
          <div class="dt">{cfg['cover_note']}</div>
        </div>"""
        cover += f'<div class="runfoot">Whale Class Circle Time · {cfg["weeklabel"]}</div>'
    else:
        wl = f'<div class="wl">{cfg["cover_words"]}</div>' if cfg.get("cover_words") else ""
        sub = (f'<div class="dt">Big Bang and the Universe · Week of {d["dates"]}</div>'
               if week == 30 else
               f'<div class="dt">Week of {d["dates"]} · 13 minutes a day · ages 2.5&ndash;6</div>')
        cover = f"""<div class="inner">
          <div class="whale">🐳</div>
          <div class="brand">W H A L E &nbsp; C L A S S</div>
          <div class="ct">Circle Time</div>
          <div class="gd">Guide</div>
          <div class="thm">{d['title']}</div>
          {sub}
          {wl}
          <div class="tag">Everything you need, one page per day</div>
        </div>"""
        if fam == "B":
            cover += '<div class="pgnum">1</div>'
    pages.append(('cover famA' if fam=='A' else 'cover', cover))

    # ---- overview ----
    ov = f'<div class="inner ov{" caps" if fam=="A" else ""}">{cfg["overview"](d)}</div>'
    if fam == "A":
        ov += f'<div class="runfoot">Whale Class Circle Time · {cfg["weeklabel"]} · Overview</div>'
    elif fam == "B":
        ov += '<div class="pgnum">2</div>'
    pages.append(('ov', ov))

    # ---- day pages ----
    for i, day in enumerate(d["days"]):
        dn = DAYNAMES[i]
        if fam == "A":
            head = (f'<div class="dayhead"><div class="dn">{dn} · Day {i+1}</div>'
                    f'<h2>{day["sub"]}</h2><div class="tw">{day["words"]}</div></div>')
        else:
            lead = f'Day {i+1} · ' if fam == "B" else ''
            head = (f'<div class="dayhead"><div class="dn">{dn}</div>'
                    f'<h2>{lead}{day["sub"]}</h2><div class="tw">{day["words"]}</div></div>')
        grabs = "".join(f'<div class="grab{" note" if st else ""}">{g}</div>' for g, st in day["grabs"])
        keep_song = (fam == "C")
        blocks = "".join(h for kind, h in day["blocks"] if keep_song or kind != "song")
        body = f'<div class="inner">{head}{grabs}{blocks}</div>'
        f = foot.get(i) or ""
        body += f'<div class="footline">{f}</div>'
        if fam == "A":
            body += f'<div class="runfoot">Whale Class Circle Time · {cfg["weeklabel"]} · {dn}</div>'
        elif fam == "B":
            body += f'<div class="pgnum">{i+3}</div>'
        pages.append(('day', body))

    # ---- songbook ----
    chordline = "".join(f'<span>{c} ({CHORD_FING.get(c,"")})</span>' for c in d["chords"])
    parts = [f'<h2><span class="star">⭐</span> {d["song_title"]}</h2>',
             f'<p class="lede">{d["song_sub"]}</p>',
             f'<p class="chordline">{chordline}</p>']
    for kind, a, b in d["sblocks"]:
        if kind == "chords":
            if a: parts.append(f'<div class="strum">{a}</div>')
            if b: parts.append(f'<p class="tip">{b}</p>')
        else:
            parts.append(a)
    song = f'<div class="inner song">{"".join(parts)}</div>'
    if fam == "A":
        song += f'<div class="runfoot">Whale Class Circle Time · {cfg["weeklabel"]} · Songbook</div>'
    elif fam == "B":
        song += '<div class="pgnum">8</div>'
    pages.append(('song', song))

    body = "".join(f'<div class="page {k}">{h}</div>' for k, h in pages)
    html = ("<!doctype html><html lang='en'><head><meta charset='utf-8'>"
            f"<title>Whale Class Circle Time Guide · Week {week}</title>"
            f"<style>{CSS}</style></head><body>{body}{FIT}</body></html>")
    return html

if __name__ == "__main__":
    for w in [7, 30, 31, 32, 33, 34]:
        h = build(w)
        p = f"{OUT}/circle-guide-week{w}.html"
        open(p, "w", encoding="utf-8").write(h)
        print(w, len(h), p)
