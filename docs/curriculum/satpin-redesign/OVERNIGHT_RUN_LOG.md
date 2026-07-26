# OVERNIGHT_RUN_LOG — Dark Phonics art run
# Format: LAST=<ID> #<n>/235 | SKIP=<ID> | RUN-START/CHUNK-END markers. Log is source of truth for resume.
RUN-START Tue 2026-07-21 (overseer session init)
NOTE: run uses MJ_PROMPT_PACK_RUN.md (oref-patched, 43 prompts updated; same 235 IDs/order as MJ_PROMPT_PACK_ALL.md)
LAST=BK4-P6R #25/235
LAST=L13-V5 #50/235
LAST=L15-C2 #75/235
LAST=L16-V5 #80/235 CHUNK-END
LAST=L18-C2 #105/235
LAST=L20-C2 #125/235
LAST=L23-V5 #150/235
LAST=L24-V5 #160/235 CHUNK-END
LAST=L25-C2 #175/235
LAST=L28-V5 #200/235
LAST=L30-C2 #225/235
LAST=L31-C2 #235/235 RUN-COMPLETE
REROLL LAST=L25-V1R #25/44
REROLL LAST=L31-V2R #44/44
REROLL-COMPLETE
CURATION 2026-07-22: all 24 sets + sat book curated (Sonnet + Opus sweep); picks in ART_PICKS_2026-07-22.md; re-roll round1 35/44 fixed; round2 (9) + pack2 (5) rendering
CURATION CLOSED 2026-07-22 evening: 240 slots picked (Sonnet + Opus sweep + 2 re-roll rounds, 10/14 final passed). Open: L17-C2 (no art), L13-S2 + L18-C1 (watermarked fallbacks, try patch), BK2-P6 (usable fallback). Record: ART_PICKS_2026-07-22.md. NEXT SESSION: merge picks into art-manifest.md, patch watermarks, assemble sat book + BK1/BK2 HTML, build media packs m-q. PUSH STILL PENDING.
BOOK ASSEMBLY 2026-07-22: prefixes resolved to full UUIDs from MJ archive (browser DOM harvest, 419 jobs Jul20-22, 226/226 picks resolved). art-manifest.md merged (full UUIDs, BK1/BK2/SAT/Segina-archive/L11-L31). Patched: BK2 p2/p4/p6 sigs, SAT-p5 sig, L13-S2 + L18-C1 watermarks. Books built: the-sat.html, snake-in-my-sock.html, an-apple-for-ant.html; spat.html p6 swapped (70ec4aad t0). Media packs: s/a/t reader cards live; NEW m/d/g/o packs (pen-and-ink art); index + n lnav updated; teacher hub lists all 6 readers. Full-res art in phonics-images/satpin-v2/books/{sock,apple,sat}/ + letters/. Open: L17-C2 no art (skipped), L15-C2 + L24-S2 sigs unpatched (not yet used). PUSH STILL PENDING.
RUN-START Wed 2026-07-22 night (realistic Montessori photo run; pack MJ_PROMPT_PACK_REAL.md, 164 jobs, deduped)
REAL LAST=REAL-025|table #25/164
REAL LAST=REAL-050|napkin #50/164
REAL CHUNK-END REAL-050 (chunk A 006-050, 45 submitted, 0 skipped)
REROLL2 SUBMITTED RR2-01..06 (queen quilt goat van zipper jam)
REAL LAST=REAL-075|ostrich #75/164
DECK B1 SHIPPED (m d g o) 22:39
DECK B2 SHIPPED (c k ck e)
DECK B3+B4 SHIPPED (u r h b / f l j v); REAL submissions at #100/164
DECKS B3-B5 SHIPPED + teacher hub linked. FAST HOURS RAN OUT ~REAL-095: jobs 096-131 silently dropped in fast mode; switched account to RELAX, resubmitting from 096
DARK PHONICS READERS SHIPPED 2026-07-25: 21 decodable readers built for weeks 7-27 (sounds m d g o c k ck e u r h b f l j v w x y z qu), locked 5-sentence format, built via dpbuild.py + book07.py-book27.py through the Inked Hush ReportLab engine. 42 PDFs (A5-reading + A5-booklet-print per book) archived to public/satpin-books/print/ alongside the six earlier SATPIN books. Build scripts (dpbuild.py, book07.py-book27.py) archived to scripts/curriculum/dark-phonics-readers/. Full handoff — book-by-book word list, page grammar, character oref sheets, art-style prompt suffix, and hard-won Midjourney lessons — at docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul25.md.
