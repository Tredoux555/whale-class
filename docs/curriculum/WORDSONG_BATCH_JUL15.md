# Word-Song Overnight Batch — Jul 15, 2026

Operator: Sonnet (Desktop Commander). Certified WORD-song path only (whisper large-v3,
schedule=auto/anchor, images-filter=lyrics). Sound songs are PARKED — none rendered.

Command per video:
```
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree" && \
  python3 scripts/mvgen/curriculum-batch.py --week N --song word --wait
```

Gate: mp4 >5MB, coverage_pct >=60%, no quality_flags, no unused_multi_token_phrase_present.
Failures do not stop the run — logged and continued.

---

## TRIAGE SUMMARY (live, updated as the run progresses)

**Status: IN PROGRESS.**

Pre-existing (rendered earlier today by a prior session, before this batch started — verified
via shot_report.json, NOT re-rendered here to conserve disk, which is already at 95% capacity
system-wide with ~10GB free):

| Week | Title | Coverage | Flags | Verdict |
|---|---|---|---|---|
| W01 | It's A (Potato) | 100.0% | none | PASS (certified) |
| W02 | Where Is Segina? | 100.0% | none | PASS (certified) |
| W03 | On the Mat | 46.2% | coverage <60% | **FLAG** (pre-existing, not re-rendered) |
| W04 | The Cat Is on the Mat | 100.0% | none | PASS |
| W05 | Sam Sat | 81.8% | none | PASS |
| W06 | I Am an Ant | 87.5% | none | PASS |
| W07 | The Cat Naps | 77.8% | none | PASS |
| W08 | Sit, Cat, Sit! | 66.7% | unused_multi_token: sat-in-a-tin.png | **FLAG** (pre-existing, not re-rendered) |
| W09 | A Hat for the Ant | 100.0% | none | PASS |
| W10 | Dad and the Ant | 75.0% | none | PASS |
| W22 | The Vet | 90.9% | none | PASS (certified) |
| W56 | The Lamb Can Climb (word) | 90.9% | none | PASS (certified) |

This run renders **W11 through W58, skipping W22 and W56** (already certified/done).

Housekeeping done: renamed `Week 08/W08 Ih-Ih-In.mp3` -> `W08 Ih-Ih-In (sound).mp3` (source
existed; fixes a known future-skip for the parked sound-song pass).

**Totals so far: 0 rendered this session · 0 passes · 0 flagged.**
**Flagged list (pre-existing, informational only): W03 On the Mat (coverage), W08 Sit Cat Sit! (unused multi-token image).**

---

## LOG (append-only, one entry per rendered video)
