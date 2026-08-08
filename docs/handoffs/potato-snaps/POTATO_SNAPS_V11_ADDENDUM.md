# POTATO SNAPS v1.1 — Contract Addendum (Aug 8, 2026) — BINDING
Extends /home/claude/POTATO_SNAPS_CONTRACT.md. Approved design: /home/claude/design/POTATO_SNAPS_DESIGN_SPEC.html (all 11 tabs, warm scrapbook pass) — founder approved "build it all" incl. re-skinning live v1.0 screens.

## 0. Rulings
- User-facing word is **film** everywhere ("Make class film", "Watch Emma's week"). "montage" survives only in code/tables.
- v1.0 screens get the warm reskin (paper grain, two-layer shadows, polaroid mats, celebration moments, 48px targets, reduced copy) — flows unchanged.
- In-app photos are REAL photos; the designer's SVG vignette library is mock-only. Mascot stickers allowed in empty states.

## 1. Migration (next free number ≥319 — builder verifies against Mac migrations/)
- tp_montage_jobs: `ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'child' CHECK (kind IN ('child','class'))`; `ALTER COLUMN child_id DROP NOT NULL` (class jobs: child_id NULL); `ADD COLUMN IF NOT EXISTS excused_child_ids uuid[]`.
  ⚠️ The existing CHECK must be added idempotently (constraint add wrapped in DO $$ ... IF NOT EXISTS). No bucket statements in the transaction (learned Aug 7: storage schema writes roll the whole thing back — bucket already exists).
- tp_classes: `ADD COLUMN IF NOT EXISTS school_name text`, `school_logo_path text`, `emblem_path text`.

## 2. Storage paths (bucket potato-snaps, unchanged)
- School logo: `class/<classId>/branding/school-logo.<ext>`; class emblem: `class/<classId>/branding/emblem.<ext>` (jpeg/png/webp, ≤2MB).
- Class film output: `class/<classId>/montages/class/<weekStart>-<jobId>.mp4`.

## 3. API
- **POST /api/potato/class-film** (teacher): {weekStart, mediaIds[], excusedChildIds[]}. This is the ONE place client-chosen media is allowed (curation IS the feature). Server validates: every mediaId belongs to this class AND captured within [weekStart 00:00 class-tz, +7d); 8 ≤ count ≤ 40; every ACTIVE child either appears (junction) in ≥1 selected photo OR is in excusedChildIds; excusedChildIds ⊆ active children. Violations → 400 with per-child detail. Insert tp_montage_jobs kind='class', child_id NULL, media_ids sorted chronologically by captured_at.
- **GET /api/potato/class-film?week=** (teacher): the picker payload — week's photos (proxy URLs, captured_at, tagged child ids per photo) + active children (id, name, facePath). One round trip.
- **GET board**: add latest class job state for the week + branding paths (emblem, school logo, school_name).
- **GET montages**: parent → own child's kind='child' jobs PLUS the class's kind='class' jobs (done only), one feed, newest first. Teacher → everything for class.
- **Branding**: POST /api/potato/branding/emblem (teacher, multipart); HQ: PATCH /api/potato/hq/classes/[id] {schoolName} + POST /api/potato/hq/classes/[id]/logo (multipart, x-admin-password). GET surfaces include paths.
- **Proxy auth additions**: `class/<classId>/montages/class/*` readable by any parent cookie with matching classId; `class/<classId>/branding/*` readable by teacher OR parent of that class.

## 4. Pages
- NEW `/potato/teacher/class-film`: the picker exactly per design tab 07 — sticky header (count + ≈seconds + 15–40 guide track), coverage strip (all active children, count badges = SELECTED photos containing them; states covered/missing/excused/focused; missing→excused→covered sort; summary pill), photo grid grouped by day (polaroid mats, star select, face-dots), chip-tap filter with clear in/out, excuse inline sheet ONLY when child has zero photos this week, CTA disabled="N children missing" / enabled="Make class film · N photos". Selection state client-side; submit → POST class-film.
- Board: class film card per tab 08 (below camera, above roster; states not-started/cooking/sent), emblem in header.
- Parent login + feed: school-branded per tabs 09/10 (logo hero, initials fallback, mascot demoted to "made with Potato Snaps 🥔" footer); feed mixes class + child films (visually distinct cards per design).
- Teacher settings: emblem upload row + read-only school logo. HQ: school name + logo per class.
- Photos review page: full-screen swipeable lightbox per tab 11 (tags, day, delete, 48px controls).
- Reskin v1.0 screens: lift tokens/CSS treatments from the spec HTML (grain via soft-light, stacked-ellipse shadows — NO SVG blur filters, they time out at scale; ±1.5° tilts; celebration burst at 8+/everyone-in). Copy diet per design (e.g. "Tap everyone you can see.").

## 5. Worker
- Handle kind='class': same Remotion→ffmpeg pipeline, photos chronological, up to 40 photos (~2min film) — verify timing math scales; music rotation unchanged.
- BRANDED END CARD for BOTH kinds per design tab 09: school logo large + school_name + class emblem + week label + tiny "made with Potato Snaps"; initials-in-circle fallback when no logo. Worker downloads branding images from bucket into the bundle per job (same re-sync discipline). Class films land at §2 path; job row updated directly as v1.0.

## 6. Split
- Builder 1 (app): migration + all API + all pages/reskin. Builder 2 (worker): kind='class' + end card. Shared pins: §1 columns, §2 paths, §3 class-film validation rule, statuses unchanged.
- Same verification gates as v1.0 (typecheck vs real deps, week harness, self-grep). Fresh-eyes Sonnet audit before delivery. Output under /home/claude/build/potato11/ (clean tree, repo-relative).
