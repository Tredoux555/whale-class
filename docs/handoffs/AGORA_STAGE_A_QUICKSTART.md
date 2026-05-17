# Agora Stage A Quickstart — Free, ~10 minutes, no credit card

You're activating native-in-Montree video calls. Recording + AI briefings come later in Stage B.

**Total time:** ~10 minutes.
**Total cost:** $0.
**What you get:** Parents and teachers join a video call inside the Montree app (no Jitsi page, no external tabs). Up to ~167 hours of meetings per month free.

---

## Step 1 — Sign up at Agora (3 min)

1. Open https://www.agora.io/en/
2. Click **Get Started for Free** (top right).
3. Sign up with `tredoux555@gmail.com`. Confirm email.
4. Pick your country (Hong Kong) when prompted.
5. **Important:** when asked about payment, choose to skip — you do NOT need a card for Stage A.

---

## Step 2 — Create a project + grab credentials (2 min)

1. After login, you land in the Agora Console.
2. Left sidebar → **Projects** → **Create Project**.
3. Fill in:
   - **Project Name:** `Montree`
   - **Use Case:** `Education`
   - **Authentication Mode:** select **App ID + Token** (NOT "App ID only")
4. Click **Submit**.
5. On the project list, click the small **Config** / **Edit** icon (looks like a wrench) next to your Montree project.
6. You'll see two boxes:
   - **App ID** — 32-character hex string. Copy it.
   - **Primary Certificate** — click **Generate** if it isn't there yet, then click the **eye icon** to reveal it. Copy it.

Keep both values handy for Step 3.

---

## Step 3 — Add 2 environment variables to Railway (2 min)

1. Open Railway → your Montree project → **Variables** tab.
2. Click **+ New Variable** and add the first one:
   - Name: `AGORA_APP_ID`
   - Value: paste the App ID from Step 2
3. Click **+ New Variable** again:
   - Name: `AGORA_APP_CERTIFICATE`
   - Value: paste the Primary Certificate from Step 2
4. Click **Deploy** (or wait for the auto-redeploy banner).

Railway will redeploy in ~2-3 minutes.

---

## Step 4 — Run migration 223 in Supabase (1 min)

Supabase Dashboard → **SQL Editor** → New query → paste this whole block → click **Run**:

```sql
BEGIN;

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS provider TEXT
    DEFAULT 'jitsi'
    CHECK (provider IN ('jitsi', 'agora'));

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN
    DEFAULT FALSE
    NOT NULL;

UPDATE montree_appointments
  SET provider = 'jitsi'
  WHERE provider IS NULL;

CREATE TABLE IF NOT EXISTS montree_appointment_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES montree_appointments(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  recording_provider TEXT NOT NULL CHECK (recording_provider IN ('agora')),
  agora_channel_name TEXT,
  agora_resource_id TEXT,
  agora_sid TEXT,
  agora_uid TEXT,
  recording_storage_path TEXT,
  recording_duration_seconds INTEGER,
  recording_file_size_bytes BIGINT,
  transcript TEXT,
  transcript_locale TEXT,
  summary TEXT,
  summary_locale TEXT,
  recording_visible_to_parent BOOLEAN NOT NULL DEFAULT FALSE,
  recording_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'recording', 'processing', 'ready', 'failed')),
  failure_reason TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  transcribed_at TIMESTAMPTZ,
  summarized_at TIMESTAMPTZ,
  consent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appt_recordings_appointment
  ON montree_appointment_recordings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_recordings_school_ended
  ON montree_appointment_recordings(school_id, ended_at DESC NULLS LAST)
  WHERE recording_status = 'ready';
CREATE INDEX IF NOT EXISTS idx_appt_recordings_status_pending
  ON montree_appointment_recordings(recording_status, created_at)
  WHERE recording_status IN ('recording', 'processing');

CREATE OR REPLACE FUNCTION update_appt_recording_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appt_recordings_updated_at ON montree_appointment_recordings;
CREATE TRIGGER trg_appt_recordings_updated_at
  BEFORE UPDATE ON montree_appointment_recordings
  FOR EACH ROW EXECUTE FUNCTION update_appt_recording_updated_at();

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES
  ('agora_video_calls', 'Native video calls (Agora)',
   'When ON, parents booking an appointment with the video-call checkbox get a native-in-Montree Agora video call instead of a Jitsi external URL. China-reachable. Free up to 10,000 min/mo.',
   FALSE, 'communication'),
  ('video_recording', 'Meeting recording + AI summary',
   'When ON (requires agora_video_calls also ON), Agora-provider video calls are recorded to Supabase Storage. Audio is transcribed via Whisper and summarised by Sonnet into a "prior conversation" briefing.',
   FALSE, 'communication')
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
```

You should see green "Success" with no error.

---

## Step 5 — Turn the video flag ON for Whale Class (30 seconds)

Same SQL Editor → new query → paste → **Run**:

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'agora_video_calls', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

Whale Class is now ready to use Agora video calls. The recording flag stays OFF (that's Stage B for later).

---

## Step 6 — Test it (5 min)

You need a second device or another browser logged in as a parent to fully test. Easiest path:

1. **Wait** ~2 min for Railway to finish the env-var redeploy.
2. **On your laptop:** open https://montree.xyz → log in as the Whale Class principal (you).
3. **On your phone (or a different browser):** log in as one of the test parents.
4. **On the parent side:** open Appointments → **+ Book a meeting** → pick yourself → pick a slot 2-3 minutes from now → at the intake step you should see a ✅ **Video call** checkbox with the new copy *"Meet face-to-face with [name] from anywhere — the call opens right here inside Montree."*

   (You should NOT see a "Record this meeting" sub-checkbox. That's correct for Stage A — it only appears once you turn on the recording flag in Stage B.)

5. Tick the checkbox → **Confirm meeting**.
6. **On your laptop:** open `/montree/admin/appointments` (or `/montree/dashboard/appointments` if you log in as a teacher) → you should see the new booking in **Upcoming bookings** with a **Join video call** button.
7. **On both devices:** tap **Join video call** at the appointed time.
8. Browser asks for camera + microphone permission → tap **Allow**.
9. You should see each other inside a Montree-branded call surface (dark forest theme, you in one tile, them in the other). Top of the screen says **"Meeting with [name]"**. No external Jitsi page.
10. Bottom bar: 🎤 Mute · 📹 Video · 📵 Leave. Try them. They should work.
11. Tap **Leave** when done.

If everything worked end-to-end, you have a native, China-reachable, free video call system running inside Montree. 🎉

---

## What's happening behind the scenes

When a parent taps **Join video call**:
1. Montree asks Agora for a "ticket" (1-hour signed token) that proves the parent is allowed to join this specific room.
2. The Agora SDK (loaded just-in-time, ~600KB) opens the room inside Montree's UI.
3. The other party gets a different ticket for the same room.
4. Camera + microphone start streaming peer-to-peer over Agora's network.
5. When either party taps Leave, both sides clean up and close.

No recording. No transcription. No AI summary. Pure peer-to-peer call inside your app.

---

## If something goes wrong

**"Could not get a video token"** when joining → Railway hasn't picked up the env vars yet. Wait 2 more minutes and retry.

**Camera permission denied** → browser blocked it. Tap the camera icon in the browser's address bar and grant access, then refresh.

**The video checkbox isn't showing on the booking page** → either Railway hasn't deployed yet (wait), or the flag isn't on (re-run Step 5's SQL), or you're in an old browser tab (hard refresh).

**The call won't connect for the parent** → check the parent's network. Most home WiFi in mainland China can reach Agora's CN POPs, but some restrictive networks may block UDP. If this happens, the parent can switch to a different network and retry.

---

## When you want recording + AI briefings (later)

That's Stage B. See `docs/handoffs/AGORA_SETUP_PLAYBOOK.md` Steps 2-3 (Enable Cloud Recording + REST API credentials) + Step 5 (Supabase Storage bucket) + adjust env vars + flip the second flag. ~15 more minutes when you're ready.

Until then, parents and teachers can use native video calls without any recording. Everything else (prior-conversation briefings, transcripts, summaries) just doesn't appear because there's nothing to summarise yet.
