import pandas as pd
import subprocess
import time
import sys
import csv

base = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/outreach/"
out_path = base + "enrichment/mx-check-jul12.csv"
master = pd.read_csv(base+"Montree_Global_Master_Jul2026.csv", dtype=str, keep_default_na=False)

def get_domain(e):
    e = (e or '').strip()
    if '@' not in e:
        return None
    d = e.split('@')[-1].strip().lower().rstrip('.')
    return d if d else None

domain_rowcount = {}
already_dead = set()
for _, r in master.iterrows():
    d = get_domain(r['Email'])
    if not d:
        continue
    domain_rowcount[d] = domain_rowcount.get(d, 0) + 1
    if 'MX_DEAD' in (r['Flags'] or ''):
        already_dead.add(d)

all_domains = set(domain_rowcount.keys())
to_check = sorted(all_domains - already_dead)

print(f"TOTAL_UNIQUE_DOMAINS={len(all_domains)} ALREADY_DEAD={len(already_dead)} TO_CHECK={len(to_check)}", flush=True)

def has_mx_or_a(domain):
    try:
        r = subprocess.run(
            ["dig", "+short", "+time=3", "+tries=1", "MX", domain],
            capture_output=True, text=True, timeout=6
        )
        if r.returncode == 0 and r.stdout.strip():
            return True
        # fallback to A record - some domains route mail without MX
        ra = subprocess.run(
            ["dig", "+short", "+time=3", "+tries=1", "A", domain],
            capture_output=True, text=True, timeout=6
        )
        if ra.returncode == 0 and ra.stdout.strip():
            return True
        return False
    except Exception:
        return None  # unknown/error - treat as inconclusive

newly_dead = []
revived = []
still_dead_confirmed = []
results = []

n = len(to_check)
for i, d in enumerate(to_check):
    ok = has_mx_or_a(d)
    status = "live" if ok else ("dead" if ok is False else "unknown")
    results.append((d, status, domain_rowcount.get(d, 0)))
    if status == "dead":
        newly_dead.append(d)
    if (i+1) % 100 == 0 or (i+1) == n:
        print(f"PROGRESS {i+1}/{n} newly_dead_so_far={len(newly_dead)}", flush=True)
    time.sleep(0.05)

# also re-check the already_dead set for revival
for d in sorted(already_dead):
    ok = has_mx_or_a(d)
    status = "live" if ok else ("dead" if ok is False else "unknown")
    if status == "live":
        revived.append(d)
    results.append((d, "revived" if status=="live" else "dead_confirmed", domain_rowcount.get(d, 0)))
    time.sleep(0.05)

with open(out_path, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["domain", "status", "affected_row_count"])
    for d, status, cnt in results:
        w.writerow([d, status, cnt])

print(f"DONE total_checked={len(results)} newly_dead={len(newly_dead)} revived={len(revived)}", flush=True)
print("NEWLY_DEAD_LIST:", ",".join(newly_dead), flush=True)
print("REVIVED_LIST:", ",".join(revived), flush=True)
