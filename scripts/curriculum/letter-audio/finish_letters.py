#!/usr/bin/env python3
"""
Second half of the letter pipeline.

    python3 finish_letters.py <outdir-from-process_letters>

1. Runs every extracted clip through ElevenLabs speech-to-speech into Laura's
   voice -- the owner's exact pronunciation and timing, Laura's timbre.
2. Builds qc.html: every letter, his voice vs the Laura conversion, side by
   side, with the transcript that identified it, so a human can confirm the
   mapping before any of it ships.
"""
import json, pathlib, sys, urllib.request, uuid, subprocess

VOICE = "FGY2WhTYpPnrIDTdsKH5"   # Laura
ORDER = list("abcdefghijklmnopqrstuvwxyz") + ["ck","qu","sh","th","ch"]

def key():
    for l in pathlib.Path(".env.local").read_text().splitlines():
        if l.startswith("ELEVENLABS_API_KEY="):
            return l.split("=",1)[1].strip().strip('"').strip("'")
    sys.exit("no ELEVENLABS_API_KEY in .env.local")

def sts(src, dst, k):
    bd = uuid.uuid4().hex
    body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\neleven_multilingual_sts_v2\r\n"
            f"--{bd}\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"a.mp3\"\r\n"
            f"Content-Type: audio/mpeg\r\n\r\n").encode() + src.read_bytes() + f"\r\n--{bd}--\r\n".encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/speech-to-speech/{VOICE}",
        data=body, headers={"xi-api-key":k,"Content-Type":f"multipart/form-data; boundary={bd}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = r.read()
        if len(d) < 800: return f"tiny ({len(d)}b)"
        dst.write_bytes(d); return "ok"
    except Exception as e:
        return f"FAIL {e}"

def dur(f):
    try: return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
        "-of","csv=p=0",str(f)],capture_output=True,text=True).stdout.strip())
    except Exception: return 0.0

def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "letters-processed")
    snd, laura = out/"sound", out/"sound-laura"
    laura.mkdir(parents=True, exist_ok=True)
    rep = json.loads((out/"report.json").read_text()) if (out/"report.json").exists() else {"rows":[]}
    byletter = {r["letter"]: r for r in rep["rows"] if r.get("letter")}
    k = key()

    present = [L for L in ORDER if (snd/f"{L}.mp3").exists()]
    print(f"converting {len(present)} clips to Laura...")
    for L in present:
        d = laura/f"{L}.mp3"
        if d.exists() and d.stat().st_size > 800: print(f"  {L}: skip"); continue
        print(f"  {L}: {sts(snd/f'{L}.mp3', d, k)}", flush=True)

    rows = []
    for L in ORDER:
        mine, lau = snd/f"{L}.mp3", laura/f"{L}.mp3"
        if not mine.exists():
            rows.append(f'<tr class="miss"><td class="L">{L}</td><td colspan="4">not in the take — re-record or I generate it</td></tr>')
            continue
        r = byletter.get(L, {})
        warn = "" if r.get("clean", True) else '<div class="warn">label may still be on this clip</div>'
        rows.append(
          f'<tr><td class="L">{L}</td>'
          f'<td class="t">{(r.get("label") or "—")[:46]}<div class="how">{r.get("how","")}</div>{warn}</td>'
          f'<td><audio controls preload="none" src="sound/{L}.mp3"></audio><div class="d">{dur(mine):.2f}s</div></td>'
          f'<td>{f"<audio controls preload=none src=sound-laura/{L}.mp3></audio><div class=d>{dur(lau):.2f}s</div>" if lau.exists() else "<span class=d>—</span>"}</td>'
          f'<td class="d">{"ok" if r.get("clean",True) else "check"}</td></tr>')

    html = """<!doctype html><html><head><meta charset="utf-8"><title>Letter sounds — QC</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#14121a;color:#f4f1ea;margin:0;padding:40px 22px}
.wrap{max-width:1000px;margin:0 auto}h1{font-size:25px;margin:0 0 8px}
p.sub{color:#a29db3;margin:0 0 20px;font-size:14.5px;line-height:1.65;max-width:680px}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#8f8a9d;padding:9px 10px;border-bottom:1px solid #2e2a38}
td{padding:10px;border-bottom:1px solid #241f2e;vertical-align:middle}
tr:hover{background:#1a1722}
.L{font-size:20px;font-weight:700;color:#e8c766;width:52px}
.t{font-size:13.5px;color:#cfc9dc;max-width:260px}
.how{color:#655f78;font-size:11.5px;margin-top:3px}
.d{color:#7d7790;font-size:11.5px;margin-top:3px}
.warn{color:#e0a05c;font-size:11.5px;margin-top:4px}
.miss td{color:#a05c5c;font-size:13px}
audio{width:210px;height:32px}
.note{background:#221f2b;border-left:3px solid #c9a227;padding:14px 18px;border-radius:0 8px 8px 0;color:#d9d4e4;font-size:14px;line-height:1.65;margin:0 0 22px;max-width:700px}
</style></head><body><div class="wrap">
<h1>Letter sounds — check before it ships</h1>
<p class="sub">Every clip cut from your take, matched to a letter by the keyword you spoke rather than by counting.</p>
<div class="note">Play down the left column and check each clip is the sound named beside it. Anything marked <strong>check</strong> may still have the spoken label on the front. Then tell me: your voice, or the Laura conversion.</div>
<table><tr><th>Letter</th><th>What it heard</th><th>Your voice</th><th>Laura</th><th></th></tr>
""" + "\n".join(rows) + "</table></div></body></html>"
    (out/"qc.html").write_text(html)
    print(f"\nQC page: {out/'qc.html'}")

if __name__ == "__main__":
    main()
