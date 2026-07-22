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
