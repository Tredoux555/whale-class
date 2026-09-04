import re, sys, html

ROOT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/public"
DRY_RUN = "--apply" not in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith("--only="):
        ONLY = [int(x) for x in a.split("=")[1].split(",")]

TAIL_OLD = """    document.getElementById('gateGo').addEventListener('click',go);
    document.getElementById('pw').addEventListener('keydown',function(e){if(e.key==='Enter')go()});
  })();
</script>"""

COPY_JS = """
  document.querySelectorAll('.copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var id=btn.getAttribute('data-copy-target');
      var el=document.getElementById(id);
      if(!el) return;
      var text=el.innerText;
      function done(){
        var old=btn.textContent;
        btn.textContent='\\u2705 Copied';
        btn.classList.add('copied');
        setTimeout(function(){btn.textContent=old; btn.classList.remove('copied');}, 1600);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done, function(){fallbackCopyPM(text,done);});
      } else {
        fallbackCopyPM(text,done);
      }
    });
  });
  function fallbackCopyPM(text,done){
    var ta=document.createElement('textarea');
    ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try{document.execCommand('copy');}catch(e){}
    document.body.removeChild(ta);
    done();
  }
"""

TAIL_NEW = TAIL_OLD[:-len("</script>")] + COPY_JS + "</script>"

CSS_OLD = ".tip{font-size:.92rem; color:var(--ink-soft); margin:8px 0 0}"
CSS_NEW = CSS_OLD + """
  .pmsg{background:var(--coral-bg); border:1px solid var(--coral-line); border-radius:12px; padding:12px 16px; margin:16px 0 4px}
  .pmsg h4{margin:0 0 6px; font-family:"Fredoka",sans-serif; font-size:.88rem; font-weight:600; color:var(--coral)}
  .pmsg-text{margin:0 0 10px; font-size:.94rem; line-height:1.5}
  .pmsg-hint{margin:0 0 10px; font-size:.78rem; color:var(--ink-soft)}
  .copy-btn{font-family:"Fredoka",sans-serif; font-weight:600; font-size:.88rem; background:var(--coral); color:#fff; border:none; border-radius:10px; padding:8px 16px; cursor:pointer}
  .copy-btn:hover{opacity:.88}
  .copy-btn.copied{background:#3a9d5d}
  .copy-btn:focus-visible{outline:3px solid var(--sun); outline-offset:2px}"""


def get_words(inner):
    m = re.search(r"Today's words?:(.*?)</p>", inner, re.S)
    if not m:
        return []
    bolds = re.findall(r'<b>(.*?)</b>', m.group(1), re.S)
    words = []
    for b in bolds:
        b_clean = html.unescape(re.sub('<[^>]+>', '', b)).strip()
        for w in re.split(r'·', b_clean):
            w = w.strip(' ,')
            if w:
                words.append(w)
    return words


def get_subtitle(inner):
    m = re.search(r'<h2>Day \d+\s*(?:·|&middot;)\s*(.*?)</h2>', inner, re.S)
    if not m:
        return None
    s = html.unescape(re.sub('<[^>]+>', '', m.group(1)))
    s = re.sub(r'&mdash;', '—', s)
    s = re.sub(r'^[A-Za-z]+day \d{1,2} [A-Za-z]+ (?:·|&middot;) ', '', s)
    return s.strip()


def get_closing(inner):
    quotes = re.findall(r'<span class="who">Everyone</span>(.*?)</div>', inner, re.S)
    if not quotes:
        return None
    raw = quotes[-1]
    raw = re.sub(r'<span class="g">.*?</span>', '', raw, flags=re.S)
    raw = re.sub('<[^>]+>', '', raw)
    raw = html.unescape(raw).strip().strip('“”"')
    return raw or None


def is_holiday(inner):
    return 'no circle time today' in inner.lower()


def build_message(subtitle, words, closing):
    if subtitle and subtitle[-1] in '!?.':
        opener = f"\U0001F433 Whale Class today — {subtitle}"
    elif subtitle:
        opener = f"\U0001F433 Whale Class today — {subtitle}!"
    else:
        opener = "\U0001F433 Whale Class today!"

    if words:
        if len(words) == 1:
            word_phrase = f"the word “{words[0]}”"
        else:
            word_phrase = "the words " + ", ".join(f"“{w}”" for w in words[:-1]) + f" and “{words[-1]}”"
    else:
        word_phrase = "some new vocabulary"

    parts = [opener, f"We practiced {word_phrase} together in circle time, with songs, games and lots of repetition to help it stick."]
    if closing:
        parts.append(f"By the end we were all chanting together: “{closing}” \U0001F389")
    parts.append("Ask your little one to show you at home! \U0001F49C")
    return " ".join(parts)


def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def process(wk):
    path = f"{ROOT}/circle-time-week{wk}.html"
    with open(path, encoding='utf-8') as f:
        txt = f.read()

    changed = False
    report = []

    if '.pmsg{' not in txt:
        if CSS_OLD not in txt:
            report.append("CSS_OLD anchor MISSING - skipped CSS")
        else:
            txt = txt.replace(CSS_OLD, CSS_NEW, 1)
            changed = True

    if 'copy-btn' not in txt.split('<script>\n  const tabs=')[-1][:2000] and TAIL_OLD in txt:
        pass
    if 'fallbackCopyPM' not in txt:
        if TAIL_OLD not in txt:
            report.append("TAIL_OLD anchor MISSING - skipped JS")
        else:
            txt = txt.replace(TAIL_OLD, TAIL_NEW, 1)
            changed = True

    inserted = 0
    for n in range(1, 9):
        m = re.search(r'(<section class="day" id="day%d"[^>]*>)(.*?)(</section>)' % n, txt, re.S)
        if not m:
            continue
        inner = m.group(2)
        if f'id="pm{n}"' in inner:
            continue  # already inserted
        subtitle = get_subtitle(inner)
        if subtitle is None:
            continue  # not a Mon-Fri teaching day tab (Song/Print/Wrap, or unmatched)
        if is_holiday(inner):
            continue
        words = get_words(inner)
        if not words:
            continue
        closing = get_closing(inner)
        msg = build_message(subtitle, words, closing)
        pmsg_html = (
            f'\n    <div class="pmsg">\n'
            f'      <h4>\U0001F4F2 Share with parents</h4>\n'
            f'      <p id="pm{n}" class="pmsg-text">{esc(msg)}</p>\n'
            f'      <p class="pmsg-hint">Tap Copy, then paste into your class WhatsApp / parent group.</p>\n'
            f'      <button class="copy-btn" data-copy-target="pm{n}">\U0001F4CB Copy message</button>\n'
            f'    </div>\n  '
        )
        new_inner = inner + pmsg_html
        txt = txt[:m.start(2)] + new_inner + txt[m.end(2):]
        changed = True
        inserted += 1
        report.append(f"day{n}: {msg[:90]}...")

    if changed and not DRY_RUN:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(txt)

    return inserted, report


weeks = ONLY if ONLY else list(range(1, 37))
total = 0
for wk in weeks:
    try:
        inserted, report = process(wk)
    except FileNotFoundError:
        print(f"week {wk}: MISSING FILE")
        continue
    total += inserted
    print(f"===== week {wk}: {inserted} messages {'(DRY RUN)' if DRY_RUN else '(APPLIED)'} =====")
    for line in report:
        print(f"  {line}")

print(f"\nTOTAL messages: {total} across {len(weeks)} weeks. Mode: {'DRY RUN (no files written)' if DRY_RUN else 'APPLIED'}")
