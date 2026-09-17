#!/usr/bin/env python3
"""Clipboard relay for the 78 missing circle-time Midjourney prompts.
Nothing touches Midjourney: each prompt is copied to your clipboard, YOU paste it.
  Enter = copy next prompt   b = go back one   r = re-copy current   q = quit (progress saved)
"""
import json, re, subprocess, sys, os
TODO = os.path.expanduser("~/Desktop/Master Brain/ACTIVE/montree/Claude outputs/ART-TODO.md")
STATE = os.path.expanduser("~/Downloads/mj-relay-state.json")

text = open(TODO, encoding="utf-8").read()
items = re.findall(r"- `([^`]+\.jpg)` — ([^\n]*)\n\s*```\n(.*?)\n\s*```", text, re.S)
if not items:
    sys.exit("No prompts parsed from ART-TODO.md")
i = 0
if os.path.exists(STATE):
    i = json.load(open(STATE)).get("next", 0)

def copy(s):
    subprocess.run(["pbcopy"], input=s.encode("utf-8"), check=True)

print(f"{len(items)} prompts. Starting at #{i+1}. Enter=next  b=back  r=recopy  q=quit\n")
while 0 <= i < len(items):
    fname, desc, prompt = items[i]
    copy(prompt.strip())
    week = re.search(r"week(\d+)", fname).group(1)
    print(f"\n[{i+1}/{len(items)}] week {week}  {fname}  ({desc})\n  PROMPT ON CLIPBOARD:\n  {prompt.strip()}\n  (Do NOT select/copy anything in this window — just Cmd+V in Midjourney, then Enter here.)")
    json.dump({"next": i}, open(STATE, "w"))
    cmd = input("> ").strip().lower()
    if cmd == "q":
        break
    elif cmd == "b":
        i = max(0, i - 1)
    elif cmd == "r":
        continue
    else:
        i += 1
json.dump({"next": i}, open(STATE, "w"))
print("Done." if i >= len(items) else f"Stopped at #{i+1}; run again to resume.")
