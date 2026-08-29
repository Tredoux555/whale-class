#!/usr/bin/env python3
"""Pre-warm the Laura TTS bank: request every utterance once against the live
route, which generates + caches into the dark-phonics bucket. Paced under the
per-IP limit (30/min); backs off on 429. Idempotent — cache hits are free."""
import json, time, urllib.request, urllib.parse, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
jobs = json.loads((ROOT / "tts-bank.json").read_text())
BASE = "https://montree.xyz/api/montree/phonics-tts"

ok = fail = 0
for i, job in enumerate(jobs):
    q = {"text": job["text"]}
    if job.get("slow"):
        q["slow"] = "1"
    url = BASE + "?" + urllib.parse.urlencode(q)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                data = r.read()
            if len(data) > 1000:
                ok += 1
                print(f"[{i+1}/{len(jobs)}] ok {len(data):>6}b  {job['text'][:48]}{' (slow)' if job.get('slow') else ''}", flush=True)
            else:
                fail += 1
                print(f"[{i+1}/{len(jobs)}] TINY {job['text'][:48]}", flush=True)
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"[{i+1}/{len(jobs)}] 429 — backing off 70s", flush=True)
                time.sleep(70)
                continue
            fail += 1
            print(f"[{i+1}/{len(jobs)}] HTTP {e.code}  {job['text'][:48]}", flush=True)
            break
        except Exception as e:
            if attempt == 3:
                fail += 1
                print(f"[{i+1}/{len(jobs)}] FAIL {e}  {job['text'][:48]}", flush=True)
            else:
                time.sleep(5)
    time.sleep(2.4)  # 30/min per-IP limit

print(f"DONE ok={ok} fail={fail} total={len(jobs)}", flush=True)
