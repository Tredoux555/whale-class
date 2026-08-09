This generator is stale at bank 1.1.0.
Running build.mjs unconditionally overwrites the five authored files and BANK_CHECKSUM.txt with old content.
The real merge is scripts/evaluation/merge-item-bank.mjs --src evaluation-kit/item-bank (supports --check).
If you need the gen sources updated, regenerate them from the current authored files first.

As of bank 1.11.0 the gen data files also carry the Montree Canopy (G1) construct tags,
the G1 taught-letter set and the three corrected ELOF/EYFS crosswalk codes, so that a future
regeneration would not silently reintroduce the pre-Canopy state. The G1 CONTENT itself was
authored by `../gen-canopy-g1.mjs`, which splices into the five authored files and is the
record of that run — build.mjs still must not be run.
