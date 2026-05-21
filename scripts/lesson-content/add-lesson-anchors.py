#!/usr/bin/env python3
"""Inject id="lesson-N" anchors into the Library curriculum HTML pages.

The English Progression tracker (Classroom Overview) deep-links each child
straight to their current lesson — e.g. /language-area-lessons.html#lesson-23.
That only works if every lesson heading carries an id. This script adds them.

Idempotent: it matches only the bare `<h3>Lesson N` form. Once an anchor is
present the heading reads `<h3 id="lesson-N">Lesson N` and is no longer
matched, so re-running is safe. Re-run after build_blue.py / build_green.py
regenerate their HTML (those generators do not emit anchors).

Usage:  python3 scripts/lesson-content/add-lesson-anchors.py
"""
import re
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[2] / "public"

# (filename, phase, expected lesson count) — expected counts are a sanity check.
FILES = [
    ("language-area-lessons.html", "Pink", 53),   # L1-53
    ("language-area-blue.html", "Blue", 30),      # L54-83
    ("language-area-green.html", "Green", 45),    # L84-128
]

# `<h3>Lesson 23 — ...`  ->  `<h3 id="lesson-23">Lesson 23 — ...`
# Section headers like `<h3 style=...>Lessons at a glance` carry an attribute
# and the plural "Lessons", so they never match.
PATTERN = re.compile(r"<h3>(Lesson (\d+))")


def process(path: Path) -> int:
    html = path.read_text(encoding="utf-8")
    count = 0

    def repl(m: "re.Match[str]") -> str:
        nonlocal count
        count += 1
        return f'<h3 id="lesson-{m.group(2)}">{m.group(1)}'

    new_html = PATTERN.sub(repl, html)
    if new_html != html:
        path.write_text(new_html, encoding="utf-8")
    return count


def main() -> None:
    total = 0
    ok = True
    for name, phase, expected in FILES:
        path = PUBLIC / name
        if not path.exists():
            print(f"  SKIP (missing): {name}")
            ok = False
            continue
        added = process(path)
        total += added
        flag = "" if added in (expected, 0) else f"  <- expected {expected}!"
        print(f"  {phase:5s} {name}: {added} anchors{flag}")

    print(f"Done — {total} lesson anchors across {len(FILES)} files.")
    if total == 0:
        print("(0 added — already anchored on a prior run, or heading format changed.)")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
