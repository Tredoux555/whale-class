#!/usr/bin/env python3
"""
add_vocab_buttons.py — one-shot scripted edit of public/dark-phonics-songs.html:
  1. Inserts a "🃏 Vocab Cards" proxy-link button next to each lesson's existing
     "🖨 Printable lesson pack" button, for the 46 lessons that have a vocab pack
     (lib/montree/english-curriculum/spec/dark-phonics-hardcards.json "songs" keys).
  2. Inserts ONE page-level "🃏 Full Flashcard Deck (Lessons 5-31)" button near
     the page intro, linking to the already-published combined deck.

Run once; re-running is a no-op after the first pass would be a mangle risk, so
this script hard-fails if the vocab-cards marker is already present.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PAGE = REPO / "public" / "dark-phonics-songs.html"
MANIFEST = REPO / "lib/montree/english-curriculum/spec/dark-phonics-hardcards.json"

manifest = json.loads(MANIFEST.read_text())
vocab_lessons = sorted(int(k) for k in manifest["songs"].keys())

html = PAGE.read_text()

if "vocab-packs/lesson-" in html:
    print("ABORT: page already contains a vocab-packs link — refusing to double-edit.")
    sys.exit(1)

PRINT_PACK_RE = re.compile(
    r'(<a href="/montree/library/lesson/(\d+)" target="_blank" rel="noopener" '
    r'style="display:inline-flex;align-items:center;gap:6px;background:#10331f;'
    r'color:#16d39a;border:1px solid #2a4d3a;border-radius:9px;padding:7px 13px;'
    r'font-size:13px;font-weight:600;text-decoration:none;margin:2px 0 4px">'
    r'🖨 Printable lesson pack →</a>)'
)

count_lessons_seen = 0
count_buttons_added = 0

def replace(m):
    global count_lessons_seen, count_buttons_added
    count_lessons_seen += 1
    full = m.group(1)
    n = int(m.group(2))
    if n not in vocab_lessons:
        return full
    nn = f"{n:02d}"
    vocab_link = (
        f'<a href="https://montree.xyz/api/montree/media/proxy/vocab-packs/lesson-{nn}.pdf'
        f'?bucket=dark-phonics&amp;v=1" target="_blank" rel="noopener" '
        f'style="display:inline-flex;align-items:center;gap:6px;background:#10331f;'
        f'color:#16d39a;border:1px solid #2a4d3a;border-radius:9px;padding:7px 13px;'
        f'font-size:13px;font-weight:600;text-decoration:none;margin:2px 0 4px 8px">'
        f'🃏 Vocab Cards →</a>'
    )
    count_buttons_added += 1
    return full + vocab_link

html2 = PRINT_PACK_RE.sub(replace, html)

if count_lessons_seen != 49:
    print(f"ABORT: expected 49 'Printable lesson pack' matches, saw {count_lessons_seen}.")
    sys.exit(1)
if count_buttons_added != len(vocab_lessons):
    print(f"ABORT: expected {len(vocab_lessons)} vocab buttons added, got {count_buttons_added}.")
    sys.exit(1)

# Page-level Full Flashcard Deck button, right after the intro <p class="sub">.
SUB_RE = re.compile(
    r'(<p class="sub">49 slow, call-and-response trap songs - one silly catch '
    r'phrase per sound\. Built for young English-learners\.</p>)'
)
deck_button = (
    '\n<div style="margin:0 0 24px">'
    '<a href="https://montree.xyz/api/montree/media/proxy/flashcards/deck-all-lessons.pdf'
    '?bucket=dark-phonics&amp;v=2" target="_blank" rel="noopener" '
    'style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;'
    'color:#f0b85a;text-decoration:none;border:1px solid #4d432a;border-radius:10px;'
    'padding:8px 14px;background:#332610;white-space:nowrap">'
    '🃏 Full Flashcard Deck (Lessons 5&ndash;31)</a></div>'
)

html3, sub_count = SUB_RE.subn(lambda m: m.group(1) + deck_button, html2)
if sub_count != 1:
    print(f"ABORT: expected exactly 1 intro <p class=sub> match, saw {sub_count}.")
    sys.exit(1)

PAGE.write_text(html3)
print(f"OK: {count_buttons_added} vocab-card buttons added (of {count_lessons_seen} lessons); "
      f"1 page-level deck button added.")
print(f"Skipped lessons (no vocab pack): {sorted(set(range(5, 54)) - set(vocab_lessons))}")
