# Handoff — Phonics Song Videos on montree.xyz (2026-06-07)

Pushed to `main` (commit `0406c51c`), Railway auto-deploying. Additive, super-admin-gated; no DB changes.

## What you can do now

**Upload videos yourself, no scripts:** go to **montree.xyz/montree/super-admin → 🎬 Phonics Videos** (`/montree/super-admin/phonics-videos`). Pick a lesson, drop its `.mp4`, hit upload. It shows ✅ / ⬜ for all 49 lessons so you can see what's done. Files go straight to the `dark-phonics` storage bucket at `videos/lesson-NN.mp4`.

**They appear automatically on the site:** the public **Dark Phonics songs page** (montree.xyz/dark-phonics.html → Songs tab) now has a **video player on every lesson card**. Each one self-reveals only when its video exists and stays hidden until you upload it — so the page looks clean whether 2 or 49 are up.

**Findable in the app:** the teacher **Library** now has a **"Phonics Songs"** card that opens the Dark Phonics hub.

## How it works (the important bit)

Your files are ~60MB each (~3GB total) — too big to push through a normal API route. So the uploader gets a **one-time Supabase signed upload URL** from the server (super-admin gated) and the browser uploads the file **directly to storage**, bypassing the serverless body limit. Re-uploading a lesson replaces the old file. Same public `dark-phonics` bucket as the song MP3s, so the videos are public with no extra config.

## To get all 49 up

Just work through the uploader one at a time (keep the tab open until each says done — big files take a bit). As you go, refresh the songs page and you'll see them light up.

## Notes
- Vertical 9:16 .mp4 plays best (Shorts/Reels shape), but any mp4 works.
- The uploader is **super-admin only** (behind your super-admin login).
- TypeScript clean; videos stream from Supabase's CDN via the public bucket.

## Files
`app/api/montree/super-admin/phonics-video-upload-url/route.ts` (GET list + POST sign) · `app/montree/super-admin/phonics-videos/page.tsx` (uploader) · super-admin nav link · `public/dark-phonics-songs.html` (49 self-revealing players) · Library card in `app/montree/library/page.tsx`.

---

## Session-end update — final state (2026-06-07, all deployed to main)

The uploader went through real testing and a few fixes. Current state:

1. **Uploader works.** Verified end-to-end: Lesson 5 (58.2 MB) is live in storage. Path `dark-phonics/videos/lesson-NN.mp4`.
2. **Fixed: the "tab flicks open/closed."** The page read the wrong super-admin token key (`super-admin-token`); the login stores it under `sa_session`. Fixed (commit 77713f1d). *(Note: the `all-logins` super-admin page has the same pre-existing wrong-key bug — still unfixed, separate.)*
3. **Fixed: 19 MB upload cap.** The `dark-phonics` bucket was limited to 19 MB (fine for MP3s, would reject 60 MB videos). **Raised to 300 MB** — your ~60 MB videos upload fine now, and the project global limit is confirmed ≥300 MB.
4. **Fixed: videos not showing on the page.** The reveal used to depend on the *visitor's* browser reaching Supabase first (unreliable behind the Great Firewall). Now a public route `/api/montree/phonics-videos` lists which lessons have a video (checked server-side) and the page reveals exactly those players (commit 1a717e31).
5. **Videos are now open + downloadable.** Each card has a ⬇ download (forced save, clean filename) + "Free for classroom & personal use · montree.xyz" (commit 0ba120b9). Matches the open audio. Goal = reach.

### ⚠️ Standing TODO — brand the videos going forward
Existing uploads stay as-is. But **from now on, burn the Montree watermark INTO each video export before uploading** (bottom corner; asset: `Montree (1)/montree-watermark.png`). Since the videos are downloadable + freely shareable, the burned-in watermark is what carries the brand back to montree.xyz on every copy. *(User OK with the already-uploaded one not being branded.)*

### Known caveat (not a bug)
Playback/upload from China to Supabase (foreign host) can be flaky — the player now always shows, but streaming the bytes may buffer. If it becomes a real blocker, options are resumable/TUS uploads or a China-friendlier CDN.

**Commits this session:** 0406c51c (build) · 77713f1d (token fix) · 1a717e31 (server reveal) · 0ba120b9 (downloadable). Bucket limit raised via service key (not a commit).
