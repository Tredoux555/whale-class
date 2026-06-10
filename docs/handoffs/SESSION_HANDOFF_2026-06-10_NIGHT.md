# Session Handoff — 2026-06-10 (night)
*Pick up cold from here. Standing rules: (1) excellence only, no half-assed work; (2) audit→fix→audit until clean on EVERYTHING; (3) everything runs FROM THE CHAT — paste SQL/commands/steps directly, never "open this doc".*

---

## 🚨 DO FIRST — pending actions (all are Tredoux's to run)

### 1. Run migration 249 — Home Practice Cards (Supabase SQL Editor)
Until this runs, the 🏡 Home Practice card can't render. The route is live + gated.
```sql
BEGIN;
CREATE TABLE IF NOT EXISTS montree_home_practice_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  grounded_on_work TEXT,
  activity_md TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_home_practice_child_week
  ON montree_home_practice_cards (child_id, week_start DESC);
ALTER TABLE montree_home_practice_cards ENABLE ROW LEVEL SECURITY;
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description, icon, category)
VALUES ('home_practice_cards','Home Practice Cards',true,
  'Adds a tiny weekly try-this-at-home activity to each parent report, matched to the work the child is currently focused on.','🏡','reporting')
ON CONFLICT (feature_key) DO UPDATE
SET name=EXCLUDED.name, description=EXCLUDED.description, icon=EXCLUDED.icon,
    category=EXCLUDED.category, default_enabled=EXCLUDED.default_enabled;
COMMIT;
```

### 2. Put Whale Class on Sonnet (so it actually generates parent reports)
Whale Class has NEVER generated a parent report — it's on the Core (Haiku) tier, which deliberately skips report narratives. This is the single highest-leverage next move: dogfoods the core product, verifies Home Practice end-to-end, gives parents their first report.
```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc','ai_tier_sonnet',true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled=true;
```

### 3. Rotate the Supabase service-role key (security — still outstanding)
The old key was hardcoded in 3 now-deleted diag scripts but is still in git history on GitHub.
Supabase → Settings → API → roll `service_role` → update `SUPABASE_SERVICE_ROLE_KEY` in Railway + `.env.local`. Don't paste it in chat.

---

## ✅ Shipped this session (all on origin/main, deployed, gated)

| Feature | Commit | Notes |
|---|---|---|
| Security hardening (RLS lockdown ×2, screenshot/features/seed auth, encryption health card) | `c4866669` | RLS probe = 0 leaks after Tredoux ran the 2 migrations |
| Group Lesson Suggester | `6469ba9e` | flag on (mig 247 run). WebClaude PASS. |
| Curriculum Gap Radar | `f4966ea2` | flag on (mig 248 run). WebClaude PASS. |
| Home Practice Cards | `3bbf0ef3` | needs mig 249 (above) |
| Weekly Wrap honest tier messaging | `4b8c3f4c` | all 3 generate surfaces show "reports skipped — Core tier" notice |
| Parent Q&A (Guru reply drafting) | `23e34e17` | teacher-side, tier-gated, no-auto-send. Fresh-eyes caught + fixed a real IDOR bug pre-ship. |

Also confirmed **Ambient Voice Routing already exists** (voice-observation pipeline) — flag `voice_observations` is off; just enable per school, no build needed.

---

## ⏸ Shelved / deferred (engineering-correct, NOT abandoned)

- **Predictive Readiness** & **Cross-school Benchmarks** — engines built + dry-run, both blocked on ADOPTION (only 1 school has real data; dwell median degenerate at 1.6d). The libs were deleted to keep the tree clean; rebuild ~1hr each from the designs in `montree-smarter-2026-06-10.md` (in ACTIVE/) once ≥3 schools have data. They auto-activate with school growth — this is the network-effect moat.
- **Astra Memory Consolidation** — needs a merge-many/prune Postgres primitive the atomic supersede fn lacks; memory is load-bearing for Astra. Build with a dedicated migration + careful test, not a rush.

## 🔲 Remaining build queue
1. **Weekly Reels** — server-side ffmpeg on Railway (infra: ffmpeg in image, render worker, Suno track, storage bucket). Can't verify rendering from a sandbox — needs an infra session.
2. **Shelf Photo Onboarding** — extends the photo-ID vision pipeline to build a classroom inventory from shelf photos. Heaviest build; needs photos.
3. **Parent Q&A — parent-initiated half** — current build is teacher-side drafting. The full loop (parent asks a question ON their report → teacher queue) needs the `parent_messaging` rollout decision (flag off by default per Session 98). Decide rollout posture first.

Full ranked detail + specs: `ACTIVE/montree-smarter-2026-06-10.md` (status table at the bottom).

---

## 🎬 Marketing
`docs/marketing/MONTREE_HEYGEN_FEATURE_SCRIPTS.md` — four ~45s reels (Group Lessons, Gap Radar, Home Practice, Parent Q&A) + 3–4 daily variation angles each (~16 reels ≈ 3 weeks of daily posts). Post daily, 9:16, same cut all platforms, put a real dashboard screen-capture behind the voice. Add a script per new feature as it ships.

---

## Verification state
- Group Lessons + Gap Radar: WebClaude PASS on live Whale data.
- Home Practice: logic/deploy/prereq verified; on-page render pending mig 249 + an active classroom (Whale has zero tagged activity this week + no reports — see #2 above).
- Weekly Wrap messaging + Parent Q&A: code + dry-run + fresh-eyes audited; not yet eyeballed in production UI. Worth a WebClaude pass next session once Whale is on Sonnet and a wrap is generated.

## Environment gotchas (save time)
- Local `npm`/eslint/tsc DON'T work on the Mac (Linux-only dep in the lockfile). Railway runs the real build on push. Verify logic via dry-run scripts in the sandbox + fresh-eyes audits instead.
- Git push: Desktop Commander `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main`.
- Temp dry-run scripts: write to `scripts/_tmp_*.mjs`, run with node inside the whale dir (needs node_modules), delete after.
