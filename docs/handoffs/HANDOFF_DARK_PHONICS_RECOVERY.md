# HANDOFF — Dark Phonics media recovery + video publish

**Status:** ✅ Media RECOVERED and restored to Desktop. ⏳ Videos NOT yet published
(only `lesson-05.mp4` is live). Tredoux to upload the rest via the browser uploader.
**Date:** Jun 15, 2026 (Cowork).

## What happened
A Desktop cleanup swept up the local Dark Phonics media (songs, pictures, animations,
videos). The CapCut projects went "media offline" because the renders hadn't been
uploaded anywhere — so it looked like a lot of lost work.

## Recovery (DONE)
- Found a full Desktop backup on the **Extreme SSD**:
  `/Volumes/Extreme SSD/Mac Backup 2026-06-14/Desktop/Dark Phonics Songs/` (1.5 GB).
- Restored it (via `ditto`) to its **original home**: `~/Desktop/Dark Phonics Songs/`
  — **1.2 GB, 32 real video files** + Animations / Pictures / Songs / Booklets / Lesson videos.
- Original path = what CapCut references, so the projects should relink (or point a project
  at this folder to reconnect). The SSD master copy is untouched.

## Publish (PENDING — Tredoux does this)
- **Target:** Supabase `dark-phonics` bucket → `videos/lesson-NN.mp4`. The public songs
  page reads this with no auth, so a file at `lesson-06.mp4` shows on the "a / apple" card.
- **Mechanism:** the **super-admin phonics-video uploader** in the browser
  (`app/montree/super-admin/phonics-videos`). This is how `lesson-05` got up.
- **⚠️ Why not scripted (the catch-22):** the Mac can only reach Supabase with the VPN
  (Astrill) ON — but with the VPN on, terminal/node large uploads are **intermittent and
  fail** ("fetch failed"); with it off, Supabase is unreachable entirely. The **browser**
  tunnels cleanly and uploads fine. So: upload via the browser uploader, not a terminal script.
- **Currently live in the bucket:** `lesson-05.mp4` only. Public check:
  `GET montree.xyz/api/montree/phonics-videos` → `{"uploaded":[...]}`.

## File → lesson mapping
Final cuts live in `~/Desktop/Dark Phonics Songs/Dark Phonics Videos/` (L20 is in the parent folder).

| Lesson | Letter | File |
|---|---|---|
| 05 | s | `Snake In My Sock - Video.mp4` |
| 06 | a | `Ant on my apple.mp4` |
| 07 | t | `Tick Tock Stinky Sock.mp4` |
| 08 | p | `pop, pop, puppy poop!.mp4` |
| 09 | i | `icky, sticky pig!.mp4` |
| 10 | n | `no-no, nanny goat!.mp4.mp4` |
| 11 | m | `mmm, muddy monkey.mp4.mp4` |
| 12 | d | `dirty dog, dig dig dig!.mp4` |
| 13 | g | `goat got my gum!.mp4.mp4` |
| 14 | o | `hot dog on a log!.mp4.mp4` |
| 15 | c | `C for the Cat.mp4.mp4` |
| 16 | k | `Lesson 16 — k — k .mp4.mp4` |
| **18** | e | `Lesson 17  e Video .mp4` — ⚠️ file is labelled "17" but the songs page shows **e at lesson 18** (17 = "ck"). Confirm before uploading. |
| 20 | r | `Lesson 20 — r - Picture - Video .mp4.mp4` (parent folder) |
| 21 | h | `Lesson 21 — h — Video.mp4` |
| 22 | b | `Lesson 22 — b — Video.mp4` |

No video exists for: 17 (ck), 19 (u), 23+ (f onward).

## Source of truth
`docs/handoffs/imported-2026-06/DARK_PHONICS_2.0.md` — full lyrics, Midjourney prompts,
and the lesson ↔ letter ↔ scene map.
