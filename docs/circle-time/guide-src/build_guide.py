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

WEEKS[16] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="winter \u00b7 cold \u00b7 snow \u00b7 coat \u00b7 boots",
  overview=bfam([
    ("Mon","<b>Brr! It's Cold!</b> \u2014 welcome back from the winter holiday. Magic Box: one ice cube in a bowl, which then lives on the shelf all week. Game: hot or cold? Shelf: Tray 1 \u00b7 Melting ice."),
    ("Tue","<b>Hat, Scarf, Coat</b> \u2014 Magic Box: a woolly hat and a very long scarf; the Montessori coat flip. Game: dress the snowman. Shelf: Tray 2 \u00b7 Dressing sequence + button and zip frames. \u5c0f\u5bd2 falls today."),
    ("Wed","<b>Stamp Your Boots</b> \u2014 Magic Box: real snow boots. Game: stamp your boots (rhythm echo). Shelf: Tray 3 \u00b7 Winter / summer clothes sorting."),
    ("Thu","<b>Snow Is Falling</b> \u2014 Magic Box: real snow, white feathers, paper snowflakes. Game: blow the snowflake. Shelf: Tray 4 \u00b7 Winter 3-part cards."),
    ("Fri","<b>Winter Walk + Review</b> \u2014 everything back in the box plus the four dressing cards; Monday's ice is now water. Game: the winter walk outside. Full song, top to bottom.")],
    extra_note=" \u2744 First week back after the winter holiday \u2014 \u5c0f\u5bd2 (Minor Cold) falls on Tuesday 5 January."))

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

WEEKS[23] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="Africa \u00b7 lion \u00b7 elephant \u00b7 hot \u00b7 drum",
  # Week 23 has no earlier PDF to lift day footers from, so its five
  # "Today's song moment" footers are carried here instead of in old_footers().
  footers=[
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Monday's verse \u2192 chorus, sitting round the map. "
    "\u201cAfrica is big and yellow-gold, / Hot in the day and at night it's cold!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus \u2014 once as the lion, once as the mouse. "
    "\u201cThe lion says ROAR \u2014 the king of all, / Big, big lion \u2014 hear him call!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, sung slowly \u2014 elephant speed. "
    "\u201cThe elephant's nose is long and grey, / Squirt, squirt, squirt \u2014 hip hooray!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, with one child on the real drum. "
    "\u201cPat the drum \u2014 boom, boom, boom, / Everybody dance around the room!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, top to bottom, round the map with the drum. "
    "\u201cYellow sun and yellow sand, / YES! I love this yellow land!\u201d"],
  overview=bfam([
    ("Mon","<b>Find Africa</b> \u2014 Magic Box: the green Africa piece from the puzzle map + a photo of Teacher Tredoux as a child. Game: find Africa (stand on it, then walk to Asia). Shelf: Tray 2 \u00b7 Africa on the map."),
    ("Tue","<b>The Lion Roars</b> \u2014 Magic Box: a lion and a tuft of wool for his mane. Game: lion and mouse (the volume dial). Shelf: Tray 4 \u00b7 3-part cards + wool manes."),
    ("Wed","<b>The Elephant</b> \u2014 Magic Box: an elephant and a length of soft tubing \u2014 a trunk that really squirts. Game: the elephant trunk walk at half speed. Shelf: Tray 1 \u00b7 Animal size grading."),
    ("Thu","<b>Boom, Boom, Drum</b> \u2014 Magic Box: a hand drum. Game: drum says \u2014 fast, slow, FREEZE. Shelf: Tray 3 \u00b7 Drum rhythm cards."),
    ("Fri","<b>Hot Yellow Land + Review</b> \u2014 everything in the box plus African printed cloth, a woven basket, warm sand and cold water. Game: the safari walk. Full song, top to bottom.")],
    extra_note=" \u2600 Our teacher's home continent, named out loud every day \u2014 \u6625\u5206 falls on Saturday 20 March, the day after we finish."))

# Week 24 · One Country — South Africa (22–26 Mar 2027). Like weeks 16–20, the
# SHIPPED guide source is the hand-authored
# docs/circle-time/guide-src/circle-guide-week24.html — day pages carry a
# .songfoot "Today's song moment" footer instead of an in-page song block, and
# day scripts are lifted verbatim from public/circle-time-week24.html. This
# entry records the week for build_guide.py's family-B path; it is additive and
# changes nothing else in this file.
WEEKS[24] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="South Africa \u00b7 zebra \u00b7 mountain \u00b7 flag \u00b7 hello",
  overview=bfam([
    ("Mon","<b>Six Colours, One Flag</b> \u2014 Magic Box: the real South African flag + six squares of coloured paper; last week's green Africa piece and a photo of the teacher as a boy. Game: six colours. Shelf: Tray 1 \u00b7 Six-colour flag collage."),
    ("Tue","<b>Zebra Stripes</b> \u2014 Magic Box: a toy zebra and a very long black-and-white striped cloth. Game: one long zebra (nose to tail, walk\u2013trot\u2013FREEZE). Shelf: Tray 2 \u00b7 Zebra stripes with pegs."),
    ("Wed","<b>Table Mountain, Flat on Top</b> \u2014 Magic Box: a photo of Table Mountain and a fistful of wooden blocks. Game: flat top / pointy top. Shelf: Tray 3 \u00b7 Table Mountain building."),
    ("Thu","<b>Sawubona!</b> \u2014 Magic Box: a Zulu beaded bracelet from KwaZulu-Natal. Game: pass the bracelet, naming the colour under your thumb. Shelf: Tray 4 \u00b7 Bead a bracelet + the 3-part cards."),
    ("Fri","<b>My Country + Big Review</b> \u2014 everything back in the box plus Teacher Tredoux's own photographs from home and an African drum. Game: the sawubona round, three languages. Full song, top to bottom.")],
    extra_note=" \U0001F1FF\U0001F1E6 Teacher Tredoux's own country \u2014 family from Newcastle, KwaZulu-Natal. \u6625\u5206 fell on Sunday 21 March, the day before this week begins."))


WEEKS[21] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="world \u00b7 map \u00b7 seven \u00b7 continent \u00b7 Asia",
  # No shipped week-21 PDF existed when this week was built, so old_footers()
  # has nothing to read: the day footers are the page's own song-moment lines,
  # lifted verbatim off #day1-#day5 of public/circle-time-week21.html.
  footers=[
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Monday's verse \u2192 chorus, standing at the globe. "
    "\u201cThe world is round, the world is blue, / I hold the world \u2014 and so do you!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus, standing on the map cloth. "
    "\u201cFlat, flat map upon the floor, / Point your finger \u2014 find some more!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, seven real fingers up. "
    "\u201cOne, two, three, four, five, six, seven \u2014 / Seven big continents \u2014 count to seven!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, everybody packed onto Asia. "
    "\u201cAsia, Asia \u2014 that's my home, / China is in Asia \u2014 now you know!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, walking round the map cloth. "
    "\u201cAfrica, Europe, Asia too, / Round the whole world \u2014 me and you!\u201d",
  ],
  overview=bfam([
    ("Mon","<b>A Round, Round World</b> \u2014 welcome back from \u6625\u8282, the first circle of \u7f8a\u5e74. Magic Box: the box is empty \u2014 the globe was too big, and waits under a cloth. Game: spin the globe, land or water? Shelf: Tray 1 \u00b7 Sandpaper globe \u2192 coloured globe."),
    ("Tue","<b>A Map to Sit On</b> \u2014 Magic Box: a world-map cloth folded very small, pulled out until it covers the floor. Game: sit on your continent (and you cannot sit on the blue). The cloth stays down all week."),
    ("Wed","<b>Seven Big Pieces</b> \u2014 Magic Box: one piece of the continent puzzle map; the other six hidden round the room. Game: puzzle piece hunt. Shelf: Tray 2 \u00b7 Continent puzzle map."),
    ("Thu","<b>I Live in Asia</b> \u2014 Magic Box: seven coloured flags and one model animal per continent. Game: animal goes home. Shelf: Tray 3 \u00b7 Continent \u00b7 colour \u00b7 animal matching."),
    ("Fri","<b>Round the World + Review</b> \u2014 everything back in the box plus a home-made passport each. Game: passport stamps, seven stops, last stop Asia. Full song, top to bottom.")],
    extra_note=" \U0001f30f First week back after the \u6625\u8282 holiday \u2014 \u60ca\u86f0 falls on Saturday 6 March."))

WEEKS[22] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="ocean \u00b7 water \u00b7 fish \u00b7 blue \u00b7 boat",
  overview=bfam([
    ("Mon","<b>Salty Water</b> \u2014 Magic Box: a bowl of warm salted \u201csea water\u201d, one fingertip taste each. Game: salty or sweet? Shelf: Tray 1 \u00b7 Pouring and sponging."),
    ("Tue","<b>Five Big Oceans</b> \u2014 Magic Box: the globe, turned to the Pacific side. Game: spin the globe and stop it \u2014 land or water? Shelf: Tray 2 \u00b7 Island and lake."),
    ("Wed","<b>Fish and Shells</b> \u2014 Magic Box: real shells and little model fish. Game: magnet fishing. Shelf: Tray 3 \u00b7 Ocean 3-part cards."),
    ("Thu","<b>Sink or Float</b> \u2014 Magic Box: a paper boat and one heavy stone. Game: sink or float, voted with thumbs. Shelf: Tray 4 \u00b7 Sink and float (the basin walks straight over)."),
    ("Fri","<b>Five Blue Ribbons + Review</b> \u2014 the whole week back in the box plus five blue ribbons, one per ocean. Game: five ocean ribbons. Full song, top to bottom.")],
    extra_note=" \U0001f30a Water on the floor every day \u2014 put the towel down before the children sit down."))

WEEKS[25] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="spring \u00b7 egg \u00b7 chick \u00b7 caterpillar \u00b7 butterfly",
  overview=bfam([
    ("Mon","<b>Wake Up, Spring!</b> \u2014 Magic Box: a branch with real buds or blossom, cut that morning, which then stands in water all week. Game: wake up, spring! (the sun taps you awake). Shelf: the 春 card and the 春分 egg standing on its end."),
    ("Tue","<b>An Egg in the Nest</b> \u2014 Magic Box: a real egg in a little nest; the box is carried flat and never shaken. Game: what's in the egg? (feely bag). Shelf: Tray 2 \u00b7 Chick life-cycle tray."),
    ("Wed","<b>Crack! A Chick</b> \u2014 Magic Box: a fluffy chick and the cracked eggshell it came out of. Game: chick, chick, cheep. Shelf: Tray 2 gains the real shell; Tray 4 \u00b7 Tweezer the eggs into the nests."),
    ("Thu","<b>The Hungry Caterpillar</b> \u2014 Magic Box: a caterpillar and a leaf full of nibbled holes; the chrysalis goes on the shelf unopened. Game: the caterpillar crawl, the whole class in one line. Shelf: Tray 3 \u00b7 Mother and baby matching."),
    ("Fri","<b>Butterfly! + Big Review</b> \u2014 the chrysalis is opened and the butterfly pulled out; every prop back in the box. Game: walk the life cycle, four stations in a ring. Full song, top to bottom.")],
    extra_note=" \U0001F338 \u6e05\u660e falls on Monday 5 April \u2014 school is closed and next week is a four-day week; Friday announces it. \u6625\u5206 has just passed, so \u6625\u5206\u7acb\u86cb stands on the shelf all week."))

# Week 35 · Summer (7–11 Jun 2027). Like weeks 16–25, the SHIPPED guide source
# is the hand-authored docs/circle-time/guide-src/circle-guide-week35.html — day pages
# carry a .songfoot "Today's song moment" footer instead of an in-page song block,
# and every day script is lifted verbatim from public/circle-time-week35.html.
# This entry records the week for build_guide.py's family-B path; it is additive
# and changes nothing else in this file. Placed after def bfam() on purpose.
WEEKS[35] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="summer · hot · sun · swim · ice",
  # No shipped week-35 PDF existed when this week was built, so old_footers() has
  # nothing to read: the day footers are the page's own song-moment lines, lifted
  # verbatim off #day1-#day5 of public/circle-time-week35.html.
  footers=[
    "3 MIN · Today's song moment — chorus → Monday's verse → chorus, standing with the hats on. "
    "“Off with my coat and on with my hat, / Summer is here — how about that!”",
    "3 MIN · Today's song moment — chorus → Tuesday's verse → chorus; everybody really drinks on “drink my water”. "
    "“Hot, hot, hot — I fan my face, / Find me a cool, shady place!”",
    "3 MIN · Today's song moment — chorus → Wednesday's verse → chorus, sitting in one long line as if in a boat, one child on the drum. "
    "“Row, row, row — the drum goes BOOM, / A dragon boat in the hot sun's room!”",
    "3 MIN · Today's song moment — chorus → Thursday's verse → chorus, everybody on their backs with their feet kicking. "
    "“Splash goes the water, kick my feet, / Swimming, swimming — cool and sweet!”",
    "3 MIN · Today's song moment — Friday's verse, then the WHOLE song, top to bottom, with the watermelon on the mat and nobody eating until the last chord. "
    "“A little bit of ice in my hand so tight, / Look! It's gone — melted out of sight!”"],
  overview=bfam([
    ("Mon","<b>Summer Is Here</b> — Magic Box: a sun hat and sunglasses, put on the teacher all wrong. Game: summer or winter? (clothes raced to the red or the blue basket). Shelf: Tray 4 · Sun-safety sequencing."),
    ("Tue","<b>Hot, Hot, Hot</b> — Magic Box: a bowl of ice cubes straight from the freezer, passed round fast. Game: melt the ice — shade, sun or warm water? Shelf: Tray 1 · Hot / cold sorting and Tray 2 · The melting tray."),
    ("Wed","<b>The Sun and the Dragon Boat · 端午节</b> — Magic Box: a 粽子, a bundle of 艾草 and a little dragon boat. Game: dragon-boat row to a drum, 一、二！一、二！ Shelf: Tray 3 · 包粽子."),
    ("Thu","<b>Splash! I Can Swim</b> — Magic Box: swimming goggles, a water bottle and a paper fan. Game: swim on the mat, starfish freeze on the music stop. Shelf: the action cards go face down on Tray 4."),
    ("Fri","<b>Ice, Watermelon + Big Review</b> — the whole week back in the box plus a whole watermelon 西瓜 and one ice cube per child. Game: watermelon share — nobody eats until everybody has one. Full song, top to bottom.")],
    extra_note=" ☀ 端午节 falls on Wednesday 9 June and 芒种 was Saturday 6 June; 夏至, the longest day, comes on 21 June, after we have gone. The last full teaching week — next week is graduation."))

# Week 29 · Earth Day (26–30 Apr 2027). Like weeks 16–25, the SHIPPED guide
# source is the hand-authored docs/circle-time/guide-src/circle-guide-week29.html
# — day pages carry a .songfoot "Today's song moment" footer instead of an
# in-page song block, and every day script is lifted verbatim from
# public/circle-time-week29.html. No earlier week-29 PDF exists, so old_footers()
# has nothing to read and the five day footers are carried here. This entry is
# additive and changes nothing else in this file.
WEEKS[29] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="clean \u00b7 trash \u00b7 recycle \u00b7 tree \u00b7 save",
  footers=[
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Monday's verse \u2192 chorus, standing round the bin. "
    "\u201cTrash, trash on the ground \u2014 / Pick it up when it's found!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus, standing by the window sill. "
    "\u201cPlant a tree \u2014 one, two, three, / Water it well and watch it be!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, standing behind the three bins. "
    "\u201cPaper, plastic, glass and can \u2014 / Sort them out, yes we can!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, the second chorus with the lights off. "
    "\u201cTurn it off \u2014 the light, the tap! / Save the water, save a drop!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, round the handprint tree and again in the parade. "
    "\u201cHappy Earth Day! Sing and shout \u2014 / One green Earth to care about!\u201d"],
  overview=bfam([
    ("Mon","<b>Trash on the Ground</b> \u2014 Magic Box: a bag of washed recyclables, tipped straight onto the carpet. Game: litter relay (one piece each, then count them). Shelf: Tray 1 \u00b7 Recycling sorting."),
    ("Tue","<b>Plant a Tree</b> \u2014 Magic Box: a real seedling with the soil still on its roots. Game: plant a seed \u2014 one cup each, names on, home on Friday. Shelf: Tray 2 \u00b7 Planting tray. \u8c37\u96e8 fell on 20 April."),
    ("Wed","<b>Sort It Out</b> \u2014 Magic Box: three sorting bins, paper, plastic and food, a photograph on the front of each. Game: sorting race. Shelf: Tray 1 gains the 12 sorting cards."),
    ("Thu","<b>Turn It Off!</b> \u2014 Magic Box: a cloth bag and a refillable bottle beside a single-use plastic bag. Game: Turn It Off! \u2014 mimed, then for real round the whole school. Shelf: Tray 3 \u00b7 Earth Day 3-part cards."),
    ("Fri","<b>Clean Earth + Big Review</b> \u2014 everything back in the box plus the class handprint \u201cEarth tree\u201d poster and a cloth. Game: the Earth Day parade. Full song, top to bottom.")],
    extra_note=" \U0001f30d Our Earth Day week \u2014 Earth Day itself was Thursday 22 April. Last week before the Labour Day holiday (1\u20135 May); back Thursday 6 May."))


# Week 26 · Animal Habitats (6-9 Apr 2027). A FOUR-day week: 清明节 falls on
# Monday 5 April, so the class runs Tue-Fri, Tuesday carries two Magic Box
# objects and two words, and the song has FOUR verses (Tuesday's is the long
# one). Like weeks 16-25, the SHIPPED guide source is the hand-authored
# docs/circle-time/guide-src/circle-guide-week26.html — day pages carry a
# .songfoot "Today's song moment" footer instead of an in-page song block, page
# 3 is the Monday no-class card (as week 4's guide does for its Friday), and the
# day scripts are lifted verbatim from public/circle-time-week26.html. This
# entry records the week for build_guide.py's family-B path; it is additive and
# changes nothing else in this file. (build() itself would need old_footers() to
# find a shipped week-26 PDF, so the footers are carried here as weeks 21 and 23
# do.)
WEEKS[26] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="nest \u00b7 den \u00b7 pond \u00b7 web \u00b7 live",
  footers=[
    None,
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus, the nest held up in both hands. "
    "This is the LONG verse: two homes, because this is a four-day week. "
    "\u201cThe bird lives up in a cosy nest, / Twigs and moss \u2014 she likes it best! / "
    "The fox lives down in a dark, dark den, / Sleeps all day and comes out again!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, sung low as the hand goes down. "
    "\u201cThe fish lives deep in the cool, cool pond, / Swish, swish, swish \u2014 he swims along!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, almost still \u2014 only the winding finger moves. "
    "\u201cThe spider sits on a silky web, / Round and round on a silver thread!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, top to bottom, standing round the four homes "
    "with every animal in its right place. \u201cBird and fox and fish and me \u2014 / Everybody has a home, you see!\u201d"],
  overview=bfam([
    ("Mon","<b>No class \u2014 \u6e05\u660e\u8282</b> \u2014 school is closed. The guide's Monday page is the no-class card: why the week is short, and what to look at outdoors on \u8e0f\u9752 \u2014 a nest in a bare fork, a pond, a web with the wet still on it."),
    ("Tue","<b>Nest and Den</b> \u2014 TWO homes and TWO words today. Magic Box: a real bird's nest, then a shoebox den with a fox curled inside it. Game: nest hunt (five eggs) + animal-home charades. Shelf: Tray 1 \u00b7 Animal \u2194 home matching and Tray 3 \u00b7 Build a nest."),
    ("Wed","<b>The Jar Pond</b> \u2014 Magic Box: a sealed jar of pond water, weed and a fish; it sloshes instead of rattling. Game: magnet fishing, every catch said out loud. Shelf: the jar pond on the window sill."),
    ("Thu","<b>A Silky Web</b> \u2014 Magic Box: a wool web on a hoop with a spider in the middle, sprayed so it glitters. Game: weave the web \u2014 the whole class in one wool web, lifted off the floor together. Shelf: Tray 2 \u00b7 3-part cards."),
    ("Fri","<b>Where Do You Live? + Big Review</b> \u2014 every home out at once plus a basket of animal figures. Game: who lives here? quick-fire. Full song, top to bottom. Shelf: Tray 4 \u00b7 Land / water / air sorting.")],
    extra_note=" \U0001FAB9 A FOUR-day week \u2014 \u6e05\u660e\u8282 falls on Monday 5 April, so we run Tuesday to Friday. Tuesday carries two homes; the song has four verses; Friday is untouched."))


# Week 27 · The Earth (12–16 Apr 2027). Like weeks 21–25, the SHIPPED guide
# source is the hand-authored docs/circle-time/guide-src/circle-guide-week27.html
# — day pages carry a .songfoot "Today's song moment" footer instead of an
# in-page song block, and every day script is lifted verbatim out of
# public/circle-time-week27.html. This entry records the week for
# build_guide.py's family-B path; it is additive and changes nothing else in
# this file. No earlier week-27 PDF exists, so old_footers() has nothing to
# read: the five day footers are carried here.
WEEKS[27] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="Earth \u00b7 land \u00b7 water \u00b7 home \u00b7 round",
  footers=[
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Monday's verse \u2192 chorus, standing in a ring holding hands with the globe in the middle. "
    "\u201cThis is the Earth, my home, my home, / Round like a ball wherever I roam!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus \u2014 sung marching, right round the room and back. "
    "\u201cLand is brown and land is green, / I can walk on the land I've seen!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, sitting down and rocking side to side like a boat. "
    "\u201cWater, water, blue and wide, / Fish can swim and boats can ride!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, quietly, still holding hands right round the ring. "
    "\u201cEarth is home for you and me, / For every bird and every tree!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, top to bottom, walking the ring slowly round. "
    "\u201cRound, round Earth, go spin around, / Land up high and sea all round!\u201d"],
  overview=bfam([
    ("Mon","<b>Our Round Earth</b> \u2014 Magic Box: the globe, heavy and rolling; it is passed right round so every child holds the whole world. Game: pass the Earth. Shelf: the globe stays out for the whole of April."),
    ("Tue","<b>Land Under My Feet</b> \u2014 Magic Box: a jar of real damp soil, smelled and rubbed between finger and thumb. Game: land or water? (teacher points at the globe). Shelf: Tray 2 \u00b7 Land / water sorting."),
    ("Wed","<b>Water All Around</b> \u2014 Magic Box: a bowl of water with a little boat floating on it, carried flat and never shaken. Game: pour and mop. Shelf: Tray 3 \u00b7 Water pouring (the jug, bowl and sponge walk straight over)."),
    ("Thu","<b>The Earth Is Home</b> \u2014 Magic Box: the Montessori sandpaper globe \u2014 rough is land, smooth is sea. Game: feel for land, eyes closed. Shelf: Tray 1 \u00b7 Sandpaper globe + coloured globe."),
    ("Fri","<b>Round and Round + Review</b> \u2014 every prop of the week back in the box plus the class's painted handprint Earth. Game: prop quick-fire review. Full song, top to bottom, walking the ring round.")],
    extra_note=" \U0001F30D The globe comes out on Monday and stays out for the whole of April \u2014 \u4e16\u754c\u5730\u7403\u65e5 (Earth Day) is 22 April, in Week 28's window; Friday announces it."))


WEEKS[28] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="mountain · river · island · lake · land",
  # Week 28 was a four-day 清明 week in the decoded doc and was re-dated to five days
  # (19–23 April) by the printed-plan re-plan. `land` — the fifth word that had no day
  # of its own — became Friday, `lake` moved to Thursday, and the whole-song finale went
  # back to Friday where the formula wants it. No shipped week-28 PDF existed when this
  # week was built, so old_footers() has nothing to read: the five day footers below are
  # the page's own song-moment lines, lifted verbatim off #day1-#day5 of
  # public/circle-time-week28.html.
  footers=[
    "3 MIN · Today's song moment — chorus → Monday's verse → chorus, standing round the sand mountain. "
    "“A mountain is high, a mountain is tall, / Up at the top I am very small!”",
    "3 MIN · Today's song moment — chorus → Tuesday's verse → chorus, sung travelling from tall to crouched. "
    "“A river runs and never stops, / Down the hill it drips and drops!”",
    "3 MIN · Today's song moment — chorus → Wednesday's verse → chorus, in a ring round the basin with the boat afloat. "
    "“An island is land with water all round, / Hop in my boat — look what I found!”",
    "3 MIN · Today's song moment — chorus → Thursday's verse → chorus, the verse sung as quietly as you possibly can. "
    "“A lake is water with land all round, / Still and quiet — not a sound!”",
    "3 MIN · Today's song moment — Friday's verse, then the WHOLE song, top to bottom, round the land-form model. "
    "“Mountain, river, island, lake, / Land and water — that's what we make!”",
  ],
  overview=bfam([
    ("Mon","<b>Up the Mountain</b> — Magic Box: a real rock, heavy enough to make the box sag; then a mountain of wet sand with the rock on its peak. Game: be a mountain (big, little, then the whole class as one range). Shelf: Tray 3 · Mountain building."),
    ("Tue","<b>Down the River</b> — Magic Box: a jug and a tray propped up at one end; pour at the top and a river runs down it. Lay it flat and it stops — a river needs a hill. Game: pass the river (a cup relay down the line). 谷雨 falls today."),
    ("Wed","<b>Round the Island</b> — Magic Box: a clay island in a basin of water and a paper boat; the box is carried flat and never shaken. Game: sail round the island. Shelf: Tray 2 · Landform 3-part cards."),
    ("Thu","<b>Still as a Lake</b> — Magic Box: a clay mound with a hollow scooped in it, and a jug — a hole in the land until the water goes in. Game: don't wake the lake (a full cup carried in silence). Earth Day, in one sentence."),
    ("Fri","<b>Land &amp; Water + Big Review</b> — the whole week back in the box plus a handful of plain earth; the island &amp; lake land-form model, poured. Game: landform quick-fire, then outside to the sandpit and the water table. Full song, top to bottom.")],
    extra_note=" \U0001F30D Water on the mat from Tuesday on — put the towel down before the children sit down. "
               "谷雨 falls on Tuesday 20 April and Earth Day on Thursday 22 April: one nod each, then straight back to the landforms."))

# Week 36 · Graduation (14–18 Jun 2027) — the LAST week of the year and the one
# week that reviews the whole year. Like weeks 16–25, the SHIPPED guide source is
# the hand-authored docs/circle-time/guide-src/circle-guide-week36.html: day pages
# carry a .songfoot "Today's song moment" footer instead of an in-page song block,
# and every day script is lifted verbatim from public/circle-time-week36.html.
# No shipped week-36 PDF existed when this week was built, so old_footers() had
# nothing to read; the five day footers are carried here, as weeks 21 and 23 do.
# This entry is additive and changes nothing else in this file.
WEEKS[36] = dict(family="B", weeklabel=None, cover_theme=None, cover_dates=None, cover_note=None,
  cover_words="graduation \u00b7 friend \u00b7 thank you \u00b7 grow \u00b7 good-bye",
  footers=[
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Monday's verse \u2192 chorus, standing in a ring, holding hands. "
    "\u201cLittle, little, little me, / Now I'm big as big can be!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Tuesday's verse \u2192 chorus, sung marching, and stop dead on the last word. "
    "\u201cCap on my head and a smile so wide, / Walk to the front with a little pride!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Wednesday's verse \u2192 chorus, holding hands right round the ring. "
    "\u201cStars and dinosaurs, seeds and snow, / All the things we got to know!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 chorus \u2192 Thursday's verse \u2192 chorus, sung quietly \u2014 do not let this one get shouted. "
    "\u201cThank you, teacher, thank you true, / Thank you for the year with you!\u201d",
    "3 MIN \u00b7 Today's song moment \u2014 Friday's verse, then the WHOLE song, top to bottom, and then the year's medley. "
    "\u201cGood-bye, good-bye \u2014 but not for long! / We'll come back and sing our song!\u201d"],
  overview=bfam([
    ("Mon","<b>Look How We Grew</b> \u2014 Magic Box: every child's first-day-of-school photograph, printed, with the date on the back. Game: then &amp; now (find the friend in the photograph). Shelf: Tray 1 \u00b7 Growth timeline."),
    ("Tue","<b>Cap and Certificate</b> \u2014 Magic Box: the graduation cap and one blank certificate. Game: graduation parade practice \u2014 walk, stop, bow, cap on. The littles' Friday walk is agreed today, not on the day."),
    ("Wed","<b>Our Memory Box</b> \u2014 Magic Box: the memory box \u2014 globe, dinosaur, rocket, bird's nest, \u7ea2\u5305, pinwheel. Game: memory-box guessing (eyes shut, name it and the month). Shelf: Tray 2 \u00b7 The year memory box."),
    ("Thu","<b>Thank You + Our Songs</b> \u2014 Magic Box: the ukulele itself and the year's song-title cards. Game: name that song \u2014 two bars, shout the title, sing ONE chorus. Shelf: Tray 3 \u00b7 Song request cards; Tray 4 \u00b7 Make a thank-you card."),
    ("Fri","<b>The Ceremony + Whole Year</b> \u2014 certificates, the class photo and every prop of the year laid along the mat. Game: the graduation ceremony. Full song top to bottom, then the year's ten-chorus medley. Runs long.")],
    extra_note=" \U0001F393 The last week of the year, and the one week that IS the review \u2014 still exactly ONE taught song: the old choruses come back as a memory game and a finale medley, never as new material. \u590f\u81f3 falls on 21 June, in the holiday."))

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
    for w in [7, 25, 30, 31, 32, 33, 34]:
        h = build(w)
        p = f"{OUT}/circle-guide-week{w}.html"
        open(p, "w", encoding="utf-8").write(h)
        print(w, len(h), p)
